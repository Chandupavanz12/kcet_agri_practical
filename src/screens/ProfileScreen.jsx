import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function ProfileScreen() {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch('/api/student/profile', { token });
        if (!alive) return;
        setProfile(res.user);
        setName(res.user.name);
      } catch (err) {
        if (!alive) return;
        setMessage(err?.message || 'Failed to load profile');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  const handleSave = async () => {
    try {
      await apiFetch('/api/student/profile', {
        token, method: 'PUT', body: { name },
      });
      setEditMode(false);
      setMessage('Profile updated');
      setProfile({ ...profile, name });
    } catch (err) {
      setMessage(err?.message || 'Failed to update profile');
    }
  };

  const handleSendOtp = async () => {
    try {
      const res = await apiFetch('/api/student/password-reset/request', {
        token, method: 'POST', body: { email: profile?.email }
      });
      setMessage(res.message || 'OTP sent');
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
        token, method: 'POST', body: { email: profile?.email, otp, newPassword },
      });
      if (res?.reset) {
        setMessage('Password updated');
        setOtp(''); setNewPassword(''); setConfirmPassword(''); setOtpSent(false);
      } else {
        setMessage(res?.message || 'Failed to reset password');
      }
    } catch (err) {
      setMessage(err?.message || 'Failed to reset password');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {!!message && (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Profile</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Name</Text>
              {editMode ? (
                <TextInput style={styles.input} value={name} onChangeText={setName} />
              ) : (
                <Text style={styles.valueText}>{profile?.name}</Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.valueText}>{profile?.email}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Role</Text>
              <Text style={styles.valueTextRole}>{profile?.role}</Text>
            </View>

            <View style={styles.actionRow}>
              {editMode ? (
                <>
                  <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
                    <Text style={styles.btnPrimaryText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnGhost} onPress={() => { setEditMode(false); setName(profile?.name); }}>
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.btnPrimary} onPress={() => setEditMode(true)}>
                  <Text style={styles.btnPrimaryText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Password Reset Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Password Reset</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.helperText}>Request an OTP to your registered email, then verify the OTP to set a new password.</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>Registered email: <Text style={{ fontWeight: 'bold' }}>{profile?.email || user?.email || '-'}</Text></Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleSendOtp}>
                <Text style={styles.btnPrimaryText}>{otpSent ? 'Resend OTP' : 'Send OTP'}</Text>
              </TouchableOpacity>
              {otpSent && (
                <TouchableOpacity style={styles.btnGhost} onPress={() => { setOtpSent(false); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            {otpSent && (
              <View style={styles.otpForm}>
                <TextInput style={styles.input} placeholder="Enter OTP" value={otp} onChangeText={setOtp} keyboardType="numeric" />
                <TextInput style={styles.input} placeholder="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
                <TextInput style={styles.input} placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
                <TouchableOpacity style={[styles.btnPrimary, { marginTop: 8 }]} onPress={handleResetWithOtp}>
                  <Text style={styles.btnPrimaryText}>Verify OTP & Reset Password</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f1f5f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, gap: 16 },
  messageBox: { backgroundColor: '#eff6ff', borderColor: '#e2e8f0', borderWidth: 1, padding: 12, borderRadius: 8 },
  messageText: { color: '#334155', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  cardBody: { padding: 16, gap: 16 },
  fieldGroup: { gap: 4 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155' },
  valueText: { fontSize: 14, color: '#0f172a' },
  valueTextRole: { fontSize: 14, color: '#0f172a', textTransform: 'capitalize' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff' },
  actionRow: { flexDirection: 'row', gap: 12 },
  btnPrimary: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnGhost: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnGhostText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  helperText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  infoBox: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1, borderRadius: 8, padding: 12 },
  infoBoxText: { fontSize: 14, color: '#334155' },
  otpForm: { gap: 12, marginTop: 8 },
});
