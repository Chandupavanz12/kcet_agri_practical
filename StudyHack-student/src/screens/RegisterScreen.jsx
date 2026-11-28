import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
    <StudentAuthShell
      titleLead={step === 'details' ? 'Create' : 'Verify'}
      titleAccent={step === 'details' ? 'Account!' : 'Email!'}
      subtitle={
        step === 'details'
          ? 'Sign up for complete exam preparation access'
          : `Enter the 6-digit code sent to ${email}`
      }
      badgeIcon={step === 'details' ? 'person-add' : 'mail-open'}
      badgeIconColor="#059669"
    >
      {step === 'details' ? (
        <>
          <View style={styles.pillInputWrap}>
            <Ionicons name="person-outline" size={20} color="#475569" style={styles.leftIcon} />
            <TextInput
              style={styles.pillInput}
              placeholder="Full Name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.pillInputWrap}>
            <Ionicons name="mail-outline" size={20} color="#475569" style={styles.leftIcon} />
            <TextInput
              style={styles.pillInput}
              placeholder="Email Address"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.pillInputWrap}>
            <Ionicons name="lock-closed" size={20} color="#475569" style={styles.leftIcon} />
            <TextInput
              style={styles.pillInput}
              placeholder="Create Password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              activeOpacity={0.7}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#475569"
              />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <>
          <View style={styles.otpNoticeBox}>
            <Ionicons name="mail-unread-outline" size={22} color="#059669" />
            <View style={{ flex: 1 }}>
              <Text style={styles.otpNoticeTitle}>Check Your Inbox</Text>
              <Text style={styles.otpNoticeText}>
                We sent a 6-digit confirmation code to{' '}
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>{email}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.pillInputWrap}>
            <Ionicons name="key-outline" size={20} color="#475569" style={styles.leftIcon} />
            <TextInput
              style={[styles.pillInput, styles.otpInput]}
              placeholder="6-Digit Verification Code"
              placeholderTextColor="#94a3b8"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
        </>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={step === 'details' ? onRequestOtp : onVerifyOtp}
        disabled={busy}
        activeOpacity={0.88}
      >
        <LinearGradient
          colors={['#059669', '#065f46']}
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
            <View style={styles.busyRow}>
              <Ionicons
                name={step === 'details' ? 'paper-plane-outline' : 'checkmark-circle-outline'}
                size={20}
                color="#ffffff"
              />
              <Text style={styles.submitBtnText}>
                {step === 'details' ? 'Send Verification Code' : 'Verify & Create Account'}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {step === 'otp' && (
        <TouchableOpacity
          onPress={() => {
            setStep('details');
            setError('');
          }}
          style={styles.backStepBtn}
        >
          <Text style={styles.backStepText}>← Edit Details / Resend</Text>
        </TouchableOpacity>
      )}

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
        <Ionicons name="log-in-outline" size={18} color="#059669" />
        <Text style={styles.secondaryLead}>Already have an account? </Text>
        <Text style={styles.secondaryAccent}>Login ›</Text>
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
    letterSpacing: 4,
    fontWeight: '800',
  },
  eyeBtn: {
    padding: 6,
  },
  otpNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 12,
  },
  otpNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  otpNoticeText: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
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
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#b91c1c',
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
  backStepBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  backStepText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
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
    gap: 6,
  },
  secondaryLead: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  secondaryAccent: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#059669',
  },
});
