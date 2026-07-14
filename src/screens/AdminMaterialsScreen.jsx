import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import AdminCRUDPage from '../components/AdminCRUDPage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';
import * as DocumentPicker from 'expo-document-picker';
import { API_BASE_URL as apiBaseUrl } from '../config/env';

export default function AdminMaterialsScreen() {
  const { token } = useAuth();
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
      setUploadProgress(50); // Just a visual indicator

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
        // Don't set Content-Type header, let fetch set it with boundary
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
    { name: 'type', label: 'Type', type: 'text', placeholder: 'pdf / pyq' },
    { name: 'accessType', label: 'Access', type: 'text', placeholder: 'free / paid' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Upload Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Upload PDF</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.label}>Upload as</Text>
            
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
              <Text style={styles.btnUploadText}>{isUploading ? 'Uploading...' : 'Select File to Upload'}</Text>
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
                <Text style={styles.label}>File Reference (copied to form)</Text>
                <TextInput style={styles.input} value={pdfUrl} editable={false} />
              </View>
            )}
          </View>
        </View>

        <AdminCRUDPage
          title="Manage Materials"
          apiEndpoint="materials"
          fields={fields}
          initialForm={{ title: '', pdf_url: pdfUrl || '', subject: 'General', type: 'pdf', accessType: accessType || 'free' }}
          onFormChange={(next) => {
            if (next && typeof next === 'object' && typeof next.accessType === 'string') {
              setAccessType(next.accessType);
            }
            return next;
          }}
          listTransform={(m) => ({
            ...m,
            accessType: m.accessType || m.access_type || 'free',
          })}
          customCreateHandler={async (data) => {
            const payload = {
              title: data.title,
              pdf_url: pdfUrl || data.pdf_url,
              subject: data.subject,
              type: data.type,
              access_type: data.accessType || accessType || 'free'
            };
            return await apiFetch('/api/admin/materials', { token, method: 'POST', body: payload });
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
  label: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 8 },
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
