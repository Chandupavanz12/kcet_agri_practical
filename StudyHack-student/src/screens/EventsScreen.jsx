import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function EventsScreen() {
    const { token } = useAuth();
    const [deadlines, setDeadlines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadDeadlines = async () => {
        try {
            setError('');
            setLoading(true);
            const res = await apiFetch('/api/counseling/deadlines', { token });
            setDeadlines(res?.deadlines || []);
        } catch (e) {
            setError(e?.message || 'Failed to load upcoming events');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDeadlines();
    }, [token]);

    const getRemainingText = (dateStr) => {
        const diff = new Date(dateStr) - new Date();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        if (days > 0) return `${days} Days Remaining`;
        if (hours > 0) return `${hours} Hours Remaining`;
        return 'Closing Soon';
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>📅 Upcoming Events</Text>
                <Text style={styles.headerSubtitle}>Important KEA Deadlines</Text>
            </View>

            {!!error && (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#f59e0b" />
                </View>
            ) : (
                <FlatList
                    data={deadlines}
                    keyExtractor={item => item._id}
                    style={styles.list}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No upcoming deadlines found.</Text>
                    }
                    renderItem={({ item: d }) => (
                        <View style={styles.card}>
                            <View style={styles.dateBox}>
                                <Text style={styles.dateMonth}>{new Date(d.date).toLocaleString('default', { month: 'short' })}</Text>
                                <Text style={styles.dateDay}>{new Date(d.date).getDate()}</Text>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.title}>{d.title}</Text>
                                <Text style={styles.remainingText}>{getRemainingText(d.date)}</Text>
                            </View>
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fcfaf8' },
    header: { padding: 20, backgroundColor: '#f59e0b', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 14, color: '#fef3c7', marginTop: 4 },
    errorBox: { margin: 16, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 8, padding: 12 },
    errorText: { color: '#b91c1c', fontSize: 14 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { flex: 1, marginTop: 8 },
    emptyText: { textAlign: 'center', fontSize: 15, color: '#64748b', marginTop: 32 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, alignItems: 'center' },
    dateBox: { backgroundColor: '#fef3c7', borderRadius: 12, width: 60, height: 60, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    dateMonth: { fontSize: 13, color: '#b45309', fontWeight: 'bold', textTransform: 'uppercase' },
    dateDay: { fontSize: 22, color: '#92400e', fontWeight: 'bold' },
    cardContent: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
    remainingText: { fontSize: 13, color: '#d97706', fontWeight: '600' },
});
