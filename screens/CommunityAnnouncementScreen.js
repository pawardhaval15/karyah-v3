import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { createAnnouncement, fetchAnnouncements } from '../utils/community';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CommunityAnnouncementScreen({ navigation, route }) {
    const { communityId, communityName } = route.params;
    const theme = useTheme();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        const getAnnouncements = async () => {
            setLoading(true);
            try {
                const token = await AsyncStorage.getItem('token');
                const data = await fetchAnnouncements(communityId, token);
                setAnnouncements(data);
            } catch (err) {
                // handle fetch error
            } finally {
                setLoading(false);
            }
        };
        getAnnouncements();
    }, [communityId]);

    const handleSendAnnouncement = async () => {
        if (!newAnnouncement.trim()) return;
        setSending(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const announcement = await createAnnouncement(communityId, newAnnouncement.trim(), token);
            setAnnouncements(prev => [{ ...announcement }, ...prev]);
            setNewAnnouncement('');
            inputRef.current && inputRef.current.blur();
        } catch (err) {
            // handle error
        } finally {
            setSending(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{communityName || 'Announcement'}</Text>
                </TouchableOpacity>
            </View>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <FlatList
                    data={announcements}
                    keyExtractor={(item) => item.id?.toString()}
                    refreshing={loading}
                    onRefresh={async () => {
                        const token = await AsyncStorage.getItem('token');
                        const data = await fetchAnnouncements(communityId, token);
                        setAnnouncements(data);
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ color: theme.secondaryText, textAlign: 'center' }}>No announcements yet</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.announcementCard, { backgroundColor: theme.card }]}>
                            <Text style={{ color: theme.text, fontSize: 15 }}>{item.message}</Text>
                            <Text style={{ color: theme.secondaryText, fontSize: 11 }}>{item.createdAt?.split('T')[0]}</Text>
                        </View>
                    )}
                />
                <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
                    <TextInput
                        ref={inputRef}
                        style={[styles.textInput, { backgroundColor: theme.background, color: theme.text }]}
                        placeholder="Type your announcement..."
                        placeholderTextColor={theme.secondaryText}
                        value={newAnnouncement}
                        onChangeText={setNewAnnouncement}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: theme.primary, opacity: newAnnouncement.trim() && !sending ? 1 : 0.5 }]}
                        disabled={!newAnnouncement.trim() || sending}
                        onPress={handleSendAnnouncement}
                    >
                        {sending
                            ? <ActivityIndicator color="#fff" />
                            : <Feather name="send" size={18} color="#fff" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 16 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    headerTitle: { fontSize: 18, fontWeight: '600', marginLeft: 8 },
    announcementCard: { borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: '#eee' },
    textInput: { flex: 1, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginRight: 12 },
    sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }
});
