import * as SecureStore from 'expo-secure-store';
import { Platform } from 'reactive-native';

// hybrid implementation / double-whammy; this would not be mobile-specific code I'd normally write in production
// (unless leaving room for web debugging specifically), but I'm writing an implenentation that satisfied both web (sessionStorage)
// and mobile (expo SecureStore)

// good example of "I want to write a cross-platform app"

// also: expo-secure-store yses Android Keystore for android, iOS keychain for iOS (cross-platform)

const SESSION_KEY = 'study-steps-session';
const isWeb = Platform.OS === 'web';


export async function saveSession(session) {
  const value = JSON.stringify(session);

  // here's our branched implementation: sessionStorage if browser, expo secure store if android/iOS
  if (isWeb) {
    localStorage.setItem(SESSION_KEY, value);
  } else {
    await SecureStore.setItemAsync(SESSION_KEY, value);
  }
}

export async function loadSession() {
  try {
    const value = isWeb ?
        localStorage.getItem(SESSION_KEY)
        : await SecureStore.getItemAsync(SESSION_KEY);

    // if there's no session, be explicit about that
    if (!value) return null;

    const session = JSON.parse(value); // "deliberate trap"; if session is null, this will throw an exception trying to parse JSON from it
    return typeof session?.token === 'string' && session.user ? session : null;
  } catch {
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