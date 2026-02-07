import { Feather } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated from 'react-native-reanimated';

// Components
import CustomDrawer from '../components/Home/CustomDrawer';
import ProjectSection from '../components/Home/ProjectSection';
import StatCardList from '../components/Home/StatCard';
import TaskSection from '../components/Home/TaskSection';
import ProjectFabDrawer from '../components/Project/ProjectFabDrawer';
import SmartSearchBar from '../components/ui/SmartSearchBar';

// Hooks & Theme
import CONFIG from '../constants/Config';
import { useHomeLogic } from '../hooks/useHomeLogic';
import { useTheme } from '../theme/ThemeContext';

const HomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const {
    drawerOpen,
    setDrawerOpen,
    refreshing,
    refreshKey,
    onRefresh,
    showSmartSearch,
    setShowSmartSearch,
    hasUnreadNotifications,
    drawerStyle,
    bellWaveStyle,
  } = useHomeLogic(navigation);

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* Modern Nav Bar */}
        <View style={styles.header}>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              style={[styles.iconBtn, { backgroundColor: theme.avatarBg }]}
              accessibilityLabel="Open Menu"
            >
              <Feather name="menu" size={22} color={theme.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.searchProxy, { backgroundColor: theme.SearchBar }]}
              onPress={() => setShowSmartSearch(true)}
              activeOpacity={0.8}
            >
              <Feather name="search" size={18} color={theme.secondaryText} style={styles.searchIcon} />
              <Text style={[styles.searchPlaceholder, { color: theme.secondaryText }]}>
                {t('search_placeholder')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('NotificationScreen')}
              style={[styles.iconBtn, { backgroundColor: theme.avatarBg }]}
            >
              <View style={styles.bellContainer}>
                <Feather name="bell" size={22} color={theme.text} />
                {hasUnreadNotifications && (
                  <>
                    <Animated.View style={[styles.waveCircle, bellWaveStyle]} />
                    <View style={styles.alertDot} />
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <StatCardList
            navigation={navigation}
            theme={theme}
            loading={refreshing}
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
            refreshKey={refreshKey}
          />
        </View>
      </ScrollView>

      {!drawerOpen && (
        <ProjectFabDrawer
          onTaskSubmit={onRefresh}
          onProjectSubmit={onRefresh}
          theme={theme}
        />
      )}

      {drawerOpen && (
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.overlayPressable} onPress={() => setDrawerOpen(false)} />
          <Animated.View style={[styles.drawerContainer, drawerStyle]}>
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
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingTop: CONFIG.IS_IOS ? 60 : 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchProxy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchPlaceholder: {
    fontSize: 15,
    fontWeight: '400',
  },
  bellContainer: {
    position: 'relative',
  },
  alertDot: {
    position: 'absolute',
    top: -2,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#FFF',
    zIndex: 10,
  },
  waveCircle: {
    position: 'absolute',
    width: 22,
    height: 22,
    backgroundColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 11,
    top: 0,
    left: 0,
  },
  content: {
    flex: 1,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    flexDirection: 'row',
  },
  overlayPressable: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContainer: {
    width: 300,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

export default React.memo(HomeScreen);