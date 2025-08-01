import MaterialIcons from '@expo/vector-icons/MaterialIcons'; // Already imported as Icon, but for clarity
import { Audio } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import {
  acceptConnectionRequest,
  getPendingRequests,
  rejectConnectionRequest,
} from '../utils/connections';
import {
  fetchNotifications,
  markAllNotificationsAsRead,
} from '../utils/notifications';

const NotificationScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Critical');
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [message, setMessage] = useState(null);
  const messageTimeout = useRef(null);
  const messageAnim = useRef(new Animated.Value(0)).current;
  const theme = useTheme();

  const tabs = ['Critical', 'Task', 'All', 'Connections'];


  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchNotifications();
      if (!Array.isArray(data)) throw new Error('Invalid notification data');
      setNotifications(data);
    } catch (err) {
      console.log('Load Error:', err.message);
    }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    try {
      const data = await getPendingRequests();
      setPendingRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Pending Requests Error:', err.message);
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
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/refresh.wav')
      );
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
        return notifications.filter((n) => /0\sday\(s\)(\sleft|\sremaining)/i.test(n.message));
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
      </TouchableOpacity>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity onPress={onRefresh}>
            <MaterialIcons name="refresh" size={22} color={theme.text} style={{ marginRight: 12 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <MaterialIcons name="check-circle-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {tabs.map((tab) => {
            const isActive = activeTab.toLowerCase() === tab.toLowerCase();
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabButton,
                  isActive
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                onPress={() => setActiveTab(tab.toUpperCase())}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive
                      ? { color: '#fff', fontWeight: '600' }
                      : { color: theme.text, fontWeight: '400' },
                  ]}
                >
                  {tab}
                  <Text
                    style={[
                      styles.countSmall,
                      isActive && { color: '#fff', fontWeight: '600' },
                    ]}
                  >
                    {' '}
                    {
                      tab.toLowerCase() === 'all'
                        ? notifications.length
                        : tab.toLowerCase() === 'connections'
                          ? pendingRequests.length
                          : tab.toLowerCase() === 'critical'
                            ? notifications.filter((n) => n.type?.toLowerCase() === 'issue').length
                            : tab.toLowerCase() === 'task'
                              ? notifications.filter((n) => n.type?.toLowerCase() === 'task').length
                              : 0
                    }
                  </Text>
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {/* Body */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'CONNECTIONS' && pendingRequests.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Connection Requests</Text>
            {pendingRequests.map((req) => {
              const initials = req.requester?.name
                ? req.requester.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                    },
                  ]}
                >
                  {/* Avatar */}
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 27,
                      borderWidth: 2,
                      borderColor: theme.primary,
                      backgroundColor: theme.avatarBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                      overflow: 'hidden',
                    }}
                  >
                    {req.requester?.profilePhoto ? (
                      <Image
                        source={{ uri: req.requester.profilePhoto }}
                        style={{ width: 50, height: 50, borderRadius: 25 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 20 }}>
                        {initials}
                      </Text>
                    )}
                  </View>
                  {/* Info and actions */}
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={[styles.name, { color: theme.text, fontWeight: '500', fontSize: 16 }]}>
                      {req.requester?.name || 'User'}
                    </Text>
                    <Text style={{ color: theme.secondaryText, fontSize: 13, marginBottom: 8, fontWeight: '300' }}>
                      wants to connect
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 0 }}>
                      <TouchableOpacity
                        onPress={() => handleAccept(req.id)}
                        style={{
                          backgroundColor: "#366CD91A",
                          borderRadius: 20,
                          paddingVertical: 6,
                          paddingHorizontal: 18,
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: theme.primary,
                        }}
                      >
                        <Text style={{ color: theme.primary, fontWeight: '500', fontSize: 14 }}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleReject(req.id)}
                        style={{
                          backgroundColor: theme.danger,
                          borderRadius: 20,
                          paddingVertical: 6,
                          paddingHorizontal: 18,
                          borderWidth: 1,
                          borderColor: theme.dangerText,
                        }}
                      >
                        <Text style={{ color: theme.dangerText, fontWeight: '500', fontSize: 14 }}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Notifications</Text>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No notifications yet.</Text>
            <Text style={[styles.emptySub, { color: theme.text }]}>
              You’ll see updates here when something important happens.
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
                onPress={() => {
                  if (targetScreen) {
                    navigation.navigate(targetScreen, n.params || {});
                  }
                }}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border || '#e0e0e0' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.avatarBg }]}>
                    <Text style={{ color: theme.primary, fontWeight: '500', fontSize: 20 }}>
                      {n.type?.charAt(0)?.toUpperCase() || 'N'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: theme.text }]}>{n.type}</Text>
                    <Text style={{ color: theme.secondaryText, fontSize: 12, fontWeight: '300' }}>{n.message}</Text>
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
            { backgroundColor: theme.primary },
            {
              opacity: messageAnim,
              transform: [
                {
                  translateY: messageAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={{ color: '#fff', fontWeight: '500', fontSize: 12, textAlign: 'center' }}>{message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    marginTop: Platform.OS === 'ios' ? 25 : 25,
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
    paddingHorizontal: 20,
    marginTop: 15,
    paddingBottom: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 18,
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
