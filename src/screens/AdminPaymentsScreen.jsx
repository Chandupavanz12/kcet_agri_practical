import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

function formatINR(paise) {
  const n = Number(paise || 0) / 100;
  return `₹${n.toFixed(2)}`;
}

export default function AdminPaymentsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [timeFilter, setTimeFilter] = useState('All');

  const filteredItems = useMemo(() => {
    if (timeFilter === 'All') return items;
    const now = new Date();
    return items.filter(p => {
      const d = new Date(p.createdAt);
      if (timeFilter === 'Today') {
        return d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'Monthly') {
        return d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
      }
      if (timeFilter === 'Yearly') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [items, timeFilter]);

  const totalPaid = useMemo(() => {
    return filteredItems
      .filter((p) => p.status === 'paid' || p.status === 'free')
      .reduce((sum, p) => sum + Number(p.amountPaise || 0), 0);
  }, [filteredItems]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch('/api/admin/payments', { token });
      setItems(Array.isArray(res?.payments) ? res.payments : []);
    } catch (e) {
      setError(e?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSelectOne = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) setSelectedIds([]);
    else setSelectedIds(items.map(i => i.id));
  };

  const handleDeleteBulk = async () => {
    if (!selectedIds.length) return;
    Alert.alert('Delete', `Are you sure you want to delete ${selectedIds.length} payment record(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            setBusy(true);
            await apiFetch('/api/admin/payments', {
              token,
              method: 'DELETE',
              body: { ids: selectedIds }
            });
            setSelectedIds([]);
            fetchData();
          } catch (err) {
            Alert.alert('Error', err.message || 'Deletion failed');
          } finally {
            setBusy(false);
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>💰 Payments</Text>
              <Text style={styles.heroSubtitle}>Review transactions and track total revenue.</Text>
            </View>
            <View style={styles.revenueBox}>
              <Text style={styles.revenueLabel}>{timeFilter === 'All' ? 'TOTAL' : timeFilter.toUpperCase()} REVENUE</Text>
              <Text style={styles.revenueValue}>{formatINR(totalPaid)}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
            <View style={styles.filterRow}>
              {['All', 'Today', 'Monthly', 'Yearly'].map(tf => (
                <TouchableOpacity
                  key={tf}
                  style={[styles.filterChip, timeFilter === tf && styles.filterChipActive]}
                  onPress={() => setTimeFilter(tf)}
                >
                  <Text style={[styles.filterChipText, timeFilter === tf && styles.filterChipTextActive]}>{tf}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.controlsRow}>
          <View style={styles.controlsLeft}>
            <TouchableOpacity style={styles.btnSelectAll} onPress={handleSelectAll}>
              <Text style={styles.btnSelectAllText}>{selectedIds.length === filteredItems.length && filteredItems.length > 0 ? 'Deselect All' : 'Select All'}</Text>
            </TouchableOpacity>
            {selectedIds.length > 0 && (
              <TouchableOpacity style={styles.btnDeleteBulk} onPress={handleDeleteBulk} disabled={busy}>
                <Text style={styles.btnDeleteBulkText}>{busy ? '...' : `Delete (${selectedIds.length})`}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.countText}>Showing {filteredItems.length}</Text>
        </View>

        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator size="large" color="#10b981" style={{ marginVertical: 40 }} />
          ) : filteredItems.length === 0 ? (
            <Text style={styles.emptyText}>No payments found in history.</Text>
          ) : (
            <View style={styles.list}>
              {filteredItems.map((p) => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.paymentItem, isSelected && styles.paymentItemActive]}
                    onPress={() => handleSelectOne(p.id)}
                  >
                    <View style={styles.pHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pUser}>{p.userName}</Text>
                        <Text style={styles.pEmail}>{p.userEmail}</Text>
                        <View style={styles.planBadge}>
                          <Text style={styles.planBadgeText}>{p.planName || p.planCode}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.pAmount}>{formatINR(p.amountPaise)}</Text>
                        <View style={[styles.statusBadge, (p.status === 'paid' || p.status === 'free') && styles.statusBadgeSuccess]}>
                          <Text style={[styles.statusBadgeText, (p.status === 'paid' || p.status === 'free') && styles.statusBadgeTextSuccess]}>{p.status}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.pDetails}>
                      <Text style={styles.pMeta}>ORDER: <Text style={styles.pMetaBold}>{p.orderId}</Text></Text>
                      {!!p.paymentId && <Text style={styles.pMeta}>TXNID: <Text style={styles.pMetaBold}>{p.paymentId}</Text></Text>}
                      <Text style={styles.pDate}>{new Date(p.createdAt).toLocaleString()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  heroCard: { backgroundColor: '#10b981', borderRadius: 16, padding: 20 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  heroSubtitle: { fontSize: 12, color: '#ecfdf5' },
  revenueBox: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'flex-end' },
  revenueLabel: { fontSize: 10, fontWeight: 'bold', color: '#ecfdf5', marginBottom: 2 },
  revenueValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  controlsLeft: { flexDirection: 'row', gap: 8 },
  btnSelectAll: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnSelectAllText: { color: '#475569', fontSize: 12, fontWeight: 'bold' },
  btnDeleteBulk: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  btnDeleteBulkText: { color: '#dc2626', fontSize: 12, fontWeight: 'bold' },
  countText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, paddingVertical: 40 },
  list: { paddingVertical: 8 },
  paymentItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  paymentItemActive: { backgroundColor: '#f0fdf4' },
  pHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pUser: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  pEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  planBadge: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 6 },
  planBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#1d4ed8', textTransform: 'uppercase' },
  pAmount: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  statusBadge: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 6, alignSelf: 'flex-end' },
  statusBadgeSuccess: { backgroundColor: '#ecfdf5', borderColor: '#d1fae5' },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
  statusBadgeTextSuccess: { color: '#047857' },
  pDetails: { marginTop: 12, gap: 4 },
  pMeta: { fontSize: 10, color: '#94a3b8' },
  pMetaBold: { color: '#475569', fontWeight: 'bold' },
  pDate: { fontSize: 10, color: '#64748b', fontWeight: '500', marginTop: 4 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16 },
  filterChip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterChipActive: { backgroundColor: '#fff', borderColor: '#fff' },
  filterChipText: { fontSize: 12, color: '#ecfdf5', fontWeight: '600' },
  filterChipTextActive: { color: '#10b981' },
});
