import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const ICONS = ['📊', '🗂️', '👥', '📝', '🎬', '📚', '📋', '🔔', '⚙️', '📈', '👤', '❓', '🚪', '📄'];

const STUDENT_ROUTE_OPTIONS = [
  { value: '/student/dashboard', label: '/student/dashboard' },
  { value: '/student/tests', label: '/student/tests' },
  { value: '/student/progress', label: '/student/progress' },
  { value: '/student/results', label: '/student/results' },
  { value: '/student/videos', label: '/student/videos' },
  { value: '/student/materials', label: '/student/materials' },
  { value: '/student/pyqs', label: '/student/pyqs' },
  { value: '/student/notifications', label: '/student/notifications' },
  { value: '/student/profile', label: '/student/profile' },
  { value: '/student/faq', label: '/student/faq' },
  { value: '/student/about', label: '/student/about' },
  { value: '/logout', label: '/logout' },
];

const ADMIN_ROUTE_OPTIONS = [
  { value: '/admin/dashboard', label: '/admin/dashboard' },
  { value: '/admin/menu', label: '/admin/menu' },
  { value: '/admin/students', label: '/admin/students' },
  { value: '/admin/specimens', label: '/admin/specimens' },
  { value: '/admin/tests', label: '/admin/tests' },
  { value: '/admin/test-builder', label: '/admin/test-builder' },
  { value: '/admin/videos', label: '/admin/videos' },
  { value: '/admin/materials', label: '/admin/materials' },
  { value: '/admin/pyqs', label: '/admin/pyqs' },
  { value: '/admin/notifications', label: '/admin/notifications' },
  { value: '/admin/results', label: '/admin/results' },
  { value: '/admin/settings', label: '/admin/settings' },
  { value: '/logout', label: '/logout' },
];

function getRouteOptions(type) {
  if (type === 'admin') return ADMIN_ROUTE_OPTIONS;
  if (type === 'both') return [...STUDENT_ROUTE_OPTIONS, ...ADMIN_ROUTE_OPTIONS];
  return STUDENT_ROUTE_OPTIONS;
}

