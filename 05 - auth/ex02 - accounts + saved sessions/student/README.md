# Lesson 18: Accounts and Saved Sessions

The starter app is the finished lesson 17 app: users sign in with a seeded account, guarded screens keep signed-out users on Sign In, and the token goes with every protected request. Two things are missing. There's no way to create an account, and the session only lives in memory, so restarting the app signs the user out.

This lesson adds a Create Account screen, saves the session on the device, restores it when the app starts, and checks it with the server before trusting it.

## Setup

### 1. Start the backend

It's the same backend as lesson 17. From this lesson's folder:

```bash
cd backend
node server.js
```

| Email | Password |
| --- | --- |
| `student1@example.com` | `Password123!` |
| `student2@example.com` | `Password123!` |

Accounts you create last until the backend restarts.

### 2. Run the starter app

```bash
cd starter-app
npm install
npm start
```

Press `w` for the browser. This starter adds `expo-secure-store`, which contains native code, so your development build needs rebuilding once before it can use it:

```bash
npm run android:dev   # or npm run ios:dev on a Mac
```

Start the rebuild at the beginning of class, and use the browser until it's done.

### Testing a restart

Most of today's tests restart the app and check whether you're still signed in:

| Where | How to restart | Where to see what's saved |
| --- | --- | --- |
| Browser | Reload the page | Developer tools, Application tab, Local Storage |
| Development build | Press `r` in the Expo terminal, or close the app and open it again | Not visible: secure storage is encrypted |

In the browser, `expo-secure-store` isn't available, so the app saves the session in `localStorage` instead (see [Where the session is saved](#where-the-session-is-saved)).

## How to build and commit a change

1. Write the shape first, with hard-coded values
2. Connect everything that uses it
3. Check that the app runs and shows the hard-coded values
4. Replace the hard-coded values with the real logic
5. Test the whole flow
6. Commit

| Change | What you check after it |
| --- | --- |
| Add a Create Account screen | a new account signs straight in |
| Save the session, and delete it on sign out | the session appears in storage, and disappears on sign out. Restarting still signs you out. |
| Restore the saved session on launch | restarting keeps you signed in |
| Check the restored token with `/auth/me` | a token the server rejects is cleared, and you're back on Sign In |

## 1. Create an account

The backend's `POST /api/auth/register` takes `{ name, email, password }`:

| Response | Meaning |
| --- | --- |
| `201` with `{ token, user }` | The account was created, and the body is the same as signing in. |
| `400` | Something is missing, or the password is under 8 characters. |
| `409` | An account with that email already exists. |

1. Add a `register({ name, email, password })` function to `AuthContext.js`, next to `signIn`. It posts to `/auth/register` and stores the session, exactly like `signIn`
2. Create `src/app/register.js`, with name, email and password fields. Copy `login.js` as a starting point
3. In `_layout.tsx`, add the `register` screen inside the `!isSignedIn` guard, next to `login`
4. On Sign In, add a Create an account button that opens `/register`. `styles.secondaryButton` is ready for it

| Test | Expected |
| --- | --- |
| Register with a password under 8 characters | `Name, email, and a password of at least 8 characters are required` |
| Register with `student1@example.com` | `An account with that email already exists` |
| Register with a new email | Home, with `Signed in as` your new name |

Commit: `2. Add a Create Account screen`

<details>
<summary>Solution</summary>

In `src/context/AuthContext.js`, next to `signIn`:

```js
async function register({ name, email, password }) {
  const { token, user } = await apiRequest('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  setSession({ token, user });
}
```

and add `register` to `value`, after `signIn`.

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

In `src/app/_layout.tsx`, inside the `!isSignedIn` guard:

```tsx
<Stack.Screen name="register" options={{ title: 'Create Account' }} />
```

In `src/app/login.js`, import `useRouter` from `expo-router`, add `const router = useRouter();`, and below the Sign in button:

```jsx
<Pressable style={styles.secondaryButton} onPress={() => router.push('/register')}>
  <Text style={styles.secondaryButtonLabel}>Create an account</Text>
</Pressable>
```

</details>

## 2. Save the session

### Where the session is saved

| Storage | Use it for the session? |
| --- | --- |
| `expo-secure-store` | Yes. It encrypts values with the iOS Keychain or the Android Keystore. |
| AsyncStorage | No. It stores values unencrypted. |
| Browser `localStorage` | Only for testing in class. Any script on the page can read it. |
| An `httpOnly` cookie | The right choice for a production web app. Page scripts can't read it. |

