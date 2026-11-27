import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export default function StudentMaterialsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [selectedExam, setSelectedExam] = useState(
    params.exam ? String(params.exam).toLowerCase().trim() : ''
  );
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [pdfs, setPdfs] = useState([]);
  const [subscriptionsDisabled, setSubscriptionsDisabled] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const openProtectedFile = (fileUrl, itemId) => {
    let raw = String(fileUrl || '').trim();
    if (raw.startsWith('gridfs:') && itemId) {
      raw = `/api/student/materials/${itemId}/file`;
    }
    const absoluteUrl = toFileUrl(raw);
    if (!absoluteUrl) {
      Alert.alert('Notice', 'Document link is not available yet.');
      return;
    }
    if (!token) {
      setError('Please login again');
      return;
    }
    const urlWithToken = absoluteUrl.includes('?')
      ? `${absoluteUrl}&token=${encodeURIComponent(token)}`
      : `${absoluteUrl}?token=${encodeURIComponent(token)}`;

    WebBrowser.openBrowserAsync(urlWithToken).catch(() => {
      Alert.alert('Error', 'Failed to open PDF. Please try again.');
    });
  };

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
    (async () => {
      try {
        setLoading(true);
        setError('');
        if (selectedExam === 'agri') {
          const res = await apiFetch('/api/student/materials?type=pdf', { token });
          if (!alive) return;
          setPdfs(Array.isArray(res?.materials) ? res.materials : []);
        } else {
          const subjParam =
            selectedSubject && selectedSubject !== 'All'
              ? `&subject=${encodeURIComponent(selectedSubject.toLowerCase())}`
              : '';
          const res = await apiFetch(`/api/student/exam/materials?exam=${selectedExam}${subjParam}`, { token });
          if (!alive) return;
          setPdfs(Array.isArray(res?.materials) ? res.materials : []);
        }
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load materials');
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
            title="Study Materials"
            subtitle="Choose an exam to access chapter PDFs, notes, and practical guides."
            icon="📚"
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
          <Text style={styles.heroTitle}>{examInfo.name} Study Materials</Text>
          <Text style={styles.heroSub}>
            High-yield PDF notes, textbooks, and reference guides curated for {examInfo.name}.
          </Text>
        </LinearGradient>

        {/* Subject Filter Pills */}
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
            <Text style={styles.loadingText}>Loading {examInfo.name} study materials...</Text>
          </View>
        ) : pdfs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No Study Materials Found</Text>
            <Text style={styles.emptyText}>
              Materials for {examInfo.name}{selectedSubject !== 'All' ? ` (${selectedSubject})` : ''} will appear here soon.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {pdfs.map((m) => (
              <View key={m.id} style={styles.materialCard}>
                <View style={[styles.cardAccent, { backgroundColor: examInfo.color }]} />
                <View style={styles.materialCardBody}>
                  <View style={styles.materialHeader}>
                    <View style={[styles.pdfIconBox, { backgroundColor: examInfo.bg }]}>
                      <Text style={styles.pdfIcon}>📄</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.materialTitle}>{m.title}</Text>
                      <Text style={[styles.materialSubject, { color: examInfo.color }]}>
                        {m.subject || examInfo.name}
                      </Text>
                    </View>
                    {m.locked ? (
                      <View style={styles.badgeLocked}><Text style={styles.badgeLockedText}>🔒 Locked</Text></View>
                    ) : (
                      <View style={styles.badgeUnlocked}><Text style={styles.badgeUnlockedText}>✓ Unlocked</Text></View>
                    )}
                  </View>

                  {!!m.description && (
                    <Text style={styles.materialDesc} numberOfLines={2}>{m.description}</Text>
                  )}

                  <View style={styles.materialFooter}>
                    {m.locked ? (
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
                        style={[styles.btnView, { backgroundColor: examInfo.color }]}
                        onPress={() => openProtectedFile(m.pdfUrl || m.pdf_url, m.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.btnViewText}>📖 View / Download PDF</Text>
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
  grid: { gap: 12 },
  materialCard: {
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
  materialCardBody: { padding: 16, gap: 12 },
  materialHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pdfIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pdfIcon: { fontSize: 22 },
  materialTitle: { fontSize: 15.5, fontWeight: '800', color: '#0f172a' },
  materialSubject: { fontSize: 12, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  materialDesc: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  badgeLocked: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeLockedText: { color: '#b45309', fontSize: 11, fontWeight: '800' },
  badgeUnlocked: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeUnlockedText: { color: '#15803d', fontSize: 11, fontWeight: '800' },
  materialFooter: {},
  btnUnlock: { backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnUnlockText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  btnView: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnViewText: { color: '#fff', fontSize: 13.5, fontWeight: '800' },
});
