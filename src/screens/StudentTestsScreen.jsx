import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function StudentTestsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/student/tests', { token });
        if (!alive) return;
        setTests(Array.isArray(res?.tests) ? res.tests : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load tests');
      } finally {
        if (alive) setLoading(false);
      }
    })();
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

        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Mock Tests</Text>
              <Text style={styles.headerSub}>Timed practice to boost your speed and accuracy.</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📝 Practice</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardBody}>
            {tests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No tests available.</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {tests.map((t) => (
                  <View key={t.id} style={styles.testCard}>
                    <View style={styles.cardAccent} />
                    <View style={styles.testCardBody}>
                      <Text style={styles.testTitle}>{t.title}</Text>
                      <Text style={styles.testQuestions}>{t.questionCount || t.question_count || 0} questions</Text>
                      <TouchableOpacity
                        style={styles.btnPrimary}
                        onPress={() => router.push(`/student/mock-test/${t.id}`)}
                      >
                        <Text style={styles.btnPrimaryText}>Start Test</Text>
                      </TouchableOpacity>
                    </View>
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
  card: { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1, overflow: 'hidden' },
  cardBody: { padding: 16 },
  emptyState: { padding: 16, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#fff' },
  emptyText: { fontSize: 14, color: '#475569', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  testCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  cardAccent: { height: 4, backgroundColor: '#8b5cf6' },
  testCardBody: { padding: 16 },
  testTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  testQuestions: { fontSize: 14, color: '#475569', marginTop: 4, marginBottom: 16 },
  btnPrimary: { backgroundColor: '#2563eb', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
