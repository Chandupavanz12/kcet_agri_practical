import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL as apiBaseUrl } from '../config/env';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function StudentMaterialsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const toFileUrl = (u) => {
    const url = String(u || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const openProtectedFile = (fileUrl, itemId) => {
    const absoluteUrl = toFileUrl(fileUrl);
    if (!absoluteUrl) return;
    if (!token) {
      setError('Please login again');
      return;
    }
    // Append token as query param so server can authenticate the download
    const urlWithToken = absoluteUrl.includes('?')
      ? `${absoluteUrl}&token=${token}`
      : `${absoluteUrl}?token=${token}`;
      
    // Use Google Docs viewer on Android for much faster rendering of large PDFs
    const finalUrl = Platform.OS === 'android' 
      ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(urlWithToken)}`
      : urlWithToken;

    WebBrowser.openBrowserAsync(finalUrl).catch(() => {
      Alert.alert('Error', 'Failed to open PDF. Please try again.');
    });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/student/materials?type=pdf', { token });
        if (!alive) return;
        setPdfs(Array.isArray(res?.materials) ? res.materials : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load materials');
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
              <Text style={styles.headerTitle}>Study Materials</Text>
              <Text style={styles.headerSub}>PDF notes and reference documents.</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>📚 PDFs</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardBody}>
            {pdfs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No materials available.</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {pdfs.map((m) => (
                  <View key={m.id} style={styles.materialCard}>
                    <View style={styles.cardAccent} />
                    <View style={styles.materialCardBody}>
                      <View style={styles.materialHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.materialTitle}>{m.title}</Text>
                          <Text style={styles.materialSubject}>{m.subject}</Text>
                        </View>
                        {m.locked ? (
                          <View style={styles.badgeLocked}><Text style={styles.badgeLockedText}>Locked</Text></View>
                        ) : (
                          <View style={styles.badgeUnlocked}><Text style={styles.badgeUnlockedText}>Unlocked</Text></View>
                        )}
                      </View>
                      <View style={styles.materialFooter}>
                        {m.locked ? (
                          <TouchableOpacity style={styles.btnUnlock} onPress={() => router.push('/student/premium')}>
                            <Text style={styles.btnUnlockText}>Unlock Premium</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={styles.btnView} onPress={() => openProtectedFile(m.pdfUrl, m.id)}>
                            <Text style={styles.btnViewText}>View PDF</Text>
                          </TouchableOpacity>
                        )}
                      </View>
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
  grid: { gap: 12 },
  materialCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  cardAccent: { height: 4, backgroundColor: '#10b981' },
  materialCardBody: { padding: 16 },
  materialHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  materialTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  materialSubject: { fontSize: 12, color: '#64748b', marginTop: 4 },
  badgeLocked: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeLockedText: { color: '#ef4444', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  badgeUnlocked: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeUnlockedText: { color: '#10b981', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  materialFooter: { marginTop: 16 },
  btnUnlock: { backgroundColor: '#f59e0b', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
  btnUnlockText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  btnView: { backgroundColor: '#2563eb', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'flex-start' },
  btnViewText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
