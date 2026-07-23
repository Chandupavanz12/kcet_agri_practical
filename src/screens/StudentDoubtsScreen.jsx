import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function StudentDoubtsScreen() {
    const { token, user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [inputText, setInputText] = useState('');
    const [selectedAttachment, setSelectedAttachment] = useState(null);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const flatListRef = useRef(null);
    const router = useRouter();

    const fetchMessages = useCallback(async () => {
        try {
            const data = await apiFetch('/api/doubts/student', { token });
            setMessages(data);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to fetch doubt messages');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 10000); // polling every 10s
        return () => clearInterval(interval);
    }, [fetchMessages]);

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.5,
        });

        if (!result.canceled && result.assets?.[0]) {
            setSelectedAttachment(result.assets[0]);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() && !selectedAttachment) return;
        try {
            setSending(true);
            let attachment_url = null;
            let attachment_type = null;

            if (selectedAttachment) {
                const base64 = await FileSystem.readAsStringAsync(selectedAttachment.uri, { encoding: 'base64' });
                const mimeType = selectedAttachment.mimeType || 'image/jpeg';
                attachment_url = `data:${mimeType};base64,${base64}`;
                attachment_type = 'image';
            }

            const newMsg = await apiFetch('/api/doubts/student', {
                method: 'POST',
                token,
                body: { message: inputText.trim(), attachment_url, attachment_type }
            });
            setMessages(prev => [...prev, newMsg]);
            setInputText('');
            setSelectedAttachment(null);
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
                            await apiFetch('/api/doubts/student/clear', {
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
        const isMe = item.sender_type === 'student';
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
                    isMe ? styles.messageRowMe : styles.messageRowAdmin,
                    isSelected && styles.messageRowSelected
                ]}
            >
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleAdmin]}>
                    {item.attachment_type === 'image' && item.attachment_url && (
                        <Image source={{ uri: item.attachment_url }} style={styles.attachmentImg} resizeMode="cover" />
                    )}
                    {!!item.message && (
                        <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextAdmin]}>
                            {item.message}
                        </Text>
                    )}
                    <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextAdmin]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#10b981" />
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
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#0f172a" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Doubt Clarification</Text>
                        <View style={{ width: 24 }} />
                    </>
                )}
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
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
                            <Text style={styles.emptyText}>No messages yet. Send your doubts here and admins will reply.</Text>
                        </View>
                    }
                />
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
                        <Ionicons name="image" size={24} color="#64748b" />
                    </TouchableOpacity>
                    <View style={styles.inputWrapper}>
                        {selectedAttachment && (
                            <View style={styles.previewBox}>
                                <Image source={{ uri: selectedAttachment.uri }} style={styles.previewImg} />
                                <TouchableOpacity style={styles.previewClose} onPress={() => setSelectedAttachment(null)}>
                                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        )}
                        <TextInput
                            style={styles.input}
                            placeholder="Type your message..."
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={1000}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.sendButton, (!inputText.trim() && !selectedAttachment) && { opacity: 0.5 }]}
                        onPress={handleSend}
                        disabled={(!inputText.trim() && !selectedAttachment) || sending}
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
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    headerActionText: { fontSize: 16, fontWeight: '600', color: '#10b981' },
    keyboardAvoid: { flex: 1 },
    listContent: { padding: 16, paddingBottom: 24, flexGrow: 1 },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
    messageRow: { marginBottom: 12, flexDirection: 'row' },
    messageRowMe: { justifyContent: 'flex-end' },
    messageRowAdmin: { justifyContent: 'flex-start' },
    messageRowSelected: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20
    },
    bubbleMe: {
        backgroundColor: '#10b981',
        borderBottomRightRadius: 4
    },
    bubbleAdmin: {
        backgroundColor: '#ffffff',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
    },
    attachmentImg: {
        width: 200,
        height: 200,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#e2e8f0'
    },
    messageText: { fontSize: 15, lineHeight: 22 },
    messageTextMe: { color: '#fff' },
    messageTextAdmin: { color: '#334155' },
    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    timeTextMe: { color: 'rgba(255,255,255,0.7)' },
    timeTextAdmin: { color: '#94a3b8' },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        alignItems: 'flex-end',
        paddingBottom: Platform.OS === 'ios' ? 32 : 16
    },
    attachButton: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
        marginBottom: 2
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: '#f1f5f9',
        borderRadius: 22,
        marginRight: 12,
        overflow: 'hidden'
    },
    previewBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0'
    },
    previewImg: { width: 50, height: 50, borderRadius: 8 },
    previewClose: { position: 'absolute', top: 4, right: 4, zIndex: 1 },
    input: {
        minHeight: 44,
        maxHeight: 120,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
        fontSize: 15,
        color: '#0f172a'
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center'
    }
});
