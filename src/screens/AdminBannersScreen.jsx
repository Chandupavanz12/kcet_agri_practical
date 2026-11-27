import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

// Predefined professional banner templates
const BANNER_TEMPLATES = [
  {
    id: 'emerald-dream',
    name: 'Emerald Dream',
    bgStart: '#07162c',
    bgEnd: '#059669',
    badge: 'Study & Grow',
  },
  {
    id: 'indigo-ace',
    name: 'Midnight Indigo',
    bgStart: '#1e1b4b',
    bgEnd: '#4338ca',
    badge: 'Top Ranks',
  },
  {
    id: 'cyan-rank',
    name: 'Ocean Cyan',
    bgStart: '#082f49',
    bgEnd: '#0284c7',
    badge: 'Target Rank',
  },
  {
    id: 'rose-success',
    name: 'Crimson Rose',
    bgStart: '#4c0519',
    bgEnd: '#e11d48',
    badge: 'Medical Pro',
  },
  {
    id: 'amber-gold',
    name: 'Obsidian Amber',
    bgStart: '#291500',
    bgEnd: '#d97706',
    badge: 'Score Booster',
  },
  {
    id: 'violet-future',
    name: 'Electric Violet',
    bgStart: '#2e1065',
    bgEnd: '#7c3aed',
    badge: 'Achieve More',
  },
];

const ROUTE_EXAM_OPTIONS = [
  { id: 'all', label: 'All Exams (General)' },
  { id: 'puc', label: 'PUC' },
  { id: 'kcet', label: 'KCET' },
  { id: 'neet', label: 'NEET' },
  { id: 'agri', label: 'Agri Practical' },
];

const ROUTES_BY_EXAM = {
  all: [
    { label: 'Home / Student Dashboard', route: '/student/dashboard' },
    { label: 'Study Materials (All Exams)', route: '/student/materials' },
    { label: 'Mock Tests (All Exams)', route: '/student/tests' },
    { label: 'Previous Year Papers (All Exams)', route: '/student/pyqs' },
    { label: 'Video Guidance (All Exams)', route: '/student/videos' },
    { label: 'Progress & Analytics', route: '/student/progress' },
  ],
  puc: [
    { label: 'PUC Exam Overview', route: '/student/exam/puc' },
    { label: 'PUC Video Guidance', route: '/student/videos?exam=puc' },
    { label: 'PUC Study Materials', route: '/student/exam/puc?module=materials' },
    { label: 'PUC Mock Tests', route: '/student/exam/puc?module=tests' },
    { label: 'PUC Previous Year Papers', route: '/student/exam/puc?module=pyqs' },
    { label: 'PUC Subscription Plans', route: '/student/exam/puc?module=plans' },
  ],
  kcet: [
    { label: 'KCET Exam Overview', route: '/student/exam/kcet' },
    { label: 'KCET Study Materials', route: '/student/exam/kcet?module=materials' },
    { label: 'KCET Mock Tests', route: '/student/exam/kcet?module=tests' },
    { label: 'KCET Previous Year Papers', route: '/student/exam/kcet?module=pyqs' },
    { label: 'KCET Subscription Plans', route: '/student/exam/kcet?module=plans' },
  ],
  neet: [
    { label: 'NEET Exam Overview', route: '/student/exam/neet' },
    { label: 'NEET Study Materials', route: '/student/exam/neet?module=materials' },
    { label: 'NEET Mock Tests', route: '/student/exam/neet?module=tests' },
    { label: 'NEET Previous Year Papers', route: '/student/exam/neet?module=pyqs' },
    { label: 'NEET Subscription Plans', route: '/student/exam/neet?module=plans' },
  ],
  agri: [
    { label: 'Agri Exam Overview', route: '/student/exam/agri' },
    { label: 'Agri Video Guidance', route: '/student/videos?exam=agri' },
    { label: 'Agri Study Materials', route: '/student/materials?exam=agri' },
    { label: 'Agri Mock Tests', route: '/student/tests?exam=agri' },
    { label: 'Agri Previous Year Papers', route: '/student/pyqs?exam=agri' },
    { label: 'Agri Subscription Plans', route: '/student/premium' },
  ],
};

