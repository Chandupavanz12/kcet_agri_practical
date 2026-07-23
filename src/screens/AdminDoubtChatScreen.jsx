import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDoubtChatScreen() {
    const { token, user } = useAuth();
    const { studentId, name } = useLocalSearchParams();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [inputText, setInputText] = useState('');

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const flatListRef = useRef(null);
    const router = useRouter();

    const fetchMessages = useCallback(async () => {
        try {
            const data = await apiFetch(`/api/doubts/admin/${studentId}`, { token });
            setMessages(data);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to fetch doubt messages');
        } finally {
            setLoading(false);
        }
    }, [studentId, token]);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 10000); // polling every 10s
        return () => clearInterval(interval);
    }, [fetchMessages]);

    const handleSend = async () => {
        if (!inputText.trim()) return;
        try {
            setSending(true);
            const newMsg = await apiFetch(`/api/doubts/admin/${studentId}/reply`, {
                method: 'POST',
                token,
                body: { message: inputText.trim(), studentName: name }
            });
            setMessages(prev => [...prev, newMsg]);
            setInputText('');
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (err) {
            Alert.alert('Error', 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleLongPress = (id) => {
        setSelectionMode(true);
        toggleSelection(id);
    };

    const toggleSelection = (id) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
            if (newSelection.size === 0) setSelectionMode(false);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };

    const clearSelected = async () => {
        if (selectedIds.size === 0) return;
        Alert.alert(
            'Clear History',
            `Are you sure you want to delete ${selectedIds.size} selected message(s)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiFetch(`/api/doubts/admin/${studentId}/clear`, {
                                method: 'POST',
                                token,
                                body: { messageIds: Array.from(selectedIds) }
                            });
                            setMessages(prev => prev.filter(m => !selectedIds.has(m._id)));
                            setSelectionMode(false);
                            setSelectedIds(new Set());
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete messages');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => {
        const isAdmin = item.sender_type === 'admin';
        const isSelected = selectedIds.has(item._id);

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onLongPress={() => handleLongPress(item._id)}
                onPress={() => {
                    if (selectionMode) toggleSelection(item._id);
                }}
                style={[
                    styles.messageRow,
                    isAdmin ? styles.messageRowMe : styles.messageRowStudent,
                    isSelected && styles.messageRowSelected
                ]}
            >
                <View style={[styles.bubble, isAdmin ? styles.bubbleMe : styles.bubbleStudent]}>
                    <Text style={[styles.messageText, isAdmin ? styles.messageTextMe : styles.messageTextStudent]}>
                        {item.message}
                    </Text>
                    <Text style={[styles.timeText, isAdmin ? styles.timeTextMe : styles.timeTextStudent]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                {selectionMode ? (
                    <>
                        <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedIds(new Set()); }}>
                            <Text style={styles.headerActionText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{selectedIds.size} Selected</Text>
                        <TouchableOpacity onPress={clearSelected}>
                            <Text style={[styles.headerActionText, { color: '#ef4444' }]}>Delete</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#0f172a" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle} numberOfLines={1}>Chat with {name || 'Student'}</Text>
                        <View style={{ width: 40 }} />
                    </>
                )}
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Text style={styles.emptyText}>No messages yet.</Text>
                        </View>
                    }
                />
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a reply..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={20} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
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
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', flex: 1, textAlign: 'center' },
    headerActionText: { fontSize: 16, fontWeight: '600', color: '#3b82f6' },
    keyboardAvoid: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
    messageRow: { marginBottom: 12, flexDirection: 'row' },
    messageRowMe: { justifyContent: 'flex-end' },
    messageRowStudent: { justifyContent: 'flex-start' },
    messageRowSelected: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20
    },
    bubbleMe: {
        backgroundColor: '#3b82f6',
        borderBottomRightRadius: 4
    },
    bubbleStudent: {
        backgroundColor: '#ffffff',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
    },
    messageText: { fontSize: 15, lineHeight: 22 },
    messageTextMe: { color: '#fff' },
    messageTextStudent: { color: '#334155' },
    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    timeTextMe: { color: 'rgba(255,255,255,0.7)' },
    timeTextStudent: { color: '#94a3b8' },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        alignItems: 'flex-end',
        paddingBottom: Platform.OS === 'ios' ? 32 : 12
    },
    input: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        minHeight: 44,
        maxHeight: 120,
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 15,
        marginRight: 12,
        color: '#0f172a'
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
