import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import AdminCRUDPage from '../components/AdminCRUDPage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';
import * as DocumentPicker from 'expo-document-picker';

export default function AdminPYQsScreen() {
  const { token } = useAuth();
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
      setUploadState({ type, progress: 50 }); // Visual indicator

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

  const fields = [
    { name: 'centre_name', label: 'Exam Centre', type: 'text', placeholder: 'Enter exam centre name' },
    { name: 'year', label: 'Year', type: 'text', placeholder: 'Enter year (e.g. 2025)' },
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'subject', label: 'Subject', type: 'text' },
    { name: 'accessType', label: 'Access (free/paid)', type: 'text', placeholder: 'free or paid' },
    { name: 'status', label: 'Status (active/inactive)', type: 'text', placeholder: 'active or inactive' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Upload Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Upload PDFs</Text>
          </View>
          <View style={styles.cardBody}>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Upload as</Text>
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
              <Text style={styles.label}>Question PDF</Text>
              <TouchableOpacity
                style={[styles.btnUpload, uploadState.type === 'pdf' && styles.opacity60]}
                onPress={() => handleUpload('pdf')}
                disabled={uploadState.type === 'pdf'}
              >
                <Text style={styles.btnUploadText}>{uploadState.type === 'pdf' ? `Uploading... ${uploadState.progress}%` : 'Select Question PDF'}</Text>
              </TouchableOpacity>
              {!!pdfUrl && (
                <TextInput style={styles.inputResult} value={pdfUrl} editable={false} />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Solution PDF (optional)</Text>
              <TouchableOpacity
                style={[styles.btnUpload, uploadState.type === 'solution' && styles.opacity60]}
                onPress={() => handleUpload('solution')}
                disabled={uploadState.type === 'solution'}
              >
                <Text style={styles.btnUploadText}>{uploadState.type === 'solution' ? `Uploading... ${uploadState.progress}%` : 'Select Solution PDF'}</Text>
              </TouchableOpacity>
              {!!solutionUrl && (
                <TextInput style={styles.inputResult} value={solutionUrl} editable={false} />
              )}
            </View>

          </View>
        </View>

        <AdminCRUDPage
          title="Manage PYQs"
          apiEndpoint="pyqs"
          fields={fields}
          initialForm={{ centre_name: '', year: '', title: '', pdf_url: pdfUrl || '', solution_url: solutionUrl || '', subject: 'General', status: 'active', accessType: accessType || 'paid' }}
          onFormChange={(next) => {
            if (next && typeof next === 'object' && typeof next.accessType === 'string') {
              setAccessType(next.accessType);
            }
            return next;
          }}
          onEdit={(item) => {
            setPdfUrl(item?.pdf_url || '');
            setSolutionUrl(item?.solution_url || '');
            setAccessType(item?.access_type || item?.accessType || 'paid');
          }}
          onAfterSubmit={() => {
            setPdfUrl('');
            setSolutionUrl('');
          }}
          onCancelEdit={() => {
            setPdfUrl('');
            setSolutionUrl('');
          }}
          listTransform={(p) => ({
            ...p,
            accessType: p.accessType || p.access_type || 'paid',
          })}
          formTransform={(data) => ({
            ...data,
            pdf_url: pdfUrl || data.pdf_url || '',
            solution_url: solutionUrl || data.solution_url || '',
            centre_name: data.centre_name || '',
            year: data.year || '',
            access_type: data.accessType || accessType || 'paid',
          })}
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
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 8 },
  accessBtns: { flexDirection: 'row', gap: 12 },
  accessBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  accessBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  accessBtnText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  accessBtnTextActive: { color: '#2563eb', fontWeight: 'bold' },
  btnUpload: { backgroundColor: '#f8fafc', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  btnUploadText: { color: '#475569', fontWeight: '600' },
  opacity60: { opacity: 0.6 },
  inputResult: { marginTop: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#f1f5f9' },
});
