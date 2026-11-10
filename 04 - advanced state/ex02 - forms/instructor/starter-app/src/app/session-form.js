import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useStudyPlan } from '../context/StudyPlanContext';


function validateSession(title, steps) {
  // simple function: take inputs, compose error messages based on inputs

  const errors = {};

  if (title.trim() === '') {
    errors.title = 'Please provide a title for the session';
  }

  if (steps.length === 0) {
    errors.steps = 'Your plan must contain at least one step before saving'
  }

  return errors;

}


export default function SessionFormScreen() {

  const router = useRouter();
  
  // shared state for study session & its steps
  const { selectedSteps, saveSession } = useStudyPlan();

  // local state for form fields data; feel free to use an object with properties for each field instead
  // -> if you do one piece of state
  //      i.e. [formData, setFormData] = useState({title: '', goal: ''}) 
  //    this can be more efficient in terms of code implementation, but understand that changing one field re-renders all fields
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');

  // error handling - notice how we're not tying error messages to state!
  // every time we type something new in a (stateful) field, the component re-renders anyway.
  // -> if I make the error messages themselves stateless, I don't have to wait for the save button to be hit again before clearing them
  const [hasTriedSaving, setHasTriedSaving] = useState(false);
  const errors  = validateSession(title, selectedSteps);
  const isValid = Object.keys(errors).length === 0;
  // ^ fix: originally was errors.length === 0, which is always false.
  //        validateSession returns an object {} with a key:value for each error, so just check if there are keys present in it.

  const titleError = hasTriedSaving ? errors.title : undefined;
  const stepsError = hasTriedSaving ? errors.steps : undefined;

  function handleSave() {
    // validate data, *then* write valid data to context
    // we could have also just built our error handling in this save method
    setHasTriedSaving(true);
    if (!isValid) return;

    // console.log('session-form : handleSave -> draft:', {title, goal})
    // if I had many many values, I could also just .map() x => x.trim() and get a new object
    saveSession({ title: title.trim(), goal: goal.trim() })
    router.back(); // I want to go back (and pop this screen off the route stack) rather than push (which would break saving)
  }

  // keyboardShouldPersistTaps will pass on any taps to the UI if made outside the kb while kb is open.
  // normally, one tap outside the kb while it's open would just close it.
  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.intro}>Steps in this session: {selectedSteps.length}</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Week 3 lab prep"
          maxLength={40}
          style={[styles.input, titleError && styles.inputError]}
        />
        {titleError && <Text style={styles.errorText}>{titleError}</Text>}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Goal (optional)</Text>
        <TextInput
          value={goal}
          onChangeText={setGoal}
          placeholder="What should this session get done?"
          multiline
          style={[styles.input, styles.multiline]}
        />
      </View>

      <Pressable style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonLabel}>Save session</Text>
      </Pressable>
      {stepsError && <Text style={styles.errorText}>{stepsError}</Text>}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  screen: { flexGrow: 1, gap: 16, padding: 24, backgroundColor: '#f5efe7' },
  intro: { fontSize: 15, color: '#5d554d' },
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
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: '#b4533a' },
  errorText: { fontSize: 13, color: '#b4533a' },
  formError: { padding: 12, borderRadius: 12, fontSize: 14, color: '#7a2e1c', backgroundColor: '#fff4f1' },
  button: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#8c5d35' },
  buttonLabel: { fontSize: 14, fontWeight: '700', color: '#fffdfb' },
});