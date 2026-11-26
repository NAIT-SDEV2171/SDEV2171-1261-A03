// Study steps API for SDEV2171 lessons 13 to 18. Lessons 17 and 18 add accounts and sign-in.
// Run with: node server.js
// Optional: TOKEN_SECONDS=20 node server.js   makes tokens expire after 20 seconds.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 3000);
const TOKEN_SECONDS = Number(process.env.TOKEN_SECONDS ?? 3600);
// A real server keeps this secret out of the code, in an environment variable.
const TOKEN_SECRET = process.env.TOKEN_SECRET ?? 'sdev2171-local-development-secret';

const steps = JSON.parse(await readFile(new URL('./study-steps.json', import.meta.url), 'utf8'));

// ---- Passwords --------------------------------------------------------------
// Passwords are never stored. Each user has a random salt and a scrypt hash.

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(password, salt, 32).toString('hex') };
}

function passwordMatches(password, user) {
  const { hash } = hashPassword(password, user.salt);
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
}

// Users live in memory. Restarting the server keeps the two seeded accounts
// and forgets everyone who registered.
const users = [
  { id: 'u1', name: 'Student One', email: 'student1@example.com', ...hashPassword('Password123!') },
  { id: 'u2', name: 'Student Two', email: 'student2@example.com', ...hashPassword('Password123!') },
];

const toPublicUser = ({ id, name, email }) => ({ id, name, email });

// ---- Tokens -----------------------------------------------------------------
// A JSON Web Token: header.payload.signature, each part base64url-encoded.
// Anyone can read the payload. Only this server can make a valid signature.
// This is written out by hand so you can read it. Real servers use a library.

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const sign = (data) => createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');

function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const data = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: user.id, iat: now, exp: now + TOKEN_SECONDS })}`;
  return `${data}.${sign(data)}`;
}

// Returns the user the token belongs to, or a reason it was rejected.
function verifyToken(token) {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return { reason: 'Malformed token' };

  const expected = Buffer.from(sign(`${header}.${payload}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { reason: 'Invalid token' };
  }

  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (claims.exp < Date.now() / 1000) return { reason: 'Token has expired' };

  const user = users.find((entry) => entry.id === claims.sub);
  if (!user) return { reason: 'User no longer exists' };
  return { user };
}

// ---- HTTP -------------------------------------------------------------------

function send(res, status, body) {
  res.writeHead(status);
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let text = '';
  for await (const chunk of req) text += chunk;
  try {
    return JSON.parse(text || '{}');
  } catch {
    return null;
  }
}

// For protected routes: the signed-in user, or null after sending a 401.
function requireUser(req, res) {
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Bearer ')) {
    send(res, 401, { error: 'Authorization header is required' });
    return null;
  }
  const { user, reason } = verifyToken(header.slice('Bearer '.length));
  if (!user) {
    send(res, 401, { error: reason });
    return null;
  }
  return user;
}

async function login(req, res) {
  const body = await readJson(req);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  if (!email || !password) return send(res, 400, { error: 'Email and password are required' });

  const user = users.find((entry) => entry.email === email);
  // The same message for a wrong email and a wrong password, so the API
  // doesn't tell an attacker which emails have accounts.
  if (!user || !passwordMatches(password, user)) return send(res, 401, { error: 'Invalid email or password' });

  send(res, 200, { token: createToken(user), user: toPublicUser(user) });
}

async function register(req, res) {
  const body = await readJson(req);
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!name || !email || password.length < 8) {
    return send(res, 400, { error: 'Name, email, and a password of at least 8 characters are required' });
  }
  if (users.some((entry) => entry.email === email)) {
    return send(res, 409, { error: 'An account with that email already exists' });
  }

  const user = { id: randomUUID(), name, email, ...hashPassword(password) };
  users.push(user);
  send(res, 201, { token: createToken(user), user: toPublicUser(user) });
}

// For flaky=N: how many times each URL has failed in a row.
const failures = new Map();

function studySteps(req, res, url) {
  if (!requireUser(req, res)) return;

  const params = url.searchParams;
  const q = (params.get('q') ?? '').trim().toLowerCase();

  // Test controls. They can be combined.
  //   delay=1500   wait 1500 ms before answering
  //   error=1      answer with a 500 error
  //   race=1       shorter searches answer slower (2000 ms minus 400 ms per character, min 200 ms)
  //   flaky=2      fail the first 2 requests to the same URL, then succeed once, then start over
  let delay = Number(params.get('delay') ?? 0);
  if (params.get('race') === '1') delay += Math.max(200, 2000 - 400 * q.length);

  // Log when the app gives up on a request before the server answers.
  let answered = false;
  res.on('close', () => {
    if (!answered) console.log(`  cancelled by the app: ${req.url}`);
  });

  setTimeout(() => {
    if (res.destroyed) return;
    answered = true;

    if (params.get('error') === '1') return send(res, 500, { error: 'The server failed on purpose (error=1).' });

    const flaky = Number(params.get('flaky') ?? 0);
    if (flaky > 0) {
      const failed = failures.get(req.url) ?? 0;
      if (failed < flaky) {
        failures.set(req.url, failed + 1);
        return send(res, 500, { error: `The server failed on purpose (flaky=${flaky}, failure ${failed + 1}).` });
      }
      failures.delete(req.url);
    }

    send(res, 200, steps.filter((step) => step.label.toLowerCase().includes(q)));
  }, delay);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`${req.method} ${req.url}`);
  const route = `${req.method} ${url.pathname}`;

  if (route === 'POST /api/auth/login') return login(req, res);
  if (route === 'POST /api/auth/register') return register(req, res);
  if (route === 'GET /api/auth/me') {
    const user = requireUser(req, res);
    if (user) send(res, 200, { user: toPublicUser(user) });
    return;
  }
  if (route === 'GET /api/study-steps') return studySteps(req, res, url);

  send(res, 404, { error: `No route for ${route}` });
});

server.listen(PORT, () => {
  console.log(`Study steps API on http://localhost:${PORT}/api`);
  console.log(`Sign in as student1@example.com or student2@example.com, password Password123!`);
  console.log(`Tokens last ${TOKEN_SECONDS} seconds.`);
});
