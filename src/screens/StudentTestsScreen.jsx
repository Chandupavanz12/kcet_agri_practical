import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import ExamSelectorView, { EXAM_OPTIONS } from '../components/ExamSelectorView.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const TESTS_CLIENT_CACHE = new Map();

const SUBJECTS_BY_EXAM = {
  puc: ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'],
  kcet: ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'],
  neet: ['All', 'Physics', 'Chemistry', 'Biology'],
  agri: [],
};

export default function StudentTestsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [selectedExam, setSelectedExam] = useState(
    params.exam ? String(params.exam).toLowerCase().trim() : ''
  );
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [tests, setTests] = useState([]);
  const [subscriptionsDisabled, setSubscriptionsDisabled] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.exam) {
      setSelectedExam(String(params.exam).toLowerCase().trim());
    }
  }, [params.exam]);

  useEffect(() => {
    apiFetch('/api/student/subscription-settings', { token })
      .then((res) => {
        if (Array.isArray(res?.subscriptionsDisabled)) setSubscriptionsDisabled(res.subscriptionsDisabled);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!selectedExam) return;
    let alive = true;
    const cacheKey = `${selectedExam}:${selectedSubject}`;
    const cached = TESTS_CLIENT_CACHE.get(cacheKey);
    if (cached) {
      setTests(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    (async () => {
      try {
        setError('');
        let list = [];
        if (selectedExam === 'agri') {
          const res = await apiFetch('/api/student/tests', { token });
          list = Array.isArray(res?.tests) ? res.tests : [];
        } else {
          const subjParam =
            selectedSubject && selectedSubject !== 'All'
              ? `&subject=${encodeURIComponent(selectedSubject.toLowerCase())}`
              : '';
          const res = await apiFetch(`/api/student/exam/tests?exam=${selectedExam}${subjParam}`, { token });
          list = Array.isArray(res?.tests) ? res.tests : [];
        }
        if (!alive) return;
        TESTS_CLIENT_CACHE.set(cacheKey, list);
        setTests(list);
      } catch (e) {
        if (!alive) return;
        if (!cached) setError(e?.message || 'Failed to load tests');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, selectedExam, selectedSubject]);

  const examInfo = EXAM_OPTIONS.find((e) => e.id === selectedExam) || EXAM_OPTIONS[3];
  const subjects = SUBJECTS_BY_EXAM[selectedExam] || [];

  if (!selectedExam) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ExamSelectorView
            title="Mock Tests"
            subtitle="Choose an exam below to practice timed mock tests and track your rank."
            icon="📝"
            onSelectExam={(id) => {
              setSelectedSubject('All');
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
          <Text style={styles.heroTitle}>{examInfo.name} Mock Tests</Text>
          <Text style={styles.heroSub}>
            Timed exam simulations with instant scoring and detailed solutions.
          </Text>
        </LinearGradient>

        {/* Subject Filter Pills (for PUC / KCET / NEET) */}
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
            <Text style={styles.loadingText}>Loading {examInfo.name} mock tests...</Text>
          </View>
        ) : tests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyTitle}>No Mock Tests Yet</Text>
            <Text style={styles.emptyText}>
              Mock tests for {examInfo.name}{selectedSubject !== 'All' ? ` (${selectedSubject})` : ''} will appear here soon.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {tests.map((t) => (
              <View key={t.id} style={styles.testCard}>
                <View style={[styles.cardAccent, { backgroundColor: examInfo.color }]} />
                <View style={styles.testCardBody}>
                  <View style={styles.testHeaderRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.testTitle}>{t.title}</Text>
                      {!!t.subject && (
                        <Text style={[styles.subjectTag, { color: examInfo.color }]}>{t.subject}</Text>
                      )}
                    </View>
                    <View style={[styles.statusBadge, t.locked ? styles.badgeLocked : styles.badgeFree]}>
                      <Text style={[styles.statusBadgeText, t.locked ? styles.badgeLockedText : styles.badgeFreeText]}>
                        {t.locked ? '🔒 Locked' : '✓ Unlocked'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>❓ {t.questionCount || t.question_count || 0} Questions</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>⏱️ {t.durationMinutes || 30} mins</Text>
                    </View>
                  </View>

                  {t.locked ? (
                    !(subscriptionsDisabled.includes('all') || subscriptionsDisabled.includes(selectedExam)) ? (
                      <TouchableOpacity
                        style={styles.btnUnlock}
                        onPress={() =>
                          router.push(selectedExam === 'agri' ? '/student/premium' : `/student/exam/${selectedExam}?module=plans`)
                        }
                        activeOpacity={0.85}
                      >
                        <Text style={styles.btnUnlockText}>🔒 Unlock with {examInfo.name} Plan 💳</Text>
                      </TouchableOpacity>
                    ) : null
                  ) : (
                    <TouchableOpacity
                      style={[styles.btnPrimary, { backgroundColor: examInfo.color }]}
                      onPress={() =>
                        router.push(
                          selectedExam === 'agri'
                            ? `/student/mock-test/${t.id}`
                            : `/student/mock-test/${t.id}?exam=${selectedExam}`
                        )
                      }
                      activeOpacity={0.85}
                    >
                      <Text style={styles.btnPrimaryText}>Start Test 🚀</Text>
                    </TouchableOpacity>
                  )}
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
  grid: { gap: 12 },
  testCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: { height: 4 },
  testCardBody: { padding: 16, gap: 12 },
  testHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  testTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  subjectTag: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  metaChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  btnPrimary: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnUnlock: { backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnUnlockText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeLocked: { backgroundColor: '#fef3c7' },
  badgeLockedText: { color: '#b45309', fontSize: 11, fontWeight: '800' },
  badgeFree: { backgroundColor: '#dcfce7' },
  badgeFreeText: { color: '#15803d', fontSize: 11, fontWeight: '800' },
});
