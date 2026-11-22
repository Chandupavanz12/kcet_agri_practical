import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const { width } = Dimensions.get('window');

// ─── StudyHack Logo Component ────────────────────────────────────────────────
function StudyHackLogo() {
  return (
    <View style={styles.logoRow}>
      {/* Stylized S Cap Badge */}
      <View style={styles.logoBadge}>
        <Text style={styles.logoGradCap}>🎓</Text>
        <Text style={styles.logoS}>S</Text>
      </View>
      <View style={styles.logoTextCol}>
        <Text style={styles.logoTitle}>
          Study<Text style={styles.logoTitleGreen}>Hack</Text>
        </Text>
        <Text style={styles.logoSubtitle}>Learn Smart. Score Higher.</Text>
        <View style={styles.logoUnderline} />
      </View>
    </View>
  );
}

// ─── Exam Cards Data ─────────────────────────────────────────────────────────
const EXAM_CARDS = [
  {
    id: 'puc',
    name: 'PUC',
    subtitle: 'Study • Practice • Ace',
    icon: '📄',
    bgColor: '#e0e7ff', // soft indigo
    iconColor: '#4f46e5',
    borderColor: '#c7d2fe',
  },
  {
    id: 'kcet',
    name: 'KCET',
    subtitle: 'Target Your Rank',
    icon: '🎯',
    bgColor: '#e0f2fe', // soft sky blue
    iconColor: '#0284c7',
    borderColor: '#bae6fd',
  },
  {
    id: 'neet',
    name: 'NEET',
    subtitle: 'Prepare for Success',
    icon: '🩺',
    bgColor: '#ffe4e6', // soft rose
    iconColor: '#e11d48',
    borderColor: '#fecdd3',
  },
  {
    id: 'agri',
    name: 'Agri Practical',
    subtitle: 'Grow Your Future',
    icon: '🌱',
    bgColor: '#dcfce7', // soft mint
    iconColor: '#16a34a',
    borderColor: '#bbf7d0',
  },
];

