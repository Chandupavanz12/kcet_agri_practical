import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';
import { API_BASE_URL as apiBaseUrl } from '../config/env';

export default function MockTestResultScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const { testId } = useLocalSearchParams();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/student/results?testId=${testId}`, { token });
        if (!alive) return;
        const latest = res.results?.[0];
        if (!latest) throw new Error('Result not found');
        const detail = await apiFetch(`/api/student/results/${latest.id}`, { token });
        if (!alive) return;
        setResult(detail.result);
      } catch (err) {
        if (!alive) return;
        Alert.alert('Error', err?.message || 'Failed to load result');
        router.replace('/student/dashboard');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, testId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading result...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Result not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const {
    score, outOf, accuracy, correctCount, wrongCount, timeTakenSec, rank, responses,
  } = result;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${apiBaseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.headerTitle}>Test Result</Text>
            <Text style={styles.headerSub}>{result.testTitle}</Text>
          </View>
        </View>

        {/* Score Card */}
        <View style={styles.grid2}>
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.statLabel}>Score</Text>
              <Text style={[styles.statValue, { color: '#2563eb' }]}>{score} / {outOf}</Text>
            </View>
          </View>
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.statLabel}>Rank</Text>
              <Text style={[styles.statValue, { color: '#334155' }]}>#{rank}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.grid2}>
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.statLabel}>Accuracy</Text>
              <Text style={styles.statValueSmall}>{accuracy}%</Text>
            </View>
          </View>
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.statLabel}>Time</Text>
              <Text style={styles.statValueSmall}>{formatTime(timeTakenSec)}</Text>
            </View>
          </View>
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.statLabel}>Correct</Text>
              <Text style={[styles.statValueSmall, { color: '#16a34a' }]}>{correctCount}</Text>
            </View>
          </View>
          <View style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.statLabel}>Wrong</Text>
              <Text style={[styles.statValueSmall, { color: '#dc2626' }]}>{wrongCount}</Text>
            </View>
          </View>
        </View>

        {/* Response Review */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Answer Review</Text>
          </View>
          <View style={styles.cardBody}>
            {responses.sort((a, b) => a.questionOrder - b.questionOrder).map((r, idx) => {
              const imgUrl = getImageUrl(r.imageUrl || r.image_url || r.image);
              return (
                <View key={r.questionId} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewNumberBox}>
                      <Text style={styles.reviewNumber}>{idx + 1}</Text>
                    </View>
                    <View style={styles.reviewHeaderRight}>
                      <Text style={styles.reviewQuestionText}>{r.questionText}</Text>
                      <Text style={[styles.reviewStatus, r.correct ? styles.textGreen : styles.textRed]}>
                        {r.correct ? '✓ Correct' : '✗ Wrong'}
                      </Text>
                    </View>
                  </View>

                  {!!imgUrl && (
                    <View style={styles.reviewImageContainer}>
                      <Image source={{ uri: imgUrl }} style={styles.reviewImage} resizeMode="contain" />
                    </View>
                  )}

                  <View style={styles.reviewOptionsGrid}>
                    {r.options.map((option, optionIdx) => {
                      const optionLetter = String.fromCharCode(65 + optionIdx);
                      const isSelected = r.selectedIndex === optionIdx;
                      const isCorrect = r.correctOption === optionLetter;

                      let boxStyle = styles.optBoxDefault;
                      let ringStyle = styles.optRingDefault;
                      if (isSelected && isCorrect) { boxStyle = styles.optBoxGreen; ringStyle = styles.optRingBlue; }
                      else if (isSelected && !isCorrect) { boxStyle = styles.optBoxRed; ringStyle = styles.optRingBlue; }
                      else if (isCorrect) { boxStyle = styles.optBoxGreenLight; }

                      return (
                        <View key={optionIdx} style={[styles.optBox, boxStyle]}>
                          <View style={[styles.optRing, ringStyle]}>
                            {isSelected && <View style={styles.optRingInner} />}
                          </View>
                          <Text style={styles.optLetter}>{optionLetter}.</Text>
                          <Text style={styles.optText}>{option}</Text>
                          {isCorrect && <Text style={styles.optCorrectLabel}>✓</Text>}
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.reviewSummary}>
                    <Text style={styles.reviewSummaryText}>
                      <Text style={{ fontWeight: 'bold' }}>Your Answer:</Text> {r.selected !== null ? `${r.selected} (${String.fromCharCode(65 + r.selectedIndex)})` : 'Not answered'}
                    </Text>
                    <Text style={styles.reviewSummaryText}>
                      <Text style={{ fontWeight: 'bold' }}>Correct Answer:</Text> {r.correctOption}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.replace('/student/dashboard')}>
            <Text style={styles.btnPrimaryText}>Back to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => router.replace(`/student/mock-test/${testId}`)}>
            <Text style={styles.btnGhostText}>Retake Test</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#475569' },
  container: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  cardBody: { padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  headerSub: { fontSize: 14, color: '#475569', marginTop: 4 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  statValue: { fontSize: 32, fontWeight: 'bold', marginTop: 8 },
  statValueSmall: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginTop: 8 },
  reviewItem: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, marginBottom: 16 },
  reviewHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  reviewNumberBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  reviewNumber: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  reviewHeaderRight: { flex: 1 },
  reviewQuestionText: { fontSize: 16, fontWeight: '500', color: '#0f172a' },
  reviewStatus: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  textGreen: { color: '#16a34a' },
  textRed: { color: '#dc2626' },
  reviewImageContainer: { alignItems: 'center', marginVertical: 16 },
  reviewImage: { width: '100%', height: 180 },
  reviewOptionsGrid: { gap: 8, marginTop: 12 },
  optBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 2 },
  optBoxDefault: { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
  optBoxGreen: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  optBoxGreenLight: { borderColor: '#86efac', backgroundColor: '#f0fdf4' },
  optBoxRed: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  optRing: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optRingDefault: { borderColor: '#cbd5e1' },
  optRingBlue: { borderColor: '#3b82f6', backgroundColor: '#3b82f6' },
  optRingInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  optLetter: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginRight: 6 },
  optText: { flex: 1, fontSize: 14, color: '#334155' },
  optCorrectLabel: { fontSize: 12, fontWeight: 'bold', color: '#16a34a', marginLeft: 8 },
  reviewSummary: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 4 },
  reviewSummaryText: { fontSize: 14, color: '#475569' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnPrimary: { flex: 1, backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  btnGhost: { flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#334155', fontSize: 14, fontWeight: 'bold' },
});