// ─── Native-compatible dropdown ────────────────────────────────────────────────
function DropdownPicker({ label, value, options, onSelect, small }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => String(o.value) === String(value));
  return (
    <>
      <TouchableOpacity
        style={small ? styles.dropBtnSmall : styles.dropBtn}
        onPress={() => setOpen(true)}
      >
        <Text style={small ? styles.dropBtnSmallText : styles.dropBtnText} numberOfLines={1}>
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

export default function AdminMenuScreen() {
  const { token } = useAuth();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('student');

  const [form, setForm] = useState({ id: null, name: '', route: '', icon: '📄', type: 'student', status: 'active', menu_order: 0 });

  const visibleMenus = useMemo(() => {
    const items = Array.isArray(menus) ? menus : [];
    const filtered = typeFilter ? items.filter((m) => m.type === typeFilter || m.type === 'both') : items;
    return [...filtered].sort((a, b) => (Number(a.menu_order) - Number(b.menu_order)) || (Number(a.id) - Number(b.id)));
  }, [menus, typeFilter]);

  const loadMenus = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/menu?type=${encodeURIComponent(typeFilter)}`, { token });
      setMenus(Array.isArray(res?.menus) ? res.menus : []);
    } catch (e) {
      setError(e?.message || 'Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMenus(); }, [typeFilter, token]);

  const resetForm = () => setForm({ id: null, name: '', route: '', icon: '📄', type: typeFilter || 'student', status: 'active', menu_order: 0 });

  const onSubmit = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('Menu name is required');
      return;
    }
    try {
      const payload = {
        name: form.name, route: form.route, icon: form.icon, type: form.type, status: form.status, menu_order: Number(form.menu_order) || 0,
      };
      if (form.id) {
        await apiFetch(`/api/admin/menu/${form.id}`, { token, method: 'PUT', body: payload });
      } else {
        await apiFetch('/api/admin/menu', { token, method: 'POST', body: payload });
      }
      resetForm();
      loadMenus();
      Alert.alert('Success', `Menu ${form.id ? 'updated' : 'created'} successfully.`);
    } catch (e2) {
      setError(e2?.message || 'Failed to save menu');
      Alert.alert('Error', e2?.message || 'Failed to save menu');
    }
  };

  const onEdit = (m) => setForm({ id: m.id, name: m.name || '', route: m.route || '', icon: m.icon || '📄', type: m.type || 'student', status: m.status || 'active', menu_order: Number(m.menu_order) || 0 });

  const onDelete = (m) => {
    if (!m?.id) return;
    Alert.alert('Delete', `Delete menu "${m.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiFetch(`/api/admin/menu/${m.id}`, { token, method: 'DELETE' });
          loadMenus();
        } catch (e) {
          Alert.alert('Error', e?.message || 'Failed to delete menu');
        }
      }}
    ]);
  };

  const moveMenu = async (id, dir) => {
    const list = visibleMenus;
    const idx = list.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const swapWith = dir === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= list.length) return;

    const a = list[idx];
    const b = list[swapWith];
    const orders = [
      { id: a.id, menu_order: Number(b.menu_order) || 0 },
      { id: b.id, menu_order: Number(a.menu_order) || 0 },
    ];

    try {
      await apiFetch('/api/admin/menu/reorder', { token, method: 'PUT', body: { orders } });
      loadMenus();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to reorder');
    }
  };

  const typeOptions = [
    { value: 'student', label: 'Student' },
    { value: 'admin', label: 'Admin' },
    { value: 'both', label: 'Both' },
  ];
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];
  const iconOptions = ICONS.map((ic) => ({ value: ic, label: ic }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Menu Management</Text>
          <View style={styles.filterRow}>
            <DropdownPicker
              label="Type"
              value={typeFilter}
              options={typeOptions}
              onSelect={(val) => { setTypeFilter(val); resetForm(); }}
              small
            />
            <TouchableOpacity style={styles.btnRefresh} onPress={loadMenus}>
              <Text style={styles.btnRefreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{form.id ? 'Edit Menu' : 'Add New Menu'}</Text>
          </View>
          <View style={styles.cardBody}>
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.label}>Menu Name</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({...form, name: v})} placeholder="e.g. Videos" />

            <Text style={styles.label}>Route</Text>
            <DropdownPicker
              label="Select route"
              value={form.route}
              options={[{ value: '', label: 'Select route' }, ...getRouteOptions(form.type)]}
              onSelect={(v) => setForm({...form, route: v})}
            />

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Icon</Text>
                <DropdownPicker
                  label="Icon"
                  value={form.icon}
                  options={iconOptions}
                  onSelect={(v) => setForm({...form, icon: v})}
                />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Order</Text>
                <TextInput style={styles.input} value={String(form.menu_order)} onChangeText={(v) => setForm({...form, menu_order: parseInt(v)||0})} keyboardType="numeric" />
              </View>
            </View>

            <View style={styles.grid2}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Type</Text>
                <DropdownPicker
                  label="Type"
                  value={form.type}
                  options={typeOptions}
                  onSelect={(v) => setForm({...form, type: v})}
                />
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Status</Text>
                <DropdownPicker
                  label="Status"
                  value={form.status}
                  options={statusOptions}
                  onSelect={(v) => setForm({...form, status: v})}
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.btnPrimary} onPress={onSubmit}>
                <Text style={styles.btnPrimaryText}>{form.id ? 'Update Menu' : 'Add Menu'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={resetForm}>
                <Text style={styles.btnGhostText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Menu Items ({typeFilter})</Text>
          </View>
          <View style={styles.cardBody}>
            {loading ? (
              <ActivityIndicator size="large" color="#4f46e5" />
            ) : visibleMenus.length === 0 ? (
              <Text style={styles.emptyText}>No menus found.</Text>
            ) : (
              <View style={styles.list}>
                {visibleMenus.map((m) => (
                  <View key={m.id} style={styles.menuItem}>
                    <View style={styles.mHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={styles.mIcon}>{m.icon}</Text>
                        <View style={{ marginLeft: 12 }}>
                          <Text style={styles.mName}>{m.name}</Text>
                          <Text style={styles.mRoute}>{m.route}</Text>
                        </View>
                      </View>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Order: {m.menu_order}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.mActions}>
                      <TouchableOpacity style={styles.btnAction} onPress={() => moveMenu(m.id, 'up')}>
                        <Text style={styles.btnActionText}>↑ Up</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnAction} onPress={() => moveMenu(m.id, 'down')}>
                        <Text style={styles.btnActionText}>↓ Down</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btnAction, { marginLeft: 'auto' }]} onPress={() => onEdit(m)}>
                        <Text style={styles.btnActionTextBlue}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.btnAction} onPress={() => onDelete(m)}>
                        <Text style={styles.btnActionTextRed}>Delete</Text>
                      </TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  filterRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  btnRefresh: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f1f5f9', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  btnRefreshText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  cardBody: { padding: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  // Dropdown styles
  dropBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#fff' },
  dropBtnText: { fontSize: 14, color: '#1e293b', flex: 1 },
  dropBtnSmall: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#fff', width: 120 },
  dropBtnSmallText: { fontSize: 13, color: '#1e293b', flex: 1 },
  dropArrow: { fontSize: 12, color: '#94a3b8', marginLeft: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, maxHeight: '70%' },
  modalSheetTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  modalOptionSelected: { backgroundColor: '#eff6ff' },
  modalOptionText: { flex: 1, fontSize: 15, color: '#1e293b' },
  modalOptionTextSelected: { color: '#4f46e5', fontWeight: '600' },
  modalOptionCheck: { color: '#4f46e5', fontWeight: 'bold', fontSize: 16 },
  grid2: { flexDirection: 'row', gap: 12 },
  gridItem: { flex: 1 },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnPrimary: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  btnGhost: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#334155', fontSize: 14, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#94a3b8', paddingVertical: 20 },
  list: { gap: 12 },
  menuItem: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16 },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mIcon: { fontSize: 24 },
  mName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  mRoute: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  badgeText: { fontSize: 10, fontWeight: 'bold', color: '#475569' },
  mActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  btnAction: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f8fafc', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  btnActionText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  btnActionTextBlue: { fontSize: 12, color: '#2563eb', fontWeight: 'bold' },
  btnActionTextRed: { fontSize: 12, color: '#dc2626', fontWeight: 'bold' },
});