`expo-secure-store` only works on Android and iOS, so on the web the app uses `localStorage` instead. [Expo's authentication guide](https://docs.expo.dev/router/advanced/authentication/) does the same.

### Steps

1. Create `src/lib/sessionStorage.js` with three functions. Each one uses `SecureStore` on a device and `localStorage` when `Platform.OS === 'web'`:
   - `saveSession(session)`: saves `{ token, user }` as a JSON string
   - `loadSession()`: resolves with the saved `{ token, user }`, or `null`. It must never throw: if the value is missing, isn't valid JSON, or has no token, it resolves with `null`
   - `clearSession()`: deletes the saved value
2. In `AuthContext.js`, signing in and registering both end the same way, so give them one helper, `startSession({ token, user })`, that sets the state and saves the session. Call it from `signIn` and `register`
3. Make `signOut` async, and have it delete the saved session after clearing the state

Never save the password. Once the user has a token, the app has no reason to keep it.

| Test (browser) | Expected |
| --- | --- |
| Sign in, and open Local Storage in the developer tools | a `study-steps-session` entry with the token and user |
| Sign out | the entry is gone |
| Sign in, then reload | Sign In. Nothing reads the saved session yet |

Commit: `3. Save the session, and delete it on sign out`

<details>
<summary>Solution</summary>

`src/lib/sessionStorage.js`:

```js
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Saves the signed-in session ({ token, user }) on the device, so it survives a restart.
//
// On Android and iOS it goes in expo-secure-store, which encrypts it with the Android Keystore
// or the iOS Keychain. expo-secure-store doesn't work in the browser, so on the web this file
// uses localStorage instead, so you can test in class. A real web app would keep the token in an
// httpOnly cookie, which page scripts can't read.

const SESSION_KEY = 'study-steps-session';
const isWeb = Platform.OS === 'web';

export async function saveSession(session) {
  const value = JSON.stringify(session);

  if (isWeb) {
    localStorage.setItem(SESSION_KEY, value);
  } else {
    await SecureStore.setItemAsync(SESSION_KEY, value);
  }
}

// Resolves with the saved { token, user }, or null when there's nothing usable saved.
export async function loadSession() {
  try {
    const value = isWeb ? localStorage.getItem(SESSION_KEY) : await SecureStore.getItemAsync(SESSION_KEY);
    if (!value) return null;

    const session = JSON.parse(value);
    return typeof session?.token === 'string' && session.user ? session : null;
  } catch {
    // Unreadable JSON, or storage that failed to open. Either way, there's no session to use.
    return null;
  }
}

export async function clearSession() {
  if (isWeb) {
    localStorage.removeItem(SESSION_KEY);
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}
```

In `src/context/AuthContext.js`, import the helpers:

```js
import { clearSession, saveSession } from '../lib/sessionStorage';
```

and replace `signIn`, `register` and `signOut`:

```js
// Signing in and registering both end here: keep the session in state, and save it.
async function startSession({ token, user }) {
  setSession({ token, user });
  await saveSession({ token, user });
}

async function signIn({ email, password }) {
  const { token, user } = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  await startSession({ token, user });
}

async function register({ name, email, password }) {
  const { token, user } = await apiRequest('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  await startSession({ token, user });
}

async function signOut() {
  setSession(null);
  await clearSession();
}
```

</details>

## 3. Restore the session on launch

Reading storage is asynchronous, so for a moment after the app starts, it doesn't know who's signed in. If the guards ran during that moment, `isSignedIn` would be `false`, and a signed-in user would see Sign In flash before Home.

1. In `AuthContext.js`, add an `isRestoring` state that starts as `true`, and add it to `value`
2. In `_layout.tsx`, `RootNavigator` returns a loading screen instead of the `Stack` while `isRestoring` is `true`
3. Check it: with nothing else changed, the app shows the loading screen forever, because nothing sets `isRestoring` to `false` yet
4. Write `restoreSession()`: load the saved session, put it in state, and set `isRestoring` to `false`. Call it from a `useEffect` that runs once, when the provider mounts

| Test | Expected |
| --- | --- |
| Sign in, then reload | a loading spinner for a moment, then Home |
| Sign out, then reload | Sign In |
| Sign in, then in Local Storage, change one character of the token, and reload | Home, but Study Steps says `Invalid token` |

The last row is the problem the next section fixes: the app trusts any saved token, even one the server rejects.

Commit: `4. Restore the saved session on launch`

<details>
<summary>Solution</summary>

In `src/context/AuthContext.js`, add `useEffect` to the `react` import, `loadSession` to the storage import, and below the `session` state:

```js
// True until the saved session has been read. Until then, nobody knows which screens to show.
const [isRestoring, setIsRestoring] = useState(true);

useEffect(() => {
  restoreSession();
}, []);

async function restoreSession() {
  const saved = await loadSession();
  setSession(saved);
  setIsRestoring(false);
}
```

Add `isRestoring` to `value`.

`src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
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
  const { isSignedIn, isRestoring } = useAuth();

  // Until the saved session has been checked, we don't know whether to show Home or Sign In.
  // Rendering the Stack now would show Sign In for a moment, even to a signed-in user.
  if (isRestoring) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5efe7' }}>
        <ActivityIndicator size="large" color="#8c5d35" />
      </View>
    );
  }

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
        <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      </Stack.Protected>
    </Stack>
  );
}
```

</details>

## 4. Check the restored token

A saved token might not work anymore. It can expire, the server's signing secret can change (which invalidates every token), the account can be deleted, or someone can edit it. Before trusting it, ask the server with `GET /api/auth/me`, which returns the token's user:

| The server answers | What the app does |
| --- | --- |
| `200` with `{ user }` | keeps the token, and saves the server's up-to-date user with it |
| `401` | deletes the saved session, so the user is signed out |
| nothing, because it can't be reached | keeps the saved session. A network error says nothing about the token |

In `restoreSession`, when there's a saved session, call `/auth/me` with its token, and handle each answer. `apiRequest` throws errors with `error.status`, and a network failure has no status.

| Test | Expected |
| --- | --- |
| Sign in, then reload | Home |
| Sign in, change one character of the token in Local Storage, and reload | Sign In, and the entry is gone |
| Sign in, stop the backend and start it with `TOKEN_SECRET=something-else node server.js`, then reload | Sign In: the new secret makes every old token invalid |
| Register a new account, restart the backend normally, then reload | Sign In: the account was only in the backend's memory |
| Sign in, stop the backend, then reload | Home, still signed in. Study Steps shows `Failed to fetch`. Start the backend again and press Retry |
| Change the saved value to `{not json` in Local Storage, and reload | Sign In, without an error |

On PowerShell, start the backend with a different secret like this: `$env:TOKEN_SECRET="something-else"; node server.js`. Close that terminal afterwards, so the next start uses the normal secret.

Commit: `5. Check the restored token with /auth/me`

<details>
<summary>Solution</summary>

`src/context/AuthContext.js`:

```js
import { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../lib/api';
import { clearSession, loadSession, saveSession } from '../lib/sessionStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // The token and the user always change together, so they're one piece of state.
  const [session, setSession] = useState(null);
  // True until the saved session has been read. Until then, nobody knows which screens to show.
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    const saved = await loadSession();

    if (saved) {
      try {
        // Ask the server whether the saved token still works, and who it belongs to now.
        const { user } = await apiRequest('/auth/me', { token: saved.token });
        await startSession({ token: saved.token, user });
      } catch (error) {
        if (error.status === 401) {
          // The server rejected the token: it expired, it was changed, or the user is gone.
          await clearSession();
        } else {
          // The server couldn't answer. That says nothing about the token, so keep the session.
          setSession(saved);
        }
      }
    }

    setIsRestoring(false);
  }

  // Signing in and registering both end here: keep the session in state, and save it.
  async function startSession({ token, user }) {
    setSession({ token, user });
    await saveSession({ token, user });
  }

  async function signIn({ email, password }) {
    const { token, user } = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    await startSession({ token, user });
  }

  async function register({ name, email, password }) {
    const { token, user } = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    await startSession({ token, user });
  }

  async function signOut() {
    setSession(null);
    await clearSession();
  }

  const value = {
    token: session?.token ?? null,
    user: session?.user ?? null,
    isSignedIn: session !== null,
    isRestoring,
    signIn,
    register,
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

`restoreSession` calls `startSession`, which is declared further down. That works because function declarations are hoisted, and `restoreSession` only runs after the component has rendered.

</details>

## How production apps do this

- **A splash screen instead of a spinner.** On a phone, the app's splash screen can stay up until the session is restored, so the user never sees a loading state. Expo's authentication guide does this, and it's the second challenge.
- **Refresh tokens.** Production access tokens expire in minutes. Apps also save a longer-lived refresh token, and use it to get a new access token when the old one is rejected, before giving up and signing the user out.
- **Auth providers.** Clerk, Supabase Auth, Firebase Authentication and Auth0 all save and restore sessions for you, using secure storage on a phone. The app still checks whether a session exists before deciding which screens to show.

## Challenges

Pick one after class. Each one names a term to look up. Read until you understand it, then implement a solution on top of your finished app, and commit it on its own.

### Tell the user why they were signed out

When a saved session is rejected, the app quietly shows Sign In. The user doesn't know whether they signed out or something went wrong. Look up **error messages in UX writing** (for example, the Nielsen Norman Group's error message guidelines).

- **Trigger it:** sign in, restart the backend with a different `TOKEN_SECRET`, and reload. Sign In appears with no explanation
- **Your solution:** after a rejected session, Sign In shows `Your session has expired. Sign in again to continue.` The message isn't shown after the user signs out on purpose, and it disappears once they sign in again
- **Hint:** the auth context is the only place that knows why the session ended. Keep a `notice` string there, set it where `restoreSession` handles a `401`, and clear it in `startSession`. Sign In reads it from `useAuth()`

<details>
<summary>Solution</summary>

In `src/context/AuthContext.js`, below the `isRestoring` state:

```js
// Why the user was signed out without asking, shown on Sign In. '' when there's nothing to say.
const [notice, setNotice] = useState('');
```

In `restoreSession`, after `await clearSession();` in the `401` branch:

```js
setNotice('Your session has expired. Sign in again to continue.');
```

At the start of `startSession`:

```js
setNotice('');
```

and add `notice` to `value`.

In `src/app/login.js`:

```js
const { signIn, notice } = useAuth();
```

```jsx
{notice !== '' && <Text style={styles.notice}>{notice}</Text>}
```

below the title, with this style:

```js
notice: { padding: 12, borderRadius: 12, fontSize: 14, color: '#4d3214', backgroundColor: '#ece2d1' },
```

</details>

### Keep the splash screen up while restoring

On a phone, the app shows its splash screen, then a spinner, then Home. Look up **expo-splash-screen preventAutoHideAsync**.

- **Trigger it:** on your development build, close the app completely and open it while signed in. You see the splash screen, then the spinner
- **Your solution:** the splash screen stays up until the session is restored, then the right screen appears. No spinner
- **Hint:** call `SplashScreen.preventAutoHideAsync()` once, at the top level of `_layout.tsx`, outside any component. In `RootNavigator`, call `SplashScreen.hide()` once `isRestoring` is `false`, and render `null` until then. `expo-splash-screen` is already installed. This one only shows on a device: in the browser there's no splash screen

<details>
<summary>Solution</summary>

`src/app/_layout.tsx`:

```tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { StudyPlanProvider } from '../context/StudyPlanContext';

// Keep the splash screen up when the app starts, instead of letting it hide on its own.
SplashScreen.preventAutoHideAsync();

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
  const { isSignedIn, isRestoring } = useAuth();

  // Hide the splash screen once the saved session has been checked.
  useEffect(() => {
    if (!isRestoring) SplashScreen.hide();
  }, [isRestoring]);

  // The splash screen is still covering the app, so render nothing underneath it yet.
  if (isRestoring) return null;

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
        <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      </Stack.Protected>
    </Stack>
  );
}
```

</details>

### Sign out when a request gets a 401

A restored token can still expire while the app is open, and then every protected request fails. Look up **HTTP 401 Unauthorized**. This is lesson 17's third challenge: skip it if you already did it.

- **Trigger it:** start the backend with `TOKEN_SECONDS=20 node server.js`. Sign in, wait 20 seconds, and open Study Steps. It shows `Token has expired`, and the user is stuck
- **Your solution:** a protected request that gets a `401` signs the user out, which also deletes the saved session. Other errors still show the error card
- **Hint:** every protected request goes through `useFetch`, and a hook can call `useAuth`. Only sign out when a token was sent

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

### Remember the email

Users type the same email every time they sign in. Look up **what to store on a device, and what not to**: the OWASP Mobile Application Security guidance on data storage is a good place to start.

- **Trigger it:** sign in, sign out. The email field is empty
- **Your solution:** after a successful sign-in, the app saves the email, and Sign In fills it in next time, including after a restart. It never saves the password
- **Hint:** add `saveLastEmail` and `loadLastEmail` to `sessionStorage.js`, under their own key. Load the email in a `useEffect` on Sign In, and only fill it in if the field is still empty, so you don't overwrite what the user started typing

<details>
<summary>Solution</summary>

At the end of `src/lib/sessionStorage.js`:

```js
// The last email that signed in successfully, so Sign In can fill it in. Never the password.
const EMAIL_KEY = 'study-steps-last-email';

