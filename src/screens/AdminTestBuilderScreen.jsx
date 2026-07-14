import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';
import * as ImagePicker from 'expo-image-picker';

function emptyQuestion() {
  return { imageUrl: '', questionText: '', options: ['', '', '', ''], correct: 0, uploading: false, error: '' };
}

export default function AdminTestBuilderScreen() {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [perQuestionSeconds, setPerQuestionSeconds] = useState('30');
  const [marksCorrect, setMarksCorrect] = useState('4');
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');

  const valid = useMemo(() => {
    if (!title.trim()) return false;
    if (!Number.isFinite(Number(perQuestionSeconds)) || Number(perQuestionSeconds) <= 0) return false;
    if (!Number.isFinite(Number(marksCorrect)) || Number(marksCorrect) <= 0) return false;
    if (!questions.length) return false;
    return questions.every((q) => {
      // Allow simulated dummy text if image upload fails, but original checks if URL is provided
      if (!q.imageUrl.trim()) return false;
      if (!Array.isArray(q.options) || q.options.length !== 4) return false;
      if (q.options.some((o) => !o.trim())) return false;
      const c = Number(q.correct);
      if (!Number.isInteger(c) || c < 0 || c > 3) return false;
      return true;
    });
  }, [title, perQuestionSeconds, marksCorrect, questions]);

  const addQuestion = () => setQuestions((qs) => [...qs, emptyQuestion()]);
  const removeQuestion = (idx) => setQuestions((qs) => (qs.length === 1 ? qs : qs.filter((_, i) => i !== idx)));

  const updateQ = (idx, patch) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const handleImageUpload = async (idx) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      const file = result.assets[0];
      updateQ(idx, { uploading: true, error: '' });

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.fileName || 'image.jpg',
        type: file.mimeType || 'image/jpeg',
      });

      const res = await apiFetch('/api/admin/upload/specimen-image', {
        token,
        method: 'POST',
        body: formData,
      });

      updateQ(idx, { imageUrl: res?.url || '', uploading: false });
    } catch (err) {
      console.error(err);
      updateQ(idx, { error: err?.message || 'Failed to upload image', uploading: false });
    }
  };

  const submit = async () => {
    setServerError('');
    setSuccess('');
    if (!valid) {
      setServerError('Please fix validation errors before submitting. Make sure all questions have an image and 4 options.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        isActive,
        perQuestionSeconds: Number(perQuestionSeconds),
        marksCorrect: Number(marksCorrect),
        questions: questions.map((q) => ({
          imageUrl: q.imageUrl.trim(),
          questionText: q.questionText.trim() || null,
          options: q.options.map((o) => o.trim()),
          correct: Number(q.correct),
        })),
      };
      const res = await apiFetch('/api/admin/tests/builder', {
        token,
        method: 'POST',
        body: payload,
      });
      setSuccess(`Test created (ID: ${res.test?.id}) with ${res.test?.questionCount} questions.`);
      setTitle('');
      setQuestions([emptyQuestion()]);
      Alert.alert('Success', 'Test created successfully!');
    } catch (err) {
      setServerError(err?.message || 'Failed to create test');
      Alert.alert('Error', err?.message || 'Failed to create test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Add Test (Builder)</Text>
          </View>
          <View style={styles.cardBody}>
            {!!serverError && <View style={styles.errorBox}><Text style={styles.errorText}>{serverError}</Text></View>}
            {!!success && <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View>}

            <Text style={styles.label}>Test Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Enter test title" />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Active</Text>
              <TouchableOpacity style={[styles.checkbox, isActive && styles.checkboxActive]} onPress={() => setIsActive(!isActive)}>
                {isActive && <Text style={styles.checkboxTick}>✓</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Seconds per Question</Text>
                <TextInput style={styles.input} value={perQuestionSeconds} onChangeText={setPerQuestionSeconds} keyboardType="numeric" />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Marks per Correct</Text>
                <TextInput style={styles.input} value={marksCorrect} onChangeText={setMarksCorrect} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.qHeader}>
              <Text style={styles.qHeaderTitle}>Questions ({questions.length})</Text>
              <TouchableOpacity style={styles.btnAdd} onPress={addQuestion}>
                <Text style={styles.btnAddText}>+ Add Question</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.qList}>
              {questions.map((q, idx) => (
                <View key={idx} style={styles.qCard}>
                  <View style={styles.qCardHeader}>
                    <Text style={styles.qCardTitle}>Question {idx + 1}</Text>
                    <TouchableOpacity onPress={() => removeQuestion(idx)}>
                      <Text style={styles.btnRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Upload Image (Required)</Text>
                  <TouchableOpacity style={styles.btnUpload} onPress={() => handleImageUpload(idx)} disabled={q.uploading}>
                    <Text style={styles.btnUploadText}>{q.uploading ? 'Uploading...' : 'Select Image'}</Text>
                  </TouchableOpacity>
                  {!!q.error && <Text style={styles.errorTextSmall}>{q.error}</Text>}
                  {!!q.imageUrl && <Image source={{ uri: q.imageUrl }} style={styles.qImage} resizeMode="contain" />}

                  <Text style={styles.label}>Question Text (Optional)</Text>
                  <TextInput style={styles.input} value={q.questionText} onChangeText={(v) => updateQ(idx, { questionText: v })} multiline />

                  <Text style={styles.label}>Options (Required)</Text>
                  <View style={styles.grid2}>
                    {q.options.map((opt, optIdx) => (
                      <View key={optIdx} style={styles.gridItem}>
                        <TextInput
                          style={styles.input}
                          placeholder={`Option ${optIdx + 1}`}
                          value={opt}
                          onChangeText={(v) => {
                            const next = [...q.options];
                            next[optIdx] = v;
                            updateQ(idx, { options: next });
                          }}
                        />
                      </View>
                    ))}
                  </View>

                  <Text style={styles.label}>Correct Option</Text>
                  {/* Simplistic correct option selector */}
                  <View style={styles.correctOptRow}>
                    {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                      <TouchableOpacity
                        key={letter}
                        style={[styles.btnCorrectOpt, q.correct === optIdx && styles.btnCorrectOptActive]}
                        onPress={() => updateQ(idx, { correct: optIdx })}
                      >
                        <Text style={[styles.btnCorrectOptText, q.correct === optIdx && styles.btnCorrectOptTextActive]}>
                          Option {letter}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btnSubmit, (!valid || saving) && styles.opacity60]}
              onPress={submit}
              disabled={!valid || saving}
            >
              <Text style={styles.btnSubmitText}>{saving ? 'Creating...' : 'Create Test'}</Text>
            </TouchableOpacity>

          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  cardBody: { padding: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  successBox: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 },
  successText: { color: '#15803d', fontSize: 14 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  checkboxTick: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  grid2: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  gridItem: { flex: 1, minWidth: '45%' },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  qHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  btnAdd: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  btnAddText: { color: '#2563eb', fontSize: 12, fontWeight: 'bold' },
  qList: { gap: 16, marginBottom: 24 },
  qCard: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, backgroundColor: '#f8fafc' },
  qCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  qCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  btnRemoveText: { color: '#dc2626', fontSize: 12, fontWeight: 'bold' },
  btnUpload: { backgroundColor: '#e2e8f0', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  btnUploadText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  errorTextSmall: { color: '#dc2626', fontSize: 12, marginTop: 4 },
  qImage: { width: '100%', height: 150, marginTop: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  correctOptRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnCorrectOpt: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', backgroundColor: '#fff' },
  btnCorrectOptActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  btnCorrectOptText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  btnCorrectOptTextActive: { color: '#fff' },
  btnSubmit: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnSubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  opacity60: { opacity: 0.6 }
});
