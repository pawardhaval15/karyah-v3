import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StatCardList from 'components/Home/StatCard';
import ProjectFabDrawer from 'components/Project/ProjectFabDrawer';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomDrawer from '../components/Home/CustomDrawer';
import ProjectsSnagBarChart from '../components/professionalDashboard/BarChartNew';
import CriticalIssueCard from '../components/professionalDashboard/CriticalIssueCard';
import DailyProgressCard from '../components/professionalDashboard/DailyProgressCard';
import HeatmapChart from '../components/professionalDashboard/HeatmapChart';
import AssignedIssuesBarChart from '../components/professionalDashboard/IssuesBarCharNew';
import IssuesPieChart from '../components/professionalDashboard/IssuesPieChart';
import ProjectsPieChart from '../components/professionalDashboard/ProjectsPieChart';
import { useTheme } from '../theme/ThemeContext';
import { fetchAssignedIssues, fetchCreatedByMeIssues } from '../utils/issues';
import { fetchNotifications } from '../utils/notifications';
import { getProjectById, getProjectsByUserId } from '../utils/project';
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
    const [selectedChartType, setSelectedChartType] = useState('bar'); // bar, pie, heatmap
    const [chartData, setChartData] = useState([]);
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

    // Effect to fetch data for heatmap when chart type changes
    useEffect(() => {
        const fetchHeatmapData = async () => {
            if (selectedChartType !== 'heatmap') return;

            try {
                if (selectedChart === 'projects') {
                    // Fetch projects data for heatmap
                    const fetchedProjects = await getProjectsByUserId();
                    const projectsWithCounts = await Promise.all(
                        fetchedProjects.map(async (proj) => {
                            try {
                                const details = await getProjectById(proj.id);
                                const issuesCount = Array.isArray(details.issues)
                                    ? details.issues.filter(
                                        (issue) =>
                                            !issue.issueStatus || 
                                            !['resolved', 'closed', 'done', 'completed'].includes(
                                                String(issue.issueStatus).toLowerCase()
                                            )
                                    ).length
                                    : 0;

                                let tasks = [];
                                if (Array.isArray(details.worklists)) {
                                    details.worklists.forEach((w) => {
                                        if (Array.isArray(w.tasks)) {
                                            tasks = tasks.concat(w.tasks);
                                        }
                                    });
                                }
                                const incompleteTasks = tasks.filter(
                                    (task) =>
                                        typeof task.progress === 'number'
                                            ? task.progress < 100
                                            : true
                                ).length;

                                const totalCount = issuesCount + incompleteTasks;

                                return {
                                    id: proj.id,
                                    name: proj.projectName,
                                    count: totalCount,
                                };
                            } catch {
                                return {
                                    id: proj.id,
                                    name: proj.projectName,
                                    count: 0,
                                };
                            }
                        })
                    );
                    setChartData(projectsWithCounts);
                } else {
                    // Fetch issues data for heatmap
                    const loggedInUserIdRaw = await AsyncStorage.getItem('userId');
                    const loggedInUserName = await AsyncStorage.getItem('userName');
                    const loggedInUserId = loggedInUserIdRaw
                        ? (isNaN(Number(loggedInUserIdRaw)) ? loggedInUserIdRaw : Number(loggedInUserIdRaw))
                        : null;

                    const [assignedIssues, createdByMeIssues] = await Promise.all([
                        fetchAssignedIssues(),
                        fetchCreatedByMeIssues(),
                    ]);

                    const normalizeIssues = (issues, isCreatedByMe = false) =>
                        issues.map(issue => ({
                            id: issue.issueId || issue.id,
                            status: (issue.issueStatus || '').toLowerCase(),
                            assignedUserId: isCreatedByMe ? issue.assignToUserId : issue.assignTo,
                            assignedUserName: isCreatedByMe ? issue.assignToUserName : null,
                        }));

                    const normalizedCreated = normalizeIssues(createdByMeIssues, true);
                    const normalizedAssigned = normalizeIssues(assignedIssues, false);

                    const userIdToName = {};
                    normalizedCreated.forEach(issue => {
                        if (issue.assignedUserId && issue.assignedUserName) {
                            userIdToName[issue.assignedUserId] = issue.assignedUserName;
                        }
                    });

                    normalizedAssigned.forEach(issue => {
                        if (issue.assignedUserId && !userIdToName[issue.assignedUserId]) {
                            userIdToName[issue.assignedUserId] = `User-${issue.assignedUserId}`;
                        }
                    });

                    if (loggedInUserId && loggedInUserName) {
                        userIdToName[loggedInUserId] = loggedInUserName;
                    }

                    const isUnresolved = (status) =>
                        !status || !['resolved', 'closed', 'done', 'completed'].includes(status);

                    const combinedIssues = [
                        ...normalizedCreated.filter(issue => isUnresolved(issue.status)),
                        ...normalizedAssigned.filter(issue => isUnresolved(issue.status)),
                    ];

                    const grouped = {};
                    combinedIssues.forEach(issue => {
                        const userId = issue.assignedUserId;
                        if (userId) {
                            grouped[userId] = (grouped[userId] || 0) + 1;
                        }
                    });

                    const issuesData = Object.entries(grouped)
                        .map(([userId, count]) => ({
                            userId: String(userId),
                            userName: userIdToName[userId] || `User-${userId}`,
                            count: Math.max(count, 0),
                        }))
                        .filter(item => item.count > 0);

                    setChartData(issuesData);
                }
            } catch (err) {
                console.error('Error fetching heatmap data:', err);
                setChartData([]);
            }
        };

        fetchHeatmapData();
    }, [selectedChart, selectedChartType, refreshKey]);

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

    // Function to render the appropriate chart based on selected type and data
    const renderChart = () => {
        const chartKey = `${selectedChart}-${selectedChartType}-${refreshKey}`;
        
        if (selectedChart === 'projects') {
            switch (selectedChartType) {
                case 'bar':
                    return (
                        <ProjectsSnagBarChart
                            theme={theme}
                            refreshKey={refreshKey}
                            key={chartKey}
                        />
                    );
                case 'pie':
                    return (
                        <ProjectsPieChart
                            theme={theme}
                            key={chartKey}
                        />
                    );
                case 'heatmap':
                    return (
                        <HeatmapChart
                            theme={theme}
                            data={chartData}
                            type="projects"
                            key={chartKey}
                        />
                    );
                default:
                    return (
                        <ProjectsSnagBarChart
                            theme={theme}
                            refreshKey={refreshKey}
                            key={chartKey}
                        />
                    );
            }
        } else {
            switch (selectedChartType) {
                case 'bar':
                    return (
                        <AssignedIssuesBarChart
                            theme={theme}
                            key={chartKey}
                        />
                    );
                case 'pie':
                    return (
                        <IssuesPieChart
                            theme={theme}
                            key={chartKey}
                        />
                    );
                case 'heatmap':
                    return (
                        <HeatmapChart
                            theme={theme}
                            data={chartData}
                            type="issues"
                            key={chartKey}
                        />
                    );
                default:
                    return (
                        <AssignedIssuesBarChart
                            theme={theme}
                            key={chartKey}
                        />
                    );
            }
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
                    {/* Integrated Chart Controls */}
                    <View style={styles.chartControlsContainer}>
                        {/* Chart Type & Data Type Combined Header */}
                        <View style={[styles.controlsHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            {/* Data Type Selection */}
                            <View style={styles.dataTypeSection}>
                                <Text style={[styles.controlLabel, { color: theme.secondaryText }]}>Data View</Text>
                                <View style={styles.dataTypeButtons}>
                                    <TouchableOpacity
                                        style={[
                                            styles.dataTypeButton,
                                            { 
                                                backgroundColor: selectedChart === 'projects' ? theme.primary : 'transparent',
                                                borderColor: theme.border
                                            },
                                        ]}
                                        onPress={() => setSelectedChart('projects')}
                                        activeOpacity={0.8}
                                    >
                                        {/* <Feather
                                            name="folder"
                                            size={16}
                                            color={selectedChart === 'projects' ? '#fff' : theme.primary}
                                        /> */}
                                        <Text style={[
                                            styles.dataTypeText,
                                            { color: selectedChart === 'projects' ? '#fff' : theme.primary }
                                        ]}>
                                            Projects
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.dataTypeButton,
                                            { 
                                                backgroundColor: selectedChart === 'issues' ? theme.primary : 'transparent',
                                                borderColor: theme.border
                                            },
                                        ]}
                                        onPress={() => setSelectedChart('issues')}
                                        activeOpacity={0.8}
                                    >
                                        {/* <Feather
                                            name="alert-circle"
                                            size={16}
                                            color={selectedChart === 'issues' ? '#fff' : theme.primary}
                                        /> */}
                                        <Text style={[
                                            styles.dataTypeText,
                                            { color: selectedChart === 'issues' ? '#fff' : theme.primary }
                                        ]}>
                                            Issues
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Vertical Divider */}
                            <View style={[styles.divider, { backgroundColor: theme.border }]} />

                            {/* Chart Type Selection */}
                            <View style={styles.chartTypeSection}>
                                <Text style={[styles.controlLabel, { color: theme.secondaryText }]}>Chart Type</Text>
                                <View style={styles.chartTypeButtons}>
                                    <TouchableOpacity
                                        style={[
                                            styles.chartTypeButtonNew,
                                            { 
                                                backgroundColor: selectedChartType === 'bar' ? theme.primary : 'transparent',
                                                borderColor: theme.border
                                            },
                                        ]}
                                        onPress={() => setSelectedChartType('bar')}
                                        activeOpacity={0.8}
                                    >
                                
                                        <Text style={[
                                            styles.chartTypeTextNew,
                                            { color: selectedChartType === 'bar' ? '#fff' : theme.primary }
                                        ]}>
                                            Bar
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.chartTypeButtonNew,
                                            { 
                                                backgroundColor: selectedChartType === 'pie' ? theme.primary : 'transparent',
                                                borderColor: theme.border
                                            },
                                        ]}
                                        onPress={() => setSelectedChartType('pie')}
                                        activeOpacity={0.8}
                                    >
                                
                                        <Text style={[
                                            styles.chartTypeTextNew,
                                            { color: selectedChartType === 'pie' ? '#fff' : theme.primary }
                                        ]}>
                                            Pie
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.chartTypeButtonNew,
                                            { 
                                                backgroundColor: selectedChartType === 'heatmap' ? theme.primary : 'transparent',
                                                borderColor: theme.border
                                            },
                                        ]}
                                        onPress={() => setSelectedChartType('heatmap')}
                                        activeOpacity={0.8}
                                    >
                                      
                                        <Text style={[
                                            styles.chartTypeTextNew,
                                            { color: selectedChartType === 'heatmap' ? '#fff' : theme.primary }
                                        ]}>
                                            Heat
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
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
        marginBottom: 16,
    },
    controlsHeader: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    dataTypeSection: {
        flex: 1,
        paddingRight: 12,
    },
    chartTypeSection: {
        flex: 1,
        paddingLeft: 12,
    },
    controlLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dataTypeButtons: {
        flexDirection: 'row',
        gap: 6,
    },
    chartTypeButtons: {
        flexDirection: 'row',
        gap: 4,
    },
    dataTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    chartTypeButtonNew: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    dataTypeText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 0,
        letterSpacing: 0.1,
        textAlign: 'center',
    },
    chartTypeTextNew: {
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 3,
        letterSpacing: 0.1,
        textAlign: 'center',
    },
    divider: {
        width: 1,
        marginHorizontal: 8,
        alignSelf: 'stretch',
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