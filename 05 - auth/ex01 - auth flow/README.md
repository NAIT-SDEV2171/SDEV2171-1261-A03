# Lesson 17: Authentication

This lesson adds authenticated sign-in to client-server interactions. 

- the server gives the app a token
- the app keeps the token in context (shared state)
- screens are split into public and protected ones (doesn't need auth vs. does)
- every protected request carries the token in it
- signing out (in this example) removes the token; normally it would have a timed lifespan

## Setup

### 1. Start this lesson's backend

Run the backend provided for this example (it is different than previous lessons' backends).

```bash
cd backend
node server.js
```

It still has no dependencies. Two accounts exist when it starts:

| Email | Password |
| --- | --- |
| `AzureDiamond@internet.com` | `hunter2` |
| `student2@example.com` | `Password123!` |

| Endpoint | Needs a token | Returns |
| --- | --- | --- |
| `POST /api/auth/login` with `{ email, password }` | no | `{ token, user }`, or `401` |
| `POST /api/auth/register` with `{ name, email, password }` | no | `{ token, user }` with `201`, or `400` or `409` |
| `GET /api/auth/me` | yes | `{ user }`, or `401` |
| `GET /api/study-steps` | yes | the steps, or `401` |

Tokens last an hour by default.

Start the server with `TOKEN_SECONDS=20 node server.js` (PowerShell: `$env:TOKEN_SECONDS=20; node server.js`) to make them expire after 20 seconds, etc.

Any new accounts you register last until the server restarts.


### 2. Run the starter app

```bash
cd starter-app
npm install
npm start
```

This example is viable to run in the browser (press `w` after expo runs and the QR code pops up) if your device struggles with Android emulation.

In the app, Open Study Steps, and check that it shows `Authorization header is required`.

The app keeps the token in memory only, so reloading the browser signs you out. Saving it will be covered in the next lesson.

## Part 1: Tokens, and what the server checks

### Authentication and authorization

| Question | Name | Who answers it |
| --- | --- | --- |
| Who are you? | **authentication** | sign in, which gives the app a token |
| What are you allowed to do? | **authorization** | the server, on every request, by checking the token |

`401 Unauthorized` means "I don't know who you are." 

`403 Forbidden` means "I know exactly who you are, and you can't do this."


### Token flow

Signing in to the server successfully returns an authentication token.

```bash
curl -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"AzureDiamond@internet.com","password":"hunter2"}'
```

The server compares the password with its stored hash, and answers with a token and the user. A wrong password and an unknown email get the same `401` and `Invalid email or password`, so the API doesn't reveal which emails have accounts.

### What's inside the token

The token is a **JSON Web Token** (JWT): `header.payload.signature`, each part base64url-encoded. Decode the payload:

```bash
node -e "console.log(Buffer.from(process.argv[1].split('.')[1], 'base64url').toString())" "<token>"
```

```json
{"sub":"u1","iat":1794317373,"exp":1794320973}
```

`sub` is the user, `iat` is when the token was issued, and `exp` is when it expires, both in seconds since 1970. Anyone can read the payload: the token is **signed, not encrypted**. The server signs it with a secret only it knows, so changing any character makes the server answer `Invalid token`. Never put anything secret in a token's payload.

`backend/server.js` builds and checks tokens by hand, in about 25 lines, so you can read how it works. Real servers use a library.

### Sending the token

A protected request carries the token in a header:

```http
Authorization: Bearer <token>
```

```bash
curl localhost:3000/api/study-steps
curl localhost:3000/api/study-steps -H "Authorization: Bearer <token>"
curl localhost:3000/api/auth/me -H "Authorization: Bearer <token>"
```

The first fails with `401`. The second returns the steps. The third returns the user the token belongs to: `/auth/me` is how an app checks a token it already has. Next lesson, the app saves the token and calls `/auth/me` on launch to find out whether it still works.

### The server is the security

You just read the study steps without the app. Hiding screens in the app protects nothing: the server checking the token on every request is what protects the data. The app hides screens so a signed-out user doesn't see screens that can only fail. Both are needed, for different reasons, the same way lesson 16's form validation helps the user while the server validates again.

## Part 2: Building sign-in

### Where auth state lives

Every protected screen needs the token, and Home needs the user's name, so auth state is shared state and goes in a context.

The token and the user always change together, so they're **one** piece of state: `session`, which is `null` or `{ token, user }`. Two separate states could get out of step, and the app could end up with a token and no user.

| In the auth context | Not in it |
| --- | --- |
| the token and the user | what the user is typing on the sign-in screen |
| `signIn` and `signOut` | the sign-in error message |
| `isSignedIn`, worked out from the session | the study plan, which has its own context |

### Public and protected screens

| Screen | Who can open it |
| --- | --- |
| Sign In | only signed-out users |
| Home, Study Steps, Plan, Save Session | only signed-in users |

`Stack.Protected` in Expo Router makes a group of screens exist only while its `guard` is `true`:

| Situation | What the router does |
| --- | --- |
| The app opens signed out | `index` is guarded, so it opens the first screen that's allowed: Sign In |
| A signed-out user opens `/details` | Sign In |
| The user signs in | Sign In's guard turns `false`, so the router moves to Home |
| The user signs out | removes the protected screens and their history, and shows Sign In |

You never navigate after signing in or out. Change the auth state, and the guards move the user.

The course's original example uses `<Redirect>` in a layout instead. That works, but [Expo's authentication guide](https://docs.expo.dev/router/advanced/authentication/) uses `Stack.Protected`, which also clears the protected history on sign out.

### How to build and commit a change

1. Write the shape first, with hard-coded values
2. Connect everything that uses it
3. Check that the app runs and shows the hard-coded values
4. Replace the hard-coded values with the real logic
5. Test the whole flow
6. Commit

| Change | What you check after it |
| --- | --- |
| Add the auth context with a hard-coded session, and guard the screens | the app opens on Sign In. A hard-coded user opens Home instead |
| Sign in against the API | a wrong password shows the server's message. The right one opens Home |
| Send the token with protected requests | Study Steps loads again |
| Show the signed-in user, and sign out | Home shows the name, and Sign out returns to Sign In |

### The auth context and the guards

1. Create `src/context/AuthContext.js` with a hard-coded `session` of `null`, empty `signIn` and `signOut` functions, and a `useAuth` hook that throws outside the provider
2. Create `src/app/login.js`: email and password `FormField`s, and a Sign in button that calls `signIn`
3. In `src/app/_layout.tsx`, wrap everything in `AuthProvider`. Move the `Stack` into a `RootNavigator` component: `Layout` renders `AuthProvider`, so it's above it and can't call `useAuth`
4. Put the four existing screens in `<Stack.Protected guard={isSignedIn}>`, and the `login` screen in `<Stack.Protected guard={!isSignedIn}>`

| Test | Expected |
| --- | --- |
| Session `null` | the app opens on Sign In. Sign in does nothing |
| Session `null`, open `/details` in the browser | Sign In |
| Session `{ token: 'test-token', user: { id: 'u0', name: 'Test User', email: 'test@example.com' } }` | the app opens on Home |
| With the test user, open Study Steps | still `Authorization header is required`: the app never sends `test-token` |

Put the session back to `null` before you commit.

Commit: `2. Add the auth context and guard the screens`

<details>
<summary>Solution</summary>

`src/context/AuthContext.js`:

```js
import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // TODO: replace this hard-coded session with real state
  const session = null;
  async function signIn() {}
  function signOut() {}

  const value = {
    token: session?.token ?? null,
    user: session?.user ?? null,
    isSignedIn: session !== null,
    signIn,
    signOut,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
```

`src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { StudyPlanProvider } from '../context/StudyPlanContext';

export default function Layout() {
  return (
    <AuthProvider>
      <StudyPlanProvider>
        <RootNavigator />
      </StudyPlanProvider>
    </AuthProvider>
  );
}

// A separate component, so it renders inside AuthProvider and can call useAuth.
function RootNavigator() {
  const { isSignedIn } = useAuth();

  return (
    <Stack>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="details" options={{ title: 'Study Steps' }} />
        <Stack.Screen name="plan" options={{ title: 'Plan' }} />
        <Stack.Screen name="session-form" options={{ title: 'Save Session' }} />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="login" options={{ title: 'Sign In' }} />
      </Stack.Protected>
    </Stack>
  );
}
```

`src/app/login.js`:

```js
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSignIn() {
    // TODO: show errors, and stop double submits
    await signIn({ email, password });
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Sign in to see your study plan</Text>

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="AzureDiamond@internet.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />

      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Password123!"
        autoComplete="current-password"
        secureTextEntry
      />

      <Pressable style={styles.button} onPress={handleSignIn}>
        <Text style={styles.buttonLabel}>Sign in</Text>
      </Pressable>
    </ScrollView>
  );
}

// Includes the error and disabled styles that later steps use.
const styles = StyleSheet.create({
  screen: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#f5efe7' },
  title: { fontSize: 22, fontWeight: '800', color: '#1f1b18' },
  formError: { padding: 12, borderRadius: 12, fontSize: 14, color: '#7a2e1c', backgroundColor: '#fff4f1' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#8c5d35' },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontSize: 14, fontWeight: '700', color: '#fffdfb' },
});
```

`secureTextEntry` hides the password. `autoComplete` lets password managers fill the form. `autoCapitalize="none"` stops the phone capitalizing the email.

</details>

### Signing in

1. Create `src/lib/api.js` with an `apiRequest(path, { method, body, token })` helper. It sends JSON, adds the bearer token when there is one, and throws an `Error` with the server's message when the response isn't OK
2. In the provider, replace the hard-coded session with `useState(null)`. `signIn` posts to `/auth/login` and stores `{ token, user }`. `signOut` sets the session back to `null`
3. In `login.js`, catch the error from `signIn` and show its message. Keep an `isSubmitting` flag that disables the button while the request runs

In lesson 16, errors were derived from the draft. This one can't be: only the server knows whether the password is right. The server's answer is an event, so it's state.

| Test | Expected |
| --- | --- |
| Sign in with a wrong password | `Invalid email or password`, and you stay on Sign In |
| Sign in as `AzureDiamond@internet.com` | Home |
| Open Study Steps | still `Authorization header is required` |

The last row is expected. The app knows you're signed in. The server doesn't, because nothing in the request says so. The server remembers nothing between requests, so every request has to carry its own proof.

Commit: `3. Sign in against the API`

<details>
<summary>Solution</summary>

`src/lib/api.js`:

```js
import { API_BASE_URL } from './apiBaseUrl';

// Sends a request to the API and returns the JSON response.
// Adds the bearer token when one is given. Throws the server's error message
// when the response isn't OK, with the HTTP status on error.status.
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error ?? `Server returned ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}
```

`src/context/AuthContext.js`:

```js
import { createContext, useContext, useState } from 'react';
import { apiRequest } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // The token and the user always change together, so they're one piece of state.
  const [session, setSession] = useState(null);

  async function signIn({ email, password }) {
    const { token, user } = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setSession({ token, user });
  }

  function signOut() {
    setSession(null);
  }

  const value = {
    token: session?.token ?? null,
    user: session?.user ?? null,
    isSignedIn: session !== null,
    signIn,
    signOut,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
```

`src/app/login.js`:

```js
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // The server's answer is an event, not something we can work out from the draft, so it's state.
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      // No navigation here. Signing in changes the guards in _layout.tsx,
      // and the router moves to Home by itself.
      await signIn({ email, password });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Sign in to see your study plan</Text>

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="AzureDiamond@internet.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />

      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Password123!"
        autoComplete="current-password"
        secureTextEntry
      />

      {errorMessage !== '' && <Text style={styles.formError}>{errorMessage}</Text>}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonLabel}>{isSubmitting ? 'Signing in...' : 'Sign in'}</Text>
      </Pressable>
    </ScrollView>
  );
}

// Includes the error and disabled styles that later steps use.
const styles = StyleSheet.create({
  screen: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#f5efe7' },
  title: { fontSize: 22, fontWeight: '800', color: '#1f1b18' },
  formError: { padding: 12, borderRadius: 12, fontSize: 14, color: '#7a2e1c', backgroundColor: '#fff4f1' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#8c5d35' },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontSize: 14, fontWeight: '700', color: '#fffdfb' },
});
```

</details>

### Sending the token

Give `useFetch` an optional second argument, `{ token }`. When there's a token, send it in an `Authorization` header, and add `token` to the effect's dependencies. In `details.js`, read the token with `useAuth` and pass it in.

`useFetch` takes the token as a string, not a headers object, on purpose. The effect compares its dependencies by reference. A headers object written in a component is a new object on every render, so the effect would refetch on every render, forever. A string only changes when the token does.

| Test | Expected |
| --- | --- |
| Sign in, open Study Steps | the list loads |
| Browser developer tools, Network tab, the `study-steps` request | Request Headers include `Authorization: Bearer eyJ...` |

In a development build, press `j` in the Expo terminal to open React Native DevTools, which has a Network panel too.

Anyone who can see that header can copy the token and use it with `curl`. That's what "bearer" means, and it's why tokens expire.

Commit: `4. Send the token with protected requests`

<details>
<summary>Solution</summary>

`src/hooks/useFetch.js`:

```js
import { useEffect, useState } from 'react';

// Fetches JSON from url. Refetches when url or token changes, or retry() is called.
// Cancels the previous request whenever a new one starts.
// Pass { token } to send it as a bearer token.
export function useFetch(url, { token } = {}) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [data, setData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStatus('loading');

      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(url, { headers, signal: controller.signal });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `Server returned ${response.status}`);
        }

        setData(await response.json());
        setStatus('success');
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(error.message);
        setStatus('error');
      }
    }

    load();
    return () => controller.abort();
  }, [url, token, reloadKey]);

  function retry() {
    setReloadKey((key) => key + 1);
  }

  return { status, data, errorMessage, retry };
}
```

In `src/app/details.js`:

```js
import { useAuth } from '../context/AuthContext';
```

```js
const { token } = useAuth();
const { status, data, errorMessage, retry } = useFetch(`${API_BASE_URL}/study-steps?delay=500`, { token });
```

</details>

### Signing out

On Home, show `Signed in as Student One (AzureDiamond@internet.com)` under the title, and a Sign out button below Open study steps. Home is inside the `isSignedIn` guard, so `user` always exists there.

| Do this | Expected |
| --- | --- |
| Sign in, open Study Steps and Plan | both work |
| Go back to Home, press Sign out | Sign In |
| Press the browser's Back button | it leaves the app. The protected history is gone |
| Sign in as Student One, add two steps, sign out, sign in as Student Two | Home says `2 in your plan` |

The last row is a bug, and it's the second challenge. Sign out cleared the session, but the plan lives in `StudyPlanProvider`, which stayed mounted.

Commit: `5. Show the signed-in user, and sign out`

<details>
<summary>Solution</summary>

`src/app/index.js`:

```js
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useStudyPlan } from '../context/StudyPlanContext';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { selectedSteps, savedSession } = useStudyPlan();
  const { user, signOut } = useAuth();

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Text style={styles.eyebrow}>SDEV2171 lesson 17</Text>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.body}>Signed in as {user.name} ({user.email})</Text>
      <Text style={styles.body}>{selectedSteps.length} in your plan</Text>
      {savedSession && <Text style={styles.body}>Saved session: {savedSession.title}</Text>}
      <Pressable style={styles.button} onPress={() => router.push('/details')}>
        <Text style={styles.buttonLabel}>Open study steps</Text>
      </Pressable>
      <Pressable style={styles.secondaryButton} onPress={signOut}>
        <Text style={styles.secondaryButtonLabel}>Sign out</Text>
      </Pressable>
    </View>
  );
}

// Includes styles that later steps use (secondaryButton), so the commits only change logic and JSX.
const styles = StyleSheet.create({
  screen: { flex: 1, gap: 16, padding: 24, paddingTop: 42, backgroundColor: '#f5efe7' },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#8c5d35' },
  title: { fontSize: 30, fontWeight: '800', color: '#1f1b18' },
  body: { fontSize: 15, color: '#5d554d' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#8c5d35' },
  buttonLabel: { fontSize: 14, fontWeight: '700', color: '#fffdfb' },
  secondaryButton: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#ece2d1' },
  secondaryButtonLabel: { fontSize: 14, fontWeight: '700', color: '#4d3214' },
});
```

</details>

## How production apps do this

**Where the token lives.** Today it's only in memory, so a reload signs the user out.

| Storage | Use it for tokens? |
| --- | --- |
| Memory (today) | safe, but the user signs in after every restart |
| AsyncStorage | no. It's stored unencrypted, so a backup or a rooted phone exposes it |
| `expo-secure-store` | yes. It uses the iOS Keychain and the Android Keystore |
| Browser `localStorage` | risky. Any script on the page can read it |
| An `httpOnly` cookie (web) | the usual choice on the web. Page scripts can't read it at all |

**Short-lived tokens.** A bearer token works for whoever holds it, so production access tokens expire in minutes. A longer-lived **refresh token** gets a new access token without the password. When a request gets `401` because the access token expired, the app refreshes and retries, and signs out if the refresh fails too.

**Auth providers.** Most production apps use a provider instead of handling passwords themselves: Clerk, Supabase Auth, Firebase Authentication, or Auth0. The app still keeps a session in a context, guards screens on it, and sends a bearer token. "Sign in with Google" and "Sign in with Apple" use OAuth: in Expo, `expo-auth-session` does it with PKCE, which needs no client secret in the app. Never put an API secret in an app. Anyone can unzip an app and read it.

## Challenges

Pick one after class. Each one names a term to look up. Read until you understand it, then implement a solution on top of your finished sign-in, and commit it on its own.

### Create an account

The backend has `POST /api/auth/register`, and the app has no way to use it. Look up **HTTP 201 and 409 status codes**.

- **Trigger it:** on Sign In, there's no way to create an account
- **Your solution:** a Create an account button on Sign In opens a Create Account screen with name, email and password. Registering signs the new user in and opens Home. A password under 8 characters, or an email that's already registered, shows the server's message
- **Hint:** registering returns the same `{ token, user }` as signing in. Add a `register` function next to `signIn`. The new screen needs the same guard as Sign In. Copy `login.js` as a starting point

<details>
<summary>Solution</summary>

In `src/context/AuthContext.js`, next to `signIn`, and add `register` to `value`:

```js
async function register({ name, email, password }) {
  const { token, user } = await apiRequest('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  setSession({ token, user });
}
```

In `src/app/_layout.tsx`, inside the `!isSignedIn` guard:

```tsx
<Stack.Screen name="register" options={{ title: 'Create Account' }} />
```

`src/app/register.js`:

```js
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      // Registering signs the user in, so the guards move to Home, as with signIn.
      await register({ name: name.trim(), email: email.trim(), password });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <FormField label="Name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        secureTextEntry
      />

      {errorMessage !== '' && <Text style={styles.formError}>{errorMessage}</Text>}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonLabel}>{isSubmitting ? 'Creating account...' : 'Create account'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#f5efe7' },
  formError: { padding: 12, borderRadius: 12, fontSize: 14, color: '#7a2e1c', backgroundColor: '#fff4f1' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#8c5d35' },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontSize: 14, fontWeight: '700', color: '#fffdfb' },
});
```

In `src/app/login.js`, import `useRouter` from `expo-router`, add `const router = useRouter();`, and below the Sign in button:

```jsx
<Pressable style={styles.secondaryButton} onPress={() => router.push('/register')}>
  <Text style={styles.secondaryButtonLabel}>Create an account</Text>
</Pressable>
```

with these styles:

```js
secondaryButton: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#ece2d1' },
secondaryButtonLabel: { fontSize: 14, fontWeight: '700', color: '#4d3214' },
```

</details>

### A fresh plan for each user

Signing out leaves the last user's plan in place. Look up **resetting state with a key** in the React docs.

- **Trigger it:** sign in as Student One, add two steps, and sign out. Sign in as Student Two. Home shows `2 in your plan`
- **Your solution:** each user starts with an empty plan, and nothing in `StudyPlanContext.js` changes
- **Hint:** when a component's `key` changes, React unmounts it and mounts a new one, with fresh state. Give `StudyPlanProvider` a key that changes with the user. `Layout` can't call `useAuth`, so move the provider into `RootNavigator`

<details>
<summary>Solution</summary>

`src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { StudyPlanProvider } from '../context/StudyPlanContext';

export default function Layout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

// A separate component, so it renders inside AuthProvider and can call useAuth.
function RootNavigator() {
  const { isSignedIn, user } = useAuth();

  return (
    // A different key makes React unmount the old provider and mount a new one,
    // so each user starts with an empty plan.
    <StudyPlanProvider key={user?.id ?? 'signed-out'}>
      <Stack>
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="index" options={{ title: 'Home' }} />
          <Stack.Screen name="details" options={{ title: 'Study Steps' }} />
          <Stack.Screen name="plan" options={{ title: 'Plan' }} />
          <Stack.Screen name="session-form" options={{ title: 'Save Session' }} />
        </Stack.Protected>

        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="login" options={{ title: 'Sign In' }} />
        </Stack.Protected>
      </Stack>
    </StudyPlanProvider>
  );
}
```

</details>

### Sign out when the token expires

When a token expires, the app keeps showing protected screens that can only fail. Look up **HTTP 401 Unauthorized**.

- **Trigger it:** start the backend with `TOKEN_SECONDS=20 node server.js`. Sign in, wait 20 seconds, and open Study Steps. It shows `Token has expired`, and the user is stuck
- **Your solution:** any protected request that gets a `401` signs the user out, which sends them to Sign In. A failure that isn't a `401`, like `?error=1`, still shows the error card
- **Hint:** every protected request goes through `useFetch`, so the check belongs there, once. A hook can call another hook, so `useFetch` can call `useAuth`. Only sign out when a token was sent: a `401` without one means a screen forgot to send it

<details>
<summary>Solution</summary>

`src/hooks/useFetch.js`:

```js
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Fetches JSON from url. Refetches when url or token changes, or retry() is called.
// Cancels the previous request whenever a new one starts.
// Pass { token } to send it as a bearer token.
export function useFetch(url, { token } = {}) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [data, setData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { signOut } = useAuth();

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setStatus('loading');

      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(url, { headers, signal: controller.signal });

        // The server rejected the token: it expired, or it was never valid.
        // Signing out sends the user back to Sign In.
        if (response.status === 401 && token) {
          signOut();
          return;
        }

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `Server returned ${response.status}`);
        }

        setData(await response.json());
        setStatus('success');
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(error.message);
        setStatus('error');
      }
    }

    load();
    return () => controller.abort();
  }, [url, token, reloadKey]);

  function retry() {
    setReloadKey((key) => key + 1);
  }

  return { status, data, errorMessage, retry };
}
```

</details>

### Check the form before sending

Pressing Sign in with an empty form sends a request that can only fail. Look up **client-side validation**.

- **Trigger it:** open the Network tab, leave both fields empty, and press Sign in. A request goes to `/auth/login`
- **Your solution:** an empty password, or an email without `@`, shows an error under that field and sends no request. The errors follow lesson 16's rules: derived from the draft, and shown only after the first attempt. Wrong-password errors still come from the server
- **Hint:** this is lesson 16's `validateSession` pattern. `FormField` already shows an `error` prop

<details>
<summary>Solution</summary>

`src/app/login.js`:

```js
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';

