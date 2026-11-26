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
