import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PublicFooter from '../components/PublicFooter.jsx';
import PublicHeader from '../components/PublicHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginScreen() {
  const { loginStudent, loginAdmin, verifyAdminLoginOtp, oauthStudent } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminOtp, setAdminOtp] = useState('');
  const [adminStep, setAdminStep] = useState('details'); // 'details' | 'otp'
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit() {
    setError('');
    setBusy(true);

    try {
      if (mode === 'admin') {
        if (adminStep === 'details') {
          const data = await loginAdmin({ email, password });
          if (data.requiresOtp) {
            setAdminStep('otp');
          }
        } else {
          const data = await verifyAdminLoginOtp({ email, otp: adminOtp });
          if (data.user?.role === 'admin') {
            router.replace('/admin/dashboard');
          }
        }
      } else {
        const data = await loginStudent({ email, password });
        if (data.user?.role === 'student') {
          router.replace('/student/dashboard');
        }
      }
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  async function onOAuth(provider) {
    try {
      if (mode === 'admin') {
        setError('OAuth not supported for admin');
        return;
      }
      setBusy(true);
      const data = await oauthStudent({
        email: `mock_${provider}@example.com`,
        name: `Mock ${provider} User`,
        provider,
        providerId: `mock_${provider}_id`
      });
      router.replace('/student/dashboard');
    } catch (err) {
      setError(err?.message || 'OAuth login failed');
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
            <View>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Login to continue your preparation.</Text>
            </View>
            <View style={styles.badgeSuccess}>
              <Text style={styles.badgeSuccessText}>Secure</Text>
            </View>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, mode === 'student' && styles.tabActiveStudent]}
              onPress={() => setMode('student')}
            >
              <Text style={[styles.tabText, mode === 'student' && styles.tabTextActive]}>Student</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'admin' && styles.tabActiveAdmin]}
              onPress={() => {
                setMode('admin');
                setAdminStep('details');
              }}
            >
              <Text style={[styles.tabText, mode === 'admin' && styles.tabTextActive]}>Admin</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            {mode === 'admin' && adminStep === 'otp' ? (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Enter Admin OTP</Text>
                <Text style={styles.sentText}>Check your admin email for OTP.</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔑</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="6-digit OTP"
                    value={adminOtp}
                    onChangeText={setAdminOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>@</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter email"
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
                      style={styles.input}
                      placeholder="Enter password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword((v) => !v)}>
                      <Text style={styles.showBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {mode === 'student' && (
                  <View style={styles.linksRow}>
                    <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                      <Text style={styles.linkText}>Forgot password?</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push('/otp-login')}>
                      <Text style={styles.linkText}>Login with OTP</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity onPress={onSubmit} disabled={busy}>
              <LinearGradient colors={['#10b981', '#2563eb']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>{busy ? 'Please wait...' : mode === 'admin' && adminStep === 'details' ? 'Get OTP' : 'Login'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {mode === 'student' && (
              <View style={styles.oauthContainer}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>
                <TouchableOpacity style={styles.oauthBtnGoogle} onPress={() => onOAuth('Google')}>
                  <Text style={styles.oauthBtnTextGoogle}>Sign in with Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.oauthBtnFacebook} onPress={() => onOAuth('Facebook')}>
                  <Text style={styles.oauthBtnTextFacebook}>Sign in with Facebook</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.footerLinks}>
            <Text style={styles.footerText}>Student new? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.linkTextBold}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.infoLogoBox}
            >
              <Text style={styles.infoLogoText}>KA</Text>
            </LinearGradient>
            <View>
              <Text style={styles.infoTitle}>KCET Agriculture Practical</Text>
              <Text style={styles.infoSubtitle}>Learn faster. Practice smarter.</Text>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoGridItem}>
              <Text style={styles.infoGridTitle}>Mock Tests</Text>
              <Text style={styles.infoGridDesc}>Specimen-based timed practice.</Text>
            </View>
            <View style={styles.infoGridItem}>
              <Text style={styles.infoGridTitle}>Progress</Text>
              <Text style={styles.infoGridDesc}>Track accuracy and scores.</Text>
            </View>
            <View style={styles.infoGridItem}>
              <Text style={styles.infoGridTitle}>Videos & PDFs</Text>
              <Text style={styles.infoGridDesc}>Concepts + identification.</Text>
            </View>
            <View style={styles.infoGridItem}>
              <Text style={styles.infoGridTitle}>Admin Panel</Text>
              <Text style={styles.infoGridDesc}>Manage content and results.</Text>
            </View>
          </View>

          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>Tip</Text>
            <Text style={styles.tipText}>Use the timed mock test daily to improve specimen identification speed.</Text>
          </View>
        </View>
      </ScrollView>
      <PublicFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16, paddingVertical: 32, gap: 24 },
  card: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 15, color: '#475569', marginTop: 6, fontWeight: '500' },
  badgeSuccess: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  badgeSuccessText: { color: '#059669', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  tabs: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 16, backgroundColor: '#f1f5f9' },
  tabActiveStudent: { backgroundColor: '#10b981' },
  tabActiveAdmin: { backgroundColor: '#0ea5e9' },
  tabText: { color: '#64748b', fontWeight: '800', fontSize: 15 },
  tabTextActive: { color: '#fff' },
  form: { gap: 18 },
  formGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  inputWrapper: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 14, zIndex: 10, color: '#94a3b8', fontSize: 16 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingLeft: 42, paddingRight: 16, paddingVertical: 14, fontSize: 15, color: '#0f172a' },
  showBtn: { position: 'absolute', right: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
  showBtnText: { fontSize: 13, fontWeight: '800', color: '#475569' },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkText: { fontSize: 14, fontWeight: '700', color: '#10b981' },
  linkTextBold: { fontSize: 14, fontWeight: '800', color: '#10b981' },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 14 },
  errorText: { color: '#b91c1c', fontSize: 14, fontWeight: '600' },
  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  sentText: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  footerLinks: { flexDirection: 'row', marginTop: 28, justifyContent: 'center' },
  footerText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  oauthContainer: { marginTop: 20, gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { marginHorizontal: 10, color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  oauthBtnGoogle: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  oauthBtnTextGoogle: { color: '#334155', fontSize: 15, fontWeight: '700' },
  oauthBtnFacebook: { backgroundColor: '#1877F2', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  oauthBtnTextFacebook: { color: '#fff', fontSize: 15, fontWeight: '700' },
  infoCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  infoLogoBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  infoLogoText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  infoTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  infoSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2, fontWeight: '500' },
  infoGrid: { marginTop: 28, gap: 12 },
  infoGridItem: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16 },
  infoGridTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  infoGridDesc: { fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: '500' },
  tipBox: { marginTop: 28, backgroundColor: '#f0fdf4', borderRadius: 16, padding: 20 },
  tipTitle: { fontSize: 15, fontWeight: '900', color: '#059669' },
  tipText: { fontSize: 14, color: '#1e293b', marginTop: 6, lineHeight: 20, fontWeight: '500' },
});
