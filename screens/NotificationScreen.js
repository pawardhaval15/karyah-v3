import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Components
import ConnectionRequestCard from '../components/Notifications/ConnectionRequestCard';
import NotificationCard from '../components/Notifications/NotificationCard';
import NotificationSkeleton from '../components/Notifications/NotificationSkeleton';
import NotificationTabs from '../components/Notifications/NotificationTabs';

// Hooks
import { useNotificationScreen } from '../hooks/useNotificationScreen';
import { useTheme } from '../theme/ThemeContext';

// Constants
const CONNECTION_ITEM_HEIGHT = 180;
const NOTIFICATION_ITEM_HEIGHT = 110;

/**
 * NotificationScreen - Enterprise-grade notification and connection management.
 * Features modular architecture, optimized list rendering, and cross-platform consistency.
 */
const NotificationScreen = ({ navigation, route }) => {
  const { defaultTab } = route.params || {};
  const theme = useTheme();
  const { t } = useTranslation();

  const {
    activeTab,
    setActiveTab,
    activeTabs,
    displayData,
    isLoadingInitial,
    isRefreshing,
    handleRefresh,
    actions,
    counts,
  } = useNotificationScreen(defaultTab);

  // --- Handlers ---
  const onRefresh = useCallback(async () => {
    try {
      // Optional: Play a subtle refresh sound
      const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/refresh.wav'));
      await sound.playAsync();
    } catch (e) {
      // Sound fail should not block refresh
    }
    await handleRefresh();
  }, [handleRefresh]);

  const handleNotificationPress = useCallback(async (notification) => {
    const id = notification.id || notification._id;

    // Mark as read proactively or via API
    if (!notification.read && id) {
      await actions.markAsRead(id);
    }

    // Navigation mapping
    const type = notification.type?.toLowerCase();
    const screenMap = {
      task: 'MyTasksScreen',
      task_message: 'MyTasksScreen',
      issue: 'IssuesScreen',
      critical: 'IssuesScreen',
      project: 'ProjectScreen',
      coadmin_added: 'ProjectScreen',
      project_updated: 'ProjectScreen'
    };

    const target = screenMap[type];
    if (target) {
      navigation.navigate(target, notification.params || {});
    }
  }, [actions, navigation]);

  // --- Render Helpers ---
  const renderItem = useCallback(({ item }) => {
    if (activeTab === 'CONNECTIONS') {
      return (
        <ConnectionRequestCard
          req={item}
          onAccept={actions.acceptRequest}
          onReject={actions.rejectRequest}
          theme={theme}
          t={t}
        />
      );
    }
    return (
      <NotificationCard
        item={item}
        onRead={handleNotificationPress}
        theme={theme}
      />
    );
  }, [activeTab, actions, theme, t, handleNotificationPress]);

  const getItemLayout = useCallback((_, index) => ({
    length: activeTab === 'CONNECTIONS' ? CONNECTION_ITEM_HEIGHT : NOTIFICATION_ITEM_HEIGHT,
    offset: (activeTab === 'CONNECTIONS' ? CONNECTION_ITEM_HEIGHT : NOTIFICATION_ITEM_HEIGHT) * index,
    index,
  }), [activeTab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Professional Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('notifications')}
          </Text>
        </TouchableOpacity>

        {counts.unread > 0 && (
          <TouchableOpacity
            onPress={() => actions.markAllAsRead()}
            style={[styles.readAllBtn, { backgroundColor: `${theme.primary}15` }]}
            activeOpacity={0.8}
          >
            <Feather name="check-circle" size={16} color={theme.primary} />
            <Text style={[styles.readAllText, { color: theme.primary }]}>
              {t('read_all')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Optimized Tab Bar */}
      <NotificationTabs
        activeTab={activeTab}
        onTabPress={setActiveTab}
        tabs={activeTabs}
        theme={theme}
      />

      {/* Notification List */}
      {isLoadingInitial ? (
        <View style={styles.listContent}>
          {[1, 2, 3, 4, 5].map((i) => (
            <NotificationSkeleton key={i} theme={theme} />
          ))}
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item.id || item._id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}

          // Performance optimizations
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={11}

          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeInDown} style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.card }]}>
                <Feather name="bell-off" size={48} color={theme.secondaryText} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {t('no_notifications_yet')}
              </Text>
              <Text style={[styles.emptySub, { color: theme.secondaryText }]}>
                {t('notifications_updates')}
              </Text>
            </Animated.View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  readAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 60,
    lineHeight: 22,
  },
});

export default NotificationScreen;
