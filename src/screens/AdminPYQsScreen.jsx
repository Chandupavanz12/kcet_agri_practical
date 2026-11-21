import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import AdminCRUDPage from '../components/AdminCRUDPage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';
import * as DocumentPicker from 'expo-document-picker';

const EXAM_SUBJECTS = {
  puc: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
  kcet: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
  neet: ['Physics', 'Chemistry', 'Biology'], // Strictly NO Mathematics
  agri: ['General'],
};

export default function AdminPYQsScreen() {
  const { token } = useAuth();
  const [selectedExam, setSelectedExam] = useState('agri'); // 'agri' | 'puc' | 'kcet' | 'neet'
  const [selectedSubject, setSelectedSubject] = useState('General');
  const [pdfUrl, setPdfUrl] = useState('');
  const [solutionUrl, setSolutionUrl] = useState('');
  const [accessType, setAccessType] = useState('paid');
  const [uploadState, setUploadState] = useState({ type: null, progress: 0 });

  const handleUpload = async (type) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      const file = result.assets[0];
      setUploadState({ type, progress: 50 });

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      });

      const endpoint = accessType === 'paid' ? '/api/admin/upload/pyq-pdf' : '/api/admin/upload/pyq-public';
      const res = await apiFetch(endpoint, {
        token,
        method: 'POST',
        body: formData,
      });

      const url = res?.url || res?.ref || '';
      if (type === 'pdf') setPdfUrl(url);
      else setSolutionUrl(url);

      setUploadState({ type, progress: 100 });
      Alert.alert('Success', `${type === 'pdf' ? 'Question' : 'Solution'} PDF uploaded successfully.`);
    } catch (err) {
      console.error(err);
      Alert.alert('Upload Failed', err?.message || `Failed to upload ${type} PDF.`);
    } finally {
      setTimeout(() => setUploadState({ type: null, progress: 0 }), 1000);
    }
  };

  const isAgri = selectedExam === 'agri';

  const fields = isAgri
    ? [
        { name: 'centre_name', label: 'Exam Centre (Agri Only)', type: 'text', placeholder: 'Enter centre name' },
        { name: 'year', label: 'Year', type: 'text', placeholder: 'e.g. 2025' },
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'subject', label: 'Subject', type: 'text' },
        { name: 'accessType', label: 'Access (free/paid)', type: 'text', placeholder: 'free or paid' },
      ]
    : [
        { name: 'title', label: 'Title', type: 'text', placeholder: 'e.g. KCET 2024 Physics Paper' },
        { name: 'year', label: 'Year', type: 'text', placeholder: 'e.g. 2024' },
        { name: 'accessType', label: 'Access (free/paid)', type: 'text', placeholder: 'free or paid' },
      ];

  const subjectsForExam = EXAM_SUBJECTS[selectedExam] || ['General'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Upload Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Upload Previous Year Papers</Text>
          </View>
          <View style={styles.cardBody}>
            
            {/* Target Exam */}
            <Text style={styles.label}>1. Target Exam</Text>
            <View style={styles.examRow}>
              {['agri', 'puc', 'kcet', 'neet'].map((ex) => (
                <TouchableOpacity
                  key={ex}
                  style={[styles.examBtn, selectedExam === ex && styles.examBtnActive]}
                  onPress={() => {
                    setSelectedExam(ex);
                    setSelectedSubject(EXAM_SUBJECTS[ex]?.[0] || 'General');
                  }}
                >
                  <Text style={[styles.examBtnText, selectedExam === ex && styles.examBtnTextActive]}>
                    {ex === 'agri' ? 'Agri Practical' : ex.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subject Selector (For PUC, KCET, NEET) */}
            {!isAgri && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>2. Subject (No Centre Selection needed)</Text>
                <View style={styles.subRow}>
                  {subjectsForExam.map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={[styles.subBtn, selectedSubject === sub && styles.subBtnActive]}
                      onPress={() => setSelectedSubject(sub)}
                    >
                      <Text style={[styles.subBtnText, selectedSubject === sub && styles.subBtnTextActive]}>
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.formGroup, { marginTop: 12 }]}>
              <Text style={styles.label}>3. Access Type</Text>
              <View style={styles.accessBtns}>
                <TouchableOpacity
                  style={[styles.accessBtn, accessType === 'free' && styles.accessBtnActive]}
                  onPress={() => { setAccessType('free'); setPdfUrl(''); setSolutionUrl(''); }}
                >
                  <Text style={[styles.accessBtnText, accessType === 'free' && styles.accessBtnTextActive]}>Free (Public)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.accessBtn, accessType === 'paid' && styles.accessBtnActive]}
                  onPress={() => { setAccessType('paid'); setPdfUrl(''); setSolutionUrl(''); }}
                >
                  <Text style={[styles.accessBtnText, accessType === 'paid' && styles.accessBtnTextActive]}>Paid (Private)</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Question PDF File</Text>
              <TouchableOpacity
                style={[styles.btnUpload, uploadState.type === 'pdf' && styles.opacity60]}
                onPress={() => handleUpload('pdf')}
                disabled={uploadState.type === 'pdf'}
              >
                <Text style={styles.btnUploadText}>{uploadState.type === 'pdf' ? 'Uploading...' : 'Select Question PDF'}</Text>
              </TouchableOpacity>
            </View>

            {!!pdfUrl && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Uploaded PDF Reference:</Text>
                <TextInput style={styles.input} value={pdfUrl} editable={false} />
              </View>
            )}
          </View>
        </View>

        <AdminCRUDPage
          key={selectedExam}
          title={`PYQs (${selectedExam.toUpperCase()})`}
          apiEndpoint="pyqs"
          endpointPath={isAgri ? 'pyqs' : `exam/pyqs?exam=${selectedExam}`}
          deleteEndpointPath={isAgri ? 'pyqs' : `exam/pyqs`}
          fields={fields}
          initialForm={{
            centre_name: isAgri ? 'General' : '',
            year: '2025',
            title: '',
            subject: selectedSubject || 'General',
            accessType: accessType || 'paid',
            status: 'active',
          }}
          customCreateHandler={async (data) => {
            if (!isAgri) {
              // Store into PostgreSQL DB 1 (PUC) or DB 2 (KCET/NEET) without centre selection
              return await apiFetch('/api/admin/exam/pyqs', {
                token,
                method: 'POST',
                body: {
                  exam: selectedExam,
                  subject: selectedSubject.toLowerCase(),
                  year: Number(data.year || 2025),
                  title: data.title || `${selectedExam.toUpperCase()} ${selectedSubject} ${data.year || 2025}`,
                  pdf_url: pdfUrl || data.pdf_url,
                  is_free: (data.accessType || accessType) === 'free',
                },
              });
            } else {
              // Agri Practical: MongoDB Atlas with centre selection
              const payload = {
                centre_name: data.centre_name,
                year: Number(data.year),
                title: data.title,
                subject: data.subject || selectedSubject,
                pdf_url: pdfUrl || data.pdf_url,
                solution_url: solutionUrl || data.solution_url || null,
                access_type: data.accessType || accessType || 'paid',
                status: data.status || 'active',
              };
              return await apiFetch('/api/admin/pyqs', { token, method: 'POST', body: payload });
            }
          }}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  cardBody: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

  examRow: { flexDirection: 'row', gap: 8 },
  examBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  examBtnActive: { backgroundColor: '#059669', borderColor: '#059669' },
  examBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  examBtnTextActive: { color: '#ffffff' },

  subRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  subBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  subBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  subBtnTextActive: { color: '#ffffff' },

  formGroup: { marginBottom: 12 },
  accessBtns: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  accessBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  accessBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  accessBtnText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  accessBtnTextActive: { color: '#2563eb', fontWeight: 'bold' },
  btnUpload: { backgroundColor: '#e2e8f0', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#94a3b8' },
  btnUploadText: { color: '#475569', fontWeight: '600' },
  opacity60: { opacity: 0.6 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
});
