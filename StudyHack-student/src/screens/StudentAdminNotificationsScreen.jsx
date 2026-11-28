import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const CATEGORIES = ['All'];

export default function StudentAdminNotificationsScreen() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async (opts = { showLoading: true }) => {
    try {
      setError('');
      if (opts.showLoading) setLoading(true);

      const res = await apiFetch('/api/student/notifications', { token });
      setNotifications(res?.notifications || []);
    } catch (e) {
      setError(e?.message || 'Failed to load notifications');
    } finally {
      if (opts.showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications({ showLoading: true });
  }, [token]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ADMIN ALERTS</Text>
        <Text style={styles.headerSubtitle}>Official Messages from StudyHack</Text>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item._id || item.id || Math.random())}
          style={styles.list}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadNotifications({ showLoading: false });
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No admin notifications yet.</Text>}
          renderItem={({ item: n }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: '#ef4444' }]}>
                  <Text style={[styles.badgeText, { color: '#fff' }]}>Admin Notice</Text>
                </View>
              </View>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.summary}>{n.message}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>{new Date(n.created_at).toLocaleString()}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    padding: 20,
    backgroundColor: '#0f172a',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#cbd5e1', marginTop: 4, fontWeight: '500' },
  chipScroll: { paddingHorizontal: 16, marginTop: 16, paddingBottom: 16 },
  chip: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  chipActive: { backgroundColor: '#059669', borderColor: '#059669' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '700' },
  chipTextActive: { color: '#ffffff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorBox: { marginHorizontal: 16, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  list: { flex: 1 },
  emptyText: { textAlign: 'center', fontSize: 15, color: '#64748b', marginTop: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  cardUnread: { backgroundColor: '#f0fdf4', borderColor: '#86efac', borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  badge: { backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, color: '#059669', fontWeight: '800', textTransform: 'uppercase' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', marginTop: 4 },
  title: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, lineHeight: 22 },
  summary: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  dateText: { fontSize: 12, color: '#94a3b8' },
  btnAction: { backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  btnActionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnActionOutlined: { borderColor: '#059669', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  btnActionTextOutlined: { color: '#059669', fontSize: 13, fontWeight: '700' },
});
