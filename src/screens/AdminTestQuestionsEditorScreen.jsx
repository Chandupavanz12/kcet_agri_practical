import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function AdminTestQuestionsEditorScreen() {
  const { testId } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  
  const [test, setTest] = useState({ id: testId, title: 'Loading...' });
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/admin/tests/${testId}/questions`, { token });
      setQuestions(res.questions || []);
      // If we don't have the test title, we could fetch it, but usually the parent passes it. We'll just display 'Test Questions' for simplicity.
      setTest({ id: testId, title: `Test ${testId}` }); 
    } catch (err) {
      setError(err?.message || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (testId) {
      loadQuestions();
    }
  }, [testId, token]);

  const updateQuestionState = (idx, updates) => {
    const next = [...questions];
    next[idx] = { ...next[idx], ...updates };
    setQuestions(next);
  };

  const uploadImageSimulate = (idx) => {
    updateQuestionState(idx, { uploading: true, uploadError: '' });
    setTimeout(() => {
      updateQuestionState(idx, { imageUrl: 'https://via.placeholder.com/300x200?text=Simulated+Upload', uploading: false });
    }, 1500);
  };

  const saveQuestion = async (idx) => {
    const q = questions[idx];
    updateQuestionState(idx, { saving: true, saveError: '', saveSuccess: false });
    try {
      await apiFetch(`/api/admin/tests/${testId}/questions/${q.id}`, {
        token,
        method: 'PUT',
        body: {
          questionText: q.questionText,
          imageUrl: q.imageUrl,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: q.correctOption,
        }
      });
      updateQuestionState(idx, { saving: false, saveSuccess: true });
      setTimeout(() => updateQuestionState(idx, { saveSuccess: false }), 3000);
    } catch (err) {
      updateQuestionState(idx, { saving: false, saveError: err?.message || 'Failed to update' });
    }
  };

  const deleteQuestion = (q) => {
    Alert.alert('Delete', 'Are you sure you want to delete this question?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiFetch(`/api/admin/tests/${testId}/questions/${q.id}`, { token, method: 'DELETE' });
          loadQuestions();
        } catch (err) {
          Alert.alert('Error', err?.message || 'Failed to delete question');
        }
      }}
    ]);
  };

  const addQuestion = async () => {
    try {
      await apiFetch(`/api/admin/tests/${testId}/questions`, {
        token,
        method: 'POST',
        body: { questionText: 'New Question' }
      });
      loadQuestions();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to add question');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={styles.btnBack} onPress={() => router.push('/admin/tests')}>
                <Text style={styles.btnBackText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.cardTitle} numberOfLines={1}>Questions</Text>
            </View>
            <TouchableOpacity style={styles.btnPrimarySmall} onPress={addQuestion}>
              <Text style={styles.btnPrimarySmallText}>+ Add Q</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardBody}>
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {questions.length === 0 ? (
              <Text style={styles.emptyText}>No questions found for this test.</Text>
            ) : (
              <View style={styles.list}>
                {questions.map((q, idx) => (
                  <View key={q.id || idx} style={styles.qItem}>
                    <View style={styles.qHeader}>
                      <Text style={styles.qTitle}>Question {idx + 1}</Text>
                      <TouchableOpacity onPress={() => deleteQuestion(q)}>
                        <Text style={styles.qDelete}>Delete</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Question Text</Text>
                    <TextInput
                      style={styles.input}
                      value={q.questionText || ''}
                      onChangeText={(v) => updateQuestionState(idx, { questionText: v })}
                      multiline
                    />

                    <Text style={styles.label}>Image (Optional)</Text>
                    <TouchableOpacity style={styles.btnUpload} onPress={() => uploadImageSimulate(idx)} disabled={q.uploading}>
                      <Text style={styles.btnUploadText}>{q.uploading ? 'Uploading...' : 'Upload Image (Simulated)'}</Text>
                    </TouchableOpacity>
                    {!!q.uploadError && <Text style={styles.errorTextSmall}>{q.uploadError}</Text>}
                    {!!q.imageUrl && <Image source={{ uri: q.imageUrl }} style={styles.qImage} resizeMode="contain" />}

                    <View style={styles.grid2}>
                      <View style={styles.gridItem}>
                        <Text style={styles.label}>Option A</Text>
                        <TextInput style={styles.input} value={q.optionA || ''} onChangeText={(v) => updateQuestionState(idx, { optionA: v })} />
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.label}>Option B</Text>
                        <TextInput style={styles.input} value={q.optionB || ''} onChangeText={(v) => updateQuestionState(idx, { optionB: v })} />
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.label}>Option C</Text>
                        <TextInput style={styles.input} value={q.optionC || ''} onChangeText={(v) => updateQuestionState(idx, { optionC: v })} />
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.label}>Option D</Text>
                        <TextInput style={styles.input} value={q.optionD || ''} onChangeText={(v) => updateQuestionState(idx, { optionD: v })} />
                      </View>
                    </View>

                    <Text style={styles.label}>Correct Option (A/B/C/D)</Text>
                    <TextInput
                      style={styles.input}
                      value={q.correctOption || 'A'}
                      onChangeText={(v) => updateQuestionState(idx, { correctOption: v.toUpperCase() })}
                      maxLength={1}
                      autoCapitalize="characters"
                    />

                    <View style={styles.qFooter}>
                      <View style={{ flex: 1 }}>
                        {!!q.saveError && <Text style={styles.errorTextSmall}>{q.saveError}</Text>}
                        {!!q.saveSuccess && <Text style={styles.successTextSmall}>Saved!</Text>}
                      </View>
                      <TouchableOpacity style={styles.btnSave} onPress={() => saveQuestion(idx)} disabled={q.saving}>
                        <Text style={styles.btnSaveText}>{q.saving ? 'Saving...' : 'Save Question'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginLeft: 8, flex: 1 },
  btnBack: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f1f5f9', borderRadius: 6 },
  btnBackText: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
  btnPrimarySmall: { backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnPrimarySmallText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardBody: { padding: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  list: { gap: 24 },
  qItem: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 16, backgroundColor: '#f8fafc' },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  qTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  qDelete: { color: '#dc2626', fontSize: 12, fontWeight: 'bold' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  btnUpload: { backgroundColor: '#e2e8f0', paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  btnUploadText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  qImage: { width: '100%', height: 150, marginTop: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { minWidth: '45%', flex: 1 },
  qFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 },
  btnSave: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnSaveText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  errorTextSmall: { color: '#dc2626', fontSize: 12 },
  successTextSmall: { color: '#16a34a', fontSize: 12, fontWeight: 'bold' },
});
