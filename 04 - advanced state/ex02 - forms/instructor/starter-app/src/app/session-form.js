import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useStudyPlan } from '../context/StudyPlanContext';


export default function SessionFormScreen() {
  
  // shared state for study session & its steps
  const { selectedSteps } = useStudyPlan();

  // local state for form fields data; feel free to use an object with properties for each field instead
  // -> if you do one piece of state
  //      i.e. [formData, setFormData] = useState({title: '', goal: ''}) 
  //    this can be more efficient in terms of code implementation, but understand that changing one field re-renders all fields
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');

  function handleSave() {
    // validate data, *then* write valid data to context
    console.log('session-form : handleSave -> draft:', {title, goal})
  }


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
          style={styles.input}
        />
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