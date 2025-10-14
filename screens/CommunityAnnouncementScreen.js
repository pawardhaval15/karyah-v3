import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
    Dimensions,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { createAnnouncement, fetchAnnouncements, fetchUserDetails, } from '../utils/community';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function CommunityAnnouncementScreen({ navigation, route }) {
    const { communityId, communityName } = route.params;
    const theme = useTheme();
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const inputRef = useRef(null);
    const intervalRef = useRef(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [userRole, setUserRole] = useState('Member');

    const fetchAndSetAnnouncements = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            const data = await fetchAnnouncements(communityId, token);
            setAnnouncements(data);
        } catch (err) {
            // Optional error handling
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        const fetchUserData = async () => {
            const userId = await AsyncStorage.getItem('userId');
            setCurrentUserId(userId);

            // Always get fresh user details for accuracy
            let userDetailsJson = await AsyncStorage.getItem('userDetails');
            if (!userDetailsJson) {
                // Optionally, call your fetchUserDetails() utility and save to AsyncStorage
                const freshUser = await fetchUserDetails(); // must be implemented to fetch from backend
                userDetailsJson = JSON.stringify(freshUser);
                await AsyncStorage.setItem('userDetails', userDetailsJson);
            }

            const userDetails = JSON.parse(userDetailsJson);
            let role = 'Member';
            if (
                userDetails.OrganizationUsers &&
                Array.isArray(userDetails.OrganizationUsers) &&
                userDetails.OrganizationUsers.length > 0
            ) {
                // Choose organization context (normally 1, but could be more)
                const activeOrgUser = userDetails.OrganizationUsers.find(
                    (ou) => ou.status === 'Active'
                );
                if (activeOrgUser) {
                    role = activeOrgUser.role || 'Member';
                }
            }
            setUserRole(role);
        };
        fetchUserData();
    }, []);
    useEffect(() => {
        // Load user ID from AsyncStorage (adjust if you use another method)
        AsyncStorage.getItem('userId').then(setCurrentUserId);
    }, []);
    useEffect(() => {
        setLoading(true);
        fetchAndSetAnnouncements();

        // Auto-refresh announcements every 30 seconds
        intervalRef.current = setInterval(fetchAndSetAnnouncements, 30000);

        return () => {
            clearInterval(intervalRef.current);
        };
    }, [communityId]);

    const handleSendAnnouncement = async () => {
        if (!newAnnouncement.trim()) return;
        setSending(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const announcement = await createAnnouncement(communityId, newAnnouncement.trim(), token);
            setAnnouncements(prev => [announcement, ...prev]);
            setNewAnnouncement('');
            inputRef.current && inputRef.current.blur();
        } catch (err) {
            // Optional error handling
        } finally {
            setSending(false);
        }
    };

    const renderItem = ({ item }) => {
        const { announcementCreator, message, createdAt, createdBy } = item;
        const isSender = currentUserId && (createdBy === Number(currentUserId)); // Matches your own
        const senderName = isSender ? 'You' : (announcementCreator?.name || 'Unknown');
        const bubbleColor = isSender ? '#dcf8c6' : theme.card;
        const align = isSender ? 'flex-end' : 'flex-start';
        const borderRadii = isSender
            ? { borderTopLeftRadius: 18, borderTopRightRadius: 6 }
            : { borderTopRightRadius: 18, borderTopLeftRadius: 6 };
        const dateObj = new Date(createdAt);
        const formattedTime = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        return (
            <View style={{ flexDirection: 'row', justifyContent: align, marginVertical: 2 }}>
                <View style={[
                    styles.bubble,
                    {
                        backgroundColor: bubbleColor,
                        alignSelf: align,
                        ...borderRadii,
                    },
                ]}>
                    {!isSender && (
                        <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 13, marginBottom: 3 }}>{senderName}</Text>
                    )}
                    <Text style={{ color: theme.text, fontSize: 16 }}>{message}</Text>
                    <Text style={{ color: theme.secondaryText, fontSize: 11, marginTop: 4, alignSelf: 'flex-end' }}>{formattedTime}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back-ios" size={22} color={theme.text} />
                    <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1} ellipsizeMode="tail">
                        {communityName || 'Announcements'}
                    </Text>
                </TouchableOpacity>
            </View>
            <KeyboardAvoidingView
                style={styles.flexGrow}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                <FlatList
                    data={[...announcements].reverse()} // latest messages at bottom
                    keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                    refreshing={loading}
                    onRefresh={fetchAndSetAnnouncements}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={{ color: theme.secondaryText, fontSize: isTablet ? 16 : 14, textAlign: 'center' }}>
                                No announcements yet
                            </Text>
                        </View>
                    }
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: isTablet ? 24 : 14 }}
                />

                {userRole === "Owner" ? (
                    <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                        <TextInput
                            ref={inputRef}
                            style={[styles.textInput, { backgroundColor: theme.background, color: theme.text, fontSize: isTablet ? 18 : 16 }]}
                            placeholder="Type your announcement..."
                            placeholderTextColor={theme.secondaryText}
                            value={newAnnouncement}
                            onChangeText={setNewAnnouncement}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.sendButton, { backgroundColor: theme.primary, opacity: newAnnouncement.trim() && !sending ? 1 : 0.5 }]}
                            disabled={!newAnnouncement.trim() || sending}
                            onPress={handleSendAnnouncement}
                        >
                            {sending ? <ActivityIndicator color="#fff" /> : <Feather name="send" size={20} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border, opacity: 0.5 }]}>
                        <Text style={{ color: theme.secondaryText, textAlign: 'center', fontSize: isTablet ? 17 : 15 }}>
                            Only organization owners can send announcements.
                        </Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flexGrow: {
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: isTablet ? 24 : 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    bubble: {
        maxWidth: '85%',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 18,
        marginHorizontal: 6,
        marginBottom: 2,
        elevation: 1,
    },

    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
    },
    headerTitle: {
        fontWeight: '700',
        fontSize: isTablet ? 22 : 18,
        marginLeft: 8,
        maxWidth: '80%',
    },
    announcementCard: {
        borderRadius: 12,
        padding: isTablet ? 24 : 16,
        marginVertical: 6,
        borderWidth: 1,
    },
    senderName: {
        fontWeight: '700',
        fontSize: 15,
        marginBottom: 4,
    },
    announcementText: {
        fontWeight: '500',
        marginBottom: 6,
    },
    announcementDate: {
        fontWeight: '400',
        fontSize: 12,
    },
    emptyContainer: {
        flex: 1,
        marginTop: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginRight: 12,
        maxHeight: 140,
        textAlignVertical: 'top',
    },
    sendButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
