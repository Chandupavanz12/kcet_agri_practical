import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function AdminFeedbackScreen() {
  const { token } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/feedback', { token });
      setFeedbacks(res?.feedbacks || []);
    } catch (err) {
      setMessage(err?.message || 'Failed to fetch feedbacks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [token]);

  const handleDelete = (id) => {
    Alert.alert('Delete Feedback', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiFetch(`/api/admin/feedback/${id}`, { token, method: 'DELETE' });
          fetchFeedbacks();
        } catch (err) {
          Alert.alert('Error', 'Failed to delete: ' + err.message);
        }
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>💬 Student Feedbacks</Text>
          <Text style={styles.heroDesc}>View and manage messages sent from the student dashboard.</Text>
        </View>

        {!!message && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{message}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>All Messages</Text>
          </View>
          <View style={styles.cardBody}>
            {loading ? (
              <ActivityIndicator size="large" color="#4f46e5" />
            ) : feedbacks.length === 0 ? (
              <Text style={styles.emptyText}>No feedbacks or messages available.</Text>
            ) : (
              <View style={styles.list}>
                {feedbacks.map((f) => (
                  <View key={f.id} style={styles.feedbackItem}>
                    <View style={styles.fHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fName}>{f.user_name}</Text>
                        <Text style={styles.fEmail}>{f.user_email}</Text>
                        <Text style={styles.fDate}>{new Date(f.created_at).toLocaleString()}</Text>
                      </View>
                      <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(f.id)}>
                        <Text style={styles.btnDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.msgBox}>
                      <Text style={styles.msgText}>{f.message}</Text>
                    </View>
                  </View>
                ))}
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
  container: { padding: 16, gap: 16, paddingBottom: 40 },
  heroCard: { backgroundColor: '#6366f1', borderRadius: 16, padding: 24 },
  heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  heroDesc: { fontSize: 14, color: '#e0e7ff' },
  errorBox: { backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, padding: 12, borderRadius: 8 },
  errorText: { color: '#b91c1c', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  cardHeader: { padding: 16, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  cardBody: { padding: 16 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, paddingVertical: 20 },
  list: { gap: 16 },
  feedbackItem: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 16 },
  fHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  fName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  fEmail: { fontSize: 14, color: '#4f46e5', fontWeight: '500' },
  fDate: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  btnDelete: { backgroundColor: '#fef2f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca' },
  btnDeleteText: { color: '#dc2626', fontSize: 12, fontWeight: 'bold' },
  msgBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  msgText: { fontSize: 14, color: '#334155', lineHeight: 20 },
});
