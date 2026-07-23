import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const MANAGE_LINKS = [
  { to: '/admin/students', icon: '👥', label: 'Students', desc: 'Accounts & Subscription' },
  { to: '/admin/tests', icon: '📝', label: 'Tests', desc: 'Manage Question Banks' },
  { to: '/admin/test-builder', icon: '🔧', label: 'Test Builder', desc: 'Craft Mock Exams' },
  { to: '/admin/videos', icon: '🎥', label: 'Videos', desc: 'Tutorials & Practical Guides' },
  { to: '/admin/materials', icon: '📚', label: 'Materials', desc: 'PDFs & Chapter Notes' },
  { to: '/admin/pyqs', icon: '📄', label: 'PYQs', desc: 'Previous Year Papers' },
  { to: '/admin/plans', icon: '💳', label: 'Plans', desc: 'Pricing & Tiers' },
  { to: '/admin/payments', icon: '💰', label: 'Payments', desc: 'Revenue & Transaction Logs' },
  { to: '/admin/feedback', icon: '💬', label: 'Feedback', desc: 'Student Communications' },
  { to: '/admin/notifications', icon: '🔔', label: 'Broadcast', desc: 'Global Announcements' },
  { to: '/admin/results', icon: '🏆', label: 'Results', desc: 'Student Performance' },
  { to: '/admin/settings', icon: '⚙️', label: 'Settings', desc: 'Global configuration' },
  { to: '/admin/doubts', icon: '💬', label: 'Students Doubts', desc: 'Clarify Student Doubts' },
];

const StatCard = memo(({ icon, label, value, color, onPress }) => {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.statIconBox, { backgroundColor: color + '1a' }]}>
        <Text style={[styles.statIcon, { color }]}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
});

const ManageCard = memo(({ item, onPress }) => {
  return (
    <TouchableOpacity style={styles.manageCard} onPress={() => onPress(item.to)}>
      <View style={styles.manageIconBox}>
        <Text style={styles.manageIcon}>{item.icon}</Text>
      </View>
      <View style={styles.manageContent}>
        <Text style={styles.manageLabel}>{item.label}</Text>
        <Text style={styles.manageDesc} numberOfLines={1}>{item.desc}</Text>
      </View>
      <Text style={styles.manageArrow}>→</Text>
    </TouchableOpacity>
  );
});

export default function AdminDashboardScreen() {
  const { token, user, logout } = useAuth();
  const router = useRouter();

  const [counts, setCounts] = useState({ students: 0, tests: 0, videos: 0, materials: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch real counts from the same endpoints the management screens use
      const [studentsRes, testsRes, videosRes, materialsRes] = await Promise.allSettled([
        apiFetch('/api/admin/students', { token }),
        apiFetch('/api/admin/tests', { token }),
        apiFetch('/api/admin/videos', { token }),
        apiFetch('/api/admin/materials', { token }),
      ]);
      setCounts({
        students: studentsRes.status === 'fulfilled' ? (studentsRes.value?.students?.length ?? 0) : 0,
        tests: testsRes.status === 'fulfilled' ? (testsRes.value?.tests?.length ?? 0) : 0,
        videos: videosRes.status === 'fulfilled' ? (videosRes.value?.videos?.length ?? 0) : 0,
        materials: materialsRes.status === 'fulfilled' ? (materialsRes.value?.materials?.length ?? 0) : 0,
      });
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNavigation = useCallback((route) => {
    router.push(route);
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      </SafeAreaView>
    );
  }

  const stats = [
    { icon: '👥', label: 'Students', value: counts.students, color: '#10b981', route: '/admin/students' },
    { icon: '📝', label: 'Tests', value: counts.tests, color: '#0ea5e9', route: '/admin/tests' },
    { icon: '🎥', label: 'Videos', value: counts.videos, color: '#3b82f6', route: '/admin/videos' },
    { icon: '📚', label: 'Documents', value: counts.materials, color: '#f59e0b', route: '/admin/materials' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={MANAGE_LINKS}
        keyExtractor={(item) => item.to}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            {/* Hero Section with Vercel Style Gradient */}
            <LinearGradient
              colors={['#0f172a', '#1e293b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>👑 Super Admin Console</Text>
              </View>
              <Text style={styles.heroTitle}>Welcome, {user?.name || 'Admin'}</Text>
              <Text style={styles.heroSubtitle}>Platform metrics are stable. You have full control over students, content, and revenue.</Text>

              <View style={styles.heroStatsRow}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.heroStatBoxBrand}>
                  <Text style={styles.heroStatValueWhite}>PRO</Text>
                  <Text style={styles.heroStatLabelBrand}>STATUS</Text>
                </LinearGradient>
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.heroStatBoxBrand}>
                  <Text style={styles.heroStatValueWhite}>200+</Text>
                  <Text style={styles.heroStatLabelBrand}>USERS</Text>
                </LinearGradient>
              </View>

              <TouchableOpacity
                style={styles.heroLogoutBtn}
                onPress={() => {
                  logout();
                  router.replace('/');
                }}
              >
                <Text style={styles.heroLogoutBtnText}>🚪 Logout</Text>
              </TouchableOpacity>
            </LinearGradient>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
              </View>
            )}

            {/* Analytics Stats */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📊 Live Stats</Text>
              <TouchableOpacity onPress={loadData}>
                <Text style={styles.refreshBtn}>Refresh ↻</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              {stats.map((s, idx) => (
                <StatCard
                  key={idx}
                  {...s}
                  onPress={() => s.route && handleNavigation(s.route)}
                />
              ))}
            </View>

            {/* Management Grid Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⚙️ Console Actions</Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <ManageCard item={item} onPress={handleNavigation} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={
          /* Feedback Banner */
          <LinearGradient
            colors={['#f43f5e', '#e11d48']}
            style={styles.feedbackBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.feedbackContent}>
              <Text style={styles.feedbackTitle}>Incoming Feedback?</Text>
              <Text style={styles.feedbackDesc}>Check what students are saying.</Text>
            </View>
            <TouchableOpacity style={styles.btnBanner} onPress={() => handleNavigation('/admin/feedback')}>
              <Text style={styles.btnBannerText}>Open Inbox</Text>
            </TouchableOpacity>
          </LinearGradient>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, paddingBottom: 40 },
  heroCard: { borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 15, elevation: 8, marginBottom: 24 },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: '#334155', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  heroBadgeText: { color: '#e2e8f0', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#cbd5e1', lineHeight: 22, marginBottom: 24, fontWeight: '500' },
  heroStatsRow: { flexDirection: 'row', gap: 12 },
  heroStatBoxBrand: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  heroStatValueWhite: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  heroStatLabelBrand: { fontSize: 10, color: '#e2e8f0', marginTop: 4, letterSpacing: 1 },
  heroLogoutBtn: { marginTop: 16, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  heroLogoutBtnText: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
  errorBox: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca', marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 14, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' },
  refreshBtn: { fontSize: 13, fontWeight: '800', color: '#10b981' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: 16, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statIcon: { fontSize: 22 },
  statContent: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  statLabel: { fontSize: 11, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginTop: 2 },
  manageCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 16 },
  manageIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center' },
  manageIcon: { fontSize: 24 },
  manageContent: { flex: 1 },
  manageLabel: { fontSize: 14, fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' },
  manageDesc: { fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: '500' },
  manageArrow: { fontSize: 20, fontWeight: '900', color: '#cbd5e1' },
  feedbackBanner: { borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, shadowColor: '#e11d48', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  feedbackContent: { flex: 1, marginRight: 16 },
  feedbackTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
  feedbackDesc: { fontSize: 13, color: '#ffe4e6', marginTop: 4, fontWeight: '500' },
  btnBanner: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  btnBannerText: { color: '#e11d48', fontSize: 13, fontWeight: '800' },
});
