import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PublicFooter from '../components/PublicFooter.jsx';
import PublicHeader from '../components/PublicHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function RegisterScreen() {
  const { registerStudent, requestStudentRegisterOtp, oauthStudent } = useAuth();
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
      if (!isValidEmail(email)) {
        setError('Please enter a valid email address');
        setBusy(false);
        return;
      }
      if (!name || !password) {
        setError('Name and password are required');
        setBusy(false);
        return;
      }

      await requestStudentRegisterOtp({ email });
      setStep('otp');
    } catch (err) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp() {
    setError('');
    setBusy(true);
    try {
      const data = await registerStudent({ name, email, password, otp });
      if (data.user?.role === 'student') {
        router.replace('/student/dashboard');
      } else {
        router.replace('/login');
      }
    } catch (err) {
      setError(err?.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  async function onOAuth(provider) {
    try {
      const data = await oauthStudent({
        email: `mock_${provider}@example.com`,
        name: `Mock ${provider} User`,
        provider,
        providerId: `mock_${provider}_id`
      });
      router.replace('/student/dashboard');
    } catch (err) {
      setError(err?.message || 'OAuth login failed');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <PublicHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Register to get started.</Text>
          </View>

          <View style={styles.form}>
            {step === 'details' ? (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Name</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>@</Text>
                    <TextInput style={styles.input} placeholder="Enter email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                  </View>
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput style={styles.input} placeholder="Create a password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
                    <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword((v) => !v)}>
                      <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Enter OTP</Text>
                <Text style={styles.sentText}>We sent a code to {email}</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔑</Text>
                  <TextInput style={styles.input} placeholder="6-digit OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
                </View>
              </View>
            )}

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {step === 'details' ? (
              <TouchableOpacity onPress={onRequestOtp} disabled={busy}>
                <LinearGradient colors={['#10b981', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBtn}>
                  <Text style={styles.submitBtnText}>{busy ? 'Sending OTP...' : 'Continue'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onVerifyOtp} disabled={busy}>
                <LinearGradient colors={['#10b981', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBtn}>
                  <Text style={styles.submitBtnText}>{busy ? 'Registering...' : 'Verify & Register'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {step === 'details' && (
            <View style={styles.oauthContainer}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity style={styles.oauthBtnGoogle} onPress={() => onOAuth('Google')}>
                <Text style={styles.oauthBtnTextGoogle}>Sign up with Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.oauthBtnFacebook} onPress={() => onOAuth('Facebook')}>
                <Text style={styles.oauthBtnTextFacebook}>Sign up with Facebook</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footerLinks}>
            <Text style={styles.footerText}>Already have an account? </Text>
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
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 4, width: '100%', maxWidth: 500 },
  cardHeader: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#475569', marginTop: 6, fontWeight: '500' },
  form: { gap: 18 },
  formGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 14, zIndex: 10, color: '#94a3b8', fontSize: 16 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingLeft: 42, paddingRight: 16, paddingVertical: 14, fontSize: 15, color: '#0f172a' },
  showBtn: { position: 'absolute', right: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
  showBtnText: { fontSize: 13, fontWeight: '800', color: '#475569' },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 14 },
  errorText: { color: '#b91c1c', fontSize: 14, fontWeight: '600' },
  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  sentText: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  footerLinks: { flexDirection: 'row', marginTop: 28, justifyContent: 'center' },
  footerText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  linkTextBold: { fontSize: 15, fontWeight: '800', color: '#10b981' },
  oauthContainer: { marginTop: 20, gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { marginHorizontal: 10, color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  oauthBtnGoogle: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  oauthBtnTextGoogle: { color: '#334155', fontSize: 15, fontWeight: '700' },
  oauthBtnFacebook: { backgroundColor: '#1877F2', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  oauthBtnTextFacebook: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
