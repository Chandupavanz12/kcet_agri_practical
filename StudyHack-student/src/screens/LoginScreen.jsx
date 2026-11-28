import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import StudentAuthShell from '../components/StudentAuthShell.jsx';
import { API_BASE_URL } from '../config/env.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginScreen() {
  const { loginStudent } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const lastWarmRef = useRef(0);
  const warmServer = (force = false) => {
    const now = Date.now();
    if (!force && now - lastWarmRef.current < 20000) return;
    lastWarmRef.current = now;
    fetch(`${API_BASE_URL}/api/ping`).catch(() => {});
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
    <StudentAuthShell
      titleLead="Welcome"
      titleAccent="Back!"
      subtitle="Sign in to continue your learning journey"
      badgeIcon="book"
      badgeIconColor="#0284c7"
    >
      {/* Email Pill Input */}
      <View style={styles.pillInputWrap}>
        <Ionicons name="mail-outline" size={20} color="#475569" style={styles.leftIcon} />
        <TextInput
          style={styles.pillInput}
          placeholder="Email Address"
          placeholderTextColor="#94a3b8"
          value={email}
          onChangeText={setEmail}
          onFocus={handleInputFocus}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      {/* Password Pill Input */}
      <View style={styles.pillInputWrap}>
        <Ionicons name="lock-closed" size={20} color="#475569" style={styles.leftIcon} />
        <TextInput
          style={styles.pillInput}
          placeholder="Password"
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

      {/* Remember Me + Forgot Password Row */}
      <View style={styles.optionsRow}>
        <TouchableOpacity
          style={styles.rememberRow}
          onPress={() => setRememberMe((v) => !v)}
          activeOpacity={0.75}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
            {rememberMe && <Ionicons name="checkmark" size={13} color="#ffffff" />}
          </View>
          <Text style={styles.rememberText}>Remember Me</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/forgot-password')} activeOpacity={0.7}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* Error Box */}
      {!!error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color="#b91c1c" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Primary Login Pill Button */}
      <TouchableOpacity onPress={onSubmit} disabled={busy} activeOpacity={0.88}>
        <LinearGradient
          colors={['#059669', '#065f46']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.loginBtn}
        >
          {busy ? (
            <View style={styles.busyRow}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={styles.loginBtnText}>Please wait...</Text>
            </View>
          ) : (
            <View style={styles.busyRow}>
              <Ionicons name="log-in-outline" size={20} color="#ffffff" />
              <Text style={styles.loginBtnText}>Login</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Quick OTP Login Option */}
      <TouchableOpacity
        style={styles.otpLinkBtn}
        onPress={() => router.push('/otp-login')}
        activeOpacity={0.75}
      >
        <Ionicons name="flash" size={15} color="#059669" />
        <Text style={styles.otpLinkText}>Login with OTP</Text>
      </TouchableOpacity>

      {/* "or" Divider */}
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>or</Text>
        <View style={styles.orLine} />
      </View>

      {/* Secondary Register Pill Button */}
      <TouchableOpacity
        style={styles.registerPill}
        onPress={() => router.push('/register')}
        activeOpacity={0.8}
      >
        <Text style={styles.rocketEmoji}>🚀</Text>
        <View>
          <Text style={styles.registerLead}>New to StudyHack?</Text>
          <Text style={styles.registerAccent}>Create an Account  ›</Text>
        </View>
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
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  eyeBtn: {
    padding: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  rememberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
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
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#b91c1c',
  },
  loginBtn: {
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
  loginBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  otpLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  otpLinkText: {
    fontSize: 13.5,
    fontWeight: '800',
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
  registerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
    borderRadius: 28,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  rocketEmoji: {
    fontSize: 22,
  },
  registerLead: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  registerAccent: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#059669',
  },
});
