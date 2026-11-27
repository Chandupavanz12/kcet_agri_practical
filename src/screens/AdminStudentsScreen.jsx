import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

let STUDENTS_CLIENT_CACHE = null;

export default function AdminStudentsScreen() {
  const { token } = useAuth();
  const [students, setStudents] = useState(STUDENTS_CLIENT_CACHE || []);
  const [loading, setLoading] = useState(!STUDENTS_CLIENT_CACHE);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('All');
  const [filterPlan, setFilterPlan] = useState('All');
  const [onlyOnline, setOnlyOnline] = useState(false);

  const plans = [
    { code: 'puc', label: '📄 PUC (Class 12) Plan', exam: 'puc' },
    { code: 'kcet', label: '🎯 KCET Preparation Plan', exam: 'kcet' },
    { code: 'neet', label: '🩺 NEET Preparation Plan', exam: 'neet' },
    { code: 'combo', label: '🌱 Agri Practical Combo (All Access)', exam: 'agri' },
    { code: 'pyq', label: '📑 Agri Practical PYQ Plan', exam: 'agri' },
    { code: 'materials', label: '📚 Agri Practical Notes Plan', exam: 'agri' },
  ];

  const [modal, setModal] = useState(null);
  const [activeStudent, setActiveStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' });
  const [selectedPlanCode, setSelectedPlanCode] = useState('combo');
  const [busy, setBusy] = useState(false);

  const fetchStudents = async () => {
    try {
      if (!STUDENTS_CLIENT_CACHE) setLoading(true);
      const res = await apiFetch('/api/admin/students', { token });
      const list = res?.students || [];
      STUDENTS_CLIENT_CACHE = list;
      setStudents(list);
    } catch (err) {
      if (!STUDENTS_CLIENT_CACHE) setMessage(err?.message || 'Failed to fetch students.');
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

  const handleSubscription = async (action, customCode = null) => {
    if (!activeStudent) return;
    const targetCode = customCode || selectedPlanCode;

    if (action === 'unsubscribe' && targetCode === 'all') {
      Alert.alert(
        'Revoke ALL Access',
        `Are you sure you want to revoke ALL exam access (PUC, KCET, NEET, Agri) for ${activeStudent.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Revoke All',
            style: 'destructive',
            onPress: async () => {
              try {
                setBusy(true);
                await apiFetch(`/api/admin/students/${activeStudent.id}/subscribe`, {
                  token,
                  method: 'POST',
                  body: { planCode: 'all', action: 'unsubscribe' },
                });
                setMessage(`❌ Revoked all exam access for ${activeStudent.name}.`);
                closeModal();
                fetchStudents();
              } catch (err) {
                Alert.alert('Error', err.message || 'Failed to revoke.');
              } finally {
                setBusy(false);
              }
            },
          },
        ]
      );
      return;
    }

    try {
      setBusy(true);
      await apiFetch(`/api/admin/students/${activeStudent.id}/subscribe`, {
        token,
        method: 'POST',
        body: { planCode: targetCode, action },
      });
      setMessage(`${action === 'subscribe' ? '✅ Unlocked' : '❌ Revoked'} "${targetCode.toUpperCase()}" for ${activeStudent.name}.`);
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
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
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
        }
      }
    ]);
  };

  const availableYears = Array.from(new Set(students.map(s => {
    return new Date(s.createdAt || s.created_at || Date.now()).getFullYear().toString();
  }))).sort((a, b) => b.localeCompare(a));

  const filteredStudents = students.filter(s => {
    const sYear = new Date(s.createdAt || s.created_at || Date.now()).getFullYear().toString();
    const n = String(s.name || '').toLowerCase();
    const e = String(s.email || '').toLowerCase();
    const searchLow = String(searchTerm || '').toLowerCase();
    const matchSearch = n.includes(searchLow) || e.includes(searchLow);
    const matchYear = filterYear === 'All' || sYear === filterYear;
    let matchPlan = true;
    if (filterPlan !== 'All') {
      const pStat = String(s.premiumStatus || '').toLowerCase();
      if (filterPlan === 'free') matchPlan = pStat.includes('free');
      else if (filterPlan === 'combo') matchPlan = pStat.includes('combo');
      else if (filterPlan === 'pyq') matchPlan = pStat.includes('pyq');
      else if (filterPlan === 'materials') matchPlan = pStat.includes('materials');
      else matchPlan = pStat.includes(filterPlan);
    }
    const matchOnline = !onlyOnline || Boolean(s.isOnline);
    return matchSearch && matchYear && matchPlan && matchOnline;
  });

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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Year:</Text>
              {['All', ...availableYears].map(y => (
                <TouchableOpacity key={'yr' + y} style={[styles.filterChip, filterYear === y && styles.filterChipActive]} onPress={() => setFilterYear(y)}>
                  <Text style={[styles.filterChipText, filterYear === y && styles.filterChipTextActive]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Plan:</Text>
              {['All', 'free', 'combo', 'pyq', 'materials'].map(p => (
                <TouchableOpacity key={'pl' + p} style={[styles.filterChip, filterPlan === p && styles.filterChipActive]} onPress={() => setFilterPlan(p)}>
                  <Text style={[styles.filterChipText, filterPlan === p && styles.filterChipTextActive]}>{p.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.cardTitle}>All Registered Students</Text>
              <TouchableOpacity
                onPress={() => setOnlyOnline((v) => !v)}
                style={{
                  backgroundColor: onlyOnline ? '#16a34a' : '#dcfce7',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: onlyOnline ? '#fff' : '#15803d' }}>
                  🟢 {students.filter((x) => x.isOnline).length} Online
                </Text>
              </TouchableOpacity>
            </View>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.studentName}>{s.name || 'Unnamed'}</Text>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4,
                              backgroundColor: s.isOnline ? '#dcfce7' : '#f1f5f9',
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 999,
                            }}
                          >
                            <View
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: 4,
                                backgroundColor: s.isOnline ? '#16a34a' : '#94a3b8',
                              }}
                            />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: s.isOnline ? '#15803d' : '#64748b' }}>
                              {s.isOnline ? 'Online' : 'Offline'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.studentEmail}>{s.email || 'No email'}</Text>
                        <Text style={styles.studentMeta}>ID #{s.id} • {new Date(s.createdAt || s.created_at || Date.now()).toLocaleDateString()}</Text>
                      </View>

                      <View style={styles.studentStatusBox}>
                        {Array.isArray(s.activePlans) && s.activePlans.length > 0 ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                            {s.activePlans.map((ap, i) => (
                              <View key={i} style={[styles.statusBadge, styles.statusPremium]}>
                                <Text style={[styles.statusBadgeText, styles.statusPremiumText]}>✓ {ap}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={[styles.statusBadge, isPremium ? styles.statusPremium : styles.statusFree]}>
                            <Text style={[styles.statusBadgeText, isPremium ? styles.statusPremiumText : styles.statusFreeText]}>
                              {isPremium ? `⭐ ${s.premiumStatus}` : '🆓 Free'}
                            </Text>
                          </View>
                        )}
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
                <TextInput style={styles.input} value={editForm.name} onChangeText={t => setEditForm({ ...editForm, name: t })} />

                <Text style={styles.label}>Email Address</Text>
                <TextInput style={styles.input} value={editForm.email} onChangeText={t => setEditForm({ ...editForm, email: t })} keyboardType="email-address" />

                <Text style={styles.label}>Reset Password</Text>
                <TextInput style={styles.input} value={editForm.password} onChangeText={t => setEditForm({ ...editForm, password: t })} placeholder="Leave blank to keep current" secureTextEntry />

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
                  <TouchableOpacity style={[styles.btnPrimary, { backgroundColor: '#10b981' }]} onPress={() => handleSubscription('subscribe')} disabled={busy}>
                    <Text style={styles.btnPrimaryText}>{busy ? 'Processing...' : '✅ Unlock Selected'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnDangerGhost} onPress={() => handleSubscription('unsubscribe')} disabled={busy}>
                    <Text style={styles.btnDangerGhostText}>{busy ? 'Processing...' : '❌ Revoke Selected'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Revoke All Access Button */}
                <TouchableOpacity
                  style={[styles.btnDangerSolid, { marginTop: 12 }]}
                  onPress={() => handleSubscription('unsubscribe', 'all')}
                  disabled={busy}
                >
                  <Text style={styles.btnDangerSolidText}>
                    {busy ? 'Processing...' : '🚫 Revoke ALL Access (PUC, KCET, NEET, Agri)'}
                  </Text>
                </TouchableOpacity>
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
  btnDangerSolid: { backgroundColor: '#ef4444', borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  btnDangerSolidText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16 },
  filterLabel: { fontSize: 12, color: '#e0e7ff', fontWeight: 'bold', marginRight: 4, textTransform: 'uppercase' },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterChipActive: { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
  filterChipText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  filterChipTextActive: { color: '#b45309' },
});
