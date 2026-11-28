import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

export default function StudentOtpLoginScreen() {
  const { requestStudentLoginOtp, loginStudentWithOtp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendLeftSec, setResendLeftSec] = useState(0);

  useEffect(() => {
    if (!resendLeftSec) return;
    const t = setInterval(() => {
      setResendLeftSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendLeftSec]);

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

  async function handleSendOtp() {
    setMessage('');
    setIsError(false);
    const e = String(email || '').trim();
    if (!e) {
      setMessage('Please enter your registered email address');
      setIsError(true);
      return;
    }
    if (!isValidEmail(e)) {
      setMessage('Please enter a valid email address');
      setIsError(true);
      return;
    }

    try {
      setBusy(true);
      const res = await requestStudentLoginOtp({ email: e });
      setMessage(res?.message || 'Login OTP sent to your registered email!');
      setIsError(false);
      setResendLeftSec(30);
    } catch (err) {
      setMessage(err?.message || 'Failed to send OTP. Please try again.');
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyLogin() {
    setMessage('');
    setIsError(false);
    const e = String(email || '').trim();
    if (!e) {
      setMessage('Please enter your registered email');
      setIsError(true);
      return;
    }
    if (!otp.trim()) {
      setMessage('Please enter the 6-digit OTP code');
      setIsError(true);
      return;
    }

    try {
      setBusy(true);
      const res = await loginStudentWithOtp({ email: e, otp: otp.trim() });
      if (res?.user?.role === 'admin') {
        router.replace('/admin/dashboard');
        return;
      } else if (res?.user?.role === 'student') {
        router.replace('/student/dashboard');
        return;
      }
      setMessage('Login failed. Please check the code.');
      setIsError(true);
    } catch (err) {
      setMessage(err?.message || 'Login failed. Invalid or expired OTP.');
      setIsError(true);
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
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.brandBadge}>
                    <Text style={styles.brandBadgeEmoji}>⚡</Text>
                    <Text style={styles.brandBadgeText}>FAST PASSLESS LOGIN</Text>
                  </View>
                  <Text style={styles.title}>Login with OTP</Text>
                  <Text style={styles.subtitle}>
                    Skip your password and log in securely using a one-time code
                  </Text>
                </View>
              </View>

              <View style={styles.form}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Registered Email</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>@</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter registered email"
                      placeholderTextColor="#94a3b8"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                {/* Send OTP Action */}
                <TouchableOpacity
                  style={[styles.btnOutline, (busy || resendLeftSec > 0) && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={busy || resendLeftSec > 0}
                  activeOpacity={0.8}
                >
                  <Text style={styles.btnOutlineText}>
                    {busy
                      ? 'Sending Code...'
                      : resendLeftSec > 0
                      ? `Resend OTP in ${resendLeftSec}s`
                      : 'Send One-Time Password 📩'}
                  </Text>
                </TouchableOpacity>

                {/* OTP Input */}
                <View style={[styles.formGroup, { marginTop: 4 }]}>
                  <Text style={styles.label}>6-Digit OTP Code</Text>
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

                {/* Alert / Status Message */}
                {!!message && (
                  <View style={isError ? styles.errorBox : styles.successBox}>
                    <Text style={styles.errorIcon}>{isError ? '⚠️' : '✅'}</Text>
                    <Text style={isError ? styles.errorText : styles.successText}>{message}</Text>
                  </View>
                )}

                {/* Verify & Login Button */}
                <TouchableOpacity
                  onPress={handleVerifyLogin}
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
                        <Text style={styles.submitBtnText}>Signing In...</Text>
                      </View>
                    ) : (
                      <Text style={styles.submitBtnText}>Verify OTP & Sign In ⚡</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Bottom Switcher */}
              <View style={styles.footerLinks}>
                <Text style={styles.footerText}>Prefer using password? </Text>
                <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.7}>
                  <Text style={styles.linkTextBold}>Password Login ➔</Text>
                </TouchableOpacity>
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
    marginBottom: 20,
  },
  cardHeaderLeft: {
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
  form: {
    gap: 14,
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
  btnOutline: {
    borderWidth: 1.5,
    borderColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
  },
  btnDisabled: {
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
    opacity: 0.7,
  },
  btnOutlineText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0369a1',
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
  successBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
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
  successText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  submitBtnWrapper: {
    marginTop: 6,
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
});
