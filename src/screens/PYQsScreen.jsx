import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import ExamSelectorView, { EXAM_OPTIONS } from '../components/ExamSelectorView.jsx';
import { API_BASE_URL as apiBaseUrl } from '../config/env';
import { useAuth } from '../contexts/AuthContext.jsx';

const SUBJECTS_BY_EXAM = {
  puc: ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'],
  kcet: ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'],
  neet: ['All', 'Physics', 'Chemistry', 'Biology'],
  agri: [],
};

export default function PYQsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [selectedExam, setSelectedExam] = useState(
    params.exam ? String(params.exam).toLowerCase().trim() : ''
  );
  const [selectedSubject, setSelectedSubject] = useState('All');

  // Agri state (centre -> year -> pyqs)
  const [centres, setCentres] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Shared PYQs state
  const [pyqs, setPyqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingPyqs, setLoadingPyqs] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.exam) {
      setSelectedExam(String(params.exam).toLowerCase().trim());
    }
  }, [params.exam]);

  const toFileUrl = (u) => {
    const url = String(u || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Load Exam-specific PYQs (PUC / KCET / NEET) or Centres (Agri)
  useEffect(() => {
    if (!selectedExam) return;
    let alive = true;
    (async () => {
      try {
        setError('');
        setLoading(true);
        if (selectedExam === 'agri') {
          const res = await apiFetch('/api/student/exam-centres', { token });
          if (!alive) return;
          setCentres(Array.isArray(res?.centres) ? res.centres : []);
        } else {
          const subjParam =
            selectedSubject && selectedSubject !== 'All'
              ? `&subject=${encodeURIComponent(selectedSubject.toLowerCase())}`
              : '';
          const res = await apiFetch(`/api/student/exam/pyqs?exam=${selectedExam}${subjParam}`, { token });
          if (!alive) return;
          setPyqs(Array.isArray(res?.pyqs) ? res.pyqs : []);
        }
      } catch (err) {
        if (!alive) return;
        setError(err?.message || 'Failed to load PYQs');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, selectedExam, selectedSubject]);

  // Agri: load years when centre selected
  useEffect(() => {
    if (selectedExam !== 'agri' || !selectedCentreId) {
      setYears([]);
      setSelectedYear('');
      if (selectedExam === 'agri') setPyqs([]);
      return;
    }
    (async () => {
      try {
        setError('');
        setLoadingYears(true);
        setYears([]);
        setSelectedYear('');
        setPyqs([]);
        const res = await apiFetch(`/api/student/exam-centres/${selectedCentreId}/years`, { token });
        setYears(Array.isArray(res?.years) ? res.years : []);
      } catch (err) {
        setError(err?.message || 'Failed to load years');
      } finally {
        setLoadingYears(false);
      }
    })();
  }, [selectedExam, selectedCentreId, token]);

  // Agri: load PYQs when year selected
  useEffect(() => {
    if (selectedExam !== 'agri' || !selectedCentreId || !selectedYear) {
      if (selectedExam === 'agri') setPyqs([]);
      return;
    }
    (async () => {
      try {
        setError('');
        setLoadingPyqs(true);
        setPyqs([]);
        const qs = `centreId=${selectedCentreId}&year=${selectedYear}`;
        const res = await apiFetch(`/api/student/pyqs/by-centre-year?${qs}`, { token });
        setPyqs(Array.isArray(res?.pyqs) ? res.pyqs : []);
      } catch (err) {
        setError(err?.message || 'Failed to load PYQs');
      } finally {
        setLoadingPyqs(false);
      }
    })();
  }, [selectedExam, selectedCentreId, selectedYear, token]);

  const openPyq = (p) => {
    if (p?.locked) {
      router.push(selectedExam === 'agri' ? '/student/premium' : `/student/exam/${selectedExam}?module=plans`);
      return;
    }
    const rawUrl = selectedExam === 'agri' ? `/api/student/pyqs/${p.id}/pdf` : (p.pdfUrl || p.pdf_url);
    const absoluteUrl = toFileUrl(rawUrl);
    if (!absoluteUrl) {
      Alert.alert('Not Available', 'Failed to generate PDF link.');
      return;
    }
    const urlWithToken = absoluteUrl.includes('?')
      ? `${absoluteUrl}&token=${encodeURIComponent(token)}`
      : `${absoluteUrl}?token=${encodeURIComponent(token)}`;

    const finalUrl =
      Platform.OS === 'android'
        ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(urlWithToken)}`
        : urlWithToken;

    WebBrowser.openBrowserAsync(finalUrl).catch(() => {
      Alert.alert('Error', 'Failed to open PDF. Please try again.');
    });
  };

  const examInfo = EXAM_OPTIONS.find((e) => e.id === selectedExam) || EXAM_OPTIONS[3];
  const subjects = SUBJECTS_BY_EXAM[selectedExam] || [];

  if (!selectedExam) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ExamSelectorView
            title="Previous Year Papers"
            subtitle="Choose an exam to practice solved and unsolved previous year question papers."
            icon="📑"
            onSelectExam={(id) => {
              setSelectedSubject('All');
              setSelectedCentreId('');
              setSelectedYear('');
              setPyqs([]);
              setSelectedExam(id);
            }}
            onBack={() => router.back()}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Modern Gradient Header */}
        <LinearGradient
          colors={examInfo.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              onPress={() => (params.exam ? router.back() : setSelectedExam(''))}
              style={styles.heroBackBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.heroBackText}>
                {params.exam ? '← Back' : '← Change Exam'}
              </Text>
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{examInfo.icon} {examInfo.name}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{examInfo.name} Previous Papers</Text>
          <Text style={styles.heroSub}>
            {selectedExam === 'agri'
              ? 'Select your practical exam centre and year to access question papers.'
              : `Previous year question papers for ${examInfo.fullName}.`}
          </Text>
        </LinearGradient>

        {/* Subject Filter Pills (PUC / KCET / NEET) */}
        {subjects.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectRow}>
            {subjects.map((subj) => {
              const active = selectedSubject === subj;
              return (
                <TouchableOpacity
                  key={subj}
                  onPress={() => setSelectedSubject(subj)}
                  style={[
                    styles.subjectPill,
                    active && { backgroundColor: examInfo.color, borderColor: examInfo.color },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.subjectText, active && styles.subjectTextActive]}>{subj}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={examInfo.color} />
            <Text style={styles.loadingText}>Loading {examInfo.name} papers...</Text>
          </View>
        ) : selectedExam === 'agri' ? (
          /* Upgraded Agri Practical Centre & Year UI */
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.label}>Select Exam Centre</Text>
              <TouchableOpacity
                style={styles.dropdownHeader}
                onPress={() => setDropdownOpen(!dropdownOpen)}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownHeaderText}>
                  {selectedCentreId
                    ? centres.find((c) => String(c.id) === selectedCentreId)?.name || 'Select Exam Centre'
                    : 'Choose an Exam Centre'}
                </Text>
                <Text style={styles.dropdownHeaderArrow}>{dropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {dropdownOpen && (
                <View style={styles.dropdownList}>
                  {centres.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.dropdownItem, selectedCentreId === String(c.id) && styles.dropdownItemActive]}
                      onPress={() => {
                        setSelectedCentreId(String(c.id));
                        setDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedCentreId === String(c.id) && styles.dropdownItemTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {loadingYears && <Text style={styles.loadingHint}>Loading years...</Text>}

              <View style={styles.divider} />

              {!selectedCentreId ? (
                <Text style={styles.emptyHint}>Select an exam centre above to view available years.</Text>
              ) : !selectedYear ? (
                <View>
                  <Text style={styles.sectionTitle}>Available Years</Text>
                  {years.length === 0 && !loadingYears ? (
                    <Text style={styles.emptyHint}>No years available for this centre.</Text>
                  ) : (
                    <View style={styles.yearsGrid}>
                      {years.map((y) => (
                        <TouchableOpacity
                          key={y.id}
                          style={styles.yearCard}
                          onPress={() => setSelectedYear(String(y.year))}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.yearText}>{y.year}</Text>
                          <Text style={styles.yearSubtext}>View Papers →</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View>
                  <View style={styles.flexRowBetween}>
                    <Text style={styles.sectionTitle}>Year {selectedYear}</Text>
                    <TouchableOpacity onPress={() => setSelectedYear('')} style={styles.btnGhost}>
                      <Text style={styles.btnGhostText}>← All Years</Text>
                    </TouchableOpacity>
                  </View>

                  {loadingPyqs ? (
                    <ActivityIndicator size="small" color={examInfo.color} style={{ marginVertical: 16 }} />
                  ) : pyqs.length === 0 ? (
                    <Text style={styles.emptyHint}>No PYQs found for {selectedYear}.</Text>
                  ) : (
                    <View style={styles.pyqGrid}>
                      {pyqs.map((p) => (
                        <View key={p.id} style={styles.pyqCard}>
                          <View style={styles.flexRowBetween}>
                            <Text style={styles.pyqTitle} numberOfLines={2}>{p.title}</Text>
                            {p.locked ? (
                              <View style={styles.badgeWarning}>
                                <Text style={styles.badgeWarningText}>🔒 Locked</Text>
                              </View>
                            ) : (
                              <View style={styles.badgeSuccess}>
                                <Text style={styles.badgeSuccessText}>✓ Unlocked</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.pyqSubject}>{p.subject} • {p.year}</Text>
                          <View style={styles.pyqFooter}>
                            {p.locked ? (
                              <TouchableOpacity style={styles.btnUnlock} onPress={() => router.push('/student/premium')}>
                                <Text style={styles.btnUnlockText}>🔒 Unlock with Agri Plan 💳</Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity style={[styles.btnView, { backgroundColor: examInfo.color }]} onPress={() => openPyq(p)}>
                                <Text style={styles.btnViewText}>📑 View Document</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        ) : pyqs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📑</Text>
            <Text style={styles.emptyTitle}>No Previous Papers Yet</Text>
            <Text style={styles.emptyText}>
              Papers for {examInfo.name}{selectedSubject !== 'All' ? ` (${selectedSubject})` : ''} will appear here soon.
            </Text>
          </View>
        ) : (
          <View style={styles.pyqGrid}>
            {pyqs.map((p) => (
              <View key={p.id} style={styles.pyqCard}>
                <View style={[styles.cardAccent, { backgroundColor: examInfo.color }]} />
                <View style={{ padding: 16 }}>
                  <View style={styles.flexRowBetween}>
                    <Text style={styles.pyqTitle} numberOfLines={2}>{p.title}</Text>
                    {p.locked ? (
                      <View style={styles.badgeWarning}>
                        <Text style={styles.badgeWarningText}>🔒 Locked</Text>
                      </View>
                    ) : (
                      <View style={styles.badgeSuccess}>
                        <Text style={styles.badgeSuccessText}>✓ Unlocked</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.pyqSubject, { color: examInfo.color }]}>
                    {p.subject || examInfo.name} {p.year ? `• ${p.year}` : ''}
                  </Text>
                  <View style={styles.pyqFooter}>
                    {p.locked ? (
                      <TouchableOpacity
                        style={styles.btnUnlock}
                        onPress={() => router.push(`/student/exam/${selectedExam}?module=plans`)}
                      >
                        <Text style={styles.btnUnlockText}>🔒 Unlock with {examInfo.name} Plan 💳</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.btnView, { backgroundColor: examInfo.color }]}
                        onPress={() => openPyq(p)}
                      >
                        <Text style={styles.btnViewText}>📑 View Paper PDF</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 14, paddingBottom: 36 },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    gap: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  heroBackBtn: { backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  heroBackText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: 13, color: '#e2e8f0', lineHeight: 18 },
  subjectRow: { gap: 8, paddingVertical: 2 },
  subjectPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subjectText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  subjectTextActive: { color: '#fff' },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  loadingBox: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  emptyState: {
    padding: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 6,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardBody: { padding: 18 },
  label: { fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 10, textTransform: 'uppercase' },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  dropdownHeaderText: { fontSize: 14.5, fontWeight: '700', color: '#1e293b' },
  dropdownHeaderArrow: { fontSize: 12, color: '#64748b' },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemActive: { backgroundColor: '#ecfdf5' },
  dropdownItemText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  dropdownItemTextActive: { color: '#059669', fontWeight: '700' },
  loadingHint: { fontSize: 12, color: '#64748b', marginTop: 8 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 18 },
  emptyHint: { fontSize: 13.5, color: '#64748b', textAlign: 'center', paddingVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  yearsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  yearCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 18,
  },
  yearText: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  yearSubtext: { fontSize: 11, fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', marginTop: 6 },
  flexRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  btnGhost: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 8 },
  btnGhostText: { fontSize: 12, color: '#334155', fontWeight: '700' },
  pyqGrid: { gap: 12, marginTop: 6 },
  pyqCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  cardAccent: { height: 4, marginHorizontal: -16, marginTop: -16, marginBottom: 12 },
  pyqTitle: { flex: 1, fontSize: 15.5, fontWeight: '800', color: '#0f172a' },
  badgeWarning: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeWarningText: { color: '#b45309', fontSize: 11, fontWeight: '800' },
  badgeSuccess: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeSuccessText: { color: '#15803d', fontSize: 11, fontWeight: '800' },
  pyqSubject: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginTop: 6 },
  pyqFooter: { marginTop: 14 },
  btnUnlock: { backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnUnlockText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  btnView: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnViewText: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
});
