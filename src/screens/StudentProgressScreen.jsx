import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function StudentProgressScreen() {
  const { token } = useAuth();
  const [results, setResults] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [res1, res2] = await Promise.all([
          apiFetch('/api/student/results', { token }),
          apiFetch('/api/student/progress', { token }),
        ]);
        if (!alive) return;
        setResults(Array.isArray(res1?.results) ? res1.results : []);
        setPoints(Array.isArray(res2?.points) ? res2.points : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load progress');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const summary = useMemo(() => {
    const attended = results.length;
    const avgAccuracy = attended
      ? Math.round((results.reduce((acc, r) => acc + Number(r.accuracy || 0), 0) / attended) * 100) / 100
      : 0;
    return { attended, avgAccuracy };
  }, [results]);

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

        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Progress</Text>
              <Text style={styles.headerSub}>Track your results and improve your accuracy.</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📈 Analytics</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statAccent, { backgroundColor: '#3b82f6' }]} />
            <View style={styles.statBody}>
              <Text style={styles.statLabel}>Tests attended</Text>
              <Text style={styles.statValue}>{summary.attended}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statAccent, { backgroundColor: '#10b981' }]} />
            <View style={styles.statBody}>
              <Text style={styles.statLabel}>Average accuracy (%)</Text>
              <Text style={styles.statValue}>{summary.avgAccuracy}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Results</Text>
          </View>
          <View style={styles.cardBody}>
            {results.length === 0 ? (
              <Text style={styles.emptyText}>No results yet.</Text>
            ) : (
              <View style={styles.table}>
                {results.map((r, i) => (
                  <View key={r.id} style={[styles.tableRow, i !== results.length - 1 && styles.tableRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tableTitle}>{r.testTitle}</Text>
                      <Text style={styles.tableDate}>{new Date(r.date).toLocaleString('en-IN')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.tableScore}>Score: {r.score}</Text>
                      <Text style={styles.tableAccuracy}>{Number(r.accuracy || 0)}% acc</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent progress points</Text>
          </View>
          <View style={styles.cardBody}>
            {points.length === 0 ? (
              <Text style={styles.emptyText}>No progress points yet.</Text>
            ) : (
              <View style={styles.pointsGrid}>
                {points.map((p, idx) => (
                  <View key={idx} style={styles.pointCard}>
                    <Text style={styles.pointDate}>{new Date(p.date).toLocaleString('en-IN')}</Text>
                    <Text style={styles.pointStat}>Score: <Text style={{ fontWeight: 'bold' }}>{p.score}</Text></Text>
                    <Text style={styles.pointStat}>Accuracy: <Text style={{ fontWeight: 'bold' }}>{p.accuracy}%</Text></Text>
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
  headerCard: { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  headerContent: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  headerSub: { fontSize: 14, color: '#475569', marginTop: 4 },
  badge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  statAccent: { height: 4 },
  statBody: { padding: 16 },
  statLabel: { fontSize: 14, color: '#475569' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1, overflow: 'hidden' },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  cardBody: { padding: 16 },
  emptyText: { fontSize: 14, color: '#64748b' },
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', padding: 12, justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  tableDate: { fontSize: 12, color: '#64748b', marginTop: 2 },
  tableScore: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  tableAccuracy: { fontSize: 12, color: '#059669', fontWeight: '500', marginTop: 2 },
  pointsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pointCard: { minWidth: '48%', flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  pointDate: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  pointStat: { fontSize: 14, color: '#334155' },
});
