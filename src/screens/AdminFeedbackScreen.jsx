import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function AdminFeedbackScreen() {
  const { token } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [submittingReply, setSubmittingReply] = useState(false);

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

  const submitReply = async (f) => {
    if (!replyText.trim()) return Alert.alert('Error', 'Please enter a reply message.');
    try {
      setSubmittingReply(true);
      await apiFetch(`/api/admin/feedback/reply/${f.id}`, {
        token,
        method: 'POST',
        body: { replyText }
      });
      Alert.alert('Success', 'In-App reply sent successfully.');
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      Alert.alert('Error', 'Failed to send reply: ' + err.message);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Feedback', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await apiFetch(`/api/admin/feedback/${id}`, { token, method: 'DELETE' });
            fetchFeedbacks();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete: ' + err.message);
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { flex: 1 }]}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>💬 Student Feedbacks</Text>
          <Text style={styles.heroDesc}>View and manage messages sent from the student dashboard.</Text>
        </View>

        {!!message && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{message}</Text>
          </View>
        )}

        <View style={[styles.card, { flex: 1 }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>All Messages</Text>
          </View>
          <View style={[styles.cardBody, { flex: 1, padding: 0 }]}>
            {loading ? (
              <ActivityIndicator size="large" color="#4f46e5" style={{ padding: 20 }} />
            ) : feedbacks.length === 0 ? (
              <Text style={styles.emptyText}>No feedbacks or messages available.</Text>
            ) : (
              <FlatList
                data={feedbacks}
                keyExtractor={f => f.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                windowSize={5}
                maxToRenderPerBatch={10}
                initialNumToRender={10}
                renderItem={({ item: f }) => (
                  <View style={styles.feedbackItem}>
                    <View style={styles.fHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fName}>{f.user_name}</Text>
                        <Text style={styles.fEmail}>{f.user_email}</Text>
                        <Text style={styles.fDate}>{new Date(f.created_at).toLocaleString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity style={styles.btnReply} onPress={() => setReplyingTo(replyingTo === f.id ? null : f.id)}>
                          <Text style={styles.btnReplyText}>{replyingTo === f.id ? 'Cancel' : 'Reply'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(f.id)}>
                          <Text style={styles.btnDeleteText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.msgBox}>
                      <Text style={styles.msgText}>{f.message}</Text>
                    </View>

                    {replyingTo === f.id && (
                      <View style={styles.replyBox}>
                        <TextInput
                          style={styles.replyInput}
                          placeholder="Type your reply here..."
                          multiline
                          value={replyText}
                          onChangeText={setReplyText}
                        />
                        <TouchableOpacity
                          style={styles.btnReplySubmit}
                          onPress={() => submitReply(f)}
                          disabled={submittingReply}
                        >
                          <Text style={styles.btnReplySubmitText}>{submittingReply ? 'Sending...' : 'Send Reply'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </View>
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
  btnReply: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  btnReplyText: { color: '#2563eb', fontSize: 12, fontWeight: 'bold' },
  replyBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  replyInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 14, color: '#334155', minHeight: 80, textAlignVertical: 'top', backgroundColor: '#fff', marginBottom: 8 },
  btnReplySubmit: { backgroundColor: '#2563eb', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnReplySubmitText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
