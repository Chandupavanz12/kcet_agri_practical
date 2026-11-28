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
    safeArea: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        padding: 20,
        backgroundColor: '#0f172a',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOpacity: 0.14,
        shadowRadius: 12,
        elevation: 5,
    },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: '#cbd5e1', marginTop: 4, fontWeight: '500' },
    errorBox: { margin: 16, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 12, padding: 12 },
    errorText: { color: '#b91c1c', fontSize: 14 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { flex: 1, marginTop: 8 },
    emptyText: { textAlign: 'center', fontSize: 15, color: '#64748b', marginTop: 32 },
    card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, alignItems: 'center' },
    dateBox: { backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 14, width: 62, height: 62, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    dateMonth: { fontSize: 12, color: '#059669', fontWeight: '800', textTransform: 'uppercase' },
    dateDay: { fontSize: 22, color: '#065f46', fontWeight: '900' },
    cardContent: { flex: 1 },
    title: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
    remainingText: { fontSize: 12.5, color: '#059669', fontWeight: '700' },
});
