import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function IndexScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setTimeout(() => {
        router.replace('/login');
      }, 0);
      return;
    }
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      if (user?.role === 'admin') {
        const res = await apiFetch('/api/admin/dashboard', { token });
        setData(res);
        return;
      }

      // Student: only fetch notifications quickly for the landing page.
      const n = await apiFetch('/api/student/notifications', { token });
      setData({ notifications: Array.isArray(n?.notifications) ? n.notifications : [] });
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome back, {user?.name}!</Text>
          <Text style={styles.welcomeSubtitle}>
            {user?.role === 'admin' ? 'Manage your learning platform' : 'Continue your learning journey'}
          </Text>
          <Text style={styles.supportText}>Support: chandupavanz12@gmail.com</Text>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Admin Dashboard */}
        {user?.role === 'admin' && data && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>👥</Text>
                <View>
                  <Text style={styles.statLabel}>Students</Text>
                  <Text style={styles.statValue}>{data.students?.count || 0}</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📝</Text>
                <View>
                  <Text style={styles.statLabel}>Active Tests</Text>
                  <Text style={styles.statValue}>{data.tests?.count || 0}</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🎬</Text>
                <View>
                  <Text style={styles.statLabel}>Videos</Text>
                  <Text style={styles.statValue}>{data.videos?.count || 0}</Text>
                </View>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📚</Text>
                <View>
                  <Text style={styles.statLabel}>Materials</Text>
                  <Text style={styles.statValue}>{data.materials?.count || 0}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionsSection}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Quick Actions</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/admin/test-builder')}><Text style={styles.btnPrimaryText}>📝 Create Test</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/admin/videos')}><Text style={styles.btnPrimaryText}>🎬 Add Video</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/admin/materials')}><Text style={styles.btnPrimaryText}>📚 Add Material</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/admin/students')}><Text style={styles.btnPrimaryText}>👥 Manage Students</Text></TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Management</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.btnGhost} onPress={() => router.push('/admin/notifications')}><Text style={styles.btnGhostText}>🔔 Notifications</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnGhost} onPress={() => router.push('/admin/settings')}><Text style={styles.btnGhostText}>⚙️ Settings</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnGhost} onPress={() => router.push('/admin/results')}><Text style={styles.btnGhostText}>📊 Results</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.btnGhost} onPress={() => router.push('/admin/pyqs')}><Text style={styles.btnGhostText}>📄 PYQs</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Student Dashboard */}
        {user?.role === 'student' && (
          <>
            {data?.notifications && data.notifications.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>🔔 Latest Updates</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.notificationsList}>
                    {data.notifications.slice(0, 4).map((notification) => (
                      <View key={notification.id} style={styles.notificationItem}>
                        <Text style={styles.notificationIcon}>📢</Text>
                        <Text style={styles.notificationText}>{notification.message}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Quick Actions</Text>
              </View>
              <View style={styles.cardBody}>
                <View style={styles.actionGrid}>
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/student/tests')}><Text style={styles.btnPrimaryText}>📝 Take Test</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/student/dashboard')}><Text style={styles.btnPrimaryText}>📚 Study Materials</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/student/dashboard')}><Text style={styles.btnPrimaryText}>🎬 Watch Videos</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/student/results')}><Text style={styles.btnPrimaryText}>📊 View Progress</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f1f5f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 16 },
  welcomeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  welcomeSubtitle: { fontSize: 14, color: '#475569' },
  supportText: { marginTop: 12, fontSize: 12, color: '#64748b' },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 8, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  statIcon: { fontSize: 24 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginTop: 4 },
  actionsSection: { gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, overflow: 'hidden' },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  cardBody: { padding: 16 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  btnPrimary: { flex: 1, minWidth: '45%', backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnGhost: { flex: 1, minWidth: '45%', backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  notificationsList: { gap: 8 },
  notificationItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  notificationIcon: { fontSize: 18 },
  notificationText: { flex: 1, fontSize: 14, color: '#334155' },
});
