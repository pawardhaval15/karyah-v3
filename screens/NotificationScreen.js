import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useAcceptConnection, usePendingRequests, useRejectConnection } from '../hooks/useConnections';
import { useMarkAllNotificationsAsRead, useMarkNotificationAsRead, useNotifications } from '../hooks/useNotifications';
import { useUIStore } from '../store/uiStore';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;

// Optimized Item Heights for getItemLayout
const CONNECTION_ITEM_HEIGHT = 160;
const NOTIFICATION_ITEM_HEIGHT = 100;

const formatDateTime = (dateString) => {
  if (!dateString) return '';
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
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const SkeletonItem = memo(({ theme }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 800 }), withTiming(0.3, { duration: 800 })),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, animatedStyle]}
    >
      <View style={styles.cardContentRow}>
        <View style={[styles.avatarContainer, { backgroundColor: theme.avatarBg, borderWidth: 0 }]} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ height: 16, backgroundColor: theme.avatarBg, width: '40%', borderRadius: 4 }} />
          <View style={{ height: 12, backgroundColor: theme.avatarBg, width: '90%', borderRadius: 4 }} />
          <View style={{ height: 12, backgroundColor: theme.avatarBg, width: '20%', borderRadius: 4 }} />
        </View>
      </View>
    </Animated.View>
  );
});

