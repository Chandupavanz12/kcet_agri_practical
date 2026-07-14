import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function AdminSettingsScreen() {
  const { token } = useAuth();
  const [settings, setSettings] = useState({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/admin/settings', { token });
        setSettings(res.settings || {});
      } catch (err) {
        setMessage(err?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleChange = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await apiFetch('/api/admin/settings', {
        token,
        method: 'PUT',
        body: settings,
      });
      Alert.alert('Success', 'Settings saved');
      setMessage('Settings saved');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save');
      setMessage(err?.message || 'Failed to save');
    }
  };

  const fields = [
    { key: 'videosEnabled', label: 'Videos' },
    { key: 'testsEnabled', label: 'Tests' },
    { key: 'pdfsEnabled', label: 'PDFs' },
    { key: 'pyqsEnabled', label: 'PYQs' },
    { key: 'notificationsEnabled', label: 'Notifications' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Feature Settings</Text>
          </View>
          <View style={styles.cardBody}>
            {!!message && (
              <View style={styles.msgBox}>
                <Text style={styles.msgText}>{message}</Text>
              </View>
            )}

            {loading ? (
              <Text style={styles.loadingText}>Loading...</Text>
            ) : (
              <View style={styles.form}>
                {fields.map((field) => (
                  <View key={field.key} style={styles.switchRow}>
                    <Text style={styles.label}>{field.label}</Text>
                    <TouchableOpacity
                      style={[styles.checkbox, settings[field.key] && styles.checkboxActive]}
                      onPress={() => handleChange(field.key, !settings[field.key])}
                    >
                      {settings[field.key] && <Text style={styles.checkboxTick}>✓</Text>}
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
                  <Text style={styles.btnPrimaryText}>Save Settings</Text>
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
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  cardBody: { padding: 16 },
  msgBox: { padding: 12, backgroundColor: '#eff6ff', borderRadius: 8, marginBottom: 16 },
  msgText: { color: '#1e40af', fontSize: 14 },
  loadingText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  form: { gap: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, color: '#334155', fontWeight: '500' },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  checkboxTick: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnPrimary: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