export default function AdminBannersScreen() {
  const { token } = useAuth();
  const router = useRouter();

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Form State
  const [selectedTemplate, setSelectedTemplate] = useState(BANNER_TEMPLATES[0]);
  const [exam, setExam] = useState('global'); // 'global' | 'puc' | 'kcet' | 'neet' | 'agri'
  const [title, setTitle] = useState('');
  const [highlightText, setHighlightText] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [buttonText, setButtonText] = useState('Start Learning >');
  const [routeExam, setRouteExam] = useState('all');
  const [actionRoute, setActionRoute] = useState('/student/dashboard');
  const [examDropdownOpen, setExamDropdownOpen] = useState(false);
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch('/api/admin/banners', { token });
      setBanners(Array.isArray(res?.banners) ? res.banners : []);
    } catch (err) {
      setError(err?.message || 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, [token]);

  const handleCreateBanner = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a banner title.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await apiFetch('/api/admin/banners', {
        token,
        method: 'POST',
        body: {
          exam,
          template_id: selectedTemplate.id,
          title: title.trim(),
          highlight_text: highlightText.trim(),
          subtitle: subtitle.trim(),
          button_text: buttonText.trim(),
          action_route: actionRoute.trim(),
          image_url: imageUrl.trim(),
          bg_gradient_start: selectedTemplate.bgStart,
          bg_gradient_end: selectedTemplate.bgEnd,
          is_active: isActive,
        },
      });
      setMessage('Banner created successfully!');
      setCreating(false);
      // Reset form
      setTitle('');
      setHighlightText('');
      setSubtitle('');
      setImageUrl('');
      loadBanners();
    } catch (err) {
      setError(err?.message || 'Failed to create banner');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBanner = (id) => {
    Alert.alert('Delete Banner', 'Are you sure you want to delete this banner?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/api/admin/banners/${id}`, { token, method: 'DELETE' });
            loadBanners();
          } catch (err) {
            Alert.alert('Error', err?.message || 'Failed to delete banner');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Banner Manager</Text>
          <TouchableOpacity
            style={styles.btnAdd}
            onPress={() => setCreating(!creating)}
            activeOpacity={0.8}
          >
            <Text style={styles.btnAddText}>{creating ? 'Cancel' : '+ New Banner'}</Text>
          </TouchableOpacity>
        </View>

        {!!message && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{message}</Text>
          </View>
        )}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* CREATE BANNER FORM */}
        {creating && (
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Create Professional Banner</Text>

            {/* Template Selector */}
            <Text style={styles.fieldLabel}>1. Select Color Theme Template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroll}>
              {BANNER_TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplate.id;
                return (
                  <TouchableOpacity
                    key={tmpl.id}
                    onPress={() => setSelectedTemplate(tmpl)}
                    style={[styles.templatePill, isSelected && styles.templatePillActive]}
                  >
                    <LinearGradient
                      colors={[tmpl.bgStart, tmpl.bgEnd]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.templateGradient}
                    />
                    <Text style={styles.templateName}>{tmpl.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Target Exam */}
            <Text style={styles.fieldLabel}>2. Target Exam Screen</Text>
            <View style={styles.examPickerRow}>
              {['global', 'puc', 'kcet', 'neet', 'agri'].map((ex) => (
                <TouchableOpacity
                  key={ex}
                  onPress={() => setExam(ex)}
                  style={[styles.examChoice, exam === ex && styles.examChoiceActive]}
                >
                  <Text style={[styles.examChoiceText, exam === ex && styles.examChoiceTextActive]}>
                    {ex.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Text Inputs */}
            <Text style={styles.fieldLabel}>3. Title & Heading</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dream Big..."
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.fieldLabel}>4. Highlighted Golden Text</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Prepare Smart!"
              value={highlightText}
              onChangeText={setHighlightText}
            />

            <Text style={styles.fieldLabel}>5. Subtitle</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Your Complete Exam Preparation Partner"
              value={subtitle}
              onChangeText={setSubtitle}
            />

            <Text style={styles.fieldLabel}>6. Button Text</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Explore Now >"
              value={buttonText}
              onChangeText={setButtonText}
            />

            <Text style={styles.fieldLabel}>6b. Navigation Route (Select Exam & Destination Page)</Text>
            <View style={{ gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => {
                  setExamDropdownOpen(!examDropdownOpen);
                  setPageDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownTriggerText}>
                  Exam: {ROUTE_EXAM_OPTIONS.find((o) => o.id === routeExam)?.label || 'All Exams'}
                </Text>
                <Text style={styles.dropdownArrow}>{examDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {examDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {ROUTE_EXAM_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.dropdownItem, routeExam === opt.id && styles.dropdownItemActive]}
                      onPress={() => {
                        setRouteExam(opt.id);
                        const firstRoute = ROUTES_BY_EXAM[opt.id]?.[0]?.route || '/student/dashboard';
                        setActionRoute(firstRoute);
                        setExamDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, routeExam === opt.id && styles.dropdownItemTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => {
                  setPageDropdownOpen(!pageDropdownOpen);
                  setExamDropdownOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownTriggerText}>
                  Page: {(ROUTES_BY_EXAM[routeExam] || []).find((r) => r.route === actionRoute)?.label || actionRoute}
                </Text>
                <Text style={styles.dropdownArrow}>{pageDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {pageDropdownOpen && (
                <View style={styles.dropdownMenu}>
                  {(ROUTES_BY_EXAM[routeExam] || []).map((opt) => (
                    <TouchableOpacity
                      key={opt.route}
                      style={[styles.dropdownItem, actionRoute === opt.route && styles.dropdownItemActive]}
                      onPress={() => {
                        setActionRoute(opt.route);
                        setPageDropdownOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownItemText, actionRoute === opt.route && styles.dropdownItemTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.routePreviewPill}>
                <Text style={styles.routePreviewText}>Target Route: {actionRoute}</Text>
              </View>
            </View>

            <Text style={styles.fieldLabel}>7. Student Image URL (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              value={imageUrl}
              onChangeText={setImageUrl}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active Status</Text>
              <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: '#10b981' }} />
            </View>

            {/* LIVE PREVIEW */}
            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Live Banner Preview:</Text>
            <LinearGradient
              colors={[selectedTemplate.bgStart, selectedTemplate.bgEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewBanner}
            >
              <View style={{ flex: 1.2, gap: 6 }}>
                <Text style={styles.previewTitle}>
                  {title || 'Dream Big...'}{' '}
                  <Text style={{ color: '#facc15', fontStyle: 'italic' }}>
                    {highlightText || 'Prepare Smart!'}
                  </Text>
                </Text>
                <Text style={styles.previewSub}>
                  {subtitle || 'Your Complete Exam Preparation Partner'}
                </Text>
                <View style={styles.previewBtn}>
                  <Text style={styles.previewBtnText}>{buttonText || 'Start Learning >'}</Text>
                </View>
              </View>
              <View style={{ flex: 0.8, alignItems: 'center' }}>
                <Image
                  source={{
                    uri: imageUrl || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&auto=format&fit=crop&q=80',
                  }}
                  style={styles.previewImg}
                />
              </View>
            </LinearGradient>

            <TouchableOpacity
              style={styles.btnSubmit}
              onPress={handleCreateBanner}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnSubmitText}>Publish Banner</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* EXISTING BANNERS LIST */}
        <Text style={styles.sectionTitle}>Existing Banners ({banners.length})</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#059669" style={{ marginVertical: 20 }} />
        ) : banners.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No banners found</Text>
            <Text style={styles.emptySub}>Create your first banner using the templates above!</Text>
          </View>
        ) : (
          banners.map((b) => (
            <View key={b.id} style={styles.bannerItemCard}>
              <LinearGradient
                colors={[b.bg_gradient_start || '#07162c', b.bg_gradient_end || '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardPreview}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {b.title} <Text style={{ color: '#facc15' }}>{b.highlight_text}</Text>
                  </Text>
                  <Text style={styles.cardSub}>{b.subtitle}</Text>
                  <Text style={styles.cardTag}>Target: {String(b.exam || 'global').toUpperCase()}</Text>
                </View>
              </LinearGradient>

              <View style={styles.cardActionsRow}>
                <Text style={[styles.statusBadge, { color: b.is_active ? '#16a34a' : '#dc2626' }]}>
                  {b.is_active ? '● Active' : '● Inactive'}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteBanner(b.id)} style={styles.btnDelete}>
                  <Text style={styles.btnDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  backBtnText: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  btnAdd: { backgroundColor: '#059669', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  btnAddText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  successBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', padding: 12, borderRadius: 12 },
  successText: { color: '#166534', fontWeight: '600', fontSize: 13 },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 12 },
  errorText: { color: '#b91c1c', fontWeight: '600', fontSize: 13 },

  formCard: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  formCardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  templateScroll: { gap: 10, paddingVertical: 4 },
  templatePill: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, paddingRight: 14, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 2, borderColor: '#e2e8f0' },
  templatePillActive: { borderColor: '#059669', backgroundColor: '#ecfdf5' },
  templateGradient: { width: 22, height: 22, borderRadius: 11 },
  templateName: { fontSize: 12, fontWeight: '700', color: '#0f172a' },

  examPickerRow: { flexDirection: 'row', gap: 8 },
  examChoice: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  examChoiceActive: { backgroundColor: '#059669', borderColor: '#059669' },
  examChoiceText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  examChoiceTextActive: { color: '#ffffff' },

  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#f8fafc' },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#f8fafc',
  },
  dropdownTriggerText: { fontSize: 13.5, fontWeight: '700', color: '#0f172a' },
  dropdownArrow: { fontSize: 11, color: '#64748b' },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemActive: { backgroundColor: '#ecfdf5' },
  dropdownItemText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  dropdownItemTextActive: { color: '#059669', fontWeight: '800' },
  routePreviewPill: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  routePreviewText: { fontSize: 11.5, fontWeight: '700', color: '#1d4ed8' },
  rowTwoCol: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#0f172a' },

  previewBanner: { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center' },
  previewTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff', lineHeight: 22 },
  previewSub: { fontSize: 11, color: '#e2e8f0', marginTop: 2 },
  previewBtn: { alignSelf: 'flex-start', backgroundColor: '#facc15', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginTop: 6 },
  previewBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 11 },
  previewImg: { width: 85, height: 100, borderRadius: 12 },

  btnSubmit: { backgroundColor: '#059669', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  btnSubmitText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  emptySub: { fontSize: 13, color: '#64748b', marginTop: 4 },

  bannerItemCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardPreview: { padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#ffffff' },
  cardSub: { fontSize: 12, color: '#e2e8f0', marginTop: 2 },
  cardTag: { fontSize: 11, fontWeight: '700', color: '#facc15', marginTop: 8 },
  cardActionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#ffffff' },
  statusBadge: { fontSize: 13, fontWeight: '700' },
  btnDelete: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#fef2f2' },
  btnDeleteText: { color: '#dc2626', fontWeight: '700', fontSize: 12 },
});