const ConnectionRequestCard = memo(({ req, onAccept, onReject, theme, t }) => {
  const initials = req.requester?.name
    ? req.requester.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify().damping(15)}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.cardContentRow}>
        <View style={[styles.avatarContainer, { borderColor: theme.primary, backgroundColor: theme.avatarBg }]}>
          {req.requester?.profilePhoto ? (
            <Image source={{ uri: req.requester.profilePhoto }} style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]}>{req.requester?.name || 'User'}</Text>
          <Text style={[styles.subText, { color: theme.secondaryText }]}>wants to connect</Text>
          <Text style={[styles.timeText, { color: theme.secondaryText }]}>{formatDateTime(req.createdAt)}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={() => onAccept(req.id || req._id)}
              style={[styles.acceptBtn, { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]}
              activeOpacity={0.7}
            >
              <Text style={{ color: theme.primary, fontWeight: '600' }}>{t('accept')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onReject(req.id || req._id)}
              style={[styles.rejectBtn, { backgroundColor: theme.danger, borderColor: theme.dangerText }]}
              activeOpacity={0.7}
            >
              <Text style={{ color: theme.dangerText, fontWeight: '600' }}>{t('reject')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const NotificationCard = memo(({ item, onRead, theme }) => {
  const typeIcon = useMemo(() => {
    const type = item.type?.toLowerCase();
    if (type === 'issue') return { icon: 'alert-circle', color: theme.dangerText || '#FF3B30' };
    if (type === 'task') return { icon: 'clipboard', color: theme.primary };
    if (type === 'project') return { icon: 'folder', color: '#FF9500' };
    return { icon: 'bell', color: theme.text };
  }, [item.type, theme]);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify().damping(15)}
      style={[styles.card, {
        backgroundColor: theme.card,
        borderColor: theme.border,
        opacity: item.read ? 0.6 : 1,
        borderLeftWidth: item.read ? 1 : 4,
        borderLeftColor: item.read ? theme.border : theme.primary
      }]}
    >
      <TouchableOpacity
        onPress={() => onRead(item)}
        style={styles.cardContentRow}
        activeOpacity={0.7}
      >
        <View style={[styles.iconCircle, { backgroundColor: theme.avatarBg }]}>
          <Feather name={typeIcon.icon} size={20} color={typeIcon.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardHeader}>
            <Text style={[styles.name, { color: theme.text, flex: 1 }]} numberOfLines={1}>{item.type}</Text>
            <Text style={[styles.timeText, { color: theme.secondaryText }]}>{formatDateTime(item.createdAt)}</Text>
          </View>
          <Text style={[styles.messageText, { color: theme.secondaryText }]} numberOfLines={2}>{item.message}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const NotificationScreen = ({ navigation, route }) => {
  const { defaultTab } = route.params || {};
  const theme = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState(defaultTab?.toUpperCase() || 'ALL');
  const { homeRefreshing, setHomeRefreshing } = useUIStore();

  // Optimized Data Fetching with auto-updates
  const { data: notifications = [], isLoading: notifsLoading, refetch: refetchNotifs, isFetching: isRefreshingNotifs } = useNotifications();
  const { data: pendingRequests = [], isLoading: requestsLoading, refetch: refetchRequests, isFetching: isRefreshingReqs } = usePendingRequests();

  const queryClient = useQueryClient();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const acceptReq = useAcceptConnection();
  const rejectReq = useRejectConnection();

  const isLoadingInitial = (notifsLoading || requestsLoading) && notifications.length === 0 && pendingRequests.length === 0;

  const tabFilters = useMemo(() => [
    { key: 'ALL', label: t('all'), count: notifications.length },
    { key: 'CRITICAL', label: t('critical'), count: notifications.filter(n => n.type?.toLowerCase() === 'issue').length },
    { key: 'TASK', label: t('task'), count: notifications.filter(n => n.type === 'task' || n.type === 'task_message').length },
    { key: 'PROJECT', label: t('project'), count: notifications.filter(n => ['coadmin_added', 'project_updated', 'discussion'].includes(n.type)).length },
    { key: 'CONNECTIONS', label: t('connections'), count: pendingRequests.length },
  ], [notifications, pendingRequests, t]);

  const activeTabs = useMemo(() =>
    tabFilters.filter(tab => tab.key === 'CONNECTIONS' ? tab.count > 0 : tab.count > 0 || tab.key === 'ALL')
    , [tabFilters]);

  const displayData = useMemo(() => {
    if (activeTab === 'CONNECTIONS') return pendingRequests;
    if (activeTab === 'ALL') return notifications;

    switch (activeTab) {
      case 'CRITICAL': return notifications.filter(n => n.type?.toLowerCase() === 'issue');
      case 'TASK': return notifications.filter(n => n.type === 'task' || n.type === 'task_message');
      case 'PROJECT': return notifications.filter(n => ['coadmin_added', 'project_updated', 'discussion'].includes(n.type));
      default: return notifications;
    }
  }, [activeTab, notifications, pendingRequests]);

  const onRefresh = useCallback(async () => {
    setHomeRefreshing(true);
    try {
      const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/refresh.wav'));
      await sound.playAsync();
    } catch { }

    // Use invalidateQueries + refetch for maximum cross-device consistency
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] }),
      refetchNotifs(),
      refetchRequests()
    ]);

    setHomeRefreshing(false);
  }, [refetchNotifs, refetchRequests, setHomeRefreshing, queryClient]);

  // Proactive refetch on tab switch for "instant" feel
  useEffect(() => {
    if (activeTab === 'CONNECTIONS') refetchRequests();
    else refetchNotifs();
  }, [activeTab, refetchNotifs, refetchRequests]);

  // Fallback to 'ALL' if the active tab is removed from the bar (e.g. last connection accepted)
  useEffect(() => {
    const isTabVisible = activeTabs.some(tab => tab.key === activeTab);
    if (!isTabVisible && activeTab !== 'ALL') {
      setActiveTab('ALL');
    }
  }, [activeTabs, activeTab]);

  const handleRead = useCallback(async (n) => {
    const id = n.id || n._id;
    if (!n.read && id) await markAsRead.mutateAsync(id);
    const screenMap = { task: 'MyTasksScreen', issue: 'IssuesScreen', project: 'ProjectScreen' };
    const target = screenMap[n.type?.toLowerCase()];
    if (target) navigation.navigate(target, n.params || {});
  }, [markAsRead, navigation]);

  const renderItem = useCallback(({ item }) => {
    if (activeTab === 'CONNECTIONS') {
      return (
        <ConnectionRequestCard
          req={item}
          onAccept={acceptReq.mutate}
          onReject={rejectReq.mutate}
          theme={theme}
          t={t}
        />
      );
    }
    return (
      <NotificationCard
        item={item}
        onRead={handleRead}
        theme={theme}
      />
    );
  }, [activeTab, acceptReq.mutate, rejectReq.mutate, theme, t, handleRead]);

  // Performance: Get item layout for silky smooth scrolling with large datasets
  const getItemLayout = useCallback((data, index) => ({
    length: activeTab === 'CONNECTIONS' ? CONNECTION_ITEM_HEIGHT : NOTIFICATION_ITEM_HEIGHT,
    offset: (activeTab === 'CONNECTIONS' ? CONNECTION_ITEM_HEIGHT : NOTIFICATION_ITEM_HEIGHT) * index,
    index,
  }), [activeTab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={theme.text} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('notifications')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => markAllAsRead.mutate()}
          disabled={notifications.length === 0}
          style={[styles.readAllBtn, { backgroundColor: theme.avatarBg }]}
          activeOpacity={0.7}
        >
          <Feather name="check-circle" size={18} color={theme.primary} />
          <Text style={[styles.readAllText, { color: theme.primary }]}>Read All</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Tab Bar */}
      <View style={styles.tabContainer}>
        <FlatList
          data={activeTabs}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveTab(item.key)}
              style={[
                styles.tabButton,
                activeTab === item.key
                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                  : { backgroundColor: theme.card, borderColor: theme.border }
              ]}
              activeOpacity={0.9}
            >
              <Text style={[styles.tabText, { color: activeTab === item.key ? '#FFF' : theme.text }]}>
                {item.label}
              </Text>
              {item.count > 0 && (
                <View style={[styles.badge, { backgroundColor: activeTab === item.key ? 'rgba(255,255,255,0.2)' : theme.primary }]}>
                  <Text style={[styles.badgeText, { color: activeTab === item.key ? '#FFF' : '#FFF' }]}>
                    {item.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          keyExtractor={item => item.key}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        />
      </View>

      {/* Main Dataset List */}
      {isLoadingInitial ? (
        <View style={styles.listContent}>
          {[1, 2, 3, 4, 5].map((i) => <SkeletonItem key={i} theme={theme} />)}
        </View>
      ) : (
        <FlatList
          data={displayData}
          renderItem={renderItem}
          keyExtractor={item => item.id || item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={homeRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              progressBackgroundColor={theme.card}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.avatarBg }]}>
                <Feather name="bell" size={40} color={theme.secondaryText} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('no_notifications_yet')}</Text>
              <Text style={[styles.emptySub, { color: theme.secondaryText }]}>{t('notifications_updates')}</Text>
            </Animated.View>
          }
          // Optimization props for handling large amounts of data
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={11}
          getItemLayout={getItemLayout}
          updateCellsBatchingPeriod={50}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  readAllText: { fontSize: 13, fontWeight: '700' },
  tabContainer: { height: 44, marginBottom: 12 },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
  },
  tabText: { fontSize: 13, fontWeight: '700' },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '800' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 5 },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardContentRow: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarText: { fontSize: 22, fontWeight: '800' },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  subText: { fontSize: 14, marginBottom: 6, opacity: 0.8 },
  timeText: { fontSize: 11, fontWeight: '500', opacity: 0.6 },
  actionRow: { flexDirection: 'row', marginTop: 14, gap: 12 },
  acceptBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(54, 108, 217, 0.08)',
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  messageText: { fontSize: 14, lineHeight: 20, marginTop: 4, opacity: 0.8 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 10 },
  emptySub: { fontSize: 15, textAlign: 'center', marginTop: 8, paddingHorizontal: 50, opacity: 0.7 },
});

export default NotificationScreen;
