# Lesson 18 Starter App

The starting point for lesson 18: the finished lesson 17 app, with sign-in, guarded screens, the token sent with each protected request, and sign out. This lesson adds account creation, and saves the session so the user stays signed in after a restart.

## Run it

Start the backend first, in its own terminal. It's the same backend as lesson 17.

```bash
cd ../backend
node server.js
```

Then, in a second terminal:

```bash
npm install
npm start          # press w to open it in the browser
```

This starter adds `expo-secure-store`, which has native code. To use your development build, rebuild it once after `npm install`:

```bash
npm run android:dev   # or npm run ios:dev on a Mac
```

The browser needs no rebuild.
