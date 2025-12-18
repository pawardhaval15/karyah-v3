import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { fetchMyTasks } from '../../utils/task';

const screenWidth = Dimensions.get('window').width;

export default function AssignedIssuesBarChart({ theme, refreshKey }) {
    const [loading, setLoading] = useState(true);
    const [dataByPOC, setDataByPOC] = useState([]);
    const [selectedBar, setSelectedBar] = useState(null);
    const [assignedIssues, setAssignedIssues] = useState([]);
    const [createdIssues, setCreatedIssues] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const loggedInUserIdRaw = await AsyncStorage.getItem('userId');
                const loggedInUserName = await AsyncStorage.getItem('userName');

                const loggedInUserId = loggedInUserIdRaw
                    ? (isNaN(Number(loggedInUserIdRaw)) ? loggedInUserIdRaw : Number(loggedInUserIdRaw))
                    : null;

                // Fetch all tasks for the user and filter for issues
                const allTasks = await fetchMyTasks();
                // console.log('Fetched all tasks:', allTasks);

                // Filter tasks that are issues (isIssue: true)
                const issueTasks = allTasks?.filter(task => task.isIssue === true) || [];
                // console.log('Filtered issue tasks:', issueTasks);

                // Separate assigned and created issues based on Task model structure
                const assignedIssues = issueTasks.filter(task => {
                    // Task is assigned to current user (in assignedUserIds array)
                    const assignedUserIds = task.assignedUserIds || [];
                    return assignedUserIds.includes(loggedInUserId);
                });

                const createdIssues = issueTasks.filter(task => {
                    // Task is created by current user
                    return task.creatorUserId === loggedInUserId;
                });

                // console.log('Assigned issues:', assignedIssues);
                // console.log('Created issues:', createdIssues);

                const normalizeTaskIssues = (tasks, isCreatedByMe = false) =>
                    tasks.map(task => ({
                        id: task.id,
                        status: (task.status || '').toLowerCase(), // Task model uses 'status' field
                        assignedUserId: isCreatedByMe 
                            ? (task.assignedUserIds && task.assignedUserIds[0]) // Get first assigned user for created issues
                            : task.creatorUserId, // For assigned issues, show creator
                        assignedUserName: isCreatedByMe 
                            ? (task.assignedUsers && task.assignedUsers[0]?.name) || 
                              (task.assignedUserDetails && task.assignedUserDetails[0]?.name) // Check both assignedUsers and assignedUserDetails
                            : task.creator?.name, // Get creator name
                        creatorUserId: task.creatorUserId,
                        isCritical: task.isCritical,
                        progress: task.progress,
                        resolvedImages: task.resolvedImages, // Include resolved images to check if issue is truly resolved
                    }));

                const normalizedCreated = normalizeTaskIssues(createdIssues, true);
                const normalizedAssigned = normalizeTaskIssues(assignedIssues, false);

                setAssignedIssues(normalizedAssigned);
                setCreatedIssues(normalizedCreated);

                // Build user ID to name mapping
                const userIdToName = {};
                normalizedCreated.forEach(issue => {
                    if (issue.assignedUserId && issue.assignedUserName) {
                        userIdToName[issue.assignedUserId] = issue.assignedUserName;
                    }
                });
                normalizedAssigned.forEach(issue => {
                    if (issue.assignedUserId && issue.assignedUserName) {
                        userIdToName[issue.assignedUserId] = issue.assignedUserName;
                    }
                });
                if (loggedInUserId && loggedInUserName) {
                    userIdToName[loggedInUserId] = loggedInUserName;
                }

                // Check if issue task is unresolved based on Task model status and resolution criteria
                const isUnresolved = (task) => {
                    const status = (task.status || '').toLowerCase();
                    const progress = task.progress || 0;
                    const hasResolvedImages = task.resolvedImages && task.resolvedImages.length > 0;
                    
                    // For issue tasks, consider them unresolved if:
                    // 1. Status is not 'completed', OR
                    // 2. Progress is less than 100%, OR  
                    // 3. No resolved images (issue not properly resolved), OR
                    // 4. Critical issues should always be shown for monitoring
                    return (
                        status !== 'completed' || 
                        progress < 100 || 
                        !hasResolvedImages ||
                        task.isCritical
                    );
                };

                // Combine and filter unresolved issues
                const combinedIssues = [
                    ...normalizedCreated.filter(isUnresolved),
                    ...normalizedAssigned.filter(isUnresolved),
                ];

                // Group by assigned user
                const grouped = {};
                combinedIssues.forEach(issue => {
                    const userId = issue.assignedUserId;
                    if (userId) {
                        grouped[userId] = (grouped[userId] || 0) + 1;
                    }
                });

                // Ensure current user is included even with 0 count
                if (loggedInUserId && !grouped[loggedInUserId]) {
                    grouped[loggedInUserId] = 0;
                }

                // Prepare chart data
                const chartData = Object.entries(grouped)
                    .map(([userId, count]) => ({
                        userId: String(userId),
                        userName: userIdToName[userId] || `User-${userId}`,
                        count: Math.max(count, 0),
                    }))
                    .filter(item => item.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 15);

                setDataByPOC(chartData);
            } catch (err) {
                console.error('Error fetching issues data:', err);
                setDataByPOC([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [refreshKey]);

    if (loading) {
        return <ActivityIndicator size="large" color={theme.primary} style={{ margin: 30 }} />;
    }

    // Always show chart container, even with no data
    const displayData = dataByPOC.length > 0 ? dataByPOC : [];

    const chartConfig = {
        backgroundColor: theme.card,
        backgroundGradientFrom: theme.card,
        backgroundGradientTo: theme.card,
        decimalPlaces: 0,
        color: (opacity = 1) => theme.secondaryText || `rgba(100, 100, 100, ${opacity})`,
        labelColor: (opacity = 1) => theme.secondaryText || `rgba(100, 100, 100, ${opacity})`,
        style: {
            borderRadius: 8,
        },
        propsForBackgroundLines: {
            strokeDasharray: "",
            stroke: theme.border || '#E5E7EB',
            strokeOpacity: 0.3,
        },
        barPercentage: 0.6,
        fillShadowGradient: 'transparent',
        fillShadowGradientOpacity: 0,
        propsForLabels: {
            fontSize: 10,
        },
    };
    const barWidth = 70;
    const chartWidth = Math.max(screenWidth - 32, Math.max(displayData.length, 1) * barWidth);

    const getIssueColor = (count) => {
        if (count === 0) return theme.border || '#E5E7EB';
        if (count >= 8) return '#FF2700'; // Critical red
        if (count >= 4) return '#FF9500'; // High orange
        if (count >= 2) return theme.primary || '#366CD9'; // Medium blue
        return '#10B981'; // Low green
    };

    const chartData = {
        labels: displayData.length > 0 
            ? displayData.map(item => {
                const name = item.userName || 'Unknown';
                return name.length > 8 ? name.slice(0, 6) + '…' : name;
              })
            : ['No Data'], // Show placeholder when no data
        datasets: [
            {
                data: displayData.length > 0 
                    ? displayData.map(item => Math.max(item.count, 1))
                    : [1], // Show minimum bar when no data
                colors: displayData.length > 0 
                    ? displayData.map(item => () => getIssueColor(item.count))
                    : [() => theme.border || '#E5E7EB'], // Gray color for empty state
            }
        ],
    };

    const handleBarPress = (data) => {
        // Don't handle press if no data available
        if (displayData.length === 0) return;
        
        const index = data.index;
        if (displayData[index]) {
            const userId = displayData[index].userId;

            // Check if issue task is unresolved based on Task model
            const isTaskUnresolved = (task) => {
                const status = (task.status || '').toLowerCase();
                const progress = task.progress || 0;
                const hasResolvedImages = task.resolvedImages && task.resolvedImages.length > 0;
                
                // For issue tasks, consider them unresolved if:
                // 1. Status is not 'completed', OR
                // 2. Progress is less than 100%, OR
                // 3. No resolved images (issue not properly resolved), OR
                // 4. Critical issues should always be shown for monitoring
                return (
                    status !== 'completed' || 
                    progress < 100 || 
                    !hasResolvedImages ||
                    task.isCritical
                );
            };

            // Count assigned unresolved issues for this user
            const assignedCount = assignedIssues.filter(
                issue => String(issue.assignedUserId) === userId && isTaskUnresolved(issue)
            ).length;

            // Count created unresolved issues assigned to this user  
            const createdCount = createdIssues.filter(
                issue => String(issue.assignedUserId) === userId && isTaskUnresolved(issue)
            ).length;

            setSelectedBar({ ...displayData[index], assignedCount, createdCount, index });
        }
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={[styles.iconBadge, { backgroundColor: `${theme.primary}20` }]}>
                        <Ionicons name="bar-chart" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.titleContent}>
                        <Text style={[styles.title, { color: theme.text }]}>Issues Analytics</Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>by team member</Text>
                    </View>
                    <View style={[styles.totalBadge, { backgroundColor: theme.primary }]}>
                        <Text style={styles.totalText}>
                            {displayData.length > 0 ? displayData.reduce((sum, item) => sum + item.count, 0) : 0}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.compactLegend}>
                <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
                    <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>Critical</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: '#FFB84D' }]} />
                    <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>Medium</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: theme.primary }]} />
                    <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>Low</Text>
                </View>
            </View>

            <View style={styles.chartSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator style={{ flexGrow: 0 }}>
                    <View style={{ width: chartWidth, position: 'relative' }}>
                        <BarChart
                            data={chartData}
                            width={chartWidth}
                            height={200}
                            chartConfig={chartConfig}
                            verticalLabelRotation={0}
                            showValuesOnTopOfBars={displayData.length > 0}
                            fromZero={true}
                            onDataPointClick={displayData.length > 0 ? handleBarPress : undefined}
                            style={styles.chart}
                        />

                        {/* Overlay for username label touch - only when data available */}
                        {displayData.length > 0 && (
                            <View style={styles.labelTouchOverlay}>
                                {displayData.map((item, index) => {
                                    const paddingRight = 40;
                                    const chartUsableWidth = chartWidth - paddingRight;
                                    const labelLeft = paddingRight + index * (chartUsableWidth / displayData.length);
                                    const labelWidth = (chartUsableWidth / displayData.length) * 0.9;
                                    const labelHeight = 40;
                                    const labelTop = 160;

                                    return (
                                        <TouchableOpacity
                                            key={`label-touch-${index}`}
                                            style={[
                                                styles.labelTouchRegion,
                                                {
                                                    position: 'absolute',
                                                    left: labelLeft,
                                                    top: labelTop,
                                                    width: labelWidth,
                                                    height: labelHeight,
                                                    backgroundColor: 'transparent',
                                                },
                                            ]}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                const userIdStr = String(item.userId);

                                                // Count unresolved issues assigned to user
                                                const assignedCount = assignedIssues.filter(
                                                    issue =>
                                                        (String(issue.assignedUserId) === userIdStr ||
                                                            String(issue.creatorUserId) === userIdStr) && // Include also where user is creator
                                                        !['resolved', 'closed', 'done', 'completed'].includes(issue.status)
                                                ).length;

                                                // Count unresolved issues created by user (same as before)
                                                const createdCount = createdIssues.filter(
                                                    issue =>
                                                        String(issue.assignedUserId) === userIdStr &&
                                                        !['resolved', 'closed', 'done', 'completed'].includes(issue.status)
                                                ).length;

                                                setSelectedBar({ ...item, assignedCount, createdCount, index });
                                            }}

                                        />
                                    );
                                })}
                            </View>
                        )}

                        {/* Empty state overlay */}
                        {displayData.length === 0 && (
                            <View style={styles.emptyStateOverlay}>
                                <Ionicons name="bar-chart-outline" size={32} color={theme.border} />
                                <Text style={[styles.emptyStateText, { color: theme.secondaryText }]}>
                                    No unresolved issues found
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>

            {/* Modal */}
            <Modal transparent visible={!!selectedBar} animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setSelectedBar(null)}
                    activeOpacity={1}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        style={[
                            styles.compactModal,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <View style={styles.modalHeader}>
                            <View style={[styles.userAvatar, { backgroundColor: getIssueColor(selectedBar?.count || 0) }]}>
                                <Ionicons name="person" size={20} color="#fff" />
                            </View>
                            <View style={styles.userDetails}>
                                <Text style={[styles.userName, { color: theme.text }]}>{selectedBar?.userName}</Text>
                                <Text style={[styles.userRole, { color: theme.secondaryText }]}>Team Member</Text>
                            </View>
                            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedBar(null)}>
                                <Ionicons name="close" size={18} color={theme.secondaryText} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <View style={styles.metricsRow}>
                                <View style={[styles.metricBox, { backgroundColor: '#FF6B6B20' }]}>
                                    <Text style={[styles.metricNumber, { color: '#FF6B6B' }]}>
                                        {selectedBar?.assignedCount ?? 0}
                                    </Text>
                                    <Text style={[styles.metricText, { color: theme.secondaryText }]}>
                                        Assigned Unresolved Issues
                                    </Text>
                                </View>
                                <View style={[styles.metricBox, { backgroundColor: '#3B82F620' }]}>
                                    <Text style={[styles.metricNumber, { color: '#3B82F6' }]}>
                                        {selectedBar?.createdCount ?? 0}
                                    </Text>
                                    <Text style={[styles.metricText, { color: theme.secondaryText }]}>
                                        Created Issues (Assigned to User)
                                    </Text>
                                </View>
                            </View>

                            <Text style={[styles.statusText, { color: theme.secondaryText }]}>
                                {(selectedBar?.assignedCount + selectedBar?.createdCount) >= 10
                                    ? 'Needs immediate attention'
                                    : (selectedBar?.assignedCount + selectedBar?.createdCount) >= 5
                                        ? 'Monitor closely'
                                        : (selectedBar?.assignedCount + selectedBar?.createdCount) > 0
                                            ? 'Manageable workload'
                                            : 'All issues resolved'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}


const styles = StyleSheet.create({
    labelTouchOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
        pointerEvents: 'box-none',
    },
    labelTouchRegion: {
        // style applied inline
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        minHeight: 300,
    },
    header: {
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    titleContent: {
        flex: 1,
    },
    title: {
        fontWeight: '700',
        fontSize: 16,
        lineHeight: 20,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.7,
    },
    totalBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    totalText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    compactLegend: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    legendLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    chartSection: {
        flex: 1,
        alignItems: 'center',
    },
    emptyStateOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    emptyStateText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 8,
        opacity: 0.6,
    },
    chart: {
        borderRadius: 8,
    },
    messageWrap: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    compactModal: {
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 280,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontWeight: '600',
        fontSize: 15,
        lineHeight: 18,
    },
    userRole: {
        fontSize: 12,
        marginTop: 1,
        opacity: 0.7,
    },
    closeBtn: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContent: {
        alignItems: 'center',
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    metricBox: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 8,
        width: '48%',
    },
    metricNumber: {
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 32,
        marginBottom: 4,
    },
    metricText: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.8,
        lineHeight: 16,
    },
});