export async function saveLastEmail(email) {
  if (isWeb) {
    localStorage.setItem(EMAIL_KEY, email);
  } else {
    await SecureStore.setItemAsync(EMAIL_KEY, email);
  }
}

export async function loadLastEmail() {
  try {
    return (isWeb ? localStorage.getItem(EMAIL_KEY) : await SecureStore.getItemAsync(EMAIL_KEY)) ?? '';
  } catch {
    return '';
  }
}
```

`src/app/login.js`:

```js
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';
import { loadLastEmail, saveLastEmail } from '../lib/sessionStorage';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // The server's answer is an event, not something we can work out from the draft, so it's state.
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fill in the last email that signed in, unless the user has already started typing.
  useEffect(() => {
    loadLastEmail().then((lastEmail) => {
      setEmail((current) => (current === '' ? lastEmail : current));
    });
  }, []);

  async function handleSignIn() {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      // No navigation here. Signing in changes the guards in _layout.tsx,
      // and the router moves to Home by itself.
      await signIn({ email, password });
      await saveLastEmail(email.trim());
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
        placeholder="student1@example.com"
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

      <Pressable style={styles.secondaryButton} onPress={() => router.push('/register')}>
        <Text style={styles.secondaryButtonLabel}>Create an account</Text>
      </Pressable>
    </ScrollView>
  );
}

