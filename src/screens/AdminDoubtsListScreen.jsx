import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDoubtsListScreen() {
    const { token } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const fetchStudents = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiFetch('/api/doubts/admin/students', { token });
            setStudents(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStudents();
        const unsubscribe = router.addListener?.('focus', () => fetchStudents());
        const interval = setInterval(fetchStudents, 30000); // Polling every 30s
        return () => {
            clearInterval(interval);
            if (unsubscribe) unsubscribe();
        };
    }, [fetchStudents, router]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStudents();
    };

    const renderItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.studentCard}
                onPress={() => router.push(`/admin/doubts/${item.studentId}?name=${encodeURIComponent(item.studentName)}`)}
                activeOpacity={0.7}
            >
                <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>{item.studentName?.charAt(0).toUpperCase() || 'S'}</Text>
                </View>
                <View style={styles.cardContent}>
                    <View style={styles.topRow}>
                        <Text style={styles.studentName}>{item.studentName}</Text>
                        <Text style={styles.timeText}>
                            {new Date(item.lastMessageDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <Text style={styles.subtitleText} numberOfLines={1}>Student ID: {item.studentId}</Text>
                </View>
                {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Student Doubts</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                </View>
            ) : (
                <FlatList
                    data={students}
                    keyExtractor={item => String(item.studentId)}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No Doubts Yet</Text>
                            <Text style={styles.emptyText}>When students send their doubts, they will appear here.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5
    },
    backBtn: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    listContent: { padding: 16, paddingBottom: 32 },
    studentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2
    },
    avatarBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    cardContent: { flex: 1, marginLeft: 12 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    studentName: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
    timeText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    subtitleText: { fontSize: 13, color: '#64748b' },
    unreadBadge: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 24,
        alignItems: 'center',
        justifyContent: 'center'
    },
    unreadText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#334155', marginTop: 16 },
    emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 22 }
});
