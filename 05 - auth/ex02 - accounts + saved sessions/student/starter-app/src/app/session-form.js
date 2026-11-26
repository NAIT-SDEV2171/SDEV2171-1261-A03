import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useStudyPlan } from '../context/StudyPlanContext';
import { FormField } from '../components/FormField';

// Returns one message per problem. An empty object means the draft is valid.
function validateSession({ title, steps }) {
  const errors = {};

  if (title.trim() === '') {
    errors.title = 'Give the session a title.';
  }

  if (steps.length === 0) {
    errors.steps = 'Add at least one step to your plan before saving.';
  }

  return errors;
}

export default function SessionFormScreen() {
  const router = useRouter();
  const { selectedSteps, saveSession } = useStudyPlan();
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [hasTriedToSave, setHasTriedToSave] = useState(false);

  // Errors are worked out from the draft on every render, so they're never out of date.
  const errors = validateSession({ title, steps: selectedSteps });
  const isValid = Object.keys(errors).length === 0;

  // Don't show errors before the first save attempt.
  const titleError = hasTriedToSave ? errors.title : undefined;
  const stepsError = hasTriedToSave ? errors.steps : undefined;

  function handleSave() {
    setHasTriedToSave(true);
    if (!isValid) return;

    saveSession({ title: title.trim(), goal: goal.trim() });
    router.back();
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>Steps in this session: {selectedSteps.length}</Text>

      <FormField
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="Week 3 lab prep"
        maxLength={40}
        error={titleError}
      />

      <FormField
        label="Goal (optional)"
        value={goal}
        onChangeText={setGoal}
        placeholder="What should this session get done?"
        multiline
        style={styles.multiline}
      />

      {stepsError && <Text style={styles.formError}>{stepsError}</Text>}

      <Pressable style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonLabel}>Save session</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#f5efe7' },
  intro: { fontSize: 15, color: '#5d554d' },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  formError: { padding: 12, borderRadius: 12, fontSize: 14, color: '#7a2e1c', backgroundColor: '#fff4f1' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#8c5d35' },
  buttonLabel: { fontSize: 14, fontWeight: '700', color: '#fffdfb' },
});
