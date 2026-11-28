import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import StudentAuthShell from '../components/StudentAuthShell.jsx';
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
    <StudentAuthShell
      titleLead="Login with"
      titleAccent="OTP!"
      subtitle="Sign in instantly using a one-time verification code"
      badgeIcon="flash"
      badgeIconColor="#059669"
    >
      <View style={styles.pillInputWrap}>
        <Ionicons name="mail-outline" size={20} color="#475569" style={styles.leftIcon} />
        <TextInput
          style={styles.pillInput}
          placeholder="Registered Email Address"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <TouchableOpacity
        style={[styles.outlineBtn, (busy || resendLeftSec > 0) && styles.btnDisabled]}
        onPress={handleSendOtp}
        disabled={busy || resendLeftSec > 0}
        activeOpacity={0.8}
      >
        <Ionicons name="paper-plane-outline" size={16} color="#059669" />
        <Text style={styles.outlineBtnText}>
          {busy
            ? 'Sending Code...'
            : resendLeftSec > 0
            ? `Resend OTP in ${resendLeftSec}s`
            : 'Send One-Time Password'}
        </Text>
      </TouchableOpacity>

      <View style={styles.pillInputWrap}>
        <Ionicons name="key-outline" size={20} color="#475569" style={styles.leftIcon} />
        <TextInput
          style={[styles.pillInput, styles.otpInput]}
          placeholder="Enter 6-Digit OTP"
          placeholderTextColor="#94a3b8"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>

      {!!message && (
        <View style={isError ? styles.errorBox : styles.successBox}>
          <Ionicons
            name={isError ? 'alert-circle' : 'checkmark-circle'}
            size={18}
            color={isError ? '#b91c1c' : '#15803d'}
          />
          <Text style={isError ? styles.errorText : styles.successText}>{message}</Text>
        </View>
      )}

      <TouchableOpacity onPress={handleVerifyLogin} disabled={busy} activeOpacity={0.88}>
        <LinearGradient
          colors={['#059669', '#065f46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitBtn}
        >
          {busy ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <View style={styles.busyRow}>
              <Ionicons name="log-in-outline" size={20} color="#ffffff" />
              <Text style={styles.submitBtnText}>Verify & Login</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.orLine} />
      </View>

      <TouchableOpacity
        style={styles.secondaryPill}
        onPress={() => router.replace('/login')}
        activeOpacity={0.8}
      >
        <Ionicons name="lock-closed-outline" size={17} color="#059669" />
        <Text style={styles.secondaryAccent}>Login with Password</Text>
      </TouchableOpacity>
    </StudentAuthShell>
  );
}

const styles = StyleSheet.create({
  pillInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 28,
    height: 52,
    paddingHorizontal: 16,
  },
  leftIcon: {
    marginRight: 10,
  },
  pillInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    height: '100%',
  },
  otpInput: {
    letterSpacing: 3,
    fontWeight: '800',
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 10,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#b91c1c',
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#15803d',
  },
  submitBtn: {
    height: 52,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#065f46',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#ffffff',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  orText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  secondaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 28,
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 8,
  },
  secondaryAccent: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#059669',
  },
});
