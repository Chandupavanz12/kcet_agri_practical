import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,  } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';
import PublicHeader from '../components/PublicHeader.jsx';
import PublicFooter from '../components/PublicFooter.jsx';

export default function StudentForgotPasswordScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendLeftSec, setResendLeftSec] = useState(0);

  useEffect(() => {
    if (!resendLeftSec) return;
    const t = setInterval(() => {
      setResendLeftSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendLeftSec]);

  if (user) {
    setTimeout(() => {
      router.replace(user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
    }, 0);
    return null;
  }

  async function handleSendOtp() {
    setMessage('');
    const e = String(email || '').trim();
    if (!e) {
      setMessage('Please enter your registered email');
      return;
    }
    if (!newPassword || !confirmPassword) {
      setMessage('Please enter new password and confirm password');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    try {
      setBusy(true);
      const res = await apiFetch('/api/auth/student/password-reset/request', {
        method: 'POST',
        body: { email: e },
      });
      setMessage(res?.message || 'OTP sent');
      setResendLeftSec(30);
    } catch (err) {
      setMessage(err?.message || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyAndReset() {
    setMessage('');
    const e = String(email || '').trim();
    if (!e || !newPassword || !confirmPassword) {
      setMessage('Please fill all fields before verifying');
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    if (!otp) {
      setMessage('Please enter OTP');
      return;
    }

    try {
      setBusy(true);
      await apiFetch('/api/auth/student/password-reset/reset', {
        method: 'POST',
        body: { email: e, otp, newPassword },
      });
      setMessage('Password reset successful. Please login.');
      setTimeout(() => router.replace('/login'), 1000);
    } catch (err) {
      setMessage(err?.message || 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <PublicHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>Reset using OTP sent to your registered email.</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Registered Email</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>@</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter registered email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>New password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="New password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.btnPrimary, resendLeftSec > 0 && styles.btnDisabled]} onPress={handleSendOtp} disabled={busy || resendLeftSec > 0}>
                <Text style={styles.btnPrimaryText}>{busy ? 'Sending...' : resendLeftSec > 0 ? `Resend in ${resendLeftSec}s` : 'Send OTP'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>OTP</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>#</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter OTP"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleVerifyAndReset} disabled={busy}>
                <Text style={styles.btnPrimaryText}>{busy ? 'Please wait...' : 'Verify & Reset'}</Text>
              </TouchableOpacity>
            </View>

            {!!message && (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            )}
          </View>

          <View style={styles.footerLinks}>
            <Text style={styles.footerText}>Back to </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.linkTextBold}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <PublicFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, paddingVertical: 32, alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#e2e8f0', width: '100%', maxWidth: 500 },
  cardHeader: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#475569', marginTop: 4 },
  form: { gap: 16 },
  formGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155' },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 12, zIndex: 10, color: '#94a3b8', fontSize: 14 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingLeft: 36, paddingRight: 12, paddingVertical: 12, fontSize: 14, color: '#0f172a' },
  actionRow: { marginTop: 4 },
  btnPrimary: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#94a3b8' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  messageBox: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 8 },
  messageText: { color: '#334155', fontSize: 14 },
  footerLinks: { flexDirection: 'row', marginTop: 24, justifyContent: 'flex-start' },
  footerText: { fontSize: 14, color: '#475569' },
  linkTextBold: { fontSize: 14, fontWeight: 'bold', color: '#1d4ed8' },
});
