import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image, Linking } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function StudentVideosScreen() {
  const { token } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/student/videos', { token });
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
  }, [token]);

  const extractYouTubeId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = String(url || '').match(pattern);
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
    Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
  };

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
              <Text style={styles.headerTitle}>Videos</Text>
              <Text style={styles.headerSub}>Short lessons to revise concepts quickly.</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🎬 Learn</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardBody}>
            {videos.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No videos available.</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {videos.map((v) => {
                  const thumb = getThumb(v.videoUrl);
                  return (
                    <View key={v.id} style={styles.videoCard}>
                      <View style={styles.cardAccent} />
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.thumbnail} />
                      ) : (
                        <View style={styles.placeholderThumb} />
                      )}
                      <View style={styles.videoCardBody}>
                        <Text style={styles.videoTitle} numberOfLines={2}>{v.title}</Text>
                        <Text style={styles.videoSubject}>{v.subject}</Text>
                        <TouchableOpacity style={styles.btnWatch} onPress={() => openVideo(v.videoUrl)}>
                          <Text style={styles.btnWatchText}>Watch →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
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
  grid: { gap: 16 },
  videoCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e2e8f0' },
  cardAccent: { height: 4, backgroundColor: '#f43f5e' },
  thumbnail: { width: '100%', height: 180, backgroundColor: '#e2e8f0' },
  placeholderThumb: { width: '100%', height: 180, backgroundColor: '#e2e8f0' },
  videoCardBody: { padding: 16 },
  videoTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  videoSubject: { fontSize: 14, color: '#475569', marginTop: 4 },
  btnWatch: { marginTop: 12, alignSelf: 'flex-start' },
  btnWatchText: { fontSize: 14, fontWeight: '600', color: '#2563eb' },
});