// One message per problem, and {} when the draft can be sent.
function validateCredentials({ email, password }) {
  const errors = {};
  if (!email.trim().includes('@')) errors.email = 'Enter your email address.';
  if (password === '') errors.password = 'Enter your password.';
  return errors;
}

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // The server's answer is an event, not something we can work out from the draft, so it's state.
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasTriedToSubmit, setHasTriedToSubmit] = useState(false);

  const errors = validateCredentials({ email, password });
  const isValid = Object.keys(errors).length === 0;

  async function handleSignIn() {
    setHasTriedToSubmit(true);
    // Don't send a request we already know the server will reject.
    if (!isValid) return;

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      // No navigation here. Signing in changes the guards in _layout.tsx,
      // and the router moves to Home by itself.
      await signIn({ email: email.trim(), password });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Sign in to see your study plan</Text>

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="AzureDiamond@internet.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        error={hasTriedToSubmit ? errors.email : undefined}
      />

      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Password123!"
        autoComplete="current-password"
        secureTextEntry
        error={hasTriedToSubmit ? errors.password : undefined}
      />

      {errorMessage !== '' && <Text style={styles.formError}>{errorMessage}</Text>}

      <Pressable
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonLabel}>{isSubmitting ? 'Signing in...' : 'Sign in'}</Text>
      </Pressable>
    </ScrollView>
  );
}

