import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function StudentFeedbackScreen() {
    const { token } = useAuth();
    const router = useRouter();

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!message.trim()) {
            return Alert.alert('Error', 'Please enter your feedback message.');
        }

        try {
            setLoading(true);
            await apiFetch('/api/student/feedback', {
                token,
                method: 'POST',
                body: { message },
            });

            Alert.alert('Success', 'Feedback submitted successfully! Thank you.');
            setMessage('');
            router.push('/student/dashboard');
        } catch (err) {
            Alert.alert('Error', err?.message || 'Failed to submit feedback');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.heroCard}>
                    <Text style={styles.heroTitle}>💬 Submit Feedback</Text>
                    <Text style={styles.heroDesc}>Have a suggestion, question, or issue? Let us know!</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Your Message</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Type your feedback here..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        numberOfLines={6}
                        value={message}
                        onChangeText={setMessage}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" style={{ paddingVertical: 2 }} />
                        ) : (
                            <Text style={styles.submitBtnText}>Send Feedback</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8fafc' },
    container: { padding: 16, gap: 18 },
    heroCard: {
        backgroundColor: '#0f172a',
        borderRadius: 24,
        padding: 22,
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 12,
        elevation: 5,
    },
    heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 6 },
    heroDesc: { fontSize: 13.5, color: '#cbd5e1', lineHeight: 20 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 2,
    },
    label: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
    input: {
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        color: '#0f172a',
        backgroundColor: '#f8fafc',
        minHeight: 130,
        marginBottom: 18,
    },
    submitBtn: {
        backgroundColor: '#059669',
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        shadowColor: '#059669',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
    },
    submitBtnDisabled: {
        backgroundColor: '#a7f3d0',
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 15.5,
        fontWeight: '800',
    },
});
