import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

// ─── Native-compatible dropdown (no @react-native-picker/picker) ─────────────
function DropdownPicker({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => String(o.value) === String(value));
  return (
    <>
      <TouchableOpacity style={styles.dropBtn} onPress={() => setOpen(true)}>
        <Text style={styles.dropBtnText} numberOfLines={1}>
          {selected ? selected.label : label}
        </Text>
        <Text style={styles.dropArrow}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalSheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalOption, String(item.value) === String(value) && styles.modalOptionSelected]}
                  onPress={() => { onSelect(item.value); setOpen(false); }}
                >
                  <Text style={[styles.modalOptionText, String(item.value) === String(value) && styles.modalOptionTextSelected]}>
                    {item.label}
                  </Text>
                  {String(item.value) === String(value) && <Text style={styles.modalOptionCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function AdminResultsScreen() {
  const { token } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState([]);
  const [testId, setTestId] = useState('');
  
  const [allStudents, setAllStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/admin/tests', { token });
        setTests(res.tests || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const url = testId ? `/api/admin/results?testId=${encodeURIComponent(testId)}` : '/api/admin/results';
        const res = await apiFetch(url, { token });
        setResults(res.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, testId]);

  useEffect(() => {
    if (!testId) {
      setAllStudents([]);
      return;
    }
    (async () => {
      setStudentsLoading(true);
      try {
        const res = await apiFetch('/api/admin/students', { token });
        setAllStudents(res.students || []);
      } catch (err) {
        console.error(err);
      } finally {
        setStudentsLoading(false);
      }
    })();
  }, [token, testId]);

  const handleExportCsv = () => {
    alert('Export CSV is not fully supported in the mobile app preview. Please use the web dashboard to export.');
  };

  const testOptions = [
    { label: 'All tests (latest results)', value: '' },
    ...tests.map((t) => ({ label: t.title, value: String(t.id) })),
  ];

  const attendedEmails = new Set(results.map((r) => String(r.student_email || '').toLowerCase()).filter(Boolean));
  const notAttended = allStudents.filter((s) => !attendedEmails.has(String(s.email || '').toLowerCase()));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Results</Text>
              <Text style={styles.heroSubtitle}>View rankings and progress.</Text>
            </View>
            <TouchableOpacity style={styles.btnExport} onPress={handleExportCsv}>
              <Text style={styles.btnExportText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.label}>Test (for ranks)</Text>
            <DropdownPicker
              label="All tests (latest results)"
              value={testId}
              options={testOptions}
              onSelect={(val) => setTestId(val)}
            />
            <Text style={styles.hintText}>
              {testId ? `Showing ${results.length} attendees — ranked by score` : 'Select a test to view full rank list'}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#4f46e5" style={{ marginVertical: 20 }} />
            ) : results.length === 0 ? (
              <Text style={styles.emptyText}>No results available.</Text>
            ) : (
              <ScrollView horizontal style={styles.tableScroll}>
                <View style={styles.table}>
                  <View style={styles.tableRowHeader}>
                    {!!testId && <Text style={[styles.th, { width: 50 }]}>Rank</Text>}
                    <Text style={[styles.th, { width: 100 }]}>Date</Text>
                    <Text style={[styles.th, { width: 120 }]}>Student</Text>
                    <Text style={[styles.th, { width: 100 }]}>Score</Text>
                    <Text style={[styles.th, { width: 80 }]}>Acc.</Text>
                    <Text style={[styles.th, { width: 80 }]}>Time (s)</Text>
                  </View>
                  {results.map((r, i) => (
                    <View key={r.id || i} style={styles.tableRow}>
                      {!!testId && <Text style={[styles.td, { width: 50, fontWeight: 'bold' }]}>{r.rank}</Text>}
                      <Text style={[styles.td, { width: 100 }]}>{new Date(r.date).toLocaleDateString()}</Text>
                      <Text style={[styles.td, { width: 120 }]} numberOfLines={1}>{r.student_name}</Text>
                      <Text style={[styles.td, { width: 100, fontWeight: 'bold' }]}>{r.score}</Text>
                      <Text style={[styles.td, { width: 80 }]}>{r.accuracy}%</Text>
                      <Text style={[styles.td, { width: 80 }]}>{r.time_taken_sec}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        {!!testId && (
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <View style={styles.missingHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.missingTitle}>Did Not Attend</Text>
                  <Text style={styles.missingSubtitle}>
                    {studentsLoading ? 'Loading...' : `${notAttended.length} students have not attempted.`}
                  </Text>
                </View>
                <View style={styles.badgeMissing}>
                  <Text style={styles.badgeMissingText}>⚠ {notAttended.length}</Text>
                </View>
              </View>

              {studentsLoading ? (
                <ActivityIndicator size="small" color="#f97316" style={{ marginVertical: 20 }} />
              ) : notAttended.length === 0 ? (
                <View style={styles.successBox}>
                  <Text style={styles.successBoxText}>🎉 All registered students attended!</Text>
                </View>
              ) : (
                <View style={styles.missingList}>
                  {notAttended.map((s, idx) => (
                    <View key={s.id || s.email} style={styles.missingItem}>
                      <Text style={styles.missingIndex}>{idx + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.missingName}>{s.name || '—'}</Text>
                        <Text style={styles.missingEmail}>{s.email || '—'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  heroCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 20 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  heroSubtitle: { fontSize: 12, color: '#64748b', marginTop: 4 },
  btnExport: { backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnExportText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardBody: { padding: 16 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 8 },
  // Dropdown
  dropBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#f8fafc', marginBottom: 8 },
  dropBtnText: { fontSize: 14, color: '#1e293b', flex: 1 },
  dropArrow: { fontSize: 14, color: '#94a3b8', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '70%' },
  modalSheetTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  modalOptionSelected: { backgroundColor: '#eff6ff' },
  modalOptionText: { flex: 1, fontSize: 15, color: '#1e293b' },
  modalOptionTextSelected: { color: '#4f46e5', fontWeight: '600' },
  modalOptionCheck: { color: '#4f46e5', fontWeight: 'bold', fontSize: 16 },
  hintText: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  emptyText: { textAlign: 'center', color: '#94a3b8', paddingVertical: 20 },
  tableScroll: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 },
  table: { minWidth: 500 },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  th: { padding: 10, fontSize: 12, fontWeight: 'bold', color: '#475569' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  td: { padding: 10, fontSize: 12, color: '#1e293b' },
  missingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  missingTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  missingSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badgeMissing: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  badgeMissingText: { color: '#c2410c', fontSize: 12, fontWeight: 'bold' },
  successBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', padding: 16, borderRadius: 8, alignItems: 'center' },
  successBoxText: { color: '#15803d', fontSize: 14, fontWeight: 'bold' },
  missingList: { gap: 8 },
  missingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ffedd5' },
  missingIndex: { width: 30, fontSize: 12, color: '#fb923c', fontWeight: 'bold' },
  missingName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  missingEmail: { fontSize: 12, color: '#64748b' },
});
