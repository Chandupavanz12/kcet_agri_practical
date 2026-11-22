import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch, clearApiCache } from '../api/client.js';
import { API_BASE_URL } from '../config/env.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const EXAM_CONFIG = {
  puc: {
    name: 'PUC',
    fullName: 'Pre-University Certificate (Class 12)',
    tagline: 'Study • Practice • Ace',
    themeColor: '#4f46e5',
    accentColor: '#818cf8',
    gradient: ['#1e1b4b', '#4338ca'],
    icon: '📄',
    subjects: [
      { name: 'Physics', icon: '⚛️', color: '#0284c7', bg: '#e0f2fe' },
      { name: 'Chemistry', icon: '🧪', color: '#7c3aed', bg: '#f3e8ff' },
      { name: 'Mathematics', icon: '📐', color: '#ea580c', bg: '#ffedd5' },
      { name: 'Biology', icon: '🧬', color: '#16a34a', bg: '#dcfce7' },
    ],
    hasVideos: false,
  },
  kcet: {
    name: 'KCET',
    fullName: 'Karnataka Common Entrance Test',
    tagline: 'Target Your Rank',
    themeColor: '#0284c7',
    accentColor: '#38bdf8',
    gradient: ['#082f49', '#0284c7'],
    icon: '🎯',
    subjects: [
      { name: 'Physics', icon: '⚛️', color: '#0284c7', bg: '#e0f2fe' },
      { name: 'Chemistry', icon: '🧪', color: '#7c3aed', bg: '#f3e8ff' },
      { name: 'Mathematics', icon: '📐', color: '#ea580c', bg: '#ffedd5' },
      { name: 'Biology', icon: '🧬', color: '#16a34a', bg: '#dcfce7' },
    ],
    hasVideos: false,
  },
  neet: {
    name: 'NEET',
    fullName: 'National Eligibility cum Entrance Test',
    tagline: 'Prepare for Success',
    themeColor: '#e11d48',
    accentColor: '#fb7185',
    gradient: ['#4c0519', '#e11d48'],
    icon: '🩺',
    subjects: [
      { name: 'Physics', icon: '⚛️', color: '#0284c7', bg: '#e0f2fe' },
      { name: 'Chemistry', icon: '🧪', color: '#7c3aed', bg: '#f3e8ff' },
      { name: 'Biology', icon: '🧬', color: '#16a34a', bg: '#dcfce7' },
      // STRICTLY NO MATHEMATICS FOR NEET
    ],
    hasVideos: false,
  },
  agri: {
    name: 'Agri Practical',
    fullName: 'KCET Agriculture Practical Exam',
    tagline: 'Grow Your Future',
    themeColor: '#16a34a',
    accentColor: '#4ade80',
    gradient: ['#064e3b', '#10b981'],
    icon: '🌱',
    subjects: [], // No subjects for Agri
    hasVideos: true, // Only Agri has video guidance
  },
};

// ─── Client In-Memory Cache for Instant 0-second landing ────────────────────
const EXAM_CLIENT_CACHE = new Map();

export default function ExamDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, user } = useAuth();

  const examId = String(params.examId || 'puc').toLowerCase().trim();
  const config = EXAM_CONFIG[examId] || EXAM_CONFIG.puc;

  // Navigation flow state: 'modules' | 'subjects' | 'content' | 'plans'
  const [view, setView] = useState('modules');
  const [selectedModule, setSelectedModule] = useState('materials'); // 'materials' | 'tests' | 'pyqs' | 'plans'
  const [selectedSubject, setSelectedSubject] = useState(config.subjects[0]?.name || '');

  const cachedData = EXAM_CLIENT_CACHE.get(examId);

  const [banners, setBanners] = useState(cachedData?.banners || [
    {
      id: 1,
      title: `Master ${config.name}`,
      highlight_text: config.tagline,
      subtitle: config.fullName,
      button_text: 'Explore Content >',
      bg_gradient_start: config.gradient[0],
      bg_gradient_end: config.gradient[1],
    },
  ]);
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const bannerFlatListRef = useRef(null);
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = Math.min(windowWidth || 380, 480);
  const BANNER_CARD_WIDTH = screenWidth - 32;
  const [materials, setMaterials] = useState(cachedData?.materials || []);
  const [pyqs, setPyqs] = useState(cachedData?.pyqs || []);
  const [tests, setTests] = useState(cachedData?.tests || []);
  const [plans, setPlans] = useState(cachedData?.plans || []);
  const [isSubscribed, setIsSubscribed] = useState(cachedData?.isSubscribed || false);
  const [loading, setLoading] = useState(false);
  const [fetchingContent, setFetchingContent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [payingPlanId, setPayingPlanId] = useState(null);

  // Auto-scroll banners one-by-one every 4 seconds with smooth sliding animation
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIdx((prev) => {
        const next = (prev + 1) % banners.length;
        bannerFlatListRef.current?.scrollToOffset({
          offset: next * (BANNER_CARD_WIDTH + 12),
          animated: true,
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  // Hardware back button handler for Android
  useEffect(() => {
    const onBackPress = () => {
      if (view === 'content') {
        setView('subjects');
        return true;
      }
      if (view === 'subjects' || view === 'plans') {
        setView('modules');
        return true;
      }
      return false; // let system navigate back to dashboard
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [view]);

  // Load Exam Data in background without blocking screen
  const loadExamData = async (showContentSpinner = false) => {
    if (showContentSpinner) setFetchingContent(true);
    try {
      setError('');
      // Load top banner for this exam
      const bannerRes = await apiFetch(`/api/student/banners?exam=${examId}`, { token }).catch(() => null);
      let currentBanners = banners;
      if (Array.isArray(bannerRes?.banners) && bannerRes.banners.length > 0) {
        currentBanners = bannerRes.banners;
        setBanners(currentBanners);
      }

      if (examId === 'agri') {
        // Agri practical loads existing Mongo endpoints
        const [planRes] = await Promise.all([
          apiFetch('/api/student/premium/plans', { token }).catch(() => null),
        ]);
        const newPlans = Array.isArray(planRes?.plans) ? planRes.plans : [];
        const newSubscribed = Boolean(planRes?.hasActivePlan);
        setPlans(newPlans);
        setIsSubscribed(newSubscribed);
        EXAM_CLIENT_CACHE.set(examId, {
          banners: currentBanners,
          plans: newPlans,
          isSubscribed: newSubscribed,
          materials: [],
          pyqs: [],
          tests: [],
        });
      } else {
        // PUC / KCET / NEET loads from Neon Postgres endpoints
        const subjectParam = selectedSubject ? `&subject=${encodeURIComponent(selectedSubject.toLowerCase())}` : '';
        const [matRes, pyqRes, testRes, planRes] = await Promise.all([
          apiFetch(`/api/student/exam/materials?exam=${examId}${subjectParam}`, { token }).catch(() => null),
          apiFetch(`/api/student/exam/pyqs?exam=${examId}${subjectParam}`, { token }).catch(() => null),
          apiFetch(`/api/student/exam/tests?exam=${examId}${subjectParam}`, { token }).catch(() => null),
          apiFetch(`/api/student/exam/plans?exam=${examId}`, { token }).catch(() => null),
        ]);

        const newMaterials = Array.isArray(matRes?.materials) ? matRes.materials : [];
        const newPyqs = Array.isArray(pyqRes?.pyqs) ? pyqRes.pyqs : [];
        const newTests = Array.isArray(testRes?.tests) ? testRes.tests : [];
        const newPlans = Array.isArray(planRes?.plans) ? planRes.plans : [];
        const newSubscribed = Boolean(planRes?.hasActivePlan || matRes?.isSubscribed);

        setMaterials(newMaterials);
        setPyqs(newPyqs);
        setTests(newTests);
        setPlans(newPlans);
        setIsSubscribed(newSubscribed);

        EXAM_CLIENT_CACHE.set(examId, {
          banners: currentBanners,
          plans: newPlans,
          isSubscribed: newSubscribed,
          materials: newMaterials,
          pyqs: newPyqs,
          tests: newTests,
        });
      }
    } catch (err) {
      setError(err?.message || 'Failed to load exam data');
    } finally {
      setLoading(false);
      setFetchingContent(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExamData(false);
  }, [examId, selectedSubject]);

  const onRefresh = () => {
    setRefreshing(true);
    loadExamData(false);
  };

  const handleBack = () => {
    if (view === 'content') {
      setView('subjects');
    } else if (view === 'subjects' || view === 'plans') {
      setView('modules');
    } else {
      router.back();
    }
  };

  // Select Module Action
  const handleSelectModule = (mod) => {
    if (examId === 'agri') {
      // Agri Practical directs directly to existing routes without subject selection
      if (mod === 'materials') return router.push('/student/materials');
      if (mod === 'tests') return router.push('/student/tests');
      if (mod === 'pyqs') return router.push('/student/pyqs');
      if (mod === 'plans') return router.push('/student/premium');
      if (mod === 'videos') return router.push('/student/videos');
    }

    if (mod === 'plans') {
      setSelectedModule('plans');
      setView('plans');
    } else {
      setSelectedModule(mod);
      setView('subjects');
    }
  };

  // Select Subject Action
  const handleSelectSubject = (subjName) => {
    setSelectedSubject(subjName);
    setView('content');
  };

  // View PDF
  const handleOpenPdf = async (item) => {
    if (item.locked) {
      Alert.alert(
        '🔒 Premium Content',
        'This material is exclusive to premium members. Upgrade your plan to unlock full access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unlock Now 💳', onPress: () => setView('plans') },
        ]
      );
      return;
    }

    const rawUrl = item.pdfUrl || item.pdf_url;
    if (!rawUrl) {
      Alert.alert('Notice', 'Document link is not available yet.');
      return;
    }
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}${rawUrl}`;
    try {
      await WebBrowser.openBrowserAsync(fullUrl);
    } catch (_) {
      Alert.alert('Error', 'Unable to preview PDF document.');
    }
  };

  // Listen for payment return redirect params
  useEffect(() => {
    if (params.payment === 'success' || params.success) {
      (async () => {
        try {
          await apiFetch('/api/student/premium/payment-status', { token });
        } catch (_) {}
        EXAM_CLIENT_CACHE.delete(examId);
        clearApiCache();
        await loadExamData(true);
      })();
      Alert.alert('Payment Successful!', '🎉 Your premium access is now activated! All materials are unlocked.');
    }
  }, [params.payment, params.success]);

  // Auto-refresh access when app returns to foreground from UPI / payment apps
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        try {
          await apiFetch('/api/student/premium/payment-status', { token });
        } catch (_) {}
        EXAM_CLIENT_CACHE.delete(examId);
        clearApiCache();
        loadExamData(false);
      }
    });
    return () => sub.remove();
  }, [examId, token]);

  // Subscribe / Payment via Razorpay (matching Agri Practical flow)
  const handleSubscribe = async (plan) => {
    try {
      setPayingPlanId(plan.id);
      const res = await apiFetch('/api/student/premium/create-order', {
        token,
        method: 'POST',
        body: { planId: plan.id, planCode: plan.code, exam: examId },
      });

      if (res?.alreadyActive) {
        Alert.alert('Notice', 'This plan is already active on your account.');
        await loadExamData();
        return;
      }

      if (res?.free) {
        Alert.alert('Success', 'Plan activated successfully!');
        await loadExamData();
        return;
      }

      if (!res?.orderId) {
        throw new Error(res?.message || 'Could not initiate checkout');
      }

      const isWeb = Platform.OS === 'web';
      let appRedirectUrl = `mymobileapp://student/exam/${examId}`;
      if (isWeb && typeof window !== 'undefined') {
        appRedirectUrl = `${window.location.origin}/student/exam/${examId}?payment=success`;
      }

      const checkoutBase = API_BASE_URL || 'https://kcet-agri-practical.onrender.com';
      const checkoutUrl = `${checkoutBase}/api/student/premium/checkout?orderId=${encodeURIComponent(res.orderId)}&amount=${res.amountPaise || 0}&name=${encodeURIComponent(res.user?.name || user?.name || '')}&email=${encodeURIComponent(res.user?.email || user?.email || '')}&planId=${encodeURIComponent(plan.code || '')}&redirect_url=${encodeURIComponent(appRedirectUrl)}`;

      if (isWeb && typeof window !== 'undefined') {
        window.location.href = checkoutUrl;
        return;
      }

      try {
        await WebBrowser.openAuthSessionAsync(checkoutUrl, appRedirectUrl);
      } catch (_) {
        await WebBrowser.openBrowserAsync(checkoutUrl);
      }

      // Automatically verify and refresh status after browser session
      setTimeout(async () => {
        try {
          await apiFetch('/api/student/premium/payment-status', { token });
        } catch (_) { }
        EXAM_CLIENT_CACHE.delete(examId);
        clearApiCache();
        loadExamData(true);
      }, 1500);

      setTimeout(async () => {
        try {
          await apiFetch('/api/student/premium/payment-status', { token });
        } catch (_) { }
        EXAM_CLIENT_CACHE.delete(examId);
        clearApiCache();
        loadExamData(false);
      }, 4000);
    } catch (err) {
      Alert.alert('Payment Error', err?.message || 'Could not launch payment gateway.');
    } finally {
      setPayingPlanId(null);
    }
  };

  const currentBanner = banners[activeBannerIdx] || banners[0] || {
    title: `Master ${config.name}`,
    highlight_text: config.tagline,
    subtitle: config.fullName,
    button_text: 'Explore Content >',
    bg_gradient_start: config.gradient[0],
    bg_gradient_end: config.gradient[1],
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* ─── Top Bar with Back Button and Hub Badge ────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={styles.backButtonIcon}>←</Text>
          <Text style={styles.backButtonText}>
            {view === 'content'
              ? 'Subjects'
              : view === 'subjects' || view === 'plans'
                ? `${config.name} Hub`
                : 'Dashboard'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.examBadgeHeader, { backgroundColor: config.themeColor }]}>
          <Text style={styles.examBadgeHeaderText}>{config.name}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[config.themeColor]} />}
      >
        {/* Error Notification */}
        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ─── LEVEL 1: MODULES SELECTION PAGE ─────────────────────────────────── */}
        {view === 'modules' && (
          <View style={styles.pageSection}>
            {/* 1. Exam Top Banner Slider (Smooth left-to-right sliding animation) */}
            <View style={{ marginBottom: 4 }}>
              <FlatList
                ref={bannerFlatListRef}
                data={banners}
                horizontal
                pagingEnabled={false}
                snapToInterval={BANNER_CARD_WIDTH + 12}
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
                keyExtractor={(item, index) => String(item.id || index)}
                onMomentumScrollEnd={(e) => {
                  const offsetX = e.nativeEvent.contentOffset.x;
                  const index = Math.round(offsetX / (BANNER_CARD_WIDTH + 12));
                  setActiveBannerIdx(index);
                }}
                renderItem={({ item }) => (
                  <LinearGradient
                    colors={[item.bg_gradient_start || config.gradient[0], item.bg_gradient_end || config.gradient[1]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bannerCard, { width: BANNER_CARD_WIDTH }]}
                  >
                    <View style={styles.bannerLeft}>
                      <View style={styles.bannerPill}>
                        <Text style={styles.bannerPillText}>{config.name} PREPARATION</Text>
                      </View>
                      <Text style={styles.bannerHeading}>
                        {item.title}{'\n'}
                        {!!item.highlight_text && (
                          <Text style={styles.bannerHeadingHighlight}>{item.highlight_text}</Text>
                        )}
                      </Text>
                      <Text style={styles.bannerSubText}>{item.subtitle || config.fullName}</Text>
                    </View>
                    <View style={styles.bannerRightIcon}>
                      <Text style={styles.bannerEmoji}>{config.icon}</Text>
                    </View>
                  </LinearGradient>
                )}
              />

              {/* Banner Dots */}
              {banners.length > 1 && (
                <View style={styles.carouselDotsRow}>
                  {banners.map((_, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setActiveBannerIdx(idx);
                        bannerFlatListRef.current?.scrollToOffset({
                          offset: idx * (BANNER_CARD_WIDTH + 12),
                          animated: true,
                        });
                      }}
                      style={[styles.dot, idx === activeBannerIdx && styles.dotActive]}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Exam Heading */}
            <View style={styles.sectionHeaderCol}>
              <Text style={styles.sectionHeading}>Select Module</Text>
              <Text style={styles.sectionSubHeading}>Explore resources and tests designed for {config.fullName}</Text>
            </View>

            {/* Modules Grid / Cards */}
            <View style={styles.modulesGrid}>
              {/* Module: Video Guidance (PRESENT AT TOP FOR AGRI PRACTICAL) */}
              {config.hasVideos && (
                <TouchableOpacity
                  style={[styles.moduleCard, { borderColor: '#fbcfe8' }]}
                  onPress={() => handleSelectModule('videos')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.moduleIconBox, { backgroundColor: '#fce7f3' }]}>
                    <Text style={styles.moduleIcon}>🎥</Text>
                  </View>
                  <View style={styles.moduleInfo}>
                    <View style={styles.moduleTitleRow}>
                      <Text style={styles.moduleTitle}>Video Guidance</Text>
                      <View style={[styles.moduleTag, { backgroundColor: '#fdf2f8' }]}>
                        <Text style={[styles.moduleTagText, { color: '#db2777' }]}>Specimens</Text>
                      </View>
                    </View>
                    <Text style={styles.moduleDesc}>
                      Practical plant identification & lab demonstration videos
                    </Text>
                  </View>
                  <Text style={styles.moduleArrow}>→</Text>
                </TouchableOpacity>
              )}

              {/* Module: Study Materials */}
              <TouchableOpacity
                style={[styles.moduleCard, { borderColor: '#e0e7ff' }]}
                onPress={() => handleSelectModule('materials')}
                activeOpacity={0.8}
              >
                <View style={[styles.moduleIconBox, { backgroundColor: '#e0e7ff' }]}>
                  <Text style={styles.moduleIcon}>📚</Text>
                </View>
                <View style={styles.moduleInfo}>
                  <View style={styles.moduleTitleRow}>
                    <Text style={styles.moduleTitle}>Study Materials</Text>
                    <View style={[styles.moduleTag, { backgroundColor: '#eef2ff' }]}>
                      <Text style={[styles.moduleTagText, { color: '#4f46e5' }]}>
                        {examId === 'agri' ? 'Practical Notes' : `${config.subjects.length} Subjects`}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.moduleDesc}>
                    {examId === 'agri'
                      ? 'Detailed specimens, guides and agri notes'
                      : 'Subject-wise notes, textbooks and chapter PDFs'}
                  </Text>
                </View>
                <Text style={styles.moduleArrow}>→</Text>
              </TouchableOpacity>

              {/* Module: Mock Tests */}
              <TouchableOpacity
                style={[styles.moduleCard, { borderColor: '#dcfce7' }]}
                onPress={() => handleSelectModule('tests')}
                activeOpacity={0.8}
              >
                <View style={[styles.moduleIconBox, { backgroundColor: '#dcfce7' }]}>
                  <Text style={styles.moduleIcon}>📝</Text>
                </View>
                <View style={styles.moduleInfo}>
                  <View style={styles.moduleTitleRow}>
                    <Text style={styles.moduleTitle}>Mock Tests</Text>
                    <View style={[styles.moduleTag, { backgroundColor: '#f0fdf4' }]}>
                      <Text style={[styles.moduleTagText, { color: '#16a34a' }]}>Timed Drills</Text>
                    </View>
                  </View>
                  <Text style={styles.moduleDesc}>Full length timed tests with instant scoring & rank feedback</Text>
                </View>
                <Text style={styles.moduleArrow}>→</Text>
              </TouchableOpacity>

              {/* Module: Previous Year Papers */}
              <TouchableOpacity
                style={[styles.moduleCard, { borderColor: '#ffedd5' }]}
                onPress={() => handleSelectModule('pyqs')}
                activeOpacity={0.8}
              >
                <View style={[styles.moduleIconBox, { backgroundColor: '#ffedd5' }]}>
                  <Text style={styles.moduleIcon}>📑</Text>
                </View>
                <View style={styles.moduleInfo}>
                  <View style={styles.moduleTitleRow}>
                    <Text style={styles.moduleTitle}>Previous Year Papers</Text>
                    <View style={[styles.moduleTag, { backgroundColor: '#fff7ed' }]}>
                      <Text style={[styles.moduleTagText, { color: '#ea580c' }]}>Past Solved</Text>
                    </View>
                  </View>
                  <Text style={styles.moduleDesc}>
                    {examId === 'agri'
                      ? 'Centre-wise solved question papers'
                      : 'Previous years official papers with answer keys'}
                  </Text>
                </View>
                <Text style={styles.moduleArrow}>→</Text>
              </TouchableOpacity>

              {/* Module: Subscription Plans (LAST MODULE) */}
              <TouchableOpacity
                style={[styles.moduleCard, { borderColor: '#fef08a' }]}
                onPress={() => handleSelectModule('plans')}
                activeOpacity={0.8}
              >
                <View style={[styles.moduleIconBox, { backgroundColor: '#fef9c3' }]}>
                  <Text style={styles.moduleIcon}>⭐</Text>
                </View>
                <View style={styles.moduleInfo}>
                  <View style={styles.moduleTitleRow}>
                    <Text style={styles.moduleTitle}>Subscription Plans</Text>
                    <View style={[styles.moduleTag, { backgroundColor: '#fefce8' }]}>
                      <Text style={[styles.moduleTagText, { color: '#ca8a04' }]}>VIP Access</Text>
                    </View>
                  </View>
                  <Text style={styles.moduleDesc}>Unlock all locked chapters, mocks & premium content</Text>
                </View>
                <Text style={styles.moduleArrow}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── LEVEL 2: SUBJECT SELECTION PAGE ─────────────────────────────────── */}
        {view === 'subjects' && (
          <View style={styles.pageSection}>
            <View style={styles.sectionHeaderCol}>
              <View style={styles.subHeaderBadge}>
                <Text style={styles.subHeaderBadgeText}>
                  {selectedModule === 'materials'
                    ? 'STUDY MATERIALS'
                    : selectedModule === 'tests'
                      ? 'MOCK TESTS'
                      : 'PREVIOUS YEAR PAPERS'}
                </Text>
              </View>
              <Text style={styles.sectionHeading}>Select Subject</Text>
              <Text style={styles.sectionSubHeading}>
                Choose a subject to view all {selectedModule === 'materials' ? 'notes & PDFs' : selectedModule === 'tests' ? 'practice tests' : 'solved papers'}
              </Text>
            </View>

            <View style={styles.subjectsGrid}>
              {config.subjects.map((subj) => (
                <TouchableOpacity
                  key={subj.name}
                  style={[styles.subjectTile, { borderColor: subj.bg }]}
                  onPress={() => handleSelectSubject(subj.name)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.subjectIconBox, { backgroundColor: subj.bg }]}>
                    <Text style={styles.subjectIcon}>{subj.icon}</Text>
                  </View>
                  <View style={styles.subjectDetails}>
                    <Text style={styles.subjectName}>{subj.name}</Text>
                    <Text style={styles.subjectSub}>
                      {config.name} • {subj.name} syllabus
                    </Text>
                  </View>
                  <View style={[styles.selectCircle, { backgroundColor: subj.color }]}>
                    <Text style={styles.selectCircleArrow}>➔</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ─── LEVEL 3: SUBJECT CONTENT PAGE ──────────────────────────────────── */}
        {view === 'content' && (() => {
          const displayedMaterials = materials.filter(
            (item) => !selectedSubject || !item.subject || item.subject.toLowerCase() === selectedSubject.toLowerCase()
          );
          const displayedTests = tests.filter(
            (test) => !selectedSubject || !test.subject || test.subject.toLowerCase() === selectedSubject.toLowerCase()
          );
          const displayedPyqs = pyqs.filter(
            (pyq) => !selectedSubject || !pyq.subject || pyq.subject.toLowerCase() === selectedSubject.toLowerCase()
          );

          return (
            <View style={styles.pageSection}>
              <View style={styles.contentHeaderBox}>
                <View style={styles.contentBreadcrumbRow}>
                  <Text style={styles.breadcrumbExam}>{config.name}</Text>
                  <Text style={styles.breadcrumbSlash}>/</Text>
                  <Text style={styles.breadcrumbSubject}>{selectedSubject}</Text>
                  <Text style={styles.breadcrumbSlash}>/</Text>
                  <Text style={styles.breadcrumbModule}>
                    {selectedModule === 'materials'
                      ? 'Study Materials'
                      : selectedModule === 'tests'
                        ? 'Mock Tests'
                        : 'PYQs'}
                  </Text>
                </View>

                {!isSubscribed && (
                  <TouchableOpacity
                    style={styles.unlockTopBanner}
                    onPress={() => setView('plans')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.unlockTopBannerIcon}>👑</Text>
                    <View style={styles.unlockTopBannerTextCol}>
                      <Text style={styles.unlockTopBannerTitle}>Unlock All Premium {selectedSubject} Notes</Text>
                      <Text style={styles.unlockTopBannerSub}>Subscribe now to access all locked items</Text>
                    </View>
                    <Text style={styles.unlockTopBannerCta}>Plans ➔</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 1. If Materials Module */}
              {selectedModule === 'materials' && (
                <View style={styles.itemsList}>
                  {displayedMaterials.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyIcon}>📂</Text>
                      <Text style={styles.emptyTitle}>No Materials Found</Text>
                      <Text style={styles.emptySub}>
                        Study materials for {config.name} {selectedSubject} will appear here once added by the admin.
                      </Text>
                    </View>
                  ) : (
                    displayedMaterials.map((item) => (
                      <View key={item.id} style={styles.contentCard}>
                        <View style={styles.contentCardTop}>
                          <View style={styles.contentTypeIconBox}>
                            <Text style={{ fontSize: 20 }}>📄</Text>
                          </View>
                          <View style={styles.contentCardTitleCol}>
                            <Text style={styles.contentCardTitle}>{item.title}</Text>
                            <Text style={styles.contentCardMeta}>
                              {item.subject ? item.subject.toUpperCase() : selectedSubject} • {item.type?.toUpperCase() || 'PDF'}
                            </Text>
                          </View>

                          {/* Status Badge */}
                          <View
                            style={[
                              styles.itemStatusBadge,
                              item.locked ? styles.statusBadgeLocked : styles.statusBadgeFree,
                            ]}
                          >
                            <Text
                              style={[
                                styles.itemStatusBadgeText,
                                item.locked ? styles.statusTextLocked : styles.statusTextFree,
                              ]}
                            >
                              {item.locked ? '🔒 Locked' : '✓ Free'}
                            </Text>
                          </View>
                        </View>

                        {!!item.description && (
                          <Text style={styles.contentCardDesc}>{item.description}</Text>
                        )}

                        {/* Action Button */}
                        {item.locked ? (
                          <TouchableOpacity
                            style={styles.unlockItemBtn}
                            onPress={() => setView('plans')}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.unlockItemBtnText}>🔒 Click to Unlock with Plan 💳</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.viewPdfBtn}
                            onPress={() => handleOpenPdf(item)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.viewPdfBtnText}>View / Download PDF 📄</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* 2. If Mock Tests Module */}
              {selectedModule === 'tests' && (
                <View style={styles.itemsList}>
                  {displayedTests.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyIcon}>📝</Text>
                      <Text style={styles.emptyTitle}>No Mock Tests Found</Text>
                      <Text style={styles.emptySub}>
                        Tests for {config.name} {selectedSubject} will appear here once published.
                      </Text>
                    </View>
                  ) : (
                    displayedTests.map((test) => (
                      <View key={test.id} style={styles.contentCard}>
                        <View style={styles.contentCardTop}>
                          <View style={[styles.contentTypeIconBox, { backgroundColor: '#dcfce7' }]}>
                            <Text style={{ fontSize: 20 }}>🎯</Text>
                          </View>
                          <View style={styles.contentCardTitleCol}>
                            <Text style={styles.contentCardTitle}>{test.title}</Text>
                            <Text style={styles.contentCardMeta}>
                              {test.durationMinutes || 30} mins • {test.questionCount || 0} Questions • Total {test.totalMarks || 60} marks
                            </Text>
                          </View>

                          {/* Status Badge */}
                          <View
                            style={[
                              styles.itemStatusBadge,
                              test.locked ? styles.statusBadgeLocked : styles.statusBadgeFree,
                            ]}
                          >
                            <Text
                              style={[
                                styles.itemStatusBadgeText,
                                test.locked ? styles.statusTextLocked : styles.statusTextFree,
                              ]}
                            >
                              {test.locked ? '🔒 Locked' : '✓ Free'}
                            </Text>
                          </View>
                        </View>

                        {test.locked ? (
                          <TouchableOpacity
                            style={styles.unlockItemBtn}
                            onPress={() => setView('plans')}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.unlockItemBtnText}>🔒 Click to Unlock Mock Test 💳</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={[styles.viewPdfBtn, { backgroundColor: config.themeColor }]}
                            onPress={() => router.push(`/student/mock-test/${test.id}`)}
                            activeOpacity={0.85}
                          >
                            <Text style={[styles.viewPdfBtnText, { color: '#ffffff' }]}>Start Mock Test 🚀</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* 3. If PYQs Module */}
              {selectedModule === 'pyqs' && (
                <View style={styles.itemsList}>
                  {displayedPyqs.length === 0 ? (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyIcon}>📑</Text>
                      <Text style={styles.emptyTitle}>No PYQs Found</Text>
                      <Text style={styles.emptySub}>
                        Previous year question papers for {config.name} {selectedSubject} will be uploaded soon.
                      </Text>
                    </View>
                  ) : (
                    displayedPyqs.map((pyq) => (
                      <View key={pyq.id} style={styles.contentCard}>
                        <View style={styles.contentCardTop}>
                          <View style={[styles.contentTypeIconBox, { backgroundColor: '#ffedd5' }]}>
                            <Text style={{ fontSize: 20 }}>📅</Text>
                          </View>
                          <View style={styles.contentCardTitleCol}>
                            <Text style={styles.contentCardTitle}>{pyq.title}</Text>
                            <Text style={styles.contentCardMeta}>
                              Exam Year: {pyq.year || 'Past Paper'} • {selectedSubject}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.itemStatusBadge,
                              pyq.locked ? styles.statusBadgeLocked : styles.statusBadgeFree,
                            ]}
                          >
                            <Text
                              style={[
                                styles.itemStatusBadgeText,
                                pyq.locked ? styles.statusTextLocked : styles.statusTextFree,
                              ]}
                            >
                              {pyq.locked ? '🔒 Locked' : '✓ Free'}
                            </Text>
                          </View>
                        </View>

                        {pyq.locked ? (
                          <TouchableOpacity
                            style={styles.unlockItemBtn}
                            onPress={() => setView('plans')}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.unlockItemBtnText}>🔒 Click to Unlock Paper 💳</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity
                            style={styles.viewPdfBtn}
                            onPress={() => handleOpenPdf(pyq)}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.viewPdfBtnText}>View Question Paper 📄</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        })()}

        {/* ─── LEVEL 4: EXAM SUBSCRIPTION PLANS PAGE ──────────────────────────── */}
        {view === 'plans' && (
          <View style={styles.pageSection}>
            <View style={styles.sectionHeaderCol}>
              <View style={[styles.subHeaderBadge, { backgroundColor: '#fef08a' }]}>
                <Text style={[styles.subHeaderBadgeText, { color: '#854d0e' }]}>PREMIUM UNLOCK</Text>
              </View>
              <Text style={styles.sectionHeading}>{config.name} Subscription Plans</Text>
              <Text style={styles.sectionSubHeading}>
                Select an official plan to unlock all subjects, tests and premium materials for {config.fullName}
              </Text>
            </View>

            <View style={styles.plansList}>
              {plans.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>⭐</Text>
                  <Text style={styles.emptyTitle}>Plans Coming Soon</Text>
                  <Text style={styles.emptySub}>
                    Admin is setting up customized subscription plans for {config.name}.
                  </Text>
                </View>
              ) : (
                plans.map((plan) => {
                  const priceRupees = Math.round((plan.pricePaise || plan.price_paise || 0) / 100);
                  const isPaying = payingPlanId === plan.id;

                  return (
                    <View key={plan.id} style={styles.planCard}>
                      <View style={styles.planHeaderRow}>
                        <View>
                          <Text style={styles.planName}>{plan.name}</Text>
                          <Text style={styles.planDuration}>{plan.durationDays || 365} Days Unlimited Validity</Text>
                        </View>
                        <View style={styles.planPriceBox}>
                          <Text style={styles.planPriceRupees}>₹{priceRupees}</Text>
                          <Text style={styles.planPricePeriod}>/ full access</Text>
                        </View>
                      </View>

                      {/* Features */}
                      <View style={styles.planFeaturesList}>
                        {(Array.isArray(plan.features) ? plan.features : []).map((feat, idx) => (
                          <View key={idx} style={styles.planFeatureItem}>
                            <Text style={styles.planFeatureCheck}>✓</Text>
                            <Text style={styles.planFeatureText}>{feat}</Text>
                          </View>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.planPayBtn,
                          { backgroundColor: config.themeColor },
                          isPaying && styles.opacity60,
                        ]}
                        onPress={() => handleSubscribe(plan)}
                        disabled={isPaying}
                        activeOpacity={0.85}
                      >
                        {isPaying ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.planPayBtnText}>Unlock {config.name} Now 💳</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  opacity60: { opacity: 0.6 },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backButtonIcon: { fontSize: 20, color: '#0f172a', fontWeight: 'bold' },
  backButtonText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  examBadgeHeader: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  examBadgeHeaderText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },

  errorBanner: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },

  pageSection: { gap: 16 },

  // Top Banner
  bannerCard: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 140,
  },
  bannerLeft: { flex: 1, gap: 6 },
  bannerPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  bannerPillText: { color: '#ffffff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  bannerHeading: { fontSize: 18, fontWeight: '900', color: '#ffffff', lineHeight: 24 },
  bannerHeadingHighlight: { color: '#facc15' },
  bannerSubText: { fontSize: 12, color: '#e2e8f0', fontWeight: '500' },
  bannerRightIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  bannerEmoji: { fontSize: 32 },

  // Section Headers
  sectionHeaderCol: { gap: 4 },
  sectionHeading: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  sectionSubHeading: { fontSize: 13, color: '#64748b' },

  // Level 1: Modules Grid
  modulesGrid: { gap: 12 },
  moduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 14,
  },
  moduleIconBox: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  moduleIcon: { fontSize: 24 },
  moduleInfo: { flex: 1, gap: 4 },
  moduleTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moduleTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  moduleTag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },
  moduleTagText: { fontSize: 10, fontWeight: '700' },
  moduleDesc: { fontSize: 12, color: '#64748b', lineHeight: 16 },
  moduleArrow: { fontSize: 18, color: '#94a3b8', fontWeight: 'bold' },

  // Level 2: Subject Selection Page
  subHeaderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  subHeaderBadgeText: { color: '#4338ca', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  subjectsGrid: { gap: 12 },
  subjectTile: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  subjectIconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subjectIcon: { fontSize: 26 },
  subjectDetails: { flex: 1, gap: 2 },
  subjectName: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  subjectSub: { fontSize: 12, color: '#64748b' },
  selectCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  selectCircleArrow: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  // Level 3: Content Page
  contentHeaderBox: { gap: 10 },
  contentBreadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breadcrumbExam: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  breadcrumbSlash: { fontSize: 13, color: '#94a3b8' },
  breadcrumbSubject: { fontSize: 13, fontWeight: '700', color: '#0284c7' },
  breadcrumbModule: { fontSize: 13, fontWeight: '600', color: '#64748b' },

  unlockTopBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef08a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  unlockTopBannerIcon: { fontSize: 20 },
  unlockTopBannerTextCol: { flex: 1, gap: 1 },
  unlockTopBannerTitle: { fontSize: 13, fontWeight: '800', color: '#854d0e' },
  unlockTopBannerSub: { fontSize: 11, color: '#a16207' },
  unlockTopBannerCta: { fontSize: 12, fontWeight: '800', color: '#854d0e' },

  itemsList: { gap: 12 },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  contentCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contentTypeIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  contentCardTitleCol: { flex: 1, gap: 2 },
  contentCardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  contentCardMeta: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  contentCardDesc: { fontSize: 12, color: '#475569', lineHeight: 17 },

  itemStatusBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  statusBadgeFree: { backgroundColor: '#dcfce7' },
  statusBadgeLocked: { backgroundColor: '#fef3c7' },
  itemStatusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusTextFree: { color: '#16a34a' },
  statusTextLocked: { color: '#b45309' },

  viewPdfBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewPdfBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 13 },
  unlockItemBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  unlockItemBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 18 },

  // Level 4: Plans Page
  plansList: { gap: 14 },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  planDuration: { fontSize: 12, color: '#64748b', marginTop: 2 },
  planPriceBox: { alignItems: 'flex-end' },
  planPriceRupees: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  planPricePeriod: { fontSize: 11, color: '#64748b' },

  planFeaturesList: { gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  planFeatureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planFeatureCheck: { color: '#16a34a', fontWeight: '900', fontSize: 14 },
  planFeatureText: { fontSize: 13, color: '#334155', fontWeight: '500' },

  planPayBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planPayBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  carouselDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#0284c7',
  },
});
