import { StyleSheet, Text, TextInput, View } from 'react-native';

// A labelled text input with its error message underneath.
// Every prop except label, error and style goes straight to the TextInput.
export function FormField({ label, error, style, ...inputProps }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...inputProps} style={[styles.input, style, error && styles.inputError]} />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '700', color: '#4d3214' },
  input: {
    borderWidth: 1,
    borderColor: '#d2c4b5',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fffdfb',
  },
  inputError: { borderColor: '#b4533a' },
  errorText: { fontSize: 13, color: '#b4533a' },
});
