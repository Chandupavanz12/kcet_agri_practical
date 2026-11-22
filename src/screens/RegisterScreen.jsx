import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuth } from '../contexts/AuthContext.jsx';

export default function RegisterScreen() {
  const { registerStudent, requestStudentRegisterOtp } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('details'); // 'details' | 'otp'
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

  async function onRequestOtp() {
    setError('');
    setBusy(true);

    try {
      if (!name.trim()) {
        setError('Please enter your full name');
        setBusy(false);
        return;
      }
      if (!isValidEmail(email)) {
        setError('Please enter a valid email address');
        setBusy(false);
        return;
      }
      if (!password || password.length < 4) {
        setError('Password must be at least 4 characters');
        setBusy(false);
        return;
      }

      await requestStudentRegisterOtp({ email: email.trim() });
      setStep('otp');
    } catch (err) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp() {
    setError('');
    setBusy(true);
    try {
      if (!otp.trim()) {
        setError('Please enter the 6-digit verification code');
        setBusy(false);
        return;
      }
      const data = await registerStudent({
        name: name.trim(),
        email: email.trim(),
        password,
        otp: otp.trim(),
      });
      if (data.user?.role === 'student') {
        router.replace('/student/dashboard');
      } else {
        router.replace('/login');
      }
    } catch (err) {
      setError(err?.message || 'Registration failed. Please check the OTP.');
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
            {/* Main Register Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.brandBadge}>
                    <Text style={styles.brandBadgeEmoji}>🎓</Text>
                    <Text style={styles.brandBadgeText}>STUDYHACK JOIN</Text>
                  </View>
                  <Text style={styles.title}>
                    {step === 'details' ? 'Create Account' : 'Verify Email'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {step === 'details'
                      ? 'Sign up for complete exam preparation access'
                      : `Enter the 6-digit code sent to ${email}`}
                  </Text>
                </View>

                {/* Step indicator */}
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>
                    {step === 'details' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}
                  </Text>
                </View>
              </View>

              <View style={styles.form}>
                {step === 'details' ? (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Full Name</Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputIcon}>👤</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your full name"
                          placeholderTextColor="#94a3b8"
                          value={name}
                          onChangeText={setName}
                        />
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Email Address</Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputIcon}>@</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="name@example.com"
                          placeholderTextColor="#94a3b8"
                          value={email}
                          onChangeText={setEmail}
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
                          placeholder="Create a strong password"
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
                  </>
                ) : (
                  <>
                    <View style={styles.otpNoticeBox}>
                      <Text style={styles.otpNoticeEmoji}>📩</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.otpNoticeTitle}>Check Your Inbox</Text>
                        <Text style={styles.otpNoticeText}>
                          We sent a 6-digit confirmation code to{' '}
                          <Text style={{ fontWeight: '700', color: '#0f172a' }}>{email}</Text>
                        </Text>
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>6-Digit Verification Code</Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputIcon}>🔑</Text>
                        <TextInput
                          style={[styles.input, styles.otpInput]}
                          placeholder="••••••"
                          placeholderTextColor="#94a3b8"
                          value={otp}
                          onChangeText={setOtp}
                          keyboardType="number-pad"
                          maxLength={6}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.backStepBtn}
                      onPress={() => setStep('details')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.backStepText}>← Edit Name or Email</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Error Box */}
                {!!error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Action Button */}
                <TouchableOpacity
                  onPress={step === 'details' ? onRequestOtp : onVerifyOtp}
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
                        <Text style={styles.submitBtnText}>
                          {step === 'details' ? 'Sending OTP...' : 'Registering...'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {step === 'details' ? 'Continue & Send OTP ➔' : 'Verify & Create Account 🎓'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Bottom Switcher */}
              <View style={styles.footerLinks}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.7}>
                  <Text style={styles.linkTextBold}>Login ➔</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Hub Banner */}
            <View style={styles.joinBenefitsCard}>
              <Text style={styles.benefitsTitle}>Why Join StudyHack?</Text>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitCheck}>✓</Text>
                  <Text style={styles.benefitText}>
                    Complete preparation for PUC (12th), KCET, NEET & Agri Practical
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitCheck}>✓</Text>
                  <Text style={styles.benefitText}>
                    Free starter mock tests with instant answer analysis
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitCheck}>✓</Text>
                  <Text style={styles.benefitText}>
                    Access from mobile app, tablet, or web browser anywhere
                  </Text>
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
    marginBottom: 22,
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
  stepBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  stepBadgeText: {
    color: '#0369a1',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  otpInput: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 4,
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
  otpNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 12,
  },
  otpNoticeEmoji: {
    fontSize: 22,
  },
  otpNoticeTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#166534',
  },
  otpNoticeText: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 1,
  },
  backStepBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backStepText: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '700',
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

  // Benefits Card
  joinBenefitsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: 12,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  benefitCheck: {
    color: '#16a34a',
    fontWeight: '900',
    fontSize: 14,
    marginTop: 1,
  },
  benefitText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
});
