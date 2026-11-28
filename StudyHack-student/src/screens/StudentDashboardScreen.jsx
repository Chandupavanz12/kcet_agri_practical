import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

// ─── StudyHack Logo Component ────────────────────────────────────────────────
function StudyHackLogo() {
  return (
    <View style={styles.logoRow}>
      <Image
        source={require('../../assets/images/studyhack-emblem.png')}
        style={{ width: 42, height: 42, borderRadius: 10 }}
        resizeMode="contain"
      />
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
  const [subscriptionsDisabled, setSubscriptionsDisabled] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setError('');
      const [bannerRes, progRes, notifRes, subSetRes] = await Promise.all([
        apiFetch('/api/student/banners?exam=global', { token }).catch(() => null),
        apiFetch('/api/student/aggregated-progress', { token }).catch(() => null),
        apiFetch('/api/student/notifications', { token }).catch(() => null),
        apiFetch('/api/student/subscription-settings', { token }).catch(() => null),
      ]);

      if (Array.isArray(subSetRes?.subscriptionsDisabled)) {
        setSubscriptionsDisabled(subSetRes.subscriptionsDisabled);
      }

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
            <TouchableOpacity
              style={styles.iconCircle}
              onPress={() => router.push('/student/notifications')}
              activeOpacity={0.75}
            >
              <Text style={styles.bellIcon}>🔔</Text>
              {notifications.length > 0 && <View style={styles.notifBadge} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarWrapper}
              onPress={() => router.push('/student/profile')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.avatarCircle}
              >
                <Text style={styles.avatarLetter}>
                  {(user?.name?.trim()?.[0] || 'S').toUpperCase()}
                </Text>
              </LinearGradient>
              <View style={styles.avatarOnlineDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Native Greeting Strip */}
        <View style={styles.greetingStrip}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingEyebrow}>STUDENT LEARNING HUB</Text>
            <Text style={styles.greetingName} numberOfLines={1}>
              Welcome back, {user?.name?.split(' ')[0] || 'Student'} 👋
            </Text>
          </View>
          <View style={styles.streakPill}>
            <Text style={styles.streakPillText}>✨ ACTIVE</Text>
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

        {/* 1. Hero Banner Slider */}
        <View style={{ marginBottom: 2 }}>
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
                colors={[item.bg_gradient_start || '#0f172a', item.bg_gradient_end || '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroCard, { width: BANNER_WIDTH }]}
              >
                <View style={styles.heroLeft}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>🎓 STUDYHACK PRO</Text>
                  </View>
                  <Text style={styles.heroHeading}>
                    {item.title}{'\n'}
                    {!!item.highlight_text && (
                      <Text style={styles.heroHeadingHighlight}>{item.highlight_text}</Text>
                    )}
                  </Text>
                  <Text style={styles.heroSubText} numberOfLines={2}>
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
          <Text style={styles.sectionHeading}>🎯 CHOOSE YOUR EXAM</Text>
          <TouchableOpacity style={styles.viewAllPill} onPress={() => router.push('/student/exam/puc')}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.examGrid}>
          {EXAM_CARDS.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.examCard}
              onPress={() => router.push(`/student/exam/${exam.id}`)}
              activeOpacity={0.82}
            >
              <View style={styles.examCardTop}>
                <View style={[styles.examIconCircle, { backgroundColor: exam.bgColor, borderColor: exam.borderColor }]}>
                  <Text style={styles.examIcon}>{exam.icon}</Text>
                </View>
                <Text style={styles.examCardArrow}>→</Text>
              </View>
              <Text style={styles.examName}>{exam.name}</Text>
              <Text style={styles.examSub}>{exam.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 3. Features Row (Quick Actions) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>⚡ STUDY TOOLS</Text>
        </View>

        <View style={styles.featuresRow}>
          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/student/videos')}
            activeOpacity={0.75}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#ede9fe' }]}>
              <Text style={{ fontSize: 20 }}>▶️</Text>
            </View>
            <Text style={styles.featureLabel}>Video{'\n'}Lectures</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/student/tests')}
            activeOpacity={0.75}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#dcfce7' }]}>
              <Text style={{ fontSize: 20 }}>📋</Text>
            </View>
            <Text style={styles.featureLabel}>Mock{'\n'}Tests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/student/materials')}
            activeOpacity={0.75}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#ffedd5' }]}>
              <Text style={{ fontSize: 20 }}>📖</Text>
            </View>
            <Text style={styles.featureLabel}>Study{'\n'}Materials</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/student/pyqs')}
            activeOpacity={0.75}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#e0f2fe' }]}>
              <Text style={{ fontSize: 20 }}>📑</Text>
            </View>
            <Text style={styles.featureLabel}>Previous{'\n'}Papers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureItem}
            onPress={() => router.push('/student/progress')}
            activeOpacity={0.75}
          >
            <View style={[styles.featureIconBox, { backgroundColor: '#fae8ff' }]}>
              <Text style={{ fontSize: 20 }}>📈</Text>
            </View>
            <Text style={styles.featureLabel}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* 4. "Your Progress" Section Card (matching Admin Hero Card Polish) */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/student/progress')}
        >
          <LinearGradient
            colors={['#0f172a', '#1e293b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.progressCard}
          >
            <View style={styles.progressHeaderRow}>
              <View style={styles.progressTitleBox}>
                <Text style={{ fontSize: 18 }}>📊</Text>
                <Text style={styles.progressTitle}>YOUR PROGRESS</Text>
              </View>
              <View style={styles.progressDetailsPill}>
                <Text style={styles.progressDetailsText}>View Details →</Text>
              </View>
            </View>

            <View style={styles.progressBodyRow}>
              <View style={styles.circleContainer}>
                <View style={styles.circleRing}>
                  <Text style={styles.circlePercentText}>{progress.progressPercent}%</Text>
                </View>
                <View style={styles.circleLabelCol}>
                  <Text style={styles.overallPrepText}>Overall Preparation</Text>
                  <Text style={styles.doingGreatText}>
                    {progress.progressPercent > 60 ? "You're doing great! 🔥" : 'Keep practicing daily! 🔥'}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsCol}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.metricStatPill}>
                  <Text style={styles.metricVal}>{progress.totalTestsGiven}</Text>
                  <Text style={styles.metricSub}>TESTS</Text>
                </LinearGradient>

                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.metricStatPill}>
                  <Text style={styles.metricVal}>{progress.totalScore}</Text>
                  <Text style={styles.metricSub}>SCORE</Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* 5. "Quick Access" Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>🚀 QUICK ACCESS</Text>
          <TouchableOpacity style={styles.viewAllPill} onPress={() => router.push('/student/tests')}>
            <Text style={styles.viewAllText}>See More →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/student/tests')}
            activeOpacity={0.82}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#fef3c7' }]}>
              <Text style={{ fontSize: 18 }}>⚡</Text>
            </View>
            <Text style={styles.quickTitle}>Daily Quiz</Text>
            <Text style={styles.quickSub}>Test Knowledge</Text>
            <Text style={styles.quickArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/student/materials')}
            activeOpacity={0.82}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#e0e7ff' }]}>
              <Text style={{ fontSize: 18 }}>📖</Text>
            </View>
            <Text style={styles.quickTitle}>Rankers Tips</Text>
            <Text style={styles.quickSub}>Top Notes</Text>
            <Text style={styles.quickArrow}>→</Text>
          </TouchableOpacity>

          {!subscriptionsDisabled.includes('all') && !subscriptionsDisabled.includes('agri') && (
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => router.push('/student/premium')}
              activeOpacity={0.82}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#ffe4e6' }]}>
                <Text style={{ fontSize: 18 }}>🎁</Text>
              </View>
              <Text style={styles.quickTitle}>Rewards</Text>
              <Text style={styles.quickSub}>Earn & Unlock</Text>
              <Text style={styles.quickArrow}>→</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* 6. Native Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.bottomNavItem, styles.bottomNavItemActive]} onPress={() => {}}>
          <Text style={[styles.bottomNavIcon, { color: '#059669' }]}>🏠</Text>
          <Text style={[styles.bottomNavLabel, { color: '#059669', fontWeight: '800' }]}>Home</Text>
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
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 92,
    gap: 16,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Top Header
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoTextCol: { gap: 1 },
  logoTitle: { fontSize: 21, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  logoTitleGreen: { color: '#059669' },
  logoSubtitle: { fontSize: 10, fontWeight: '700', color: '#475569' },
  logoUnderline: { height: 2, backgroundColor: '#10b981', borderRadius: 2, width: 42, marginTop: 1 },

  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: { fontSize: 17 },
  notifBadge: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#ef4444', position: 'absolute', top: 8, right: 8 },
  avatarWrapper: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: '#10b981' },
  avatarCircle: { width: '100%', height: '100%', borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 17, fontWeight: '900', color: '#ffffff' },
  avatarOnlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', position: 'absolute', bottom: -1, right: -1, borderWidth: 2, borderColor: '#fff' },

  // Greeting Strip
  greetingStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  greetingEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.8,
  },
  greetingName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  streakPill: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  streakPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },

  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 14, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  successBox: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 14, padding: 12 },
  successText: { color: '#15803d', fontSize: 13, fontWeight: '600' },

  // Hero Card
  heroCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 178,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  heroLeft: { flex: 1.25, gap: 7 },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  heroBadgeText: { color: '#e2e8f0', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  heroHeading: { fontSize: 20, fontWeight: '900', color: '#ffffff', lineHeight: 25 },
  heroHeadingHighlight: { color: '#facc15', fontStyle: 'italic' },
  heroSubText: { fontSize: 12, color: '#cbd5e1', lineHeight: 16, fontWeight: '500' },
  heroCtaBtn: { alignSelf: 'flex-start', backgroundColor: '#facc15', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginTop: 4 },
  heroCtaText: { color: '#0f172a', fontWeight: '900', fontSize: 12 },
  heroRight: { flex: 0.75, alignItems: 'center', justifyContent: 'center' },
  heroStudentImg: { width: 108, height: 128, borderRadius: 16, resizeMode: 'cover' },
  carouselDotsRow: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 18, backgroundColor: '#facc15' },

  // Sections
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  sectionHeading: { fontSize: 15, fontWeight: '900', color: '#1e293b', letterSpacing: 0.4 },
  viewAllPill: { backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  viewAllText: { fontSize: 12, fontWeight: '800', color: '#059669' },

  // Exam Grid (Admin-style elevated native cards)
  examGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  examCard: {
    width: '48.2%',
    maxWidth: '48.2%',
    flexBasis: '48.2%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  examCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  examIconCircle: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  examIcon: { fontSize: 22 },
  examCardArrow: { fontSize: 18, fontWeight: '900', color: '#cbd5e1' },
  examName: { fontSize: 16.5, fontWeight: '900', color: '#0f172a' },
  examSub: { fontSize: 11.5, fontWeight: '600', color: '#64748b' },

  // Features Row
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  featureItem: { alignItems: 'center', gap: 6, flex: 1 },
  featureIconBox: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { fontSize: 10, fontWeight: '800', color: '#334155', textAlign: 'center', lineHeight: 13 },

  // Progress Card (Admin Hero Card polish)
  progressCard: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 6,
  },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTitle: { fontSize: 14, fontWeight: '900', color: '#ffffff', letterSpacing: 0.5 },
  progressDetailsPill: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  progressDetailsText: { color: '#38bdf8', fontSize: 11, fontWeight: '800' },
  progressBodyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  circleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  circleRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 5, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', alignItems: 'center', justifyContent: 'center' },
  circlePercentText: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  circleLabelCol: { gap: 2, flex: 1 },
  overallPrepText: { fontSize: 13.5, fontWeight: '800', color: '#ffffff' },
  doingGreatText: { fontSize: 11, color: '#cbd5e1', fontWeight: '500' },
  metricsCol: { flexDirection: 'row', gap: 8 },
  metricStatPill: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, alignItems: 'center', minWidth: 62 },
  metricVal: { fontSize: 17, fontWeight: '900', color: '#ffffff' },
  metricSub: { fontSize: 9, fontWeight: '800', color: '#e2e8f0', letterSpacing: 0.6, marginTop: 2 },

  // Quick Access
  quickAccessRow: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIconCircle: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  quickTitle: { fontSize: 12.5, fontWeight: '900', color: '#0f172a' },
  quickSub: { fontSize: 10.5, color: '#64748b', fontWeight: '600' },
  quickArrow: { fontSize: 14, color: '#10b981', fontWeight: '900', marginTop: 2 },

  // Bottom Nav
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  bottomNavItemActive: { backgroundColor: '#ecfdf5' },
  bottomNavIcon: { fontSize: 19 },
  bottomNavLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
});
