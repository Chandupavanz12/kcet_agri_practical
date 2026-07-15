import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { API_BASE_URL as apiBaseUrl } from '../config/env';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function MockTestScreen() {
  const { id: testId } = useLocalSearchParams();
  const { token } = useAuth();
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const intervalRef = useRef(null);
  const submittedRef = useRef(false);

  const current = questions[currentIndex];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError('');
        setSubmitting(false);
        submittedRef.current = false;
        setCurrentIndex(0);
        setResponses({});
        setStartTime(Date.now());

        let resolvedTestId = testId;
        if (!resolvedTestId) {
          const list = await apiFetch('/api/student/tests', { token });
          const first = list.tests?.[0];
          if (!first?.id) throw new Error('No active tests available');
          resolvedTestId = String(first.id);
          if (alive) {
            router.replace(`/student/mock-test/${resolvedTestId}`);
          }
          return;
        }

        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Test load timeout')), 12000));
        const res = await Promise.race([
          apiFetch(`/api/student/tests/${resolvedTestId}/start`, { token }),
          timeout,
        ]);
        if (!alive) return;
        setTest(res.test);
        setQuestions(Array.isArray(res.questions) ? res.questions : []);
        setSecondsLeft((res.test?.questionCount || 0) * (res.test?.perQuestionSeconds || 0));

        // Preload images to ensure they display quickly when user navigates to them
        if (Array.isArray(res.questions)) {
          res.questions.forEach((q) => {
            if (q.imageUrl) {
              const url = q.imageUrl.startsWith('http')
                ? q.imageUrl
                : `${apiBaseUrl}${q.imageUrl.startsWith('/') ? '' : '/'}${q.imageUrl}`;
              Image.prefetch(url).catch(() => { });
            }
          });
        }

        if (!res.test || !Array.isArray(res.questions) || res.questions.length === 0) {
          throw new Error('No questions returned for this test');
        }
      } catch (err) {
        if (!alive) return;
        setLoadError(err?.message || 'Failed to start test');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [testId, token]);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) {
      if (secondsLeft === 0) handleSubmit();
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((v) => {
        if (v <= 1) {
          clearInterval(intervalRef.current);
          handleSubmit();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [secondsLeft]);

  const handleSelect = useCallback((optionIndex) => {
    setResponses((r) => ({ ...r, [current.id]: optionIndex }));
  }, [current]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (submitting || submittedRef.current) return;
    setSubmitting(true);
    submittedRef.current = true;
    try {
      const timeTakenSec = Math.round((Date.now() - startTime) / 1000);
      const mappedResponses = questions.map((q) => ({
        specimenId: q.id,
        selected: responses[q.id] ?? null,
      }));
      const resolvedTestId = testId || test?.id;
      await apiFetch(`/api/student/tests/${resolvedTestId}/submit`, {
        token,
        method: 'POST',
        body: { responses: mappedResponses, timeTakenSec },
      });
      router.replace(`/student/mock-test/result?testId=${resolvedTestId}`);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to submit test');
      setSubmitting(false);
      submittedRef.current = false;
    }
  };

  const formatTime = (s) => {
    if (s === null) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading test...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load test</Text>
            <Text style={styles.errorTextMsg}>{loadError}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => router.replace(`/student/mock-test/${testId}`)}>
                <Text style={styles.btnPrimaryText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => router.replace('/student/dashboard')}>
                <Text style={styles.btnGhostText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!test || !current) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Test not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageUrl = current.imageUrl?.startsWith('http') ? current.imageUrl : `${apiBaseUrl}${current.imageUrl?.startsWith('/') ? '' : '/'}${current.imageUrl || ''}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{test.title}</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerCounter}>Q {currentIndex + 1}/{questions.length}</Text>
          <Text style={[styles.headerTimer, secondsLeft <= 30 && styles.headerTimerUrgent]}>
            {formatTime(secondsLeft)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardBody}>
            {!!current.imageUrl && (
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.specimenImage}
                  resizeMode="contain"
                />
              </View>
            )}

            <View style={styles.optionsGrid}>
              {current.options.map((opt, idx) => {
                const isSelected = responses[current.id] === idx;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleSelect(idx)}
                    disabled={submitting}
                    style={[
                      styles.optionBtn,
                      isSelected ? styles.optionBtnSelected : styles.optionBtnNormal,
                      submitting && styles.opacity60
                    ]}
                  >
                    <Text style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                      {String.fromCharCode(65 + idx)}
                    </Text>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.navRow}>
              <Text style={styles.navHint}>Auto-submit when time ends</Text>
              <TouchableOpacity
                onPress={handleNext}
                disabled={submitting}
                style={[styles.btnNext, submitting && styles.opacity60]}
              >
                <Text style={styles.btnNextText}>
                  {currentIndex < questions.length - 1 ? 'Next' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.quickNavTitle}>Quick Navigation</Text>
            <View style={styles.quickNavGrid}>
              {questions.map((q, idx) => {
                const answered = responses[q.id] !== undefined;
                const isCurrent = idx === currentIndex;
                return (
                  <TouchableOpacity
                    key={q.id}
                    onPress={() => setCurrentIndex(idx)}
                    disabled={submitting}
                    style={[
                      styles.quickNavBtn,
                      answered ? styles.quickNavBtnAnswered : styles.quickNavBtnUnanswered,
                      isCurrent && styles.quickNavBtnCurrent,
                      submitting && styles.opacity60
                    ]}
                  >
                    <Text style={[
                      styles.quickNavText,
                      answered ? styles.quickNavTextAnswered : styles.quickNavTextUnanswered,
                      isCurrent && styles.quickNavTextCurrent
                    ]}>
                      {idx + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#475569' },
  errorCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  errorTextMsg: { fontSize: 14, color: '#475569', marginBottom: 20 },
  errorActions: { flexDirection: 'row', gap: 12 },
  btnPrimary: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  btnGhost: { backgroundColor: '#f1f5f9', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnGhostText: { color: '#334155', fontSize: 14, fontWeight: 'bold' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerCounter: { fontSize: 14, color: '#64748b' },
  headerTimer: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  headerTimerUrgent: { color: '#dc2626' },
  container: { padding: 16, gap: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1, borderWidth: 1, borderColor: '#e2e8f0' },
  cardBody: { padding: 16 },
  imageContainer: { alignItems: 'center', marginBottom: 24, backgroundColor: '#f8fafc', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  specimenImage: { width: '100%', height: 250 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  optionBtn: { flex: 1, minWidth: '45%', borderWidth: 2, borderRadius: 12, padding: 16, alignItems: 'center' },
  optionBtnNormal: { borderColor: '#e2e8f0', backgroundColor: '#fff' },
  optionBtnSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  optionLetter: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  optionLetterSelected: { color: '#1d4ed8' },
  optionText: { fontSize: 14, color: '#475569', marginTop: 4, textAlign: 'center' },
  optionTextSelected: { color: '#1e40af', fontWeight: '500' },
  opacity60: { opacity: 0.6 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  navHint: { fontSize: 12, color: '#94a3b8' },
  btnNext: { backgroundColor: '#2563eb', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  btnNextText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  quickNavTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  quickNavGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickNavBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  quickNavBtnUnanswered: { backgroundColor: '#f1f5f9' },
  quickNavBtnAnswered: { backgroundColor: '#2563eb' },
  quickNavBtnCurrent: { borderWidth: 2, borderColor: '#f59e0b' },
  quickNavText: { fontSize: 14, fontWeight: '600' },
  quickNavTextUnanswered: { color: '#475569' },
  quickNavTextAnswered: { color: '#fff' },
  quickNavTextCurrent: { color: '#fff' },
});
