import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function StudentDashboardScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [data, setData] = useState(null);
  const [tests, setTests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    let alive = true;
    try {
      setError('');
      const [dashRes, testsRes, notifRes] = await Promise.all([
        apiFetch('/api/student/dashboard', { token }).catch(() => null),
        apiFetch('/api/student/tests', { token }).catch(() => null),
        apiFetch('/api/student/notifications', { token }).catch(() => null)
      ]);

      if (!alive) return;
      setData(dashRes);
      setTests(Array.isArray(testsRes?.tests) ? testsRes.tests : []);

      const rows = Array.isArray(notifRes?.notifications) ? notifRes.notifications : [];
      const seen = new Set();
      const uniq = [];
      for (const n of rows) {
        const msg = String(n?.message || '').trim();
        if (!msg) continue;
        const key = msg.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        uniq.push({ ...n, message: msg });
      }
      setNotifications(uniq);
    } catch (err) {
      if (!alive) return;
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      if (alive) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    return () => { alive = false; };
  };

  useEffect(() => {
    loadData(true);
  }, [token]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [token]);

  useEffect(() => {
    if (params.error) {
      if (params.error === 'PaymentVerificationFailed') setError('Payment verification failed.');
      else setError(params.error);
    }
    if (params.success) {
      if (params.success === 'PremiumActivated') setSuccessMsg('🎉 Payment successful! Premium access is now activated.');
      else setSuccessMsg(params.success);
    }
  }, [params.error, params.success]);

  const handleNavigation = useCallback((route) => {
    router.push(route);
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  // Get the latest notification or fall back to default
  const latestNotification = notifications.length > 0
    ? notifications[0].message
    : "Mock test-2 will be scheduled on today 6pm";

  // Get mock tests or fall back to default list
  const displayTests = tests.length > 0
    ? tests.slice(0, 6)
    : [
      { id: 'mock-6', title: 'Mock test-6', questionCount: 20 },
      { id: 'mock-5', title: 'Mock test-5', questionCount: 20 },
      { id: 'mock-4', title: 'Mock test-4', questionCount: 20 },
    ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />
        }
      >

        {/* Error / Success Banners */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {!!successMsg && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* 1. Dashboard Welcome Card */}
        <View style={styles.card}>
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeLeft}>
              <Text style={styles.welcomeTitle}>Student Dashboard</Text>
              <Text style={styles.welcomeSub}>Welcome back, {user?.name || 'Student'} 👋</Text>
            </View>
            <View style={styles.badgeContainer}>
              {(data?.premiumStatus?.comboActive || data?.premiumStatus?.pyqActive || data?.premiumStatus?.materialActive) ? (
                <>
                  <View style={[styles.badgeActive, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
                    <Text style={[styles.badgeActiveText, { color: '#d97706' }]}>👑 Premium User</Text>
                  </View>
                  {data?.premiumStatus?.comboActive && (
                    <View style={styles.badgePrep}>
                      <Text style={styles.badgePrepText}>Combo Plan Active</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.badgePrep}>
                  <Text style={styles.badgePrepText}>Free Student</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 2. Notifications Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => handleNavigation('/student/notifications')}>
              <Text style={styles.viewAllLink}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.notificationBox}>
            <Text style={styles.notificationText}>
              {latestNotification}
            </Text>
          </View>
        </View>

        {/* Feedback Section */}
        <View style={[styles.card, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
          <View style={[styles.cardHeader, { marginBottom: 8 }]}>
            <Text style={[styles.cardTitle, { color: '#1e3a8a' }]}>Have Suggestions?</Text>
          </View>
          <Text style={{ color: '#3b82f6', marginBottom: 12, fontSize: 13 }}>Share your feedback or queries with the admin directly.</Text>
          <TouchableOpacity
            onPress={() => handleNavigation('/student/feedback')}
            style={styles.btnAction}
          >
            <Text style={[styles.btnActionText, { textAlign: 'center' }]}>Submit Feedback</Text>
          </TouchableOpacity>
        </View>

        {/* 3. Mock Tests Grid Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tests</Text>
            <TouchableOpacity onPress={() => handleNavigation('/student/tests')}>
              <Text style={styles.viewAllLink}>View all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {displayTests.map((t) => (
              <View key={t.id} style={styles.testCard}>
                <View style={styles.testCardBody}>
                  <Text style={styles.testTitle}>{t.title}</Text>
                  <Text style={styles.testInfo}>
                    {t.questionCount || t.question_count || 20} questions • 30s per question
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleNavigation(`/student/mock-test/${t.id}`)}
                    style={styles.gradientBtnWrapper}
                  >
                    <LinearGradient
                      colors={['#10b981', '#2563eb']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.startBtn}
                    >
                      <Text style={styles.startBtnText}>Start Test</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f4' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 16, paddingBottom: 32 },

  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 4 },
  errorText: { color: '#b91c1c', fontSize: 14, fontWeight: '600' },
  successBox: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 4 },
  successText: { color: '#15803d', fontSize: 14, fontWeight: '600' },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Welcome Card Styles
  welcomeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  welcomeLeft: {
    flex: 1,
    minWidth: 150,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  welcomeSub: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  badgePrep: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgePrepText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeActiveText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },

  // Common Card Headers
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  viewAllLink: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '700',
  },

  // Notifications Styles
  notificationBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  notificationText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Mock Tests Grid Styles
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  testCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  testCardBody: {
    padding: 14,
    justifyContent: 'space-between',
    flex: 1,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  testInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 16,
  },
  gradientBtnWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  startBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnAction: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnActionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
