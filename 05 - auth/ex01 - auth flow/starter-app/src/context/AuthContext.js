import { createContext, useContext } from 'react';

const AuthContext = createContext(null);


export function AuthProvider({ children }) {

  // we will eventually replace these hardcodings with state
  const session = null;
  async function signIn() {}
  function signOut() {}

  // what we want accessible in auth-related shared state
  const value = {
    token: session?.token ?? null,
    user: session?.user ?? null,
    isSignedIn: session !== null,
    signIn,
    signOut,
  }

  return <AuthContext value={value}>{children}</AuthContext>;

}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