export default function StudentDashboardScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [banners, setBanners] = useState([
    {
      id: 1,
      title: 'Dream Big...',
      highlight_text: 'Prepare Smart!',
      subtitle: 'Your Complete Exam Preparation Partner',
      button_text: 'Start Learning >',
      action_route: '/student/exam/puc',
      bg_gradient_start: '#07162c',
      bg_gradient_end: '#059669',
    },
  ]);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const bannerFlatListRef = useRef(null);
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth || 380, 480);
  const BANNER_WIDTH = screenWidth - 32;
  const [progress, setProgress] = useState({
    progressPercent: 0,
    totalTestsGiven: 0,
    totalScore: 0,
    overallAccuracy: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setError('');
      const [bannerRes, progRes, notifRes] = await Promise.all([
        apiFetch('/api/student/banners?exam=global', { token }).catch(() => null),
        apiFetch('/api/student/aggregated-progress', { token }).catch(() => null),
        apiFetch('/api/student/notifications', { token }).catch(() => null),
      ]);

      if (Array.isArray(bannerRes?.banners) && bannerRes.banners.length > 0) {
        setBanners(bannerRes.banners);
      }

      if (progRes?.overall) {
        setProgress(progRes.overall);
      }

      const rows = Array.isArray(notifRes?.notifications) ? notifRes.notifications : [];
      setNotifications(rows);
    } catch (err) {
      setError(err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData(false);
  }, [token]);

  // Auto-scroll hero banners every 4 seconds with smooth sliding animation
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => {
        const next = (prev + 1) % banners.length;
        bannerFlatListRef.current?.scrollToOffset({
          offset: next * (BANNER_WIDTH + 12),
          animated: true,
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData(false);
  }, [token]);

  useEffect(() => {
    if (params.error) {
      setError(params.error === 'PaymentVerificationFailed' ? 'Payment verification failed.' : String(params.error));
    }
    if (params.success) {
      setSuccessMsg(params.success === 'PremiumActivated' ? '🎉 Payment successful! Premium access is now activated.' : String(params.success));
    }
  }, [params.error, params.success]);

  const currentBanner = banners[activeBannerIdx] || banners[0] || {
    title: 'Dream Big...',
    highlight_text: 'Prepare Smart!',
    subtitle: 'Your Complete Exam Preparation Partner',
    button_text: 'Start Learning >',
    action_route: '/student/exam/puc',
    bg_gradient_start: '#07162c',
    bg_gradient_end: '#059669',
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />}
      >
        {/* Top Header with StudyHack Logo, Notification Bell and User Avatar */}
        <View style={styles.topHeader}>
          <StudyHackLogo />

          <View style={styles.headerRight}>
            {/* Notification Bell */}
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => router.push('/student/notifications')}
              activeOpacity={0.7}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {notifications.length > 0 && <View style={styles.notifBadge} />}
            </TouchableOpacity>

            {/* User Avatar Initial Letter with Green Active Dot */}
            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={() => router.push('/student/profile')}
              activeOpacity={0.8}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {(user?.name?.trim()?.[0] || 'S').toUpperCase()}
                </Text>
              </View>
              <View style={styles.avatarOnlineDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Error / Success Notifications */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {!!successMsg && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        {/* 1. Hero Banner Slider (Smooth left-to-right sliding animation) */}
        <View style={{ marginBottom: 4 }}>
          <FlatList
            ref={bannerFlatListRef}
            data={banners}
            horizontal
            pagingEnabled={false}
            snapToInterval={BANNER_WIDTH + 12}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
            keyExtractor={(item, index) => String(item.id || index)}
            onMomentumScrollEnd={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / (BANNER_WIDTH + 12));
              setActiveBannerIdx(index);
            }}
            renderItem={({ item }) => (
              <LinearGradient
                colors={[item.bg_gradient_start || '#07162c', item.bg_gradient_end || '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroCard, { width: BANNER_WIDTH }]}
              >
                <View style={styles.heroLeft}>
                  <Text style={styles.heroHeading}>
                    {item.title}{'\n'}
                    {!!item.highlight_text && (
                      <Text style={styles.heroHeadingHighlight}>{item.highlight_text}</Text>
                    )}
                  </Text>
                  <Text style={styles.heroSubText}>
                    {item.subtitle || 'Your Complete Exam Preparation Partner'}
                  </Text>

                  <TouchableOpacity
                    style={styles.heroCtaBtn}
                    onPress={() => router.push(item.action_route || '/student/exam/puc')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.heroCtaText}>{item.button_text || 'Start Learning >'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Student Illustration / Image on Right */}
                <View style={styles.heroRight}>
                  <Image
                    source={{
                      uri: item.image_url || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&auto=format&fit=crop&q=80',
                    }}
                    style={styles.heroStudentImg}
                  />
                </View>
              </LinearGradient>
            )}
          />

          {/* Carousel Dots */}
          {banners.length > 1 && (
            <View style={styles.carouselDotsRow}>
              {banners.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setActiveBannerIdx(idx);
                    bannerFlatListRef.current?.scrollToOffset({
                      offset: idx * (BANNER_WIDTH + 12),
                      animated: true,
                    });
                  }}
                  style={[styles.dot, idx === activeBannerIdx && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* 2. "Choose Your Exam" Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Choose Your Exam</Text>
          <TouchableOpacity onPress={() => router.push('/student/exam/puc')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.examGrid}>
          {EXAM_CARDS.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={[styles.examCard, { backgroundColor: exam.bgColor, borderColor: exam.borderColor }]}
              onPress={() => router.push(`/student/exam/${exam.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.examIconCircle}>
                <Text style={styles.examIcon}>{exam.icon}</Text>
              </View>
              <Text style={styles.examName}>{exam.name}</Text>
              <Text style={styles.examSub}>{exam.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. Features Row (Quick Actions) */}
        <View style={styles.featuresRow}>
          {/* Video Guidance (Active for Agri Practical) */}
          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/student/exam/agri')}
            activeOpacity={0.7}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#ede9fe' }]}>
              <Text style={{ fontSize: 20 }}>▶️</Text>
            </View>
            <Text style={styles.featureLabel}>Video{'\n'}Lectures</Text>
          </TouchableOpacity>

          {/* Mock Tests */}
          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/student/tests')}
            activeOpacity={0.7}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#dcfce7' }]}>
              <Text style={{ fontSize: 20 }}>📋</Text>
            </View>
            <Text style={styles.featureLabel}>Mock{'\n'}Tests</Text>
          </TouchableOpacity>

          {/* Study Materials */}
          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/student/materials')}
            activeOpacity={0.7}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#ffedd5' }]}>
              <Text style={{ fontSize: 20 }}>📖</Text>
            </View>
            <Text style={styles.featureLabel}>Study{'\n'}Materials</Text>
          </TouchableOpacity>

          {/* Previous Year Papers */}
          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/student/pyqs')}
            activeOpacity={0.7}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Text style={{ fontSize: 20 }}>📑</Text>
            </View>
            <Text style={styles.featureLabel}>Previous{'\n'}Year Papers</Text>
          </TouchableOpacity>

          {/* Performance Analytics */}
          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/student/progress')}
            activeOpacity={0.7}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#fae8ff' }]}>
              <Text style={{ fontSize: 20 }}>📈</Text>
            </View>
            <Text style={styles.featureLabel}>Performance{'\n'}Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* 4. "Your Progress" Section Card */}
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressCard}
        >
          <View style={styles.progressHeaderRow}>
            <View style={styles.progressTitleBox}>
              <Text style={{ fontSize: 18 }}>📊</Text>
              <Text style={styles.progressTitle}>Your Progress</Text>
            </View>
            <Text style={styles.keepGoingText}>Keep Going! 🔥</Text>
          </View>

          <View style={styles.progressBodyRow}>
            {/* Left Circular Meter */}
            <View style={styles.circleContainer}>
              <View style={styles.circleRing}>
                <Text style={styles.circlePercentText}>{progress.progressPercent}%</Text>
              </View>
              <View style={styles.circleLabelCol}>
                <Text style={styles.overallPrepText}>Overall Preparation</Text>
                <Text style={styles.doingGreatText}>
                  {progress.progressPercent > 60 ? "You're doing great!" : 'Keep practicing daily!'}
                </Text>
              </View>
            </View>

            {/* Right Metrics */}
            <View style={styles.metricsCol}>
              <View style={styles.metricItem}>
                <Text style={{ fontSize: 22 }}>🏆</Text>
                <Text style={styles.metricVal}>{progress.totalTestsGiven}</Text>
                <Text style={styles.metricSub}>Tests Given</Text>
              </View>

              <View style={styles.metricItem}>
                <Text style={{ fontSize: 22 }}>⭐</Text>
                <Text style={styles.metricVal}>{progress.totalScore}</Text>
                <Text style={styles.metricSub}>Total Score</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* 5. "Quick Access" Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Quick Access</Text>
          <TouchableOpacity onPress={() => router.push('/student/tests')}>
            <Text style={styles.viewAllText}>See More →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickAccessRow}>
          {/* Daily Quiz */}
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]}
            onPress={() => router.push('/student/tests')}
            activeOpacity={0.8}
          >
            <View style={styles.quickIconRow}>
              <Text style={{ fontSize: 22 }}>⚡</Text>
              <Text style={styles.quickTitle}>Daily Quiz</Text>
            </View>
            <Text style={styles.quickSub}>Test Your Knowledge</Text>
            <Text style={styles.quickArrow}>→</Text>
          </TouchableOpacity>

          {/* Top Rankers Tips */}
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#eef2ff', borderColor: '#e0e7ff' }]}
            onPress={() => router.push('/student/materials')}
            activeOpacity={0.8}
          >
            <View style={styles.quickIconRow}>
              <Text style={{ fontSize: 22 }}>📖</Text>
              <Text style={styles.quickTitle}>Rankers Tips</Text>
            </View>
            <Text style={styles.quickSub}>Learn from the Best</Text>
            <Text style={styles.quickArrow}>→</Text>
          </TouchableOpacity>

          {/* Study Rewards */}
          <TouchableOpacity
            style={[styles.quickCard, { backgroundColor: '#fff1f2', borderColor: '#ffe4e6' }]}
            onPress={() => router.push('/student/premium')}
            activeOpacity={0.8}
          >
            <View style={styles.quickIconRow}>
              <Text style={{ fontSize: 22 }}>🎁</Text>
              <Text style={styles.quickTitle}>Rewards</Text>
            </View>
            <Text style={styles.quickSub}>Earn & Unlock</Text>
            <Text style={styles.quickArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 6. Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.bottomNavItem} onPress={() => {}}>
          <Text style={[styles.bottomNavIcon, { color: '#16a34a' }]}>🏠</Text>
          <Text style={[styles.bottomNavLabel, { color: '#16a34a', fontWeight: '800' }]}>Home</Text>
          <View style={styles.bottomActiveBar} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/student/tests')}>
          <Text style={styles.bottomNavIcon}>📊</Text>
          <Text style={styles.bottomNavLabel}>Practice</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/student/progress')}>
          <Text style={styles.bottomNavIcon}>🏆</Text>
          <Text style={styles.bottomNavLabel}>Leaderboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/student/profile')}>
          <Text style={styles.bottomNavIcon}>⚙️</Text>
          <Text style={styles.bottomNavLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 85,
    gap: 16,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Top Header
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 2,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center' },
  logoGradCap: { fontSize: 14, position: 'absolute', top: 2 },
  logoS: { fontSize: 22, fontWeight: '900', color: '#ffffff', marginTop: 10 },
  logoTextCol: { gap: 1 },
  logoTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  logoTitleGreen: { color: '#16a34a' },
  logoSubtitle: { fontSize: 10, fontWeight: '700', color: '#334155' },
  logoUnderline: { height: 2, backgroundColor: '#16a34a', borderRadius: 2, width: 40, marginTop: 1 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  bellIcon: { fontSize: 18 },
  notifBadge: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ef4444', position: 'absolute', top: 9, right: 9 },
  avatarWrapper: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#10b981' },
  avatarCircle: { width: '100%', height: '100%', borderRadius: 21, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  avatarOnlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', position: 'absolute', bottom: -1, right: -1, borderWidth: 2, borderColor: '#fff' },

  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 14, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  successBox: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 14, padding: 12 },
  successText: { color: '#15803d', fontSize: 13, fontWeight: '600' },

  // Hero Card
  heroCard: { borderRadius: 22, padding: 20, flexDirection: 'row', alignItems: 'center', position: 'relative', overflow: 'hidden', minHeight: 175 },
  heroLeft: { flex: 1.2, gap: 8 },
  heroHeading: { fontSize: 20, fontWeight: '900', color: '#ffffff', lineHeight: 26 },
  heroHeadingHighlight: { color: '#facc15', fontStyle: 'italic' },
  heroSubText: { fontSize: 12, color: '#e2e8f0', lineHeight: 16 },
  heroCtaBtn: { alignSelf: 'flex-start', backgroundColor: '#facc15', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginTop: 4 },
  heroCtaText: { color: '#0f172a', fontWeight: '800', fontSize: 12 },
  heroRight: { flex: 0.8, alignItems: 'center', justifyContent: 'center' },
  heroStudentImg: { width: 110, height: 130, borderRadius: 16, resizeMode: 'cover' },
  carouselDotsRow: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 18, backgroundColor: '#facc15' },

  // Sections
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionHeading: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  viewAllText: { fontSize: 13, fontWeight: '700', color: '#059669' },

  // Exam Grid
  examGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  examCard: { width: (width - 44) / 2, borderRadius: 18, padding: 14, borderWidth: 1, gap: 4, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 },
  examIconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  examIcon: { fontSize: 22 },
  examName: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
  examSub: { fontSize: 11, fontWeight: '600', color: '#64748b' },

  // Features Row
  featuresRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  featureItem: { alignItems: 'center', gap: 6, width: (width - 60) / 5 },
  featureIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 10, fontWeight: '700', color: '#334155', textAlign: 'center', lineHeight: 13 },

  // Progress Card
  progressCard: { borderRadius: 20, padding: 18, gap: 14 },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTitle: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  keepGoingText: { fontSize: 12, fontWeight: '700', color: '#facc15' },
  progressBodyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  circleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  circleRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 5, borderColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  circlePercentText: { fontSize: 17, fontWeight: '900', color: '#ffffff' },
  circleLabelCol: { gap: 2, flex: 1 },
  overallPrepText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  doingGreatText: { fontSize: 11, color: '#94a3b8' },
  metricsCol: { flexDirection: 'row', gap: 16 },
  metricItem: { alignItems: 'center', gap: 2 },
  metricVal: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  metricSub: { fontSize: 10, color: '#94a3b8' },

  // Quick Access
  quickAccessRow: { flexDirection: 'row', gap: 10 },
  quickCard: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1, gap: 4 },
  quickIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickTitle: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
  quickSub: { fontSize: 10, color: '#64748b' },
  quickArrow: { fontSize: 14, color: '#0f172a', fontWeight: '800', marginTop: 4 },

  // Bottom Nav
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 65, backgroundColor: '#ffffff', flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center', justifyContent: 'space-around' },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative' },
  bottomNavIcon: { fontSize: 20 },
  bottomNavLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  bottomActiveBar: { position: 'absolute', bottom: -6, width: 20, height: 3, backgroundColor: '#16a34a', borderRadius: 2 },
});
