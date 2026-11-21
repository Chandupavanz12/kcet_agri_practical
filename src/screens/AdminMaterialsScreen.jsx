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
  neet: ['Physics', 'Chemistry', 'Biology'], // Strictly NO Mathematics!
  agri: ['General'],
};

export default function AdminMaterialsScreen() {
  const { token } = useAuth();
  const [selectedExam, setSelectedExam] = useState('agri'); // 'agri' | 'puc' | 'kcet' | 'neet'
  const [selectedSubject, setSelectedSubject] = useState('General');
  const [pdfUrl, setPdfUrl] = useState('');
  const [accessType, setAccessType] = useState('free');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;
      
      const file = result.assets[0];
      setIsUploading(true);
      setUploadProgress(50);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      });

      const endpoint = accessType === 'paid' ? '/api/admin/upload/material-private' : '/api/admin/upload/material-pdf';
      const res = await apiFetch(endpoint, {
        token,
        method: 'POST',
        body: formData,
      });

      setPdfUrl(res?.url || res?.ref || '');
      setUploadProgress(100);
      Alert.alert('Success', 'PDF uploaded successfully.');
    } catch (err) {
      console.error(err);
      Alert.alert('Upload Failed', err?.message || 'Failed to upload PDF.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const fields = [
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'subject', label: 'Subject', type: 'text' },
    { name: 'type', label: 'Type', type: 'text', placeholder: 'pdf / notes' },
    { name: 'accessType', label: 'Access', type: 'text', placeholder: 'free / paid' },
  ];

  const subjectsForExam = EXAM_SUBJECTS[selectedExam] || ['General'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Upload Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Upload Study Material</Text>
          </View>
          <View style={styles.cardBody}>
            
            {/* Target Exam Selector */}
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

            {/* Subject Selector for PUC, KCET, NEET */}
            {selectedExam !== 'agri' && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>2. Subject</Text>
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

            <Text style={[styles.label, { marginTop: 12 }]}>3. Access Type</Text>
            <View style={styles.accessBtns}>
              <TouchableOpacity
                style={[styles.accessBtn, accessType === 'free' && styles.accessBtnActive]}
                onPress={() => { setAccessType('free'); setPdfUrl(''); }}
              >
                <Text style={[styles.accessBtnText, accessType === 'free' && styles.accessBtnTextActive]}>Free (Public)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.accessBtn, accessType === 'paid' && styles.accessBtnActive]}
                onPress={() => { setAccessType('paid'); setPdfUrl(''); }}
              >
                <Text style={[styles.accessBtnText, accessType === 'paid' && styles.accessBtnTextActive]}>Paid (Private)</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.btnUpload} onPress={handleUpload} disabled={isUploading}>
              <Text style={styles.btnUploadText}>{isUploading ? 'Uploading...' : 'Select PDF File to Upload'}</Text>
            </TouchableOpacity>

            {isUploading && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>Uploading: {uploadProgress}%</Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
                </View>
              </View>
            )}

            {!!pdfUrl && (
              <View style={styles.resultBox}>
                <Text style={styles.label}>Uploaded File Reference:</Text>
                <TextInput style={styles.input} value={pdfUrl} editable={false} />
              </View>
            )}
          </View>
        </View>

        <AdminCRUDPage
          key={selectedExam}
          title={`Materials (${selectedExam.toUpperCase()})`}
          apiEndpoint="materials"
          endpointPath={selectedExam === 'agri' ? 'materials' : `exam/materials?exam=${selectedExam}`}
          deleteEndpointPath={selectedExam === 'agri' ? 'materials' : `exam/materials`}
          fields={fields}
          initialForm={{
            title: '',
            pdf_url: pdfUrl || '',
            subject: selectedSubject || 'General',
            type: 'pdf',
            accessType: accessType || 'free'
          }}
          onFormChange={(next) => {
            if (next?.accessType && next.accessType !== accessType) {
              setAccessType(next.accessType);
            }
          }}
          listTransform={(m) => ({
            ...m,
            accessType: m.accessType || m.access_type || 'free',
          })}
          customCreateHandler={async (data) => {
            if (selectedExam !== 'agri') {
              // Store in PostgreSQL DB 1 (PUC) or DB 2 (KCET/NEET)
              return await apiFetch('/api/admin/exam/materials', {
                token,
                method: 'POST',
                body: {
                  exam: selectedExam,
                  subject: selectedSubject.toLowerCase(),
                  title: data.title,
                  pdf_url: pdfUrl || data.pdf_url,
                  type: data.type || 'pdf',
                  is_free: (data.accessType || accessType) === 'free',
                },
              });
            } else {
              // Store in MongoDB Atlas (Agri Practical)
              const payload = {
                title: data.title,
                pdf_url: pdfUrl || data.pdf_url,
                subject: data.subject || selectedSubject,
                type: data.type || 'pdf',
                access_type: data.accessType || accessType || 'free'
              };
              return await apiFetch('/api/admin/materials', { token, method: 'POST', body: payload });
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

  accessBtns: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  accessBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  accessBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  accessBtnText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  accessBtnTextActive: { color: '#2563eb', fontWeight: 'bold' },
  btnUpload: { backgroundColor: '#e2e8f0', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#94a3b8' },
  btnUploadText: { color: '#475569', fontWeight: '600' },
  progressContainer: { marginTop: 12 },
  progressText: { fontSize: 12, color: '#2563eb', fontWeight: 'bold', marginBottom: 4 },
  progressBarBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2563eb' },
  resultBox: { marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
});
