import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function StudentProgressScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isSmall = width < 380;
  const isLarge = width > 768;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [aggregated, setAggregated] = useState(null);
  const [results, setResults] = useState([]);
  const [selectedExamFilter, setSelectedExamFilter] = useState('all'); // 'all' | 'puc' | 'kcet' | 'neet' | 'agri'

  const loadData = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [aggRes, resRes] = await Promise.all([
        apiFetch('/api/student/aggregated-progress', { token }).catch(() => null),
        apiFetch('/api/student/results', { token }).catch(() => null),
      ]);

      if (aggRes && aggRes.success) {
        setAggregated(aggRes);
      }
      if (resRes && Array.isArray(resRes.results)) {
        setResults(resRes.results);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load progress analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const onRefresh = () => {
    loadData(true);
  };

  const overall = aggregated?.overall || {
    progressPercent: 0,
    totalTestsGiven: 0,
    totalScore: 0,
    correctCount: 0,
    wrongCount: 0,
    totalQuestions: 0,
    overallAccuracy: 0,
    motivationalQuote: 'Take your first mock test today to unlock your personalized analytics and boost your score!',
  };

  const examsList = useMemo(() => {
    const list = Array.isArray(aggregated?.exams) ? aggregated.exams : [];
    if (selectedExamFilter === 'all') return list;
    return list.filter((e) => e.exam === selectedExamFilter);
  }, [aggregated, selectedExamFilter]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/student/dashboard');
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading your detailed progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* ─── Top Header Bar ──────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backButtonArrow}>←</Text>
          <Text style={styles.backButtonText}>Dashboard</Text>
        </TouchableOpacity>
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>📊 Analytics</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isLarge && styles.scrollContentLarge]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16a34a']} />}
      >
        {/* Title Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Your Learning Progress</Text>
          <Text style={styles.pageSub}>
            Comprehensive subject-wise analytics, accuracy, and test metrics
          </Text>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* ─── 1. OVERALL PROGRESS HERO CARD ───────────────────────────────── */}
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleRow}>
              <Text style={{ fontSize: 20 }}>🎯</Text>
              <Text style={styles.heroTitle}>Overall Preparation Status</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {overall.progressPercent >= 75 ? 'Mastery 🔥' : overall.progressPercent >= 40 ? 'On Track ⚡' : 'Starting 🚀'}
              </Text>
            </View>
          </View>

          {/* Circle Ring & Summary */}
          <View style={styles.heroBodyRow}>
            {/* Visual Ring */}
            <View style={styles.ringWrapper}>
              <View style={[styles.ringOuter, { borderColor: overall.progressPercent >= 60 ? '#22c55e' : '#38bdf8' }]}>
                <Text style={styles.ringPercentText}>{overall.progressPercent}%</Text>
                <Text style={styles.ringSubText}>Done</Text>
              </View>
            </View>

            {/* Motivational message callout */}
            <View style={styles.motivationCallout}>
              <Text style={styles.motivationHeading}>Ranker's Motivation</Text>
              <Text style={styles.motivationText}>{overall.motivationalQuote}</Text>
            </View>
          </View>

          {/* 4-Stat Metric Row */}
          <View style={styles.statGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statIcon}>📝</Text>
              <Text style={styles.statNumber}>{overall.totalTestsGiven}</Text>
              <Text style={styles.statLabel}>Tests Attended</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statIcon}>⭐</Text>
              <Text style={styles.statNumber}>{overall.totalScore}</Text>
              <Text style={styles.statLabel}>Total Marks</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statIcon}>✅ / ❌</Text>
              <Text style={styles.statNumberGreen}>
                {overall.correctCount} <Text style={styles.statNumberRed}>/ {overall.wrongCount}</Text>
              </Text>
              <Text style={styles.statLabel}>Correct / Wrong</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statIcon}>🎯</Text>
              <Text style={styles.statNumber}>{overall.overallAccuracy}%</Text>
              <Text style={styles.statLabel}>Avg Accuracy</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ─── 2. EXAM SELECTOR FILTER TABS ────────────────────────────────── */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionHeading}>Filter by Exam</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {[
              { id: 'all', label: '🌟 All Exams', badge: '4' },
              { id: 'puc', label: '📄 PUC', badge: 'Class 12' },
              { id: 'kcet', label: '🎯 KCET', badge: 'CET' },
              { id: 'neet', label: '🩺 NEET', badge: 'Medical' },
              { id: 'agri', label: '🌱 Agri Practical', badge: 'Practical' },
            ].map((tab) => {
              const active = selectedExamFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setSelectedExamFilter(tab.id)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ─── 3. ONE-BY-ONE EXAM PROGRESS CARDS ──────────────────────────── */}
        <View style={styles.examsContainer}>
          {examsList.map((exam) => {
            const hasTests = exam.testsAttended > 0;
            return (
              <View key={exam.exam} style={styles.examSectionCard}>
                {/* Exam Banner Header */}
                <View style={[styles.examHeaderBar, { backgroundColor: exam.bgColor || '#f1f5f9' }]}>
                  <View style={styles.examHeaderLeft}>
                    <View style={styles.examIconWrap}>
                      <Text style={{ fontSize: 24 }}>{exam.icon}</Text>
                    </View>
                    <View>
                      <Text style={[styles.examNameText, { color: exam.themeColor }]}>{exam.name}</Text>
                      <Text style={styles.examTagline}>{exam.tagline}</Text>
                    </View>
                  </View>

                  <View style={[styles.examCompletionPill, { backgroundColor: exam.themeColor }]}>
                    <Text style={styles.examCompletionText}>{exam.progressPercent}% Complete</Text>
                  </View>
                </View>

                {/* Exam Motivation Quote Banner */}
                <View style={styles.examMotivationBanner}>
                  <Text style={styles.examMotivationIcon}>💡</Text>
                  <Text style={styles.examMotivationText}>{exam.motivationMessage}</Text>
                </View>

                {/* Exam Overall Metric Stats Row */}
                <View style={styles.examMetricRow}>
                  <View style={styles.examMetricItem}>
                    <Text style={styles.examMetricVal}>{exam.testsAttended}</Text>
                    <Text style={styles.examMetricLbl}>Tests Given</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.examMetricItem}>
                    <Text style={styles.examMetricVal}>{exam.totalScore}</Text>
                    <Text style={styles.examMetricLbl}>Marks</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.examMetricItem}>
                    <Text style={styles.examMetricVal}>
                      <Text style={{ color: '#16a34a' }}>{exam.correctCount}</Text>
                      <Text style={{ color: '#94a3b8' }}> / </Text>
                      <Text style={{ color: '#ef4444' }}>{exam.wrongCount}</Text>
                    </Text>
                    <Text style={styles.examMetricLbl}>Correct / Wrong</Text>
                  </View>
                  <View style={styles.metricDivider} />
                  <View style={styles.examMetricItem}>
                    <Text style={[styles.examMetricVal, { color: exam.themeColor }]}>
                      {exam.avgAccuracy}%
                    </Text>
                    <Text style={styles.examMetricLbl}>Accuracy</Text>
                  </View>
                </View>

                {/* Subject-Wise Performance Breakdown */}
                <View style={styles.subjectsContainer}>
                  <View style={styles.subjectHeaderRow}>
                    <Text style={styles.subjectSectionTitle}>Subject Breakdown</Text>
                    <TouchableOpacity
                      onPress={() => router.push(`/student/exam/${exam.exam}`)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.viewExamLink, { color: exam.themeColor }]}>
                        Go to {exam.name} Hub →
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {Array.isArray(exam.subjects) && exam.subjects.length > 0 ? (
                    <View style={styles.subjectList}>
                      {exam.subjects.map((subj, sIdx) => {
                        const statusColors = {
                          Mastered: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
                          'Good Progress': { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
                          'Needs Focus': { bg: '#ffedd5', text: '#c2410c', border: '#fed7aa' },
                          'Ready to Start': { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
                        };
                        const statusStyle = statusColors[subj.status] || statusColors['Ready to Start'];

                        return (
                          <View key={sIdx} style={styles.subjectCard}>
                            {/* Top Subject Row */}
                            <View style={styles.subjectTopRow}>
                              <View style={styles.subjectNameBox}>
                                <Text style={{ fontSize: 20 }}>{subj.icon || '📚'}</Text>
                                <Text style={styles.subjectName}>{subj.name}</Text>
                              </View>
                              <View
                                style={[
                                  styles.statusBadge,
                                  { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                                ]}
                              >
                                <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                                  {subj.status}
                                </Text>
                              </View>
                            </View>

                            {/* Progress Bar */}
                            <View style={styles.progressBarWrap}>
                              <View
                                style={[
                                  styles.progressBarFill,
                                  {
                                    width: `${Math.max(6, Math.min(100, subj.progressPercent || 0))}%`,
                                    backgroundColor: subj.color || exam.themeColor,
                                  },
                                ]}
                              />
                            </View>

                            {/* Stats Detail Row */}
                            <View style={styles.subjectStatsRow}>
                              <View style={styles.subjStatItem}>
                                <Text style={styles.subjStatVal}>{subj.testsAttended}</Text>
                                <Text style={styles.subjStatLbl}>Tests</Text>
                              </View>
                              <View style={styles.subjStatItem}>
                                <Text style={styles.subjStatVal}>{subj.totalScore}</Text>
                                <Text style={styles.subjStatLbl}>Score</Text>
                              </View>
                              <View style={styles.subjStatItem}>
                                <Text style={styles.subjStatVal}>
                                  <Text style={{ color: '#16a34a' }}>{subj.correctCount}</Text>
                                  <Text style={{ color: '#94a3b8' }}> / </Text>
                                  <Text style={{ color: '#ef4444' }}>{subj.wrongCount}</Text>
                                </Text>
                                <Text style={styles.subjStatLbl}>Correct / Wrong</Text>
                              </View>
                              <View style={styles.subjStatItem}>
                                <Text style={[styles.subjStatVal, { color: subj.color || exam.themeColor }]}>
                                  {subj.accuracy}%
                                </Text>
                                <Text style={styles.subjStatLbl}>Accuracy</Text>
                              </View>
                            </View>

                            {/* Practice CTA button */}
                            <TouchableOpacity
                              style={[styles.practiceBtn, { borderColor: subj.color || exam.themeColor }]}
                              onPress={() => router.push(`/student/exam/${exam.exam}`)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.practiceBtnText, { color: subj.color || exam.themeColor }]}>
                                Practice {subj.name} Tests ➔
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.noSubjText}>No subject breakdown available.</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ─── 4. RECENT TEST ATTEMPTS HISTORY ─────────────────────────────── */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeaderRow}>
            <Text style={styles.sectionHeading}>Recent Test Submissions</Text>
            <TouchableOpacity onPress={() => router.push('/student/tests')}>
              <Text style={styles.viewAllText}>All Mock Tests →</Text>
            </TouchableOpacity>
          </View>

          {results.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={{ fontSize: 32 }}>📝</Text>
              <Text style={styles.emptyTitle}>No Mock Tests Completed Yet</Text>
              <Text style={styles.emptySub}>
                Attend your first mock test to see your detailed answers, score breakdowns, and rankings.
              </Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => router.push('/student/tests')}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyCtaText}>Start a Mock Test Now</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.resultsList}>
              {results.slice(0, 8).map((r, i) => (
                <View key={r.id || i} style={styles.resultItem}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.resultTitle}>{r.testTitle || 'Mock Examination'}</Text>
                    <View style={styles.resultMetaRow}>
                      <Text style={styles.resultDate}>
                        {r.date ? new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                      </Text>
                      {!!r.exam && (
                        <View style={styles.resultExamBadge}>
                          <Text style={styles.resultExamText}>{String(r.exam).toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.resultRightCol}>
                    <Text style={styles.resultScore}>Score: {r.score}</Text>
                    <Text
                      style={[
                        styles.resultAccuracy,
                        { color: Number(r.accuracy || 0) >= 70 ? '#16a34a' : '#d97706' },
                      ]}
                    >
                      {Number(r.accuracy || 0)}% accuracy
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  backButtonArrow: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '800',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  topBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  topBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },

  scrollContent: {
    padding: 16,
    gap: 16,
  },
  scrollContentLarge: {
    maxWidth: 820,
    alignSelf: 'center',
    width: '100%',
  },

  pageHeader: {
    gap: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  pageSub: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },

  // 1. Hero Card
  heroCard: {
    borderRadius: 22,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#facc15',
  },

  heroBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ringPercentText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
  },
  ringSubText: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: -2,
  },

  motivationCallout: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 4,
  },
  motivationHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#facc15',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  motivationText: {
    fontSize: 12,
    color: '#e2e8f0',
    lineHeight: 16,
    fontWeight: '500',
  },

  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: '#ffffff',
  },
  statNumberGreen: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4ade80',
  },
  statNumberRed: {
    fontSize: 14,
    fontWeight: '900',
    color: '#f87171',
  },
  statLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Filter Chips
  filterSection: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },

  // 3. Exams Container
  examsContainer: {
    gap: 16,
  },
  examSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  examHeaderBar: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  examIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  examNameText: {
    fontSize: 16,
    fontWeight: '900',
  },
  examTagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  examCompletionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  examCompletionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },

  examMotivationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  examMotivationIcon: {
    fontSize: 16,
  },
  examMotivationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 16,
  },

  examMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  examMetricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  examMetricVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  examMetricLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },

  // Subjects
  subjectsContainer: {
    padding: 16,
    gap: 12,
  },
  subjectHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  viewExamLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  subjectList: {
    gap: 10,
  },
  subjectCard: {
    backgroundColor: '#fafbfc',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 10,
  },
  subjectTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  progressBarWrap: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  subjectStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  subjStatItem: {
    alignItems: 'center',
    gap: 1,
  },
  subjStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  subjStatLbl: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },

  practiceBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  practiceBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  noSubjText: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  // Recent Section
  recentSection: {
    gap: 10,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyCta: {
    marginTop: 8,
    backgroundColor: '#16a34a',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  emptyCtaText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },

  resultsList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  resultDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  resultExamBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  resultExamText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  resultRightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  resultScore: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultAccuracy: {
    fontSize: 11,
    fontWeight: '700',
  },
});