// Includes the styles that later steps use (secondaryButton for the Create an account button).
const styles = StyleSheet.create({
  screen: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#f5efe7' },
  title: { fontSize: 22, fontWeight: '800', color: '#1f1b18' },
  formError: { padding: 12, borderRadius: 12, fontSize: 14, color: '#7a2e1c', backgroundColor: '#fff4f1' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#8c5d35' },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontSize: 14, fontWeight: '700', color: '#fffdfb' },
  secondaryButton: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#ece2d1' },
  secondaryButtonLabel: { fontSize: 14, fontWeight: '700', color: '#4d3214' },
});
```

Sign out leaves the email in place on purpose: it isn't secret, and it's the whole point.

</details>

## If you're stuck

| Problem | Try |
| --- | --- |
| `Cannot find native module 'ExpoSecureStore'` | Rebuild your development build. The old build doesn't include the new native code |
| The app shows the spinner forever | Something never sets `isRestoring` to `false`. Check that `restoreSession` runs, and that `loadSession` can't throw |
| Sign In flashes before Home after a reload | `RootNavigator` renders the `Stack` while `isRestoring` is still `true` |
| Still signed in after Sign out and a restart | `signOut` clears the state but not the storage |
| Signed out after every reload | `startSession` sets the state but doesn't save, or `loadSession` reads a different key than `saveSession` writes |
| Signed out whenever the backend is down | `restoreSession` deletes the session on every error. Only a `401` means the token is bad |
| `localStorage is not defined` | That code ran on a device. Check `Platform.OS === 'web'` before using `localStorage` |
| Register says `An account with that email already exists` for a new email | Accounts last until the backend restarts. Use another email, or restart the backend |
| Still stuck | Compare with the class repository's commit for that step |

## Exercise

Do one challenge, then submit a write-up of 1 to 2 pages (Markdown or PDF):

1. **The problem:** in your own words, what the challenge's term means and what problem it solves. Name one source you read
2. **Your solution:** paste the code you changed, and explain how it works
3. **Proof:** the steps you took to test it, and one screenshot of the result with a caption
4. **The restore:** walk through what happens from the moment the app starts until the user sees Home or Sign In. Name each function, say what `isRestoring` is at each point, and describe what happens when `/auth/me` answers `200`, answers `401`, or can't be reached
