import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function emptyQuestion() {
  return { imageUrl: '', questionText: '', options: ['', '', '', ''], correct: 0, uploading: false, error: '' };
}

const EXAM_SUBJECTS = {
  puc: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
  kcet: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
  neet: ['Physics', 'Chemistry', 'Biology'], // Strictly NO Mathematics
  agri: ['Agri Practical'],
};

export default function AdminTestBuilderScreen() {
  const { token } = useAuth();
  const [exam, setExam] = useState('puc'); // 'puc' | 'kcet' | 'neet' | 'agri'
  const [subject, setSubject] = useState('Physics');
  const [accessType, setAccessType] = useState('free'); // 'free' | 'paid'
  const [title, setTitle] = useState('');
  const [perQuestionSeconds, setPerQuestionSeconds] = useState('30');
  const [marksCorrect, setMarksCorrect] = useState('4');
  const [isActive, setIsActive] = useState(true);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');

  const isAgri = exam === 'agri';

  const valid = useMemo(() => {
    if (!title.trim()) return false;
    if (!Number.isFinite(Number(perQuestionSeconds)) || Number(perQuestionSeconds) <= 0) return false;
    if (!Number.isFinite(Number(marksCorrect)) || Number(marksCorrect) <= 0) return false;
    if (!questions.length) return false;

    return questions.every((q) => {
      // For Agri: specimen image is required. For PUC/KCET/NEET: no image, text is required
      if (isAgri && !q.imageUrl.trim()) return false;
      if (!isAgri && !q.questionText.trim()) return false;
      if (!Array.isArray(q.options) || q.options.length !== 4) return false;
      if (q.options.some((o) => !o.trim())) return false;
      const c = Number(q.correct);
      if (!Number.isInteger(c) || c < 0 || c > 3) return false;
      return true;
    });
  }, [title, perQuestionSeconds, marksCorrect, questions, isAgri]);

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
      setServerError(
        isAgri
          ? 'Please ensure all questions have a specimen image and 4 non-empty options.'
          : 'Please ensure test title, question text, and 4 non-empty options are provided for all questions.'
      );
      return;
    }
    setSaving(true);
    try {
      if (isAgri) {
        // Agri Practical Test (MongoDB Atlas)
        const payload = {
          title: title.trim(),
          isActive,
          is_free: accessType === 'free',
          isFree: accessType === 'free',
          perQuestionSeconds: Number(perQuestionSeconds),
          marksCorrect: Number(marksCorrect),
          questions: questions.map((q) => ({
            imageUrl: q.imageUrl.trim(),
            questionText: q.questionText.trim() || null,
            options: q.options.map((o) => o.trim()),
            correct: Number(q.correct),
          })),
        };
        await apiFetch('/api/admin/tests/builder', {
          token,
          method: 'POST',
          body: payload,
        });
      } else {
        // PUC / KCET / NEET Mock Test (PostgreSQL Neon DB 1 or DB 2)
        const optionKeys = ['a', 'b', 'c', 'd'];
        const payload = {
          exam,
          subject: subject.toLowerCase(),
          title: title.trim(),
          is_free: accessType === 'free',
          instructions: `Timed mock test for ${exam.toUpperCase()} ${subject}`,
          duration_minutes: Math.round((questions.length * Number(perQuestionSeconds)) / 60) || 30,
          total_marks: questions.length * Number(marksCorrect),
          passing_marks: Math.round(questions.length * Number(marksCorrect) * 0.35),
          per_question_seconds: Number(perQuestionSeconds),
          marks_correct: Number(marksCorrect),
          questions: questions.map((q) => ({
            question_text: q.questionText.trim(),
            option_a: q.options[0].trim(),
            option_b: q.options[1].trim(),
            option_c: q.options[2].trim(),
            option_d: q.options[3].trim(),
            correct_option: optionKeys[q.correct] || 'a',
          })),
        };
        await apiFetch('/api/admin/exam/tests', {
          token,
          method: 'POST',
          body: payload,
        });
      }

      setSuccess(`Mock Test for ${exam.toUpperCase()} created successfully!`);
      setTitle('');
      setQuestions([emptyQuestion()]);
    } catch (err) {
      setServerError(err?.message || 'Failed to create test');
    } finally {
      setSaving(false);
    }
  };

  const subjectOptions = EXAM_SUBJECTS[exam] || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.heading}>Mock Test Builder</Text>
          <Text style={styles.subheading}>
            Select target exam, craft timed questions and publish to student dashboard.
          </Text>
        </View>

        {!!serverError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{serverError}</Text>
          </View>
        )}
        {!!success && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        )}

        {/* 1. Exam Target Selector */}
        <View style={styles.card}>
          <Text style={styles.label}>1. Select Target Exam</Text>
          <View style={styles.examSelectorRow}>
            {['puc', 'kcet', 'neet', 'agri'].map((ex) => (
              <TouchableOpacity
                key={ex}
                style={[styles.examBtn, exam === ex && styles.examBtnActive]}
                onPress={() => {
                  setExam(ex);
                  const firstSub = EXAM_SUBJECTS[ex]?.[0] || '';
                  setSubject(firstSub);
                }}
              >
                <Text style={[styles.examBtnText, exam === ex && styles.examBtnTextActive]}>
                  {ex === 'agri' ? 'Agri Practical' : ex.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Subject Selector (For PUC, KCET, NEET) */}
          {!isAgri && subjectOptions.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>2. Select Subject</Text>
              <View style={styles.subjectSelectorRow}>
                {subjectOptions.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.subjectBtn, subject === sub && styles.subjectBtnActive]}
                    onPress={() => setSubject(sub)}
                  >
                    <Text style={[styles.subjectBtnText, subject === sub && styles.subjectBtnTextActive]}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Access Type (Free vs Paid) */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>{isAgri ? '2. Access Type' : '3. Access Type'}</Text>
            <View style={styles.accessRow}>
              <TouchableOpacity
                style={[styles.accessBtn, accessType === 'free' && styles.accessBtnActive]}
                onPress={() => setAccessType('free')}
              >
                <Text style={[styles.accessBtnText, accessType === 'free' && styles.accessBtnTextActive]}>
                  Free (Public)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accessBtn, accessType === 'paid' && styles.accessBtnActive]}
                onPress={() => setAccessType('paid')}
              >
                <Text style={[styles.accessBtnText, accessType === 'paid' && styles.accessBtnTextActive]}>
                  Paid (Locked)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2. Test Configuration */}
        <View style={styles.card}>
          <Text style={styles.label}>{isAgri ? '3. Test Title & Settings' : '4. Test Title & Settings'}</Text>
          <TextInput
            style={styles.input}
            placeholder={isAgri ? 'e.g. Agri Specimen Test 1' : `e.g. ${exam.toUpperCase()} ${subject} Mock Test 1`}
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Seconds / Q</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={perQuestionSeconds}
                onChangeText={setPerQuestionSeconds}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Marks / Correct</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={marksCorrect}
                onChangeText={setMarksCorrect}
              />
            </View>
          </View>
        </View>

        {/* 3. Questions List */}
        {questions.map((q, idx) => (
          <View key={idx} style={styles.qCard}>
            <View style={styles.qHeader}>
              <Text style={styles.qTitle}>Question {idx + 1}</Text>
              {questions.length > 1 && (
                <TouchableOpacity onPress={() => removeQuestion(idx)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Specimen Image ONLY FOR Agri Practical */}
            {isAgri ? (
              <View style={styles.imageSection}>
                <Text style={styles.label}>Specimen Image (Required for Agri Practical)</Text>
                {q.imageUrl ? (
                  <Image source={{ uri: q.imageUrl }} style={styles.previewImage} />
                ) : null}
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => handleImageUpload(idx)}
                  disabled={q.uploading}
                >
                  <Text style={styles.btnSecondaryText}>
                    {q.uploading ? 'Uploading...' : q.imageUrl ? 'Change Image' : 'Upload Specimen Image'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Question Text */}
            <Text style={styles.label}>Question Text</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              placeholder={isAgri ? 'Optional question notes' : 'Enter question description or problem statement'}
              multiline
              value={q.questionText}
              onChangeText={(t) => updateQ(idx, { questionText: t })}
            />

            {/* 4 Options */}
            <Text style={[styles.label, { marginTop: 8 }]}>Options (Tap option label to mark correct answer)</Text>
            {q.options.map((opt, oIdx) => {
              const isCorrect = q.correct === oIdx;
              const optionLetter = ['A', 'B', 'C', 'D'][oIdx];
              return (
                <View key={oIdx} style={styles.optionRow}>
                  <TouchableOpacity
                    style={[styles.correctBadge, isCorrect && styles.correctBadgeActive]}
                    onPress={() => updateQ(idx, { correct: oIdx })}
                  >
                    <Text style={[styles.correctBadgeText, isCorrect && styles.correctBadgeTextActive]}>
                      {optionLetter} {isCorrect ? '✓' : ''}
                    </Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, styles.optionInput]}
                    placeholder={`Option ${optionLetter}`}
                    value={opt}
                    onChangeText={(t) => {
                      const next = [...q.options];
                      next[oIdx] = t;
                      updateQ(idx, { options: next });
                    }}
                  />
                </View>
              );
            })}
          </View>
        ))}

        {/* Add Question Button */}
        <TouchableOpacity style={styles.btnAddQ} onPress={addQuestion}>
          <Text style={styles.btnAddQText}>+ Add Another Question</Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.btnSubmit, (!valid || saving) && styles.btnDisabled]}
          onPress={submit}
          disabled={!valid || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnSubmitText}>Publish {exam.toUpperCase()} Test ({questions.length} Qs)</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 14, paddingBottom: 50 },
  header: { gap: 4 },
  heading: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  subheading: { fontSize: 13, color: '#64748b' },

  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 10 },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  successBox: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, padding: 12, borderRadius: 10 },
  successText: { color: '#166534', fontSize: 13, fontWeight: '600' },

  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },

  examSelectorRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  examBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  examBtnActive: { backgroundColor: '#059669', borderColor: '#059669' },
  examBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  examBtnTextActive: { color: '#ffffff' },

  accessRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  accessBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  accessBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  accessBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  accessBtnTextActive: { color: '#ffffff' },

  subjectSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  subjectBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  subjectBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  subjectBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  subjectBtnTextActive: { color: '#ffffff' },

  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 4 },

  qCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  removeText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },

  imageSection: { gap: 6, marginVertical: 4 },
  previewImage: { width: '100%', height: 160, borderRadius: 10, resizeMode: 'cover' },
  btnSecondary: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnSecondaryText: { color: '#0f172a', fontWeight: '700', fontSize: 13 },

  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  correctBadge: { width: 44, height: 40, borderRadius: 8, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  correctBadgeActive: { backgroundColor: '#059669', borderColor: '#059669' },
  correctBadgeText: { fontSize: 13, fontWeight: '800', color: '#475569' },
  correctBadgeTextActive: { color: '#ffffff' },
  optionInput: { flex: 1 },

  btnAddQ: { backgroundColor: '#f8fafc', borderWidth: 2, borderStyle: 'dashed', borderColor: '#cbd5e1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnAddQText: { color: '#059669', fontWeight: '800', fontSize: 14 },

  btnSubmit: { backgroundColor: '#059669', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnSubmitText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
});
