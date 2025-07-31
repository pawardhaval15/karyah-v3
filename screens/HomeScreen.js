import { Feather } from '@expo/vector-icons';
import CustomDrawer from 'components/Home/CustomDrawer';
import ProjectProgressCard from 'components/Home/ProjectProgressCard';
import TaskSection from 'components/Home/TaskSection';
import ProjectFabDrawer from 'components/Project/ProjectFabDrawer';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatCardList from '../components/Home/StatCard';
import { useTheme } from '../theme/ThemeContext';
import { fetchNotifications } from '../utils/notifications';
import { getProjectsByUserId } from '../utils/project';
import usePushNotifications from '../utils/usePushNotifications';
const DRAWER_WIDTH = 300;

const projectProgressData = [
  {
    title: 'Dashboard Admin for SaaS Dream Company',
    timeline: '03 August – 28 August 2023',
    assignedBy: 'Astri',
    avatars: [
      'https://randomuser.me/api/portraits/men/1.jpg',
      'https://randomuser.me/api/portraits/men/2.jpg',
      'https://randomuser.me/api/portraits/men/3.jpg',
    ],
    progress: 80,
  },
  {
    title: 'UI Kit for Landing Page and Mobile Res',
    timeline: '28 July – 16 July 2023',
    assignedBy: 'Meyda',
    avatars: [
      'https://randomuser.me/api/portraits/men/4.jpg',
      'https://randomuser.me/api/portraits/men/5.jpg',
      'https://randomuser.me/api/portraits/men/6.jpg',
    ],
    progress: 60,
  },
  {
    title: 'CRM Integration for Sales Team',
    timeline: '01 July – 20 July 2023',
    assignedBy: 'Rahul',
    avatars: [
      'https://randomuser.me/api/portraits/men/7.jpg',
      'https://randomuser.me/api/portraits/men/8.jpg',
    ],
    progress: 45,
  },
];

function formatMinimalDateRange(start, end) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const startStr = `${startDate.getDate()} ${startDate.toLocaleString('default', { month: 'short' })}`;
  const endStr = endDate
    ? `${endDate.getDate()} ${endDate.toLocaleString('default', { month: 'short' })} ${endDate.getFullYear()}`
    : 'Ongoing';
  return `${startStr} – ${endStr}`;
}

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const theme = useTheme(); // <-- Use theme
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false); // <-- state for drawer
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current; // Start hidden
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  usePushNotifications();
  useEffect(() => {
    const checkUnreadNotifications = async () => {
      try {
        const data = await fetchNotifications();
        const hasUnread = data?.some(n => !n.read); // assuming each notification has a `read` boolean
        setHasUnreadNotifications(hasUnread);
      } catch (err) {
        console.error('Error checking notifications:', err.message);
      }
    };

    checkUnreadNotifications();

    const interval = setInterval(checkUnreadNotifications, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {

    Animated.timing(drawerAnim, {
      toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [drawerOpen]);

  const fetchProjectsData = async () => {
    try {
      setLoadingProjects(true);
      const data = await getProjectsByUserId();
      const filtered = (data || []).filter(
        project => project.status?.toLowerCase() !== 'completed'
      );
      setProjects(filtered);
    } catch (err) {
      console.error('Failed to fetch projects:', err.message);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchProjectsData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjectsData();
    setRefreshing(false);
  };

  return (
    <View style={[
      { backgroundColor: theme.card, flex: 1 }
    ]}>
      {loadingProjects ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary || '#366CD9'} />
        </View>
      ) : (
        <>
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
            {/* Modern Header */}
            <View style={[styles.modernHeader, { backgroundColor: theme.background }]}>
              <View style={styles.headerRow}>
                <TouchableOpacity 
                  onPress={() => setDrawerOpen(true)}
                  style={[styles.headerButton, { backgroundColor: theme.avatarBg }]}
                >
                  <Feather name="menu" size={22} color={theme.text} />
                </TouchableOpacity>
                
                <View style={styles.titleContainer}>
                  <Text style={[styles.modernTitle, { color: theme.text }]}>Overview</Text>
                  <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Project Management Hub</Text>
                </View>
                
                <TouchableOpacity 
                  onPress={() => navigation.navigate('NotificationScreen')}
                  style={[styles.headerButton, { backgroundColor: theme.avatarBg }]}
                >
                  <View style={{ position: 'relative' }}>
                    <Feather name="bell" size={22} color={theme.text} />
                    {hasUnreadNotifications && (
                      <View style={styles.notificationDot} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.greeting, { color: theme.text }]}></Text>
              <StatCardList
                navigation={navigation}
                theme={theme}
                loading={loadingProjects || refreshing}
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
              {projects.length > 0 && (
                <>
                  <View style={styles.sectionRow}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Ongoing Projects <Text style={{ color: theme.text, fontWeight: '600', fontSize: 20, marginLeft: 12 }}>{projects.length}</Text>
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, marginBottom: 20 }}
                  >
                    {projects.map((project, idx) => (
                      <ProjectProgressCard
                        key={project.id || idx}
                        title={project.projectName}
                        timeline={formatMinimalDateRange(project.startDate, project.endDate)}
                        assignedBy={"You"}
                        avatars={[
                          ...(project.mainUserProfilePhoto ? [project.mainUserProfilePhoto] : []),
                          ...(Array.isArray(project.coAdminProfilePhotos)
                            ? project.coAdminProfilePhotos
                              .map(photoObj => photoObj?.profilePhoto)
                              .filter(Boolean)
                            : [])
                        ]}
                        progress={project.progress}
                        theme={theme}
                        project={project}
                        creatorName={project.mainUserName || "Unknown"}
                        location={project.location}
                      />
                    ))}
                  </ScrollView>
                </>
              )}
              <TaskSection
                navigation={navigation}
                theme={theme}
                loading={loadingProjects || refreshing}
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            </ScrollView>
          </ScrollView>
          {!drawerOpen && (
            <ProjectFabDrawer
              onTaskSubmit={(task) => {
                // handle new task here
                console.log('New Task:', task);
              }}
              onProjectSubmit={(project) => {
                // handle new project here
                console.log('New Project:', project);
              }}
              theme={theme}
            />
          )}
          {/* {refreshing && (
            <View style={styles.activityOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )} */}
          {drawerOpen && (
            <View style={styles.drawerOverlay}>
              <Pressable style={styles.overlayBg} onPress={() => setDrawerOpen(false)} />
              <Animated.View style={[styles.animatedDrawer, { left: drawerAnim }]}>
                <CustomDrawer onClose={() => setDrawerOpen(false)} theme={theme} />
              </Animated.View>
            </View>
          )}
        </>
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
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#363942',
    paddingVertical: 0,
  },
  searchIcon: {
    marginLeft: 8,
  },
  drawerOverlay: {
    zIndex: 1000,
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    zIndex: 1000,
    elevation: 100,
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
    fontSize: 22,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 6,
  },
  viewAll: {
    color: '#363942',
    fontWeight: '400',
    fontSize: 14,
  },
  fabContainer: {
    zIndex: 0,
    position: 'absolute',
    bottom: 45,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#011F53',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: -36,
  },
});