import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function StudentNotificationsScreen() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotifications = async (opts = { showLoading: true }, isAlive = () => true) => {
    try {
      setError('');
      if (opts.showLoading) setLoading(true);
      const res = await apiFetch('/api/student/notifications', { token });
      if (!isAlive()) return;
      const rows = Array.isArray(res?.notifications) ? res.notifications : [];
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
    } catch (e) {
      if (!isAlive()) return;
      setError(e?.message || 'Failed to load notifications');
    } finally {
      if (opts.showLoading && isAlive()) setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    loadNotifications({ showLoading: true }, () => alive);
    return () => { alive = false; };
  }, [token]);

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
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Notifications</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => loadNotifications({ showLoading: true })} disabled={loading}>
                <Text style={styles.btnGhostText}>Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setNotifications([])} disabled={notifications.length === 0}>
                <Text style={styles.btnGhostText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.cardBody}>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No notifications.</Text>
            ) : (
              <View style={styles.list}>
                {notifications.map((n) => (
                  <View key={n.id} style={styles.notificationItem}>
                    <Text style={styles.notificationText}>{n.message}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f1f5f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 16, paddingBottom: 32 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 8, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1, overflow: 'hidden' },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  headerActions: { flexDirection: 'row', gap: 8 },
  btnGhost: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnGhostText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  cardBody: { padding: 16 },
  emptyText: { fontSize: 14, color: '#64748b' },
  list: { gap: 12 },
  notificationItem: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1, borderRadius: 12, padding: 12 },
  notificationText: { fontSize: 14, color: '#1e40af', lineHeight: 20 },
});
