import { Feather } from '@expo/vector-icons';
import StatCardList from 'components/Home/StatCard';
import ProjectFabDrawer from 'components/Project/ProjectFabDrawer';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomDrawer from '../components/Home/CustomDrawer';
import ProjectsSnagLineChart from '../components/professionalDashboard/BarChartNew';
import CriticalIssueCard from '../components/professionalDashboard/CriticalIssueCard';
import DailyProgressCard from '../components/professionalDashboard/DailyProgressCard';
import AssignedIssuesBarChart from '../components/professionalDashboard/IssuesBarCharNew';
import { useTheme } from '../theme/ThemeContext';
import { fetchNotifications } from '../utils/notifications';
import usePushNotifications from '../utils/usePushNotifications';
const DRAWER_WIDTH = 300;

function AnalyticsSection({ theme }) {
    // Dummy analytics data
    const analytics = [
        { label: 'Avg. Task Completion', value: '82%' },
        { label: 'Most Active Project', value: 'Office Renovation' },
        { label: 'Peak Activity Hour', value: '2-3 PM' },
        { label: 'Open Issues Trend', value: '↓ 12% this week' },
    ];
    return (
        <View style={[styles.analyticsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.analyticsTitle, { color: theme.text }]}>Analytics</Text>
            {analytics.map((item, idx) => (
                <View key={idx} style={styles.analyticsRow}>
                    <Text style={[styles.analyticsLabel, { color: theme.secondaryText }]}>{item.label}</Text>
                    <Text style={[styles.analyticsValue, { color: theme.primary }]}>{item.value}</Text>
                </View>
            ))}
        </View>
    );
}

export default function ProfessionalDashboard({ navigation }) {
    const theme = useTheme();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const [refreshing, setRefreshing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
    const [selectedChart, setSelectedChart] = useState('projects');
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

    // Effect to fetch data when chart changes
    useEffect(() => {
        // No additional data fetching needed for bar charts
        // They handle their own data fetching internally
    }, [selectedChart, refreshKey]);

    useEffect(() => {
        Animated.timing(drawerAnim, {
            toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
            duration: 250,
            useNativeDriver: false,
        }).start();
    }, [drawerOpen]);

    const onRefresh = async () => {
        setRefreshing(true);
        setRefreshKey(prev => prev + 1);
        // Simulate API call or add your fetch logic here
        setTimeout(() => {
            setRefreshing(false);
        }, 800);
    };

    // Function to render the appropriate bar chart based on selected data type
    const renderChart = () => {
        const chartKey = `${selectedChart}-bar-${refreshKey}`;
        
        if (selectedChart === 'projects') {
            return (
                <ProjectsSnagLineChart
                    theme={theme}
                    refreshKey={refreshKey}
                    key={chartKey}
                />
            );
        } else {
            return (
                <AssignedIssuesBarChart
                    theme={theme}
                    refreshKey={refreshKey}
                    key={chartKey}
                />
            );
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Drawer Overlay */}
            {drawerOpen && (
                <View style={styles.drawerOverlay}>
                    <Pressable style={styles.overlayBg} onPress={() => setDrawerOpen(false)} />
                    <Animated.View style={[styles.animatedDrawer, { left: drawerAnim }]}>
                        <CustomDrawer onClose={() => setDrawerOpen(false)} theme={theme} />
                    </Animated.View>
                </View>
            )}

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
                        <Text style={[styles.modernTitle, { color: theme.text }]}>Analytics</Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Data Insights & Performance</Text>
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
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1, paddingHorizontal: 0 }}
                nestedScrollEnabled={true}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[theme.primary || '#366CD9']}
                        tintColor={theme.primary || '#366CD9'}
                    />
                }
            >
                <StatCardList navigation={navigation} theme={theme} refreshKey={refreshKey} key={`stat-${refreshKey}`} />
                <DailyProgressCard theme={theme} refreshKey={refreshKey} key={`daily-${refreshKey}`} />
                {/* Analytics Charts Section */}
                <View style={[styles.chartsSection, { backgroundColor: theme.background }]}>
                    {/* Minimal Capsule Chart Controls */}
                    <View style={styles.chartControlsContainer}>
                        <View style={[styles.capsuleContainer, { backgroundColor: `${theme.border}40` }]}>
                            <TouchableOpacity
                                style={[
                                    styles.capsuleButton,
                                    { 
                                        backgroundColor: selectedChart === 'projects' ? theme.primary : 'transparent',
                                    },
                                ]}
                                onPress={() => setSelectedChart('projects')}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.capsuleText,
                                    { color: selectedChart === 'projects' ? '#fff' : theme.text }
                                ]}>
                                    Projects
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.capsuleButton,
                                    { 
                                        backgroundColor: selectedChart === 'issues' ? theme.primary : 'transparent',
                                    },
                                ]}
                                onPress={() => setSelectedChart('issues')}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.capsuleText,
                                    { color: selectedChart === 'issues' ? '#fff' : theme.text }
                                ]}>
                                    Issues
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Render selected chart */}
                    <View style={styles.chartContainer}>
                        {renderChart()}
                    </View>
                </View>
                <CriticalIssueCard
                    theme={theme}
                    refreshKey={refreshKey}
                    onViewAll={() => navigation.navigate('IssuesScreen')}
                    key={`critical-${refreshKey}`}
                />
                {/* <AnalyticsSection theme={theme} /> */}
                {/* <AllAnalyticsSection/> */}
            </ScrollView>
            {/* iOS-like Activity Indicator Overlay (only after ScrollView, so it doesn't block pull gesture) */}
            {refreshing && (
                <View style={styles.activityOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            )}
            <ProjectFabDrawer
                onTaskSubmit={async (task) => {
                    // handle new task here
                    console.log('New Task:', task);
                    // Refresh dashboard data instantly
                    await onRefresh();
                }}
                onProjectSubmit={async (project) => {
                    // handle new project here
                    console.log('New Project:', project);
                    // Refresh dashboard data instantly
                    await onRefresh();
                }}
                theme={theme}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    chartsSection: {
        marginTop: 10,
        marginBottom: 0,
    },
    chartControlsContainer: {
        paddingHorizontal: 16,
        marginBottom: 10,
        alignItems: 'center',
    },
    capsuleContainer: {
        flexDirection: 'row',
        borderRadius: 25,
        padding: 3,
        alignItems: 'center',
    },
    capsuleButton: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 22,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    capsuleText: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    chartContainer: {
        minHeight: 320,
    },
    activityOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    analyticsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 18,
        marginHorizontal: 18,
        marginTop: 14,
        borderWidth: 1,
        borderColor: '#e6eaf3',
        marginBottom: 24,
    },
    analyticsTitle: {
        fontWeight: '600',
        fontSize: 16,
        color: '#222',
        marginBottom: 10,
    },
    analyticsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    analyticsLabel: {
        color: '#666',
        fontSize: 14,
        fontWeight: '400',
    },
    analyticsValue: {
        color: '#366CD9',
        fontWeight: '400',
        fontSize: 14,
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? 0 : 0,
    },
    modernHeader: {
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    gradientHeader: {
        width: '100%',
        paddingTop: Platform.OS === 'ios' ? 70 : 25,
        paddingBottom: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginTop: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '600',
        letterSpacing: 0,
        marginRight: 12,
    },
    scrollContent: {
        marginTop: 8,
        paddingHorizontal: 0,
        paddingBottom: 100,
    },
    // Drawer styles (copied from HomeScreen for consistency)
    drawerOverlay: {
        zIndex: 1000,
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        flexDirection: 'row',
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
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
});