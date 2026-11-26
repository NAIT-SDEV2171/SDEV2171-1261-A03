import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';

export default function LoginScreen() {
  const { signIn } = useAuth();  // the only thing I need from auth hook here is the function that signs in
  
  // set up the local state to bind to form fields
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
        placeholder="student2@example.com"
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