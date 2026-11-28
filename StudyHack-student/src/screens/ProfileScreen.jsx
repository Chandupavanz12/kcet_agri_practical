import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function ProfileScreen() {
  const { token, user, logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Aggregated Real Progress Data
  const [progressData, setProgressData] = useState({
    overall: { progressPercent: 0, totalTestsGiven: 0, totalScore: 0, overallAccuracy: 0 },
    exams: [
      { exam: 'puc', name: 'PUC (Class 12)', progressPercent: 0, testsAttended: 0, totalScore: 0, avgAccuracy: 0, color: '#4f46e5', icon: '📄' },
      { exam: 'kcet', name: 'KCET Engineering', progressPercent: 0, testsAttended: 0, totalScore: 0, avgAccuracy: 0, color: '#0284c7', icon: '🎯' },
      { exam: 'neet', name: 'NEET Medical', progressPercent: 0, testsAttended: 0, totalScore: 0, avgAccuracy: 0, color: '#e11d48', icon: '🩺' },
      { exam: 'agri', name: 'Agri Practical', progressPercent: 0, testsAttended: 0, totalScore: 0, avgAccuracy: 0, color: '#16a34a', icon: '🌱' },
    ],
  });

  const loadProfileData = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [profRes, progRes] = await Promise.all([
        apiFetch('/api/student/profile', { token }).catch(() => null),
        apiFetch('/api/student/aggregated-progress', { token }).catch(() => null),
      ]);
      if (profRes?.user) {
        setProfile(profRes.user);
        setName(profRes.user.name);
      }
      if (progRes?.exams) {
        const colorMap = {
          puc: { color: '#4f46e5', icon: '📄' },
          kcet: { color: '#0284c7', icon: '🎯' },
          neet: { color: '#e11d48', icon: '🩺' },
          agri: { color: '#16a34a', icon: '🌱' },
        };
        const mapped = progRes.exams.map((e) => ({
          ...e,
          color: colorMap[e.exam]?.color || '#2563eb',
          icon: colorMap[e.exam]?.icon || '📚',
        }));
        setProgressData({
          overall: progRes.overall || { progressPercent: 0, totalTestsGiven: 0, totalScore: 0, overallAccuracy: 0 },
          exams: mapped,
        });
      }
    } catch (err) {
      setMessage(err?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfileData(false);
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData(false);
  };

  const handleSave = async () => {
    try {
      await apiFetch('/api/student/profile', {
        token,
        method: 'PUT',
        body: { name },
      });
      setEditMode(false);
      setMessage('Profile updated successfully');
      setProfile({ ...profile, name });
    } catch (err) {
      setMessage(err?.message || 'Failed to update profile');
    }
  };

  const handleSendOtp = async () => {
    try {
      const res = await apiFetch('/api/student/password-reset/request', {
        token,
        method: 'POST',
        body: { email: profile?.email || user?.email },
      });
      setMessage(res.message || 'OTP sent to your email');
      setOtpSent(true);
    } catch (err) {
      setMessage(err?.message || 'Failed to send OTP');
    }
  };

  const handleResetWithOtp = async () => {
    if (!otp.trim()) { setMessage('Enter OTP'); return; }
    if (!newPassword) { setMessage('Enter new password'); return; }
    if (newPassword !== confirmPassword) { setMessage('Passwords do not match'); return; }
    try {
      const res = await apiFetch('/api/student/password-reset/reset', {
        token,
        method: 'POST',
        body: { email: profile?.email || user?.email, otp, newPassword },
      });
      if (res?.reset) {
        setMessage('Password updated successfully');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpSent(false);
        setShowPasswordSection(false);
      } else {
        setMessage(res?.message || 'Failed to reset password');
      }
    } catch (err) {
      setMessage(err?.message || 'Failed to reset password');
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined'
          ? window.confirm('Are you sure you want to log out of StudyHack?')
          : true;
      if (!confirmed) return;
      await logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.replace('/login');
      }
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to log out of StudyHack?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const studentName = profile?.name || user?.name || 'Student';
  const initial = (studentName.trim()?.[0] || 'S').toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: Platform.OS === 'android' ? Math.max(StatusBar.currentHeight || 0, 14) : 0 }]} edges={['top', 'bottom']}>
      {/* ─── Top Header Bar ────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnArrow}>←</Text>
          <Text style={styles.backBtnLabel}>Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Student Profile</Text>
        <TouchableOpacity style={styles.editToggleBtn} onPress={() => setEditMode(!editMode)}>
          <Text style={styles.editToggleBtnText}>{editMode ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} />}
      >
        {/* Alert / Notification Banner */}
        {!!message && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>{message}</Text>
          </View>
        )}

        {/* ─── 1. Hero Profile Card ───────────────────────────────────────────── */}
        <LinearGradient
          colors={['#0f172a', '#1e293b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroRow}>
            {/* Initial Letter Avatar */}
            <View style={styles.avatarGlow}>
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarInitialText}>{initial}</Text>
              </View>
              <View style={styles.onlineStatusDot} />
            </View>

            <View style={styles.heroDetails}>
              {editMode ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.editInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity style={styles.saveSmallBtn} onPress={handleSave}>
                    <Text style={styles.saveSmallBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameRow}>
                  <Text style={styles.studentNameText}>{studentName}</Text>
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓</Text>
                  </View>
                </View>
              )}

              <Text style={styles.studentEmailText}>{profile?.email || user?.email || 'student@studyhack.com'}</Text>
              <View style={styles.aspirantTag}>
                <Text style={styles.aspirantTagText}>🎓 PUC • KCET • NEET • Agri Practical</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.quickStatsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{progressData.overall.progressPercent}%</Text>
              <Text style={styles.statLabel}>Overall Prep</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{progressData.overall.totalTestsGiven}</Text>
              <Text style={styles.statLabel}>Tests Given</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{progressData.overall.totalScore}</Text>
              <Text style={styles.statLabel}>Total Score</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>2026</Text>
              <Text style={styles.statLabel}>Target Year</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ─── 2. Multi-Exam Preparation Flowlines ────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Exam Preparation Progress</Text>
            <Text style={styles.sectionSubtitleBadge}>Real-time Analytics</Text>
          </View>

          <View style={styles.examProgressCard}>
            {progressData.exams.map((exam, idx) => (
              <View key={exam.exam} style={[styles.progressExamItem, idx > 0 && styles.progressItemBorder]}>
                <View style={styles.progressExamTop}>
                  <View style={styles.examIconNameRow}>
                    <Text style={styles.examEmojiIcon}>{exam.icon}</Text>
                    <View>
                      <Text style={styles.examDisplayName}>{exam.name}</Text>
                      <Text style={styles.examStatsSub}>
                        {exam.testsAttended} Tests Attended • {exam.avgAccuracy}% Accuracy
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.examPercentBig, { color: exam.color }]}>
                    {exam.progressPercent}%
                  </Text>
                </View>

                {/* Progress Flowline Bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.max(5, exam.progressPercent)}%`, backgroundColor: exam.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ─── 3. Quick Services Menu ─────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Academic Services & Updates</Text>

          <View style={styles.menuCard}>
            {/* Doubt Clarification */}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/student/doubts')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#e0f2fe' }]}>
                <Text style={styles.menuIcon}>💬</Text>
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>Doubt Clarification</Text>
                <Text style={styles.menuSubtitle}>Ask questions directly to subject mentors</Text>
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            {/* Admin Announcements */}
            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowBorder]}
              onPress={() => router.push('/student/admin-notifications')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#fef3c7' }]}>
                <Text style={styles.menuIcon}>📢</Text>
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>Admin Announcements</Text>
                <Text style={styles.menuSubtitle}>Official class notices and test schedules</Text>
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            {/* KEA Official Notifications */}
            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowBorder]}
              onPress={() => router.push('/student/notifications')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#dcfce7' }]}>
                <Text style={styles.menuIcon}>🏛️</Text>
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>KEA Official Portal Updates</Text>
                <Text style={styles.menuSubtitle}>Live notifications from cetonline.karnataka.gov.in</Text>
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>

            {/* Feedback & Support */}
            <TouchableOpacity
              style={[styles.menuRow, styles.menuRowBorder]}
              onPress={() => router.push('/student/feedback')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#f3e8ff' }]}>
                <Text style={styles.menuIcon}>✍️</Text>
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuTitle}>Feedback & Help Desk</Text>
                <Text style={styles.menuSubtitle}>Submit suggestions or report technical issues</Text>
              </View>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── 5. Account Security ────────────────────────────────────────────── */}
        <View style={styles.sectionBlock}>
          <TouchableOpacity
            style={styles.securityToggleRow}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
            activeOpacity={0.7}
          >
            <View style={styles.secLeft}>
              <Text style={{ fontSize: 18 }}>🔒</Text>
              <Text style={styles.securityTitle}>Change Account Password</Text>
            </View>
            <Text style={styles.secArrow}>{showPasswordSection ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showPasswordSection && (
            <View style={styles.passwordCard}>
              <Text style={styles.secNotice}>
                Click below to receive a one-time verification OTP to {profile?.email || 'your registered email'}.
              </Text>

              <TouchableOpacity style={styles.btnSecondary} onPress={handleSendOtp}>
                <Text style={styles.btnSecondaryText}>{otpSent ? 'Resend OTP' : 'Request Password Reset OTP'}</Text>
              </TouchableOpacity>

              {otpSent && (
                <View style={styles.otpForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity style={styles.btnPrimary} onPress={handleResetWithOtp}>
                    <Text style={styles.btnPrimaryText}>Set New Password</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ─── 6. Sign Out Button ─────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out from Account</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>StudyHack Mobile v2.0 • Build 2026.11</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 18 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  centerLoadingText: { color: '#64748b', fontSize: 14, fontWeight: '600' },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  backBtnArrow: { fontSize: 18, color: '#0f172a', fontWeight: 'bold' },
  backBtnLabel: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  pageTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  editToggleBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#ecfdf5', borderRadius: 10 },
  editToggleBtnText: { color: '#059669', fontWeight: '800', fontSize: 13 },

  infoBanner: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, borderRadius: 12, padding: 12 },
  infoBannerText: { color: '#15803d', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Hero Card
  heroCard: { borderRadius: 20, padding: 20, gap: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarGlow: { position: 'relative' },
  avatarBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#38bdf8',
  },
  avatarInitialText: { fontSize: 32, fontWeight: '900', color: '#ffffff' },
  onlineStatusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22c55e',
    position: 'absolute',
    bottom: 2,
    right: 2,
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  heroDetails: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentNameText: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  verifiedBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  verifiedBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  studentEmailText: { fontSize: 13, color: '#94a3b8' },
  aspirantTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 2,
  },
  aspirantTagText: { color: '#cbd5e1', fontSize: 10, fontWeight: '700' },

  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#0f172a',
  },
  saveSmallBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  saveSmallBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  // Quick Stats Row
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 12,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '900', color: '#ffffff' },
  statLabel: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
  statDivider: { width: 1, height: '70%', backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center' },

  // Section Block
  sectionBlock: { gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sectionSubtitleBadge: { fontSize: 11, fontWeight: '700', color: '#059669', backgroundColor: '#ecfdf5', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 },

  // Exam Progress Flowlines
  examProgressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  progressExamItem: { gap: 8, paddingVertical: 10 },
  progressItemBorder: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  progressExamTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  examIconNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  examEmojiIcon: { fontSize: 24 },
  examDisplayName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  examStatsSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
  examPercentBig: { fontSize: 17, fontWeight: '900' },

  progressBarTrack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  // VIP Subscription Card
  subscriptionCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 14,
  },
  subCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subBadgeStar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fef08a', alignItems: 'center', justifyContent: 'center' },
  subCardTitle: { fontSize: 16, fontWeight: '900', color: '#854d0e' },
  subCardSubtitle: { fontSize: 12, color: '#a16207', marginTop: 2, lineHeight: 16 },
  subUpgradeBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  subUpgradeBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },

  // Academic Services Menu
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuRowBorder: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  menuIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuIcon: { fontSize: 20 },
  menuInfo: { flex: 1, gap: 2 },
  menuTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  menuSubtitle: { fontSize: 12, color: '#64748b' },
  menuArrow: { fontSize: 18, color: '#94a3b8', fontWeight: 'bold' },

  // Security Section
  securityToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  securityTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  secArrow: { fontSize: 12, color: '#64748b' },
  passwordCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 12, marginTop: 8 },
  secNotice: { fontSize: 12, color: '#64748b', lineHeight: 16 },
  btnSecondary: { backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnSecondaryText: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  otpForm: { gap: 10, marginTop: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14 },
  btnPrimary: { backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  // Logout Button
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { color: '#b91c1c', fontWeight: '800', fontSize: 15 },
  versionText: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
});
