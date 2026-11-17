# Lesson 17 Starter App

The starting point for lesson 17: the finished lesson 16 app, with its study plan, saved sessions and `FormField` component. This lesson adds sign-in.

## Run it

Start this lesson's backend first, in its own terminal. It replaces the lesson 16 backend: stop that one if it's still running.

```bash
cd ../backend
node server.js
```

Then, in a second terminal:

```bash
npm install
npm start          # press w to open it in the browser, or open your development build
```

Open Study Steps. It shows `Authorization header is required`, because the backend now protects the study steps. That's the starting point.

The app's config and dependencies are unchanged since lesson 13, so the development build you already have still works.
