import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function AdminVideosScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', youtubeId: '', subject: 'General', status: 'active' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const isValid = useMemo(() => {
    return Boolean(form.title.trim() && form.youtubeId.trim() && form.subject.trim() && (form.status === 'active' || form.status === 'inactive'));
  }, [form]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/videos', { token });
      setItems(res.videos || []);
    } catch (e) {
      setServerError(e?.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.youtubeId.trim()) e.youtubeId = 'YouTube ID is required';
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (form.status !== 'active' && form.status !== 'inactive') e.status = 'Status must be active or inactive';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setServerError('');
    if (!validate()) return;
    setSaving(true);
    try {
      await apiFetch('/api/admin/videos', {
        token,
        method: 'POST',
        body: {
          title: form.title.trim(),
          youtubeId: form.youtubeId.trim(),
          subject: form.subject.trim(),
          status: form.status,
        },
      });
      setForm({ title: '', youtubeId: '', subject: 'General', status: 'active' });
      await load();
      Alert.alert('Success', 'Video saved');
    } catch (err) {
      setServerError(err?.message || 'Failed to save video');
      if (err?.details) setErrors(err.details);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Form Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Add Video</Text>
          </View>
          <View style={styles.cardBody}>
            {!!serverError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{serverError}</Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(t) => setForm((s) => ({ ...s, title: t }))}
              />
              {!!errors.title && <Text style={styles.errorHint}>{errors.title}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>YouTube ID</Text>
              <TextInput
                style={styles.input}
                value={form.youtubeId}
                onChangeText={(t) => setForm((s) => ({ ...s, youtubeId: t }))}
              />
              {!!errors.youtubeId && <Text style={styles.errorHint}>{errors.youtubeId}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                value={form.subject}
                onChangeText={(t) => setForm((s) => ({ ...s, subject: t }))}
              />
              {!!errors.subject && <Text style={styles.errorHint}>{errors.subject}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Status (active/inactive)</Text>
              <TextInput
                style={styles.input}
                value={form.status}
                onChangeText={(t) => setForm((s) => ({ ...s, status: t }))}
                autoCapitalize="none"
              />
              {!!errors.status && <Text style={styles.errorHint}>{errors.status}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, (!isValid || saving) && styles.opacity60]}
              onPress={submit}
              disabled={!isValid || saving}
            >
              <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Save Video'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Video List */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Videos</Text>
          </View>
          <View style={styles.cardBody}>
            {loading ? (
              <ActivityIndicator size="large" color="#2563eb" />
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>No videos found.</Text>
            ) : (
              <View style={styles.list}>
                {items.map((v) => (
                  <View key={v.id} style={styles.videoItem}>
                    <View style={styles.videoHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.videoTitle}>{v.title}</Text>
                        <Text style={styles.videoSubject}>{v.subject}</Text>
                        <Text style={styles.videoMeta}>ID: {v.youtubeId}</Text>
                      </View>
                      <View style={[styles.badge, v.status === 'active' && styles.badgeSuccess]}>
                        <Text style={[styles.badgeText, v.status === 'active' && styles.badgeSuccessText]}>{v.status}</Text>
                      </View>
                    </View>

                    <View style={styles.videoContent}>
                      <Image
                        source={{ uri: `https://i.ytimg.com/vi/${v.youtubeId}/mqdefault.jpg` }}
                        style={styles.thumbnail}
                      />
                      <View style={styles.videoInfo}>
                        <Text style={styles.linkTextLabel}>Embed link:</Text>
                        <Text style={styles.linkText}>https://www.youtube.com/watch?v={v.youtubeId}</Text>
                        <Text style={styles.fallbackText}>* iframe embedding not supported natively in this view yet.</Text>
                      </View>
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
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  cardBody: { padding: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  errorHint: { color: '#dc2626', fontSize: 12, marginTop: 4 },
  btnPrimary: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  opacity60: { opacity: 0.6 },
  list: { gap: 12 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  videoItem: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, backgroundColor: '#fff' },
  videoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  videoTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  videoSubject: { fontSize: 14, color: '#64748b', marginTop: 2 },
  videoMeta: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  badge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeSuccessText: { color: '#166534' },
  videoContent: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  thumbnail: { width: 120, height: 80, borderRadius: 8, backgroundColor: '#f1f5f9' },
  videoInfo: { flex: 1 },
  linkTextLabel: { fontSize: 12, color: '#64748b', marginBottom: 2 },
  linkText: { fontSize: 12, color: '#2563eb', textDecorationLine: 'underline' },
  fallbackText: { fontSize: 10, color: '#94a3b8', marginTop: 8, fontStyle: 'italic' }
});
