import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PublicFooter from '../components/PublicFooter.jsx';
import PublicHeader from '../components/PublicHeader.jsx';
import { API_BASE_URL } from '../config/env.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginScreen() {
  const { loginStudent } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const lastWarmRef = useRef(0);
  const warmServer = (force = false) => {
    const now = Date.now();
    if (!force && now - lastWarmRef.current < 20000) return;
    lastWarmRef.current = now;
    fetch(`${API_BASE_URL}/api/ping`).catch(() => { });
  };

  // Pre-warm the backend on mount and whenever returning from background inactivity
  useEffect(() => {
    warmServer(true);
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') warmServer(true);
    });
    return () => sub.remove();
  }, []);

  const handleInputFocus = () => {
    warmServer(false);
  };

  async function onSubmit() {
    setError('');
    setBusy(true);

    try {
      const data = await loginStudent({ email, password });
      if (data.user?.role === 'student') {
        router.replace('/student/dashboard');
      }
    } catch (err) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <PublicHeader />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerWrapper}>
            {/* Main Auth Card */}
            <View style={styles.card}>
              {/* Header inside Card */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.brandBadge}>
                    <Text style={styles.brandBadgeEmoji}>🎓</Text>
                    <Text style={styles.brandBadgeText}>STUDYHACK</Text>
                  </View>
                  <Text style={styles.title}>Welcome back</Text>
                  <Text style={styles.subtitle}>Login to continue your exam preparation</Text>
                </View>
                <View style={styles.badgeSuccess}>
                  <Text style={styles.badgeSuccessText}>🔒 SECURE</Text>
                </View>
              </View>

              {/* Form Section */}
              <View style={styles.form}>
                <>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Username or Email</Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputIcon}>👤</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your username or email"
                          placeholderTextColor="#94a3b8"
                          value={email}
                          onChangeText={setEmail}
                          onFocus={handleInputFocus}
                          autoCapitalize="none"
                          keyboardType="email-address"
                        />
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputIcon}>🔒</Text>
                        <TextInput
                          style={[styles.input, { paddingRight: 64 }]}
                          placeholder="Enter password"
                          placeholderTextColor="#94a3b8"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity
                          style={styles.showBtn}
                          onPress={() => setShowPassword((v) => !v)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.linksRow}>
                      <TouchableOpacity onPress={() => router.push('/forgot-password')} activeOpacity={0.7}>
                        <Text style={styles.linkText}>Forgot password?</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => router.push('/otp-login')} activeOpacity={0.7}>
                        <Text style={styles.linkTextEmerald}>Login with OTP ⚡</Text>
                      </TouchableOpacity>
                    </View>
                  </>

                {/* Error Box */}
                {!!error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={onSubmit}
                  disabled={busy}
                  activeOpacity={0.85}
                  style={styles.submitBtnWrapper}
                >
                  <LinearGradient
                    colors={['#10b981', '#2563eb']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    {busy ? (
                      <View style={styles.busyRow}>
                        <ActivityIndicator color="#ffffff" size="small" />
                        <Text style={styles.submitBtnText}>Please wait...</Text>
                      </View>
                    ) : (
                      <Text style={styles.submitBtnText}>Login to StudyHack ➔</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Bottom Register Switcher */}
              <View style={styles.footerLinks}>
                <Text style={styles.footerText}>New to StudyHack? </Text>
                <TouchableOpacity onPress={() => router.push('/register')} activeOpacity={0.7}>
                  <Text style={styles.linkTextBold}>Create Free Account ➔</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Platform Highlights Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoTopRow}>
                <View style={styles.infoLogoBadge}>
                  <Text style={styles.infoLogoBadgeEmoji}>🎓</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>StudyHack Preparation Hub</Text>
                  <Text style={styles.infoSubtitle}>PUC • KCET • NEET • Agri Practical</Text>
                </View>
              </View>

              <View style={styles.examChipsRow}>
                <View style={[styles.examChip, { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' }]}>
                  <Text style={[styles.examChipText, { color: '#4338ca' }]}>📄 PUC (12th)</Text>
                </View>
                <View style={[styles.examChip, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
                  <Text style={[styles.examChipText, { color: '#0369a1' }]}>🎯 KCET</Text>
                </View>
                <View style={[styles.examChip, { backgroundColor: '#ffe4e6', borderColor: '#fecdd3' }]}>
                  <Text style={[styles.examChipText, { color: '#be123c' }]}>🩺 NEET</Text>
                </View>
                <View style={[styles.examChip, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
                  <Text style={[styles.examChipText, { color: '#15803d' }]}>🌱 Agri Practical</Text>
                </View>
              </View>

              <View style={styles.infoFeaturesGrid}>
                <View style={styles.infoFeatureItem}>
                  <Text style={styles.infoFeatureEmoji}>📚</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoFeatureHeading}>Chapter Study Notes</Text>
                    <Text style={styles.infoFeatureDesc}>High-yield summaries & formula sheets</Text>
                  </View>
                </View>
                <View style={styles.infoFeatureItem}>
                  <Text style={styles.infoFeatureEmoji}>⏱️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoFeatureHeading}>Timed Mock Tests</Text>
                    <Text style={styles.infoFeatureDesc}>Real exam simulation with instant rankings</Text>
                  </View>
                </View>
                <View style={styles.infoFeatureItem}>
                  <Text style={styles.infoFeatureEmoji}>📄</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoFeatureHeading}>Previous Year Papers</Text>
                    <Text style={styles.infoFeatureDesc}>Solved question papers with keys</Text>
                  </View>
                </View>
                <View style={styles.infoFeatureItem}>
                  <Text style={styles.infoFeatureEmoji}>📈</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoFeatureHeading}>Smart Analytics</Text>
                    <Text style={styles.infoFeatureDesc}>Identify strengths and weak subjects</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <PublicFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  centerWrapper: {
    width: '100%',
    maxWidth: 480,
    gap: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 4,
  },
  brandBadgeEmoji: {
    fontSize: 12,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  badgeSuccess: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  badgeSuccessText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 16,
    marginBottom: 22,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabActiveStudent: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  tabActiveAdmin: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  form: {
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#1e293b',
  },
  sentText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 10,
    color: '#94a3b8',
    fontSize: 16,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingLeft: 44,
    paddingRight: 16,
    paddingVertical: 12,
    fontSize: 14.5,
    color: '#0f172a',
    minHeight: 48,
  },
  showBtn: {
    position: 'absolute',
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  showBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  linkTextEmerald: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  submitBtnWrapper: {
    marginTop: 4,
    borderRadius: 14,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerLinks: {
    flexDirection: 'row',
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  linkTextBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 16,
  },
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLogoBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLogoBadgeEmoji: {
    fontSize: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  infoSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  examChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  examChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  examChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  infoFeaturesGrid: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
  },
  infoFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
  },
  infoFeatureEmoji: {
    fontSize: 18,
  },
  infoFeatureHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoFeatureDesc: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '500',
  },
});
