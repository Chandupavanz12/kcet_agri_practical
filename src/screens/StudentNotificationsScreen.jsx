import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Linking, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const CATEGORIES = [
  'All', 'UGCET', 'UGNEET', 'Result', 'Seat Matrix',
  'Mock Allotment', 'Cutoff', '1st Round', '2nd Round', 'Extended Round',
];

// Determine the type-tag label and color for a notification card
function getTypeTag(n) {
  const url = (n.pdfUrl || '').toLowerCase();
  if (url.endsWith('.pdf')) return { label: '📄 PDF', color: '#7c3aed', bg: '#ede9fe' };
  if (url.length > 0) return { label: '🔗 Link', color: '#0369a1', bg: '#e0f2fe' };
  return { label: '📢 Alert', color: '#b45309', bg: '#fef9c3' };
}

// Best display date: prefer uploadDate, fall back to created_at
function bestDate(n) {
  const d = n.uploadDate ? new Date(n.uploadDate) : new Date(n.created_at);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Client-side sort: newest uploadDate / created_at first
function sortByNewest(list) {
  return [...list].sort((a, b) => {
    const da = new Date(a.uploadDate || a.created_at || 0).getTime();
    const db = new Date(b.uploadDate || b.created_at || 0).getTime();
    if (da !== db) return db - da;

    const ca = new Date(a.created_at || 0).getTime();
    const cb = new Date(b.created_at || 0).getTime();
    return cb - ca;
  });
}

export default function StudentNotificationsScreen() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async (opts = { showLoading: true }) => {
    try {
      setError('');
      if (opts.showLoading) setLoading(true);

      let endpoint = '/api/counseling/notifications';
      const params = [];
      if (activeCategory !== 'All') {
        if (['UGCET', 'UGNEET'].includes(activeCategory)) {
          params.push(`category=${encodeURIComponent(activeCategory)}`);
        } else {
          params.push(`type=${encodeURIComponent(activeCategory)}`);
        }
      }
      if (params.length > 0) endpoint += '?' + params.join('&');

      const res = await apiFetch(endpoint, { token });
      // Sort newest first on the client too (belt-and-suspenders)
      setNotifications(sortByNewest(res?.notifications || []));
    } catch (e) {
      setError(e?.message || 'Failed to load notifications');
    } finally {
      if (opts.showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications({ showLoading: true });
  }, [token, activeCategory]);

  const deleteNotificationItem = async (id) => {
    try {
      await apiFetch(`/api/counseling/notifications/${id}`, { token, method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (e) { console.error('Failed to delete', e); }
  };

  const markAsRead = async (id, isAlert = false) => {
    try {
      if (isAlert) {
        await deleteNotificationItem(id);
      } else {
        await apiFetch(`/api/counseling/notifications/${id}/read`, { token, method: 'POST' });
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (e) { console.error('Failed to mark read', e); }
  };

  const handleOpenLink = (url, id) => {
    if (id) markAsRead(id, false);
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KEA ALERTS</Text>
        <Text style={styles.headerSubtitle}>Real-time Counselling Assistant</Text>
      </View>

      {/* Filter chips */}
      <View style={styles.chipRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipContent}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, activeCategory === cat && styles.chipActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading KEA updates…</Text>
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>No notifications found</Text>
              <Text style={styles.emptySubText}>Pull down to refresh</Text>
            </View>
          }
          renderItem={({ item: n }) => {
            const tag = getTypeTag(n);
            const displayDate = bestDate(n);
            const isPdf = (n.pdfUrl || '').toLowerCase().endsWith('.pdf');
            const isLink = (n.pdfUrl || '').length > 0 && !isPdf;

            return (
              <View style={[styles.card, !n.isRead && styles.cardUnread]}>
                {/* Header row: category badge + type tag + unread dot */}
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {n.category} · {n.notificationType}
                      </Text>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: tag.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: tag.color }]}>{tag.label}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!n.isRead && <View style={styles.unreadDot} />}
                    <TouchableOpacity onPress={() => deleteNotificationItem(n._id)} style={{ marginLeft: 10, padding: 4 }}>
                      <Text style={{ fontSize: 16 }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>{n.title}</Text>

                {/* Summary / description — only show if different from title */}
                {n.summary && n.summary !== n.title && (
                  <Text style={styles.summary}>{n.summary}</Text>
                )}

                {/* Footer: date + action */}
                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>🗓 {displayDate}</Text>

                  {isPdf ? (
                    <TouchableOpacity
                      style={styles.btnPdf}
                      onPress={() => handleOpenLink(n.pdfUrl, n._id)}
                    >
                      <Text style={styles.btnActionText}>Open PDF</Text>
                    </TouchableOpacity>
                  ) : isLink ? (
                    <TouchableOpacity
                      style={styles.btnLink}
                      onPress={() => handleOpenLink(n.pdfUrl, n._id)}
                    >
                      <Text style={styles.btnActionText}>Open Link</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.btnMark}
                      onPress={() => markAsRead(n._id, true)}
                    >
                      <Text style={styles.btnMarkText}>Mark Read</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#4f46e5', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#e0e7ff', marginTop: 4 },

  chipRow: { paddingTop: 14, paddingBottom: 8 },
  chipContent: { paddingHorizontal: 16 },
  chip: { backgroundColor: '#e2e8f0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  chipActive: { backgroundColor: '#4f46e5' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },

  errorBox: { marginHorizontal: 16, marginTop: 8, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 8, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 14 },

  list: { flex: 1 },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { textAlign: 'center', fontSize: 16, color: '#475569', fontWeight: '600', marginTop: 12 },
  emptySubText: { textAlign: 'center', fontSize: 13, color: '#94a3b8', marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
  cardUnread: { backgroundColor: '#f5f3ff', borderColor: '#c4b5fd', borderWidth: 1 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  badge: { backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, color: '#6d28d9', fontWeight: 'bold', textTransform: 'uppercase' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7c3aed', marginTop: 3, marginLeft: 6 },

  title: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', lineHeight: 22, marginBottom: 6 },
  summary: { fontSize: 13, color: '#475569', lineHeight: 19, marginBottom: 12 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 6 },
  dateText: { fontSize: 11, color: '#94a3b8', flex: 1 },

  btnPdf: { backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  btnLink: { backgroundColor: '#0369a1', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  btnActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnMark: { borderColor: '#4f46e5', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  btnMarkText: { color: '#4f46e5', fontSize: 12, fontWeight: '600' },
});
