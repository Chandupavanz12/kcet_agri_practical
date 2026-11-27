import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import AdminCRUDPage from '../components/AdminCRUDPage.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const AVAILABLE_MODULES = [
  { id: 'all', label: '🌟 All Modules (Complete Access)' },
  { id: 'materials', label: '📚 Study Materials Only' },
  { id: 'tests', label: '📝 Mock Tests Only' },
  { id: 'pyqs', label: '📑 Previous Year Papers Only' },
];

const TARGET_EXAMS_OPTIONS = [
  { id: 'puc', label: 'PUC' },
  { id: 'kcet', label: 'KCET' },
  { id: 'neet', label: 'NEET' },
  { id: 'agri', label: 'Agri Practical' },
];

export default function AdminPlansScreen() {
  const { token } = useAuth();
  const [selectedExam, setSelectedExam] = useState('kcet'); // 'agri' | 'puc' | 'kcet' | 'neet' | 'global'
  const [accessModule, setAccessModule] = useState('all'); // 'all' | 'materials' | 'tests' | 'pyqs'
  const [globalCoveredExams, setGlobalCoveredExams] = useState(['puc', 'kcet', 'neet', 'agri']);
  const [customFeaturesText, setCustomFeaturesText] = useState('');
  const [subscriptionsDisabled, setSubscriptionsDisabled] = useState([]);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/admin/settings', { token });
        if (Array.isArray(res?.settings?.subscriptionsDisabled)) {
          setSubscriptionsDisabled(res.settings.subscriptionsDisabled);
        }
      } catch (_) {}
    })();
  }, [token]);

  const toggleSubDisable = async (examKey) => {
    const prev = subscriptionsDisabled;
    const exists = prev.includes(examKey);
    const next = exists ? prev.filter((x) => x !== examKey) : [...prev, examKey];
    setSubscriptionsDisabled(next);
    try {
      setSavingToggle(true);
      await apiFetch('/api/admin/settings', {
        token,
        method: 'PUT',
        body: { subscriptionsDisabled: next },
      });
    } catch (e) {
      setSubscriptionsDisabled(prev);
      Alert.alert('Error', e?.message || 'Failed to update subscription setting');
    } finally {
      setSavingToggle(false);
    }
  };

  const toggleGlobalExam = (exId) => {
    if (globalCoveredExams.includes(exId)) {
      if (globalCoveredExams.length > 1) {
        setGlobalCoveredExams(globalCoveredExams.filter((x) => x !== exId));
      }
    } else {
      setGlobalCoveredExams([...globalCoveredExams, exId]);
    }
  };

  const fields = [
    { name: 'code', label: 'Plan Code', type: 'text', placeholder: 'e.g. kcet_full_access, puc_tests' },
    { name: 'name', label: 'Plan Name', type: 'text', placeholder: 'e.g. KCET Mock Series 2026' },
    { name: 'priceRupees', label: 'Price (₹)', type: 'number', placeholder: 'e.g. 499' },
    { name: 'durationDays', label: 'Validity in Days', type: 'number', placeholder: 'e.g. 365' },
    { name: 'featuresText', label: 'Custom Features (one per line or comma-separated)', type: 'textarea', placeholder: 'Feature 1\nFeature 2\nFeature 3' },
    { name: 'status', label: 'Status', type: 'text', placeholder: 'active / inactive' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Subscription Visibility Controls */}
        <View style={styles.card}>
          <Text style={styles.label}>Subscription Visibility (Hide from Student Dashboard)</Text>
          <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
            Turn ON to disable & hide Subscription Plans and Unlock messages for an exam or all exams.
          </Text>
          {[
            { id: 'all', label: 'Disable All Exams Subscriptions' },
            { id: 'puc', label: 'Disable PUC Subscription' },
            { id: 'kcet', label: 'Disable KCET Subscription' },
            { id: 'neet', label: 'Disable NEET Subscription' },
            { id: 'agri', label: 'Disable Agri Practical Subscription' },
          ].map((opt) => {
            const disabled = subscriptionsDisabled.includes(opt.id);
            return (
              <View
                key={opt.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <Text style={{ fontSize: 13.5, fontWeight: '600', color: disabled ? '#dc2626' : '#0f172a' }}>
                  {opt.label}
                </Text>
                <Switch
                  value={disabled}
                  disabled={savingToggle}
                  onValueChange={() => toggleSubDisable(opt.id)}
                  trackColor={{ false: '#cbd5e1', true: '#ef4444' }}
                />
              </View>
            );
          })}
        </View>

        {/* Exam Selector Header Card */}
        <View style={styles.card}>
          <Text style={styles.label}>1. Select Target Exam for Plan</Text>
          <View style={styles.examBtnRow}>
            {['kcet', 'puc', 'neet', 'agri', 'global'].map((ex) => (
              <TouchableOpacity
                key={ex}
                style={[styles.examBtn, selectedExam === ex && styles.examBtnActive]}
                onPress={() => setSelectedExam(ex)}
                activeOpacity={0.7}
              >
                <Text style={[styles.examBtnText, selectedExam === ex && styles.examBtnTextActive]}>
                  {ex === 'agri' ? 'Agri' : ex === 'global' ? 'Global (All)' : ex.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* If Global Exam Selected: Select which exams are unlocked */}
          {selectedExam === 'global' && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Global Plan Covers Which Exams:</Text>
              <View style={styles.examBtnRow}>
                {TARGET_EXAMS_OPTIONS.map((opt) => {
                  const active = globalCoveredExams.includes(opt.id);
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.examBtn, active && styles.examBtnActive]}
                      onPress={() => toggleGlobalExam(opt.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.examBtnText, active && styles.examBtnTextActive]}>
                        {active ? `✓ ${opt.label}` : opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Module Access Selection Dropdown / Selector */}
          <View style={{ marginTop: 14 }}>
            <Text style={styles.label}>2. Access Modules Unlocked by Plan</Text>
            <View style={styles.moduleRow}>
              {AVAILABLE_MODULES.map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  style={[styles.moduleBtn, accessModule === mod.id && styles.moduleBtnActive]}
                  onPress={() => setAccessModule(mod.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.moduleBtnText, accessModule === mod.id && styles.moduleBtnTextActive]}>
                    {mod.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Plans Management CRUD Component */}
        <AdminCRUDPage
          key={selectedExam}
          title={`Subscription Plans (${selectedExam.toUpperCase()})`}
          apiEndpoint="plans"
          endpointPath={selectedExam === 'agri' ? 'plans' : `exam/plans?exam=${selectedExam}`}
          updateEndpointPath={selectedExam === 'agri' ? 'plans' : `exam/plans?exam=${selectedExam}`}
          deleteEndpointPath={selectedExam === 'agri' ? 'plans' : `exam/plans?exam=${selectedExam}`}
          responseKey="plans"
          disableCreate={false}
          fields={fields}
          initialForm={{
            code: '',
            name: '',
            priceRupees: 0,
            durationDays: 365,
            featuresText: '',
            status: 'active',
          }}
          listTransform={(p) => {
            const rawFeat = p.features;
            const featArr = Array.isArray(rawFeat)
              ? rawFeat
              : typeof rawFeat === 'string'
                ? JSON.parse(rawFeat || '[]')
                : [];

            return {
              id: p.id,
              title: p.name,
              code: p.code,
              name: p.name,
              priceRupees: Number(p.pricePaise || p.price_paise || 0) / 100,
              durationDays: p.durationDays || p.duration_days,
              featuresText: featArr.join('\n'),
              status: p.status,
              accessModule: Array.isArray(p.access_modules) ? p.access_modules.join(', ') : (p.access_modules || 'all'),
            };
          }}
          onEdit={(item) => {
            if (item.accessModule) {
              setAccessModule(item.accessModule.includes('all') ? 'all' : item.accessModule.split(',')[0].trim());
            }
          }}
          customCreateHandler={async (f) => {
            // Parse custom features entered by admin line by line or comma-separated
            const customFeat = String(f.featuresText || '')
              .split(/\r?\n|,/)
              .map((s) => s.trim())
              .filter(Boolean);

            if (selectedExam !== 'agri') {
              // Neon PostgreSQL (PUC, KCET, NEET, Global)
              return await apiFetch('/api/admin/exam/plans', {
                token,
                method: 'POST',
                body: {
                  exam: selectedExam,
                  code: f.code,
                  name: f.name,
                  price_paise: Math.round(Number(f.priceRupees || 0) * 100),
                  duration_days: Number(f.durationDays || 365),
                  access_modules: accessModule === 'all' ? ['all'] : [accessModule],
                  target_exams: selectedExam === 'global' ? globalCoveredExams : [selectedExam],
                  features: customFeat,
                },
              });
            } else {
              // Agri Practical (MongoDB Atlas)
              return await apiFetch('/api/admin/plans', {
                token,
                method: 'POST',
                body: {
                  code: f.code,
                  name: f.name,
                  pricePaise: Math.round(Number(f.priceRupees || 0) * 100),
                  durationDays: Number(f.durationDays || 365),
                  features: customFeat,
                  status: String(f.status || 'active'),
                  isFree: false,
                },
              });
            }
          }}
          customUpdateHandler={async (id, f) => {
            const customFeat = String(f.featuresText || '')
              .split(/\r?\n|,/)
              .map((s) => s.trim())
              .filter(Boolean);

            if (selectedExam !== 'agri') {
              return await apiFetch(`/api/admin/exam/plans/${id}?exam=${selectedExam}`, {
                token,
                method: 'PUT',
                body: {
                  exam: selectedExam,
                  code: f.code,
                  name: f.name,
                  price_paise: Math.round(Number(f.priceRupees || 0) * 100),
                  duration_days: Number(f.durationDays || 365),
                  access_modules: accessModule === 'all' ? ['all'] : [accessModule],
                  target_exams: selectedExam === 'global' ? globalCoveredExams : [selectedExam],
                  features: customFeat,
                  status: String(f.status || 'active'),
                },
              });
            } else {
              return await apiFetch(`/api/admin/plans/${id}`, {
                token,
                method: 'PUT',
                body: {
                  code: f.code,
                  name: f.name,
                  pricePaise: Math.round(Number(f.priceRupees || 0) * 100),
                  durationDays: Number(f.durationDays || 365),
                  features: customFeat,
                  status: String(f.status || 'active'),
                },
              });
            }
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContainer: { padding: 16, gap: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  examBtnRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  examBtn: { flex: 1, minWidth: 60, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  examBtnActive: { backgroundColor: '#059669', borderColor: '#059669' },
  examBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  examBtnTextActive: { color: '#ffffff' },

  moduleRow: { gap: 8 },
  moduleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  moduleBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  moduleBtnText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  moduleBtnTextActive: { color: '#1d4ed8', fontWeight: '800' },
});
