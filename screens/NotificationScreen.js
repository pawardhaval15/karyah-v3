import MaterialIcons from '@expo/vector-icons/MaterialIcons'; // Already imported as Icon, but for clarity
import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { acceptConnectionRequest, getPendingRequests, rejectConnectionRequest } from '../utils/connections';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../utils/notifications';
import { useTranslation } from 'react-i18next';
const NotificationScreen = ({ navigation, route }) => {
  const { defaultTab } = route.params || {};
  const [activeTab, setActiveTab] = useState(defaultTab?.toUpperCase() || 'CRITICAL');
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [message, setMessage] = useState(null);
  const messageTimeout = useRef(null);
  const messageAnim = useRef(new Animated.Value(0)).current;
  const theme = useTheme();
  const { t } = useTranslation();
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;

  const tabs = [
    t('critical'),
    t('task'),
    t('connections'),
    t('all')
  ];


  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      if (!Array.isArray(data)) throw new Error('Invalid notification data');
      setNotifications(data);
      console.log('Loaded notifications:', data);
    } catch (err) {
      // console.log('Load Error:', err.message);
    }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    try {
      const data = await getPendingRequests();
      setPendingRequests(Array.isArray(data) ? data : []);
      console.log('Loaded pending requests:', data);
      // Only log if we actually got some data
      if (data && data.length > 0) {
        // console.log('Loaded pending requests:', data.length);
      }
    } catch (err) {
      // console.log('Pending Requests Error (gracefully handled):', err.message);
      setPendingRequests([]); // Set to empty array on error
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    loadPendingRequests();
  }, [loadNotifications, loadPendingRequests]);

  // Auto-refresh notifications when screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadNotifications();
      loadPendingRequests();
    });
    return unsubscribe;
  }, [navigation, loadNotifications, loadPendingRequests]);

  const onRefresh = async () => {
    setRefreshing(true);

    // Play refresh sound
    try {
      const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/refresh.wav'));
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) sound.unloadAsync();
      });
    } catch (err) {
      console.error('Refresh sound error:', err.message);
    }

    await loadNotifications();
    await loadPendingRequests();
    setRefreshing(false);
    showMessage('Refreshed');
  };

  const handleAccept = async (connectionId) => {
    console.log('Accepting connectionId:', connectionId);
    try {
      await acceptConnectionRequest(connectionId);
      showMessage('Connection request accepted');
      setPendingRequests((prev) => prev.filter((req) => req.id !== connectionId));
      setNotifications((prev) => prev.filter((n) => n.connectionId !== connectionId));
    } catch (err) {
      showMessage('Error accepting request: ' + err.message);
    }
  };

  const handleReject = async (connectionId) => {
    console.log('Rejecting connectionId:', connectionId);
    try {
      await rejectConnectionRequest(connectionId);
      showMessage('Connection request rejected');
      setPendingRequests((prev) => prev.filter((req) => req.id !== connectionId));
      setNotifications((prev) => prev.filter((n) => n.connectionId !== connectionId));
    } catch (err) {
      showMessage('Error rejecting request: ' + err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await loadNotifications();
      showMessage('All notifications marked as read');
    } catch (err) {
      showMessage('Error marking notifications: ' + err.message);
    }
  };

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'CRITICAL':
        return notifications.filter((n) => n.type?.toLowerCase() === 'issue');

      case 'TASK':
        return notifications.filter((n) => n.type?.toLowerCase() === 'task');
      case 'CONNECTIONS':
        return notifications.filter((n) => n.type?.toLowerCase() === 'connection');
      default:
        return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();
  // Helper to show a message in the drawer
  const showMessage = (msg) => {
    setMessage(msg);
    Animated.timing(messageAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    if (messageTimeout.current) clearTimeout(messageTimeout.current);
    messageTimeout.current = setTimeout(() => {
      Animated.timing(messageAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setMessage(null));
    }, 2000);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    // For older dates, show actual date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[
          styles.backBtn,
          {
            marginLeft: isTablet ? 24 : 16,
            marginBottom: isTablet ? 24 : 18,
          },
        ]}
        onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back-ios" size={isTablet ? 18 : 16} color={theme.text} />
        <Text
          style={[
            styles.backText,
            {
              color: theme.text,
              fontSize: isTablet ? 20 : 18,
            },
          ]}>
          {t('back')}
        </Text>
      </TouchableOpacity>

      <View
        style={[
          styles.headerRow,
          {
            paddingHorizontal: isTablet ? 24 : 16,
            marginBottom: isTablet ? 4 : 0,
          },
        ]}>
        <Text
          style={[
            styles.headerTitle,
            {
              color: theme.text,
              fontSize: isTablet ? 24 : 20,
            },
          ]}>
          {t('notifications')}
        </Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={onRefresh}>
            <MaterialIcons
              name="refresh"
              size={isTablet ? 26 : 22}
              color={theme.text}
              style={{ marginRight: isTablet ? 16 : 12 }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <MaterialIcons
              name="check-circle-outline"
              size={isTablet ? 26 : 22}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.tabRow,
          {
            paddingHorizontal: isTablet ? 14 : 10,
            marginTop: isTablet ? 12 : 8,
          },
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabRow, { gap: isTablet ? 2 : 8 }]}>
          {tabs.map((tab) => {
            const isActive = activeTab.toLowerCase() === tab.toLowerCase();

            // Determine count based on tab
            const count =
              tab.toLowerCase() === 'all'
                ? notifications.length
                : tab.toLowerCase() === 'connections'
                  ? pendingRequests.length
                  : tab.toLowerCase() === 'critical'
                    ? notifications.filter((n) => n.type?.toLowerCase() === 'issue').length
                    : tab.toLowerCase() === 'task'
                      ? notifications.filter((n) => n.type?.toLowerCase() === 'task').length
                      : 0;

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  {
                    paddingVertical: isTablet ? 12 : 8,
                    paddingHorizontal: isTablet ? 22 : 17,
                    borderRadius: isTablet ? 24 : 20,
                    marginRight: isTablet ? 0 : 8,
                  },
                  isActive
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                onPress={() => setActiveTab(tab.toUpperCase())}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: isTablet ? 8 : 6,
                  }}>
                  <Text
                    style={[
                      styles.tabText,
                      {
                        fontSize: isTablet ? 16 : 14,
                      },
                      isActive
                        ? { color: '#fff', fontWeight: '600' }
                        : { color: theme.text, fontWeight: '400' },
                    ]}>
                    {tab}
                  </Text>
                  {count > 0 && (
                    <View
                      style={{
                        minWidth: isTablet ? 24 : 20,
                        height: isTablet ? 24 : 20,
                        borderRadius: isTablet ? 12 : 10,
                        backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : theme.primary + '33', // semi-transparent primary
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingHorizontal: isTablet ? 8 : 6,
                      }}>
                      <Text
                        style={{
                          color: isActive ? '#fff' : theme.primary,
                          fontSize: isTablet ? 14 : 12,
                          fontWeight: '700',
                        }}>
                        {count}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {/* Body */}
      <ScrollView
        contentContainerStyle={{
          padding: isTablet ? 24 : 16,
          paddingBottom: isTablet ? 60 : 50,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}>
        {activeTab === 'CONNECTIONS' && pendingRequests.length > 0 && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.text,
                  fontSize: isTablet ? 18 : 16,
                  marginBottom: isTablet ? 12 : 8,
                },
              ]}>
              {t('connection_requests')}
            </Text>
            {pendingRequests.map((req) => {
              const initials = req.requester?.name
                ? req.requester.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
                : 'U';
              return (
                <View
                  key={req.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.DrawerBorder || '#e0e0e0',
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: isTablet ? 18 : 14,
                      paddingHorizontal: isTablet ? 20 : 14,
                      borderRadius: isTablet ? 20 : 16,
                      marginBottom: isTablet ? 16 : 12,
                    },
                  ]}>
                  {/* Avatar */}
                  <View
                    style={{
                      width: isTablet ? 64 : 54,
                      height: isTablet ? 64 : 54,
                      borderRadius: isTablet ? 32 : 27,
                      borderWidth: 2,
                      borderColor: theme.primary,
                      backgroundColor: theme.avatarBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: isTablet ? 18 : 14,
                      overflow: 'hidden',
                    }}>
                    {req.requester?.profilePhoto ? (
                      <Image
                        source={{ uri: req.requester.profilePhoto }}
                        style={{
                          width: isTablet ? 60 : 50,
                          height: isTablet ? 60 : 50,
                          borderRadius: isTablet ? 30 : 25,
                        }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text
                        style={{
                          color: theme.primary,
                          fontWeight: '700',
                          fontSize: isTablet ? 24 : 20,
                        }}>
                        {initials}
                      </Text>
                    )}
                  </View>
                  {/* Info and actions */}
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text
                      style={[
                        styles.name,
                        {
                          color: theme.text,
                          fontWeight: '500',
                          fontSize: isTablet ? 18 : 16,
                        },
                      ]}>
                      {req.requester?.name || 'User'}
                    </Text>
                    <Text
                      style={{
                        color: theme.secondaryText,
                        fontSize: isTablet ? 15 : 13,
                        marginBottom: isTablet ? 10 : 8,
                        fontWeight: '300',
                      }}>
                      wants to connect
                    </Text>
                    <Text
                      style={{
                        color: theme.secondaryText,
                        fontSize: isTablet ? 13 : 11,
                        marginBottom: isTablet ? 12 : 8,
                        fontWeight: '300',
                      }}>
                      {formatDateTime(req.createdAt)}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 0 }}>
                      <TouchableOpacity
                        onPress={() => handleAccept(req.id)}
                        style={{
                          backgroundColor: '#366CD91A',
                          borderRadius: isTablet ? 24 : 20,
                          paddingVertical: isTablet ? 10 : 6,
                          paddingHorizontal: isTablet ? 24 : 18,
                          marginRight: isTablet ? 12 : 8,
                          borderWidth: 1,
                          borderColor: theme.primary,
                        }}>
                        <Text
                          style={{
                            color: theme.primary,
                            fontWeight: '500',
                            fontSize: isTablet ? 16 : 14,
                          }}>
                          {t('accept')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleReject(req.id)}
                        style={{
                          backgroundColor: theme.danger,
                          borderRadius: isTablet ? 24 : 20,
                          paddingVertical: isTablet ? 10 : 6,
                          paddingHorizontal: isTablet ? 24 : 18,
                          borderWidth: 1,
                          borderColor: theme.dangerText,
                        }}>
                        <Text
                          style={{
                            color: theme.dangerText,
                            fontWeight: '500',
                            fontSize: isTablet ? 16 : 14,
                          }}>
                          {t('reject')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
        {/* <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Notifications</Text> */}
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('no_notifications_yet')}</Text>
            <Text style={[styles.emptySub, { color: theme.text }]}>
              {t('notifications_updates')}
            </Text>
          </View>
        ) : (
          filteredNotifications.map((n) => {
            const screenMap = {
              task: 'MyTasksScreen',
              issue: 'IssuesScreen',
              project: 'ProjectScreen',
              connection: 'ConnectionsScreen',
            };
            const targetScreen = screenMap[n.type?.toLowerCase()] || null;
            return (
              <TouchableOpacity
                key={n.id}
                onPress={async () => {
                  try {
                    // Mark notification as read
                    await markNotificationAsRead(n.id);
                    // Refresh notifications to update UI
                    await loadNotifications();
                  } catch (error) {
                    console.error('Failed to mark notification as read:', error.message);
                    showMessage('Failed to mark notification as read');
                  }
                  // Navigate after marking as read
                  if (targetScreen) {
                    navigation.navigate(targetScreen, n.params || {});
                  }
                }}
                style={[
                  styles.card,
                  {
                    backgroundColor: n.read ? theme.card : `${theme.card}`, // Slightly different shade if unread
                    borderColor: theme.border || '#e0e0e0',
                    borderRadius: isTablet ? 20 : 16,
                    padding: isTablet ? 20 : 16,
                    marginBottom: isTablet ? 16 : 12,
                  },
                ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: theme.avatarBg,
                        width: isTablet ? 50 : 42,
                        height: isTablet ? 50 : 42,
                        borderRadius: isTablet ? 16 : 12,
                        marginRight: isTablet ? 16 : 12,
                      },
                    ]}>
                    <Text
                      style={{
                        color: theme.primary,
                        fontWeight: '500',
                        fontSize: isTablet ? 24 : 20,
                      }}>
                      {n.type?.charAt(0)?.toUpperCase() || 'N'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: isTablet ? 4 : 2,
                      }}>
                      <Text
                        style={[
                          styles.name,
                          {
                            color: theme.text,
                            flex: 1,
                            fontSize: isTablet ? 16 : 14,
                            fontWeight: '600',
                            marginBottom: isTablet ? 6 : 5,
                          },
                        ]}>
                        {n.type}
                      </Text>
                      <Text
                        style={{
                          color: theme.secondaryText,
                          fontSize: isTablet ? 13 : 11,
                          fontWeight: '300',
                        }}>
                        {formatDateTime(n.createdAt)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: theme.secondaryText,
                        fontSize: isTablet ? 14 : 12,
                        fontWeight: '300',
                      }}>
                      {n.message}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      {/* Custom message drawer */}
      {message && (
        <Animated.View
          style={[
            styles.messageDrawer,
            {
              backgroundColor: theme.primary,
              right: isTablet ? 30 : 20,
              top: isTablet ? 80 : 70,
              maxWidth: isTablet ? 400 : 360,
              borderRadius: isTablet ? 20 : 16,
              paddingVertical: isTablet ? 18 : 14,
              paddingHorizontal: isTablet ? 30 : 24,
            },
            {
              opacity: messageAnim,
              transform: [
                {
                  translateY: messageAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [isTablet ? -50 : -40, 0],
                  }),
                },
              ],
            },
          ]}>
          <Text
            style={{
              color: '#fff',
              fontWeight: '500',
              fontSize: isTablet ? 14 : 12,
              textAlign: 'center',
            }}>
            {message}
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    marginTop: Platform.OS === 'ios' ? 0 : 25,
    marginLeft: 16,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  backText: {
    fontSize: 18,
    fontWeight: '400',
    marginLeft: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginTop: 8,
    paddingBottom: 0,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 17,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#222',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 0,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#ddd',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  acceptButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  acceptText: {
    color: '#fff',
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#eee',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: {
    fontSize: 20,
    color: '#333',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageDrawer: {
    position: 'absolute',
    right: 20,
    top: 70,
    maxWidth: 360,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NotificationScreen;
