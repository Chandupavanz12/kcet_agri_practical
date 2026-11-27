import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import ExamSelectorView, { EXAM_OPTIONS } from '../components/ExamSelectorView.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const VIDEO_EXAMS = EXAM_OPTIONS.filter((e) => e.id === 'puc' || e.id === 'agri');

export default function StudentVideosScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [selectedExam, setSelectedExam] = useState(
    params.exam ? String(params.exam).toLowerCase().trim() : ''
  );
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.exam) {
      setSelectedExam(String(params.exam).toLowerCase().trim());
    }
  }, [params.exam]);

  useEffect(() => {
    if (!selectedExam) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiFetch(`/api/student/videos?exam=${encodeURIComponent(selectedExam)}`, { token });
        if (!alive) return;
        setVideos(Array.isArray(res?.videos) ? res.videos : []);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || 'Failed to load videos');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, selectedExam]);

  const extractYouTubeId = (url) => {
    const s = String(url || '').trim();
    if (!s) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
      /[?&]v=([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = s.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getThumb = (url) => {
    const id = extractYouTubeId(url);
    if (!id) return null;
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  };

  const openVideo = (url) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  const examInfo = EXAM_OPTIONS.find((e) => e.id === selectedExam) || VIDEO_EXAMS[0];

  if (!selectedExam) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ExamSelectorView
            title="Video Guidance"
            subtitle="Choose an exam to watch concept tutorials and practical demonstration videos."
            icon="🎥"
            exams={VIDEO_EXAMS}
            onSelectExam={(id) => setSelectedExam(id)}
            onBack={() => router.back()}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={examInfo.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              onPress={() => (params.exam ? router.back() : setSelectedExam(''))}
              style={styles.heroBackBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.heroBackText}>
                {params.exam ? '← Back' : '← Change Exam'}
              </Text>
            </TouchableOpacity>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{examInfo.icon} {examInfo.name}</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>{examInfo.name} Video Guidance</Text>
          <Text style={styles.heroSub}>
            {selectedExam === 'puc'
              ? 'Concept explanations, chapter lectures, and exam preparation videos.'
              : 'Practical plant identification, specimen analysis, and lab video tutorials.'}
          </Text>
        </LinearGradient>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={examInfo.color} />
            <Text style={styles.loadingText}>Loading {examInfo.name} videos...</Text>
          </View>
        ) : videos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎥</Text>
            <Text style={styles.emptyTitle}>No Videos Available Yet</Text>
            <Text style={styles.emptyText}>
              Video guidance for {examInfo.name} will be added here soon.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {videos.map((v) => {
              const thumb = getThumb(v.videoUrl);
              return (
                <View key={v.id} style={styles.videoCard}>
                  <View style={[styles.cardAccent, { backgroundColor: examInfo.color }]} />
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.placeholderThumb} />
                  )}
                  <View style={styles.videoCardBody}>
                    <Text style={styles.videoTitle} numberOfLines={2}>{v.title}</Text>
                    <Text style={[styles.videoSubject, { color: examInfo.color }]}>{v.subject}</Text>
                    <TouchableOpacity
                      style={[styles.btnWatch, { backgroundColor: examInfo.color }]}
                      onPress={() => openVideo(v.videoUrl)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.btnWatchText}>▶ Watch Video</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, gap: 14, paddingBottom: 36 },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    gap: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  heroBackBtn: { backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  heroBackText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  heroSub: { fontSize: 13, color: '#e2e8f0', lineHeight: 18 },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  loadingBox: { paddingVertical: 48, alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  emptyState: {
    padding: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    gap: 6,
  },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  grid: { gap: 14 },
  videoCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: { height: 4 },
  thumbnail: { width: '100%', height: 185, backgroundColor: '#e2e8f0' },
  placeholderThumb: { width: '100%', height: 185, backgroundColor: '#e2e8f0' },
  videoCardBody: { padding: 16, gap: 6 },
  videoTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  videoSubject: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  btnWatch: { marginTop: 8, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  btnWatchText: { fontSize: 13.5, fontWeight: '800', color: '#fff' },
});
