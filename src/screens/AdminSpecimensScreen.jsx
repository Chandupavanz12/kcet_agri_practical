import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function AdminSpecimensScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correct, setCorrect] = useState('0');
  const [status, setStatus] = useState('active');
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const isValid = useMemo(() => {
    return Boolean(
      imageUrl.trim() &&
      options.length === 4 &&
      options.every((o) => o.trim().length > 0) &&
      Number.isInteger(Number(correct)) &&
      Number(correct) >= 0 &&
      Number(correct) <= 3 &&
      (status === 'active' || status === 'inactive')
    );
  }, [imageUrl, options, correct, status]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/specimens', { token });
      setItems(res.specimens || []);
    } catch (e) {
      setServerError(e?.message || 'Failed to load specimens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleImageUploadSimulate = () => {
    setServerError('');
    setImageUrl('https://via.placeholder.com/300x200?text=Simulated+Upload');
  };

  const submit = async () => {
    setServerError('');
    if (!isValid) {
      setServerError('Please fix validation errors. Image, 4 options, and correct option are required.');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/api/admin/specimens', {
        token,
        method: 'POST',
        body: {
          imageUrl: imageUrl.trim(),
          questionText: questionText.trim() || null,
          options: options.map((o) => o.trim()),
          correct: Number(correct),
          status,
        },
      });
      setImageUrl('');
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrect('0');
      setStatus('active');
      load();
      Alert.alert('Success', 'Specimen saved successfully.');
    } catch (err) {
      setServerError(err?.message || 'Failed to save specimen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Add Specimen</Text>
          </View>
          <View style={styles.cardBody}>
            {!!serverError && <View style={styles.errorBox}><Text style={styles.errorText}>{serverError}</Text></View>}

            <Text style={styles.label}>Upload Image</Text>
            <TouchableOpacity style={styles.btnUpload} onPress={handleImageUploadSimulate}>
              <Text style={styles.btnUploadText}>Simulate Image Upload</Text>
            </TouchableOpacity>
            {!!imageUrl && <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="contain" />}

            <Text style={styles.label}>Question Text (Optional)</Text>
            <TextInput style={styles.input} value={questionText} onChangeText={setQuestionText} />

            <Text style={styles.label}>Options</Text>
            <View style={styles.grid2}>
              {options.map((opt, idx) => (
                <View key={idx} style={styles.gridItem}>
                  <TextInput
                    style={styles.input}
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChangeText={(val) => {
                      const next = [...options];
                      next[idx] = val;
                      setOptions(next);
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Correct Option (0-3)</Text>
                <TextInput style={styles.input} value={String(correct)} onChangeText={setCorrect} keyboardType="numeric" />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Status (active/inactive)</Text>
                <TextInput style={styles.input} value={status} onChangeText={setStatus} autoCapitalize="none" />
              </View>
            </View>

            <TouchableOpacity style={[styles.btnSubmit, (!isValid || saving) && styles.opacity60]} onPress={submit} disabled={!isValid || saving}>
              <Text style={styles.btnSubmitText}>{saving ? 'Saving...' : 'Save Specimen'}</Text>
            </TouchableOpacity>

          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Specimens</Text>
          </View>
          <View style={styles.cardBody}>
            {loading ? (
              <ActivityIndicator size="large" color="#4f46e5" />
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>No specimens found.</Text>
            ) : (
              <View style={styles.list}>
                {items.map((s) => (
                  <View key={s.id} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Image source={{ uri: s.imageUrl }} style={styles.itemThumb} />
                      <View>
                        <Text style={styles.itemName}>Specimen #{s.id}</Text>
                        <Text style={styles.itemMeta}>Correct: {s.correct}</Text>
                      </View>
                    </View>
                    <View style={[styles.badge, s.status === 'active' && styles.badgeSuccess]}>
                      <Text style={[styles.badgeText, s.status === 'active' && styles.badgeSuccessText]}>{s.status}</Text>
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
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  cardBody: { padding: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  btnUpload: { backgroundColor: '#e2e8f0', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  btnUploadText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  previewImage: { width: '100%', height: 150, marginTop: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flex: 1, minWidth: '45%' },
  btnSubmit: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  btnSubmitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  opacity60: { opacity: 0.6 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, paddingVertical: 20 },
  list: { gap: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12 },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemThumb: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  itemMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f1f5f9' },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' },
  badgeSuccessText: { color: '#166534' }
});
