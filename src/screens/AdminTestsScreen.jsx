import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function AdminTestsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [editingTest, setEditingTest] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', isActive: true, questionCount: 0, perQuestionSeconds: 60, marksCorrect: 1 });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/tests', { token });
      setTests(res.tests || []);
    } catch (err) {
      setError(err?.message || 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const deleteTest = (id) => {
    Alert.alert('Delete Test', 'Delete this test?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiFetch(`/api/admin/tests/${id}`, { token, method: 'DELETE' });
          load();
        } catch (err) {
          Alert.alert('Error', err?.message || 'Failed to delete test');
        }
      }}
    ]);
  };

  const handleEditClick = (t) => {
    setEditingTest(t);
    setEditForm({
      title: t.title,
      isActive: t.isActive,
      questionCount: t.questionCount,
      perQuestionSeconds: t.perQuestionSeconds,
      marksCorrect: t.marksCorrect
    });
  };

  const saveEdit = async () => {
    if (!editingTest) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/tests/${editingTest.id}`, {
        token,
        method: 'PUT',
        body: editForm
      });
      setEditingTest(null);
      load();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to update test');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tests</Text>
            <TouchableOpacity style={styles.btnPrimarySmall} onPress={() => router.push('/admin/test-builder')}>
              <Text style={styles.btnPrimarySmallText}>Add Test (Builder)</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cardBody}>
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {loading ? (
              <ActivityIndicator size="large" color="#4f46e5" style={{ marginVertical: 40 }} />
            ) : tests.length === 0 ? (
              <Text style={styles.emptyText}>No tests found.</Text>
            ) : (
              <View style={styles.list}>
                {tests.map((t) => (
                  <View key={t.id} style={styles.testItem}>
                    <View style={styles.testInfo}>
                      <Text style={styles.testTitle}>{t.title}</Text>
                      <Text style={styles.testMeta}>Questions: {t.questionCount} • {t.perQuestionSeconds}s • +{t.marksCorrect}</Text>
                    </View>
                    <View style={styles.testActions}>
                      <View style={[styles.badge, t.isActive ? styles.badgeSuccess : styles.badgeInactive]}>
                        <Text style={[styles.badgeText, t.isActive ? styles.badgeSuccessText : styles.badgeInactiveText]}>
                          {t.isActive ? 'active' : 'inactive'}
                        </Text>
                      </View>
                      <View style={styles.btnRow}>
                        <TouchableOpacity style={styles.btnAction} onPress={() => handleEditClick(t)}>
                          <Text style={styles.btnActionText}>Edit Details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnActionBlue} onPress={() => router.push(`/admin/tests/${t.id}/questions`)}>
                          <Text style={styles.btnActionBlueText}>Edit Questions</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnActionRed} onPress={() => deleteTest(t.id)}>
                          <Text style={styles.btnActionRedText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <Modal visible={!!editingTest} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Test Details</Text>
              
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} value={editForm.title} onChangeText={(v) => setEditForm({...editForm, title: v})} />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <TouchableOpacity
                  style={[styles.checkbox, editForm.isActive && styles.checkboxActive]}
                  onPress={() => setEditForm({...editForm, isActive: !editForm.isActive})}
                >
                  {editForm.isActive && <Text style={styles.checkboxTick}>✓</Text>}
                </TouchableOpacity>
              </View>

              <View style={styles.grid2}>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Question Count</Text>
                  <TextInput style={styles.input} value={String(editForm.questionCount)} onChangeText={(v) => setEditForm({...editForm, questionCount: parseInt(v)||0})} keyboardType="numeric" />
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Seconds / Qstn</Text>
                  <TextInput style={styles.input} value={String(editForm.perQuestionSeconds)} onChangeText={(v) => setEditForm({...editForm, perQuestionSeconds: parseInt(v)||0})} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.label}>Marks for Correct (+)</Text>
              <TextInput style={styles.input} value={String(editForm.marksCorrect)} onChangeText={(v) => setEditForm({...editForm, marksCorrect: parseFloat(v)||0})} keyboardType="numeric" />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnGhost} onPress={() => setEditingTest(null)} disabled={saving}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={saveEdit} disabled={saving}>
                  <Text style={styles.btnPrimaryText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  btnPrimarySmall: { backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnPrimarySmallText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardBody: { padding: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  list: { gap: 12 },
  testItem: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, gap: 12 },
  testInfo: {},
  testTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  testMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  testActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  badgeSuccessText: { color: '#166534' },
  badgeInactiveText: { color: '#475569' },
  btnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  btnAction: { backgroundColor: '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  btnActionText: { color: '#334155', fontSize: 12, fontWeight: '500' },
  btnActionBlue: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  btnActionBlueText: { color: '#2563eb', fontSize: 12, fontWeight: '500' },
  btnActionRed: { backgroundColor: '#fef2f2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca' },
  btnActionRedText: { color: '#dc2626', fontSize: 12, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  checkboxTick: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  grid2: { flexDirection: 'row', gap: 12 },
  gridItem: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, justifyContent: 'flex-end' },
  btnPrimary: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  btnGhost: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f1f5f9' },
  btnGhostText: { color: '#334155', fontSize: 14, fontWeight: 'bold' },
});
