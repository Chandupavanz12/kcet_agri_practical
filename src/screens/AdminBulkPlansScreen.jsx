import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const EXAM_TABS = [
  { id: 'all', label: 'All Exams' },
  { id: 'puc', label: 'PUC' },
  { id: 'kcet', label: 'KCET' },
  { id: 'neet', label: 'NEET' },
  { id: 'agri', label: 'Agri' },
];

const TYPE_TABS = [
  { id: 'materials', label: '📚 Study Materials' },
  { id: 'tests', label: '📝 Mock Tests' },
  { id: 'pyqs', label: '📑 PYQs' },
];

export default function AdminBulkPlansScreen() {
  const { token } = useAuth();
  const router = useRouter();

  const [catalog, setCatalog] = useState({ materials: [], pyqs: [], tests: [] });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [examFilter, setExamFilter] = useState('all');
  const [typeTab, setTypeTab] = useState('materials');

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [durationDays, setDurationDays] = useState('365');
  const [featuresText, setFeaturesText] = useState('');
  const [selected, setSelected] = useState({ materials: [], pyqs: [], tests: [] });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [catRes, plansRes] = await Promise.all([
        apiFetch('/api/admin/bulk-plans/catalog', { token }),
        apiFetch('/api/admin/bulk-plans', { token }),
      ]);
      setCatalog({
        materials: Array.isArray(catRes?.materials) ? catRes.materials : [],
        pyqs: Array.isArray(catRes?.pyqs) ? catRes.pyqs : [],
        tests: Array.isArray(catRes?.tests) ? catRes.tests : [],
      });
      setPlans(Array.isArray(plansRes?.plans) ? plansRes.plans : []);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [token]);

  const isSelected = (type, exam, id) => {
    return (selected[type] || []).some(
      (x) => String(x.exam).toLowerCase() === String(exam).toLowerCase() && Number(x.id) === Number(id)
    );
  };

  const toggleItem = (type, item) => {
    const exam = String(item.exam || 'puc').toLowerCase();
    const id = Number(item.id);
    setSelected((prev) => {
      const list = prev[type] || [];
      const exists = list.some((x) => x.exam === exam && Number(x.id) === id);
      if (exists) {
        return { ...prev, [type]: list.filter((x) => !(x.exam === exam && Number(x.id) === id)) };
      }
      return { ...prev, [type]: [...list, { exam, id, title: item.title }] };
    });
  };

  const filteredItems = useMemo(() => {
    const list = catalog[typeTab] || [];
    if (examFilter === 'all') return list;
    return list.filter((i) => String(i.exam).toLowerCase() === examFilter);
  }, [catalog, typeTab, examFilter]);

  const coveredExams = useMemo(() => {
    const set = new Set();
    for (const k of ['materials', 'pyqs', 'tests']) {
      for (const it of selected[k] || []) {
        if (it?.exam) set.add(it.exam.toUpperCase());
      }
    }
    return Array.from(set);
  }, [selected]);

  const totalSelected =
    (selected.materials?.length || 0) + (selected.tests?.length || 0) + (selected.pyqs?.length || 0);

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setPriceRupees('');
    setDurationDays('365');
    setFeaturesText('');
    setSelected({ materials: [], pyqs: [], tests: [] });
  };

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) {
      Alert.alert('Validation', 'Plan Code and Plan Name are required.');
      return;
    }
    if (totalSelected === 0) {
      Alert.alert('Validation', 'Select at least 1 Study Material, Mock Test, or PYQ.');
      return;
    }

    const customFeatures = featuresText
      .split(/\r?\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const autoFeatures =
      customFeatures.length > 0
        ? customFeatures
        : [
            selected.materials.length > 0 ? `${selected.materials.length} Selected Study Material(s)` : null,
            selected.tests.length > 0 ? `${selected.tests.length} Selected Mock Test(s)` : null,
            selected.pyqs.length > 0 ? `${selected.pyqs.length} Selected PYQ(s)` : null,
            `Exams Covered: ${coveredExams.join(', ')}`,
            `${Number(durationDays || 365)} Days Validity`,
          ].filter(Boolean);

    try {
      setSaving(true);
      const payload = {
        code: code.trim().toLowerCase(),
        name: name.trim(),
        price_paise: Math.round(Number(priceRupees || 0) * 100),
        duration_days: Number(durationDays || 365),
        allowed_items: {
          materials: selected.materials.map((x) => ({ exam: x.exam, id: Number(x.id) })),
          pyqs: selected.pyqs.map((x) => ({ exam: x.exam, id: Number(x.id) })),
          tests: selected.tests.map((x) => ({ exam: x.exam, id: Number(x.id) })),
        },
        features: autoFeatures,
        status: 'active',
      };

      if (editingId) {
        await apiFetch(`/api/admin/bulk-plans/${editingId}`, { token, method: 'PUT', body: payload });
        Alert.alert('Updated', 'Bulk plan updated successfully!');
      } else {
        await apiFetch('/api/admin/bulk-plans', { token, method: 'POST', body: payload });
        Alert.alert('Created', 'Bulk plan created! It will now appear in the included exam sections.');
      }
      resetForm();
      await loadAll();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to save bulk plan');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p) => {
    setEditingId(p.id);
    setCode(p.code || '');
    setName(p.name || '');
    setPriceRupees(String(Math.round(Number(p.price_paise || 0) / 100)));
    setDurationDays(String(p.duration_days || 365));
    const feat = Array.isArray(p.features) ? p.features : [];
    setFeaturesText(feat.join('\n'));
    const ai = p.allowed_items || { materials: [], pyqs: [], tests: [] };
    setSelected({
      materials: Array.isArray(ai.materials) ? ai.materials : [],
      pyqs: Array.isArray(ai.pyqs) ? ai.pyqs : [],
      tests: Array.isArray(ai.tests) ? ai.tests : [],
    });
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Bulk Plan', 'Are you sure you want to delete this plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/admin/bulk-plans/${id}`, { token, method: 'DELETE' });
            await loadAll();
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to delete bulk plan');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bulk Plan Creation</Text>
          {editingId ? (
            <TouchableOpacity onPress={resetForm} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {/* Plan Details Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Plan Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Plan Code (e.g. combo_bundle_1)"
            value={code}
            onChangeText={setCode}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Plan Name (e.g. PUC + KCET Custom Pack)"
            value={name}
            onChangeText={setName}
          />
          <View style={styles.rowTwo}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Price (₹)"
              value={priceRupees}
              onChangeText={setPriceRupees}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Days (e.g. 365)"
              value={durationDays}
              onChangeText={setDurationDays}
              keyboardType="numeric"
            />
          </View>
          <TextInput
            style={[styles.input, { minHeight: 68, textAlignVertical: 'top' }]}
            placeholder="Custom Features (optional - auto-filled from selection if blank)"
            value={featuresText}
            onChangeText={setFeaturesText}
            multiline
          />
        </View>

        {/* Content Selector Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Select Specific Contents Across Exams</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>
              Selected: {selected.materials.length} Materials • {selected.tests.length} Mock Tests • {selected.pyqs.length} PYQs
            </Text>
            <Text style={styles.summarySub}>
              Exams Included: {coveredExams.length ? coveredExams.join(', ') : 'None selected'}
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
            {EXAM_TABS.map((ex) => (
              <TouchableOpacity
                key={ex.id}
                onPress={() => setExamFilter(ex.id)}
                style={[styles.pill, examFilter === ex.id && styles.pillActive]}
              >
                <Text style={[styles.pillText, examFilter === ex.id && styles.pillTextActive]}>{ex.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.typeRow}>
            {TYPE_TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setTypeTab(t.id)}
                style={[styles.typeBtn, typeTab === t.id && styles.typeBtnActive]}
              >
                <Text style={[styles.typeBtnText, typeTab === t.id && styles.typeBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 20 }} />
          ) : filteredItems.length === 0 ? (
            <Text style={styles.emptyText}>No items found for this filter.</Text>
          ) : (
            <ScrollView
              style={styles.itemListScroll}
              contentContainerStyle={styles.itemList}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {filteredItems.map((item) => {
                const checked = isSelected(typeTab, item.exam, item.id);
                return (
                  <TouchableOpacity
                    key={`${item.exam}-${item.id}`}
                    style={[styles.checkRow, checked && styles.checkRowActive]}
                    onPress={() => toggleItem(typeTab, item)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
                      {checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.itemMeta}>
                        {String(item.exam || '').toUpperCase()} • {item.subject || 'General'}
                        {item.year ? ` • ${item.year}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.btnSave, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnSaveText}>
                {editingId ? 'Update Bulk Plan' : 'Create Bulk Plan'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Existing Bulk Plans */}
        <Text style={styles.listHeading}>Existing Bulk Plans ({plans.length})</Text>
        {plans.map((p) => {
          const ai = p.allowed_items || {};
          const targets = Array.isArray(p.target_exams) ? p.target_exams : [];
          return (
            <View key={p.id} style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>{p.name}</Text>
                  <Text style={styles.planCode}>Code: {p.code} • ₹{Math.round(Number(p.price_paise || 0) / 100)} • {p.duration_days}d</Text>
                </View>
                <View style={styles.planActions}>
                  <TouchableOpacity onPress={() => handleEdit(p)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(p.id)} style={styles.delBtn}>
                    <Text style={styles.delBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.planSummary}>
                Exams: {targets.map((x) => String(x).toUpperCase()).join(', ') || 'None'}
              </Text>
              <Text style={styles.planSummary}>
                Includes: {(ai.materials?.length || 0)} Materials, {(ai.tests?.length || 0)} Mock Tests, {(ai.pyqs?.length || 0)} PYQs
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 14, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#e2e8f0', borderRadius: 10 },
  backBtnText: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fee2e2', borderRadius: 8 },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
  rowTwo: { flexDirection: 'row', gap: 10 },
  summaryBox: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 12, padding: 12, gap: 2 },
  summaryText: { fontSize: 13, fontWeight: '800', color: '#065f46' },
  summarySub: { fontSize: 12, fontWeight: '600', color: '#047857' },
  pillRow: { gap: 8, paddingVertical: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  pillActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  pillText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  pillTextActive: { color: '#fff' },
  typeRow: { flexDirection: 'row', gap: 6 },
  typeBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  typeBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  typeBtnText: { fontSize: 11.5, fontWeight: '700', color: '#475569' },
  typeBtnTextActive: { color: '#1d4ed8', fontWeight: '800' },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', paddingVertical: 16 },
  itemListScroll: { maxHeight: 300, borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 12, padding: 6, backgroundColor: '#f8fafc' },
  itemList: { gap: 8, paddingBottom: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  checkRowActive: { backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#94a3b8', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '900' },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemMeta: { fontSize: 11.5, color: '#64748b', fontWeight: '600', marginTop: 1 },
  btnSave: { backgroundColor: '#059669', paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  btnSaveText: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  listHeading: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 4 },
  planCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  planName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  planCode: { fontSize: 12, color: '#475569', fontWeight: '600' },
  planActions: { flexDirection: 'row', gap: 6 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#e0f2fe', borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#0284c7' },
  delBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#fee2e2', borderRadius: 8 },
  delBtnText: { fontSize: 12, fontWeight: '700', color: '#dc2626' },
  planSummary: { fontSize: 12.5, color: '#334155', fontWeight: '600' },
});

