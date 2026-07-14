import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';
import { API_BASE_URL as apiBaseUrl } from '../config/env';

export default function PYQsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  
  const [centres, setCentres] = useState([]);
  const [years, setYears] = useState([]);
  const [pyqs, setPyqs] = useState([]);
  
  const [selectedCentreId, setSelectedCentreId] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingPyqs, setLoadingPyqs] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toFileUrl = (u) => {
    const url = String(u || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    (async () => {
      try {
        setError('');
        setLoading(true);
        const res = await apiFetch('/api/student/exam-centres', { token });
        setCentres(Array.isArray(res?.centres) ? res.centres : []);
      } catch (err) {
        setError(err?.message || 'Failed to load exam centres');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!selectedCentreId) {
      setYears([]); setSelectedYear(''); setPyqs([]);
      return;
    }
    (async () => {
      try {
        setError(''); setLoadingYears(true);
        setYears([]); setSelectedYear(''); setPyqs([]);
        const res = await apiFetch(`/api/student/exam-centres/${selectedCentreId}/years`, { token });
        setYears(Array.isArray(res?.years) ? res.years : []);
      } catch (err) {
        setError(err?.message || 'Failed to load years');
      } finally {
        setLoadingYears(false);
      }
    })();
  }, [selectedCentreId, token]);

  useEffect(() => {
    if (!selectedCentreId || !selectedYear) {
      setPyqs([]);
      return;
    }
    (async () => {
      try {
        setError(''); setLoadingPyqs(true); setPyqs([]);
        const qs = `centreId=${selectedCentreId}&year=${selectedYear}`;
        const res = await apiFetch(`/api/student/pyqs/by-centre-year?${qs}`, { token });
        setPyqs(Array.isArray(res?.pyqs) ? res.pyqs : []);
      } catch (err) {
        setError(err?.message || 'Failed to load PYQs');
      } finally {
        setLoadingPyqs(false);
      }
    })();
  }, [selectedCentreId, selectedYear, token]);

  const openPyq = (p) => {
    if (p?.locked) {
      setError('Premium access required');
      router.push('/student/premium');
      return;
    }
    // The backend does not send the raw PDF url for PYQs, so we use the dedicated stream endpoint.
    const rawUrl = `/api/student/pyqs/${p.id}/pdf`;
    const absoluteUrl = toFileUrl(rawUrl);
    if (!absoluteUrl) {
      Alert.alert('Not Available', 'Failed to generate PDF link.');
      return;
    }
    // Append token as query param for server-side authentication
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
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
          <View style={styles.cardBody}>
            <Text style={styles.label}>Exam Centre</Text>
            <TouchableOpacity 
              style={styles.dropdownHeader} 
              onPress={() => setDropdownOpen(!dropdownOpen)}
            >
              <Text style={styles.dropdownHeaderText}>
                {selectedCentreId 
                  ? (centres.find(c => String(c.id) === selectedCentreId)?.name || 'Select Exam Centre') 
                  : 'Select Exam Centre'}
              </Text>
              <Text style={styles.dropdownHeaderArrow}>{dropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {dropdownOpen && (
              <View style={styles.dropdownList}>
                {centres.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.dropdownItem, selectedCentreId === String(c.id) && styles.dropdownItemActive]}
                    onPress={() => {
                      setSelectedCentreId(String(c.id));
                      setDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, selectedCentreId === String(c.id) && styles.dropdownItemTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {loadingYears && <Text style={styles.loadingText}>Loading years...</Text>}

            <View style={styles.divider} />

            {!selectedCentreId ? (
              <Text style={styles.emptyText}>Select an exam centre to view PYQs.</Text>
            ) : !selectedYear ? (
              <View>
                <Text style={styles.sectionTitle}>Available Years</Text>
                {years.length === 0 && !loadingYears ? (
                  <Text style={styles.emptyText}>No years available for this centre.</Text>
                ) : (
                  <View style={styles.yearsGrid}>
                    {years.map((y) => (
                      <TouchableOpacity
                        key={y.id}
                        style={styles.yearCard}
                        onPress={() => setSelectedYear(String(y.year))}
                      >
                        <Text style={styles.yearText}>{y.year}</Text>
                        <Text style={styles.yearSubtext}>View Papers →</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View>
                <View style={styles.flexRowBetween}>
                  <Text style={styles.sectionTitle}>Year {selectedYear}</Text>
                  <TouchableOpacity onPress={() => setSelectedYear('')} style={styles.btnGhost}>
                    <Text style={styles.btnGhostText}>Back to years</Text>
                  </TouchableOpacity>
                </View>

                {loadingPyqs && <Text style={styles.loadingText}>Loading papers...</Text>}
                
                {pyqs.length === 0 && !loadingPyqs ? (
                  <Text style={styles.emptyText}>No PYQs found for {selectedYear}.</Text>
                ) : (
                  <View style={styles.pyqGrid}>
                    {pyqs.map((p) => (
                      <View key={p.id} style={styles.pyqCard}>
                        <View style={styles.flexRowBetween}>
                          <Text style={styles.pyqTitle} numberOfLines={2}>{p.title}</Text>
                          {String(p.accessType || '').toLowerCase() === 'paid' ? (
                            p.locked ? (
                              <View style={styles.badgeWarning}><Text style={styles.badgeWarningText}>⭐ Premium</Text></View>
                            ) : (
                              <View style={styles.badgeInfo}><Text style={styles.badgeInfoText}>Unlocked</Text></View>
                            )
                          ) : (
                            <View style={styles.badgeSuccess}><Text style={styles.badgeSuccessText}>Free</Text></View>
                          )}
                        </View>
                        <Text style={styles.pyqSubject}>{p.subject} • {p.year}</Text>

                        <View style={styles.pyqFooter}>
                          {p.locked ? (
                            <TouchableOpacity style={styles.btnUnlock} onPress={() => router.push('/student/premium')}>
                              <Text style={styles.btnUnlockText}>Unlock</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity style={styles.btnView} onPress={() => openPyq(p)}>
                              <Text style={styles.btnViewText}>View Document</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
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
  card: { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 12 },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  dropdownHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  dropdownHeaderArrow: {
    fontSize: 12,
    color: '#64748b',
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  loadingText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },
  emptyText: { fontSize: 14, color: '#64748b' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  yearsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  yearCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  yearText: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  yearSubtext: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', marginTop: 8 },
  flexRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  btnGhost: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  btnGhostText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  pyqGrid: { gap: 16, marginTop: 12 },
  pyqCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  pyqTitle: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  badgeWarning: { backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeWarningText: { color: '#b45309', fontSize: 10, fontWeight: 'bold' },
  badgeInfo: { backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeInfoText: { color: '#1d4ed8', fontSize: 10, fontWeight: 'bold' },
  badgeSuccess: { backgroundColor: '#d1fae5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeSuccessText: { color: '#047857', fontSize: 10, fontWeight: 'bold' },
  pyqSubject: { fontSize: 12, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginTop: 8 },
  pyqFooter: { marginTop: 16 },
  btnUnlock: { backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnUnlockText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  btnView: { backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnViewText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});