// Includes the error and disabled styles that later steps use.
const styles = StyleSheet.create({
  screen: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#f5efe7' },
  title: { fontSize: 22, fontWeight: '800', color: '#1f1b18' },
  formError: { padding: 12, borderRadius: 12, fontSize: 14, color: '#7a2e1c', backgroundColor: '#fff4f1' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#8c5d35' },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontSize: 14, fontWeight: '700', color: '#fffdfb' },
});
```

</details>

## If you're stuck

| Problem | Try |
| --- | --- |
| `useAuth must be used inside AuthProvider` | You called `useAuth` in `Layout`. Call it in `RootNavigator`, which renders inside the provider |
| The app opens on Home while signed out | The screen isn't inside the `isSignedIn` guard, or the hard-coded session isn't `null` |
| Signing in works but the app stays on Sign In | `login` isn't inside a `!isSignedIn` guard, so nothing moves you |
| `Invalid email or password` with the right password | Check for a space in the email, and that you're running this lesson's backend |
| `Failed to fetch` or `Network request failed` | The backend isn't running, or `apiBaseUrl.js` has the wrong host for your device |
| Study Steps still says `Authorization header is required` | `details.js` isn't passing `{ token }` to `useFetch` |
| Study Steps refetches over and over | You passed `useFetch` a new object, like `{ headers: {...} }`, that ends up in the effect's dependencies |
| `Token has expired` or `Invalid token` | The token is old, or the backend restarted with a different `TOKEN_SECRET`. Sign out and sign in |
| Signed out after a browser reload | Expected: the token only lives in memory this lesson |
| Still stuck | Compare with the class repository's commit for that step |

## Exercise

Do one challenge, then submit a write-up of 1 to 2 pages (Markdown or PDF):

1. **The problem:** in your own words, what the challenge's term means and what problem it solves. Name one source you read
2. **Your solution:** paste the code you changed, and explain how it works
3. **Proof:** the steps you took to test it, and one screenshot of the result with a caption
4. **The token:** paste the decoded payload of a token from your app, explain each claim, and explain why the app can't change the user it names
5. **The split:** name one public screen and one protected screen, say what moves the user between them when they sign in, and explain why hiding protected screens isn't what keeps the study steps private
