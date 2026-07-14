import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function AdminStudentsScreen() {
  const { token } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const plans = [
    { code: 'combo', label: '🌟 Combo Plan (All Access)' },
    { code: 'pyq', label: '📄 PYQ Plan' },
    { code: 'materials', label: '📚 Materials Plan' }
  ];

  const [modal, setModal] = useState(null);
  const [activeStudent, setActiveStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [selectedPlanCode, setSelectedPlanCode] = useState('combo');
  const [busy, setBusy] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/students', { token });
      setStudents(res?.students || []);
    } catch (err) {
      setMessage(err?.message || 'Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, [token]);

  const closeModal = () => { setModal(null); setActiveStudent(null); };

  const openInfoModal = (s) => {
    setActiveStudent(s);
    setEditForm({ name: s.name, email: s.email, password: '' });
    setModal('info');
  };

  const openPlanModal = (s) => {
    setActiveStudent(s);
    setSelectedPlanCode('combo');
    setModal('plan');
  };

  const handleUpdateStudent = async () => {
    if (!activeStudent) return;
    try {
      setBusy(true);
      await apiFetch(`/api/admin/students/${activeStudent.id}`, {
        token, method: 'PUT', body: editForm
      });
      setMessage(`Student "${activeStudent.name}" updated.`);
      closeModal();
      fetchStudents();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubscription = async (action) => {
    if (!activeStudent) return;
    try {
      setBusy(true);
      await apiFetch(`/api/admin/students/${activeStudent.id}/subscribe`, {
        token, method: 'POST', body: { planCode: selectedPlanCode, action }
      });
      setMessage(`${action === 'subscribe' ? '✅ Unlocked' : '❌ Revoked'} "${selectedPlanCode}" for ${activeStudent.name}.`);
      closeModal();
      fetchStudents();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to process subscription.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteStudent = async (id, name) => {
    Alert.alert('Delete', `PERMANENTLY delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          setBusy(true);
          await apiFetch(`/api/admin/students/${id}`, { token, method: 'DELETE' });
          setMessage(`Student "${name}" deleted.`);
          closeModal();
          fetchStudents();
        } catch (err) {
          Alert.alert('Error', err.message || 'Failed to delete.');
        } finally {
          setBusy(false);
        }
      }}
    ]);
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { flex: 1 }]}>
        
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>👥 Student Management</Text>
          <Text style={styles.headerSubtitle}>Student Info — edit details & reset password. Manage Plan — allocate premium access.</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search by name or email..."
            placeholderTextColor="#cbd5e1"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        {!!message && (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
            <TouchableOpacity onPress={() => setMessage('')}><Text style={styles.messageClose}>✕</Text></TouchableOpacity>
          </View>
        )}

        {/* Student List */}
        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>All Registered Students</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{filteredStudents.length}</Text></View>
          </View>
          <View style={[styles.cardBody, { flex: 1, paddingBottom: 0 }]}>
            {loading ? (
              <ActivityIndicator size="large" color="#4f46e5" style={{ marginVertical: 40 }} />
            ) : filteredStudents.length === 0 ? (
              <Text style={styles.emptyText}>No students found.</Text>
            ) : (
              <FlatList
                data={filteredStudents}
                keyExtractor={s => s.id.toString()}
                contentContainerStyle={styles.list}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                renderItem={({ item: s }) => {
                  const isPremium = s.premiumStatus && s.premiumStatus !== 'Free';
                  return (
                    <View style={styles.studentItem}>
                      <View style={styles.studentInfoBox}>
                        <Text style={styles.studentName}>{s.name}</Text>
                        <Text style={styles.studentEmail}>{s.email}</Text>
                        <Text style={styles.studentMeta}>ID #{s.id} • {new Date(s.createdAt).toLocaleDateString()}</Text>
                      </View>
                      
                      <View style={styles.studentStatusBox}>
                        <View style={[styles.statusBadge, isPremium ? styles.statusPremium : styles.statusFree]}>
                          <Text style={[styles.statusBadgeText, isPremium ? styles.statusPremiumText : styles.statusFreeText]}>
                            {isPremium ? `⭐ ${s.premiumStatus}` : '🆓 Free'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.studentActions}>
                        <TouchableOpacity style={styles.btnActionBlue} onPress={() => openInfoModal(s)}>
                          <Text style={styles.btnActionBlueText}>Student Info</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnActionAmber} onPress={() => openPlanModal(s)}>
                          <Text style={styles.btnActionAmberText}>Manage Plan</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>

        {/* Modals */}
        <Modal visible={modal === 'info'} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[styles.modalHeader, { backgroundColor: '#4f46e5' }]}>
                <Text style={styles.modalTitle}>✏️ Student Info</Text>
                <TouchableOpacity onPress={closeModal}><Text style={styles.modalClose}>Close</Text></TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} value={editForm.name} onChangeText={t => setEditForm({...editForm, name: t})} />
                
                <Text style={styles.label}>Email Address</Text>
                <TextInput style={styles.input} value={editForm.email} onChangeText={t => setEditForm({...editForm, email: t})} keyboardType="email-address" />
                
                <Text style={styles.label}>Reset Password</Text>
                <TextInput style={styles.input} value={editForm.password} onChangeText={t => setEditForm({...editForm, password: t})} placeholder="Leave blank to keep current" secureTextEntry />
                
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.btnPrimary} onPress={handleUpdateStudent} disabled={busy}>
                    <Text style={styles.btnPrimaryText}>{busy ? 'Saving...' : '💾 Save Changes'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnDangerGhost} onPress={() => handleDeleteStudent(activeStudent?.id, activeStudent?.name)} disabled={busy}>
                    <Text style={styles.btnDangerGhostText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={modal === 'plan'} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[styles.modalHeader, { backgroundColor: '#f59e0b' }]}>
                <Text style={styles.modalTitle}>⭐ Manage Plan</Text>
                <TouchableOpacity onPress={closeModal}><Text style={styles.modalClose}>Close</Text></TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <Text style={styles.label}>Current Status</Text>
                <View style={[styles.statusBadge, activeStudent?.premiumStatus === 'Free' ? styles.statusFree : styles.statusPremium, { alignSelf: 'flex-start', marginBottom: 16 }]}>
                  <Text style={[styles.statusBadgeText, activeStudent?.premiumStatus === 'Free' ? styles.statusFreeText : styles.statusPremiumText]}>
                    {activeStudent?.premiumStatus === 'Free' ? '🆓 Free User' : `⭐ ${activeStudent?.premiumStatus}`}
                  </Text>
                </View>

                <Text style={styles.label}>Select Plan Tier</Text>
                <View style={styles.planOptions}>
                  {plans.map(p => (
                    <TouchableOpacity
                      key={p.code}
                      style={[styles.planBtn, selectedPlanCode === p.code && styles.planBtnActive]}
                      onPress={() => setSelectedPlanCode(p.code)}
                    >
                      <Text style={[styles.planBtnText, selectedPlanCode === p.code && styles.planBtnTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#4f46e5' }]} onPress={() => handleSubscription('subscribe')} disabled={busy}>
                    <Text style={styles.btnPrimaryText}>{busy ? 'Processing...' : '✅ Unlock'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnDangerGhost} onPress={() => handleSubscription('unsubscribe')} disabled={busy}>
                    <Text style={styles.btnDangerGhostText}>{busy ? 'Processing...' : '❌ Revoke'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  headerCard: { backgroundColor: '#4f46e5', borderRadius: 16, padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 12, color: '#e0e7ff', marginBottom: 16 },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14 },
  messageBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1, borderRadius: 12, padding: 12 },
  messageText: { color: '#3730a3', fontSize: 14, fontWeight: '600', flex: 1 },
  messageClose: { color: '#818cf8', fontSize: 16, fontWeight: 'bold', paddingHorizontal: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginRight: 12 },
  badge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  cardBody: { padding: 0 },
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: 32 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  studentItem: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 16, gap: 12 },
  studentInfoBox: {},
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  studentEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  studentMeta: { fontSize: 10, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' },
  studentStatusBox: { flexDirection: 'row' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderWidth: 1 },
  statusPremium: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  statusFree: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  statusPremiumText: { color: '#b45309' },
  statusFreeText: { color: '#475569' },
  studentActions: { flexDirection: 'row', gap: 8 },
  btnActionBlue: { flex: 1, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnActionBlueText: { color: '#2563eb', fontSize: 12, fontWeight: 'bold' },
  btnActionAmber: { flex: 1, borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  btnActionAmberText: { color: '#d97706', fontSize: 12, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  modalClose: { fontSize: 12, fontWeight: 'bold', color: '#000', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  modalBody: { padding: 20 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', marginBottom: 16 },
  planOptions: { gap: 8, marginBottom: 24 },
  planBtn: { borderWidth: 2, borderColor: '#f1f5f9', borderRadius: 12, padding: 16, backgroundColor: '#fff' },
  planBtnActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  planBtnText: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  planBtnTextActive: { color: '#4f46e5' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnPrimary: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  btnDangerGhost: { flex: 1, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnDangerGhostText: { color: '#dc2626', fontSize: 14, fontWeight: 'bold' },
});
