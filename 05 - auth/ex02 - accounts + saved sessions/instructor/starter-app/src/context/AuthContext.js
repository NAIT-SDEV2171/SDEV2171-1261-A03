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
