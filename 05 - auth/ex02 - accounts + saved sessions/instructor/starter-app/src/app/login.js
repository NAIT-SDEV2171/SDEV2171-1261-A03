import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';


export default function LoginScreen() {
  const router = useRouter();

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
