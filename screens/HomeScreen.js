import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomDrawer from '../components/Home/CustomDrawer';
import ProjectSection from '../components/Home/ProjectSection';
import StatCardList from '../components/Home/StatCard';
import TaskSection from '../components/Home/TaskSection';
import ProjectFabDrawer from '../components/Project/ProjectFabDrawer';
import SmartSearchBar from '../components/ui/SmartSearchBar';
import { useNotifications } from '../hooks/useNotifications';
import { useProjectInvites } from '../hooks/useProjects';
import { useUIStore } from '../store/uiStore';
import { useTheme } from '../theme/ThemeContext';
import usePushNotifications from '../utils/usePushNotifications';

const DRAWER_WIDTH = 300;

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const queryClient = useQueryClient();
  usePushNotifications();
  const { t } = useTranslation();

  // Global UI State
  const {
    drawerOpen,
    setDrawerOpen,
    homeRefreshing: refreshing,
    setHomeRefreshing,
    homeRefreshKey: refreshKey,
    incrementHomeRefreshKey
  } = useUIStore();

  const {
    data: invites = [],
    refetch: refetchInvites
  } = useProjectInvites();

  const {
    data: notifications = []
  } = useNotifications();

  // Local State
  const [showSmartSearch, setShowSmartSearch] = useState(false);

  // Derived State
  const pendingInvites = invites.length || 0;
  const hasUnreadNotifications = notifications?.some(n => !n.read);

  // Reanimated Values
  const drawerTranslateX = useSharedValue(-DRAWER_WIDTH);
  const blinkOpacity = useSharedValue(1);
  const waveScale = useSharedValue(0);
  const waveOpacity = useSharedValue(0);
  const bellScale = useSharedValue(1);
  const bellWaveScale = useSharedValue(1);
  const bellWaveOpacity = useSharedValue(0);

  // Effects
  useFocusEffect(
    useCallback(() => {
      const route = navigation.getState()?.routes?.find(r => r.name === 'HomeScreen');
      if (route?.params?.refresh) {
        onRefresh();
        navigation.setParams({ refresh: false });
      }
    }, [navigation])
  );

  // Drawer Animation
  useEffect(() => {
    drawerTranslateX.value = withTiming(drawerOpen ? 0 : -DRAWER_WIDTH, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [drawerOpen]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerTranslateX.value }],
  }));

  // Blinking/Wave Animation for Invites
  useEffect(() => {
    if (pendingInvites > 0) {
      blinkOpacity.value = withRepeat(
        withSequence(withTiming(0.4, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true
      );
      waveScale.value = 0;
      waveOpacity.value = 1;
      waveScale.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
      waveOpacity.value = withRepeat(withTiming(0, { duration: 1500 }), -1, false);
    } else {
      blinkOpacity.value = 1;
      waveScale.value = 0;
      waveOpacity.value = 0;
    }
  }, [pendingInvites]);

  // Bell Animation
  useEffect(() => {
    if (hasUnreadNotifications) {
      bellWaveScale.value = 0; // reset
      bellWaveScale.value = withRepeat(withTiming(2.5, { duration: 1500 }), -1, false);
      bellWaveOpacity.value = 0.8;
      bellWaveOpacity.value = withRepeat(withTiming(0, { duration: 1500 }), -1, false);
    } else {
      bellWaveScale.value = 1;
      bellWaveOpacity.value = 0;
    }
  }, [hasUnreadNotifications]);

  const bellWaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bellWaveScale.value }],
    opacity: bellWaveOpacity.value,
  }));

  const onRefresh = async () => {
    setHomeRefreshing(true);
    // Invalidate all relevant queries to trigger a fresh fetch in all components
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['myTasks'] }),
      queryClient.invalidateQueries({ queryKey: ['issuesByUser'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }),
      queryClient.invalidateQueries({ queryKey: ['criticalIssues'] }),
      queryClient.invalidateQueries({ queryKey: ['projectInvites'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
    incrementHomeRefreshKey();
    setHomeRefreshing(false);
  };

  return (
    <View style={[{ backgroundColor: theme.card, flex: 1 }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
        style={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary || '#366CD9']}
            tintColor={theme.primary || '#366CD9'}
          />
        }
      >
        {/* Header */}
        <View style={[styles.modernHeader, { backgroundColor: theme.background }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              style={[styles.headerButton, { backgroundColor: theme.avatarBg, marginRight: 10 }]}
            >
              <Feather name="menu" size={22} color={theme.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.searchBarContainer,
                {
                  backgroundColor: theme.SearchBar,
                  flex: 1,
                  marginHorizontal: 0,
                  marginTop: 0,
                  marginBottom: 0,
                  marginRight: 10,
                  paddingVertical: 10
                }
              ]}
              onPress={() => setShowSmartSearch(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.searchPlaceholder, { color: theme.secondaryText }]}>
                {t('search_placeholder')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('NotificationScreen')}
              style={[styles.headerButton, { backgroundColor: theme.avatarBg }]}
            >
              <View style={{ position: 'relative' }}>
                <Feather name="bell" size={22} color={theme.text} />
                {hasUnreadNotifications && (
                  <>
                    <Animated.View style={[styles.waveCircle, bellWaveStyle]} />
                    <View style={styles.notificationDot} />
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: theme.text }]}></Text>
          <StatCardList
            navigation={navigation}
            theme={theme}
            loading={refreshing}
            refreshing={refreshing}
            onRefresh={onRefresh}
            refreshKey={refreshKey}
          />

          <ProjectSection
            navigation={navigation}
            theme={theme}
            loading={refreshing}
          />

          <TaskSection
            navigation={navigation}
            theme={theme}
            loading={refreshing}
            refreshing={refreshing}
            onRefresh={onRefresh}
            refreshKey={refreshKey}
          />
        </View>
      </ScrollView>

      {!drawerOpen && (
        <ProjectFabDrawer
          onTaskSubmit={async (task) => {
            onRefresh();
          }}
          onProjectSubmit={async (project) => {
            onRefresh();
          }}
          theme={theme}
        />
      )}

      {drawerOpen && (
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.overlayBg} onPress={() => setDrawerOpen(false)} />
          <Animated.View style={[styles.animatedDrawer, drawerStyle]}>
            <CustomDrawer onClose={() => setDrawerOpen(false)} theme={theme} />
          </Animated.View>
        </View>
      )}

      {showSmartSearch && (
        <SmartSearchBar
          navigation={navigation}
          theme={theme}
          onClose={() => setShowSmartSearch(false)}
        />
      )}
    </View>
  );
}



const styles = StyleSheet.create({
  activityOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 0,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchPlaceholder: {
    fontSize: 16,
    flex: 1,
  },
  drawerOverlay: {
    zIndex: 1000,
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
  },
  overlayBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  animatedDrawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 3,
  },
  container: { flex: 1 },
  modernHeader: {
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  modernTitle: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    opacity: 0.7,
  },
  notificationDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 0,
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 20,
    marginBottom: 0,
    marginTop: 0,
  },
  statCardList: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 6,
  },
  waveCircle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 59, 48, 0.5)',
    borderRadius: 12, // Match headerButton radius
    top: 0,
    left: 0,
  }
});