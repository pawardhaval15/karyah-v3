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
import { fetchAssignedIssues, fetchCreatedByMeIssues } from '../../utils/issues';

const screenWidth = Dimensions.get('window').width;

export default function AssignedIssuesBarChart({ theme }) {
    const [loading, setLoading] = useState(true);
    const [dataByPOC, setDataByPOC] = useState([]);
    const [selectedBar, setSelectedBar] = useState(null);
    const [assignedIssues, setAssignedIssues] = useState([]);
    const [createdByMeIssues, setCreatedByMeIssues] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const loggedInUserIdRaw = await AsyncStorage.getItem('userId');
                const loggedInUserName = await AsyncStorage.getItem('userName');

                const loggedInUserId = loggedInUserIdRaw
                    ? (isNaN(Number(loggedInUserIdRaw)) ? loggedInUserIdRaw : Number(loggedInUserIdRaw))
                    : null;

                // Fetch both assigned and created by me issues simultaneously
                const [assignedRaw, createdRaw] = await Promise.all([
                    fetchAssignedIssues(),
                    fetchCreatedByMeIssues(),
                ]);

                console.log('Fetched assignedIssues:', assignedRaw);
                console.log('Fetched createdByMeIssues:', createdRaw);

                const normalizeIssues = (issues, isCreatedByMe = false) =>
                    issues.map(issue => ({
                        id: issue.issueId || issue.id,
                        status: (issue.issueStatus || '').toLowerCase(),
                        assignedUserId: isCreatedByMe ? issue.assignToUserId : issue.assignTo,
                        assignedUserName: isCreatedByMe ? issue.assignToUserName : null,
                        creatorUserId: issue.creatorUserId,  // add creatorUserId to each issue
                    }));


                const normalizedCreated = normalizeIssues(createdRaw, true);
                const normalizedAssigned = normalizeIssues(assignedRaw, false);

                setAssignedIssues(normalizedAssigned); // preserve full normalized arrays
                setCreatedByMeIssues(normalizedCreated);

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

                if (loggedInUserId && !grouped[loggedInUserId]) {
                    grouped[loggedInUserId] = 0;
                }

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
    }, []);
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
    const chartWidth = Math.max(screenWidth - 32, dataByPOC.length * barWidth);

    const getIssueColor = (count) => {
        if (count === 0) return theme.border || '#E5E7EB';
        if (count >= 8) return '#FF2700'; // Critical red
        if (count >= 4) return '#FF9500'; // High orange
        if (count >= 2) return theme.primary || '#366CD9'; // Medium blue
        return '#10B981'; // Low green
    };

    const chartData = {
        labels: dataByPOC.map(item => {
            const name = item.userName || 'Unknown';
            return name.length > 8 ? name.slice(0, 6) + '…' : name;
        }),
        datasets: [
            {
                data: dataByPOC.map(item => Math.max(item.count, 1)),
                colors: dataByPOC.map(item => () => getIssueColor(item.count)),
            }
        ],
    };

    const handleBarPress = (data) => {
        const index = data.index;
        if (dataByPOC[index]) {
            const userId = dataByPOC[index].userId;

            const assignedCount = assignedIssues.filter(
                issue => String(issue.assignedUserId) === userId &&
                    !['resolved', 'closed', 'done', 'completed'].includes(issue.status)
            ).length;

            const createdCount = createdByMeIssues.filter(
                issue => String(issue.assignedUserId) === userId &&
                    !['resolved', 'closed', 'done', 'completed'].includes(issue.status)
            ).length;

            setSelectedBar({ ...dataByPOC[index], assignedCount, createdCount, index });
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color={theme.primary} style={{ margin: 30 }} />;
    }

    if (!dataByPOC.length) {
        return (
            <View style={styles.messageWrap}>
                <Text style={{ color: theme.text }}>No unresolved issues found</Text>
            </View>
        );
    }

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
                            {dataByPOC.reduce((sum, item) => sum + item.count, 0)}
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
                    <View style={{ width: chartWidth }}>
                        <BarChart
                            data={chartData}
                            width={chartWidth}
                            height={200}
                            chartConfig={chartConfig}
                            verticalLabelRotation={0}
                            showValuesOnTopOfBars={true}
                            fromZero={true}
                            onDataPointClick={handleBarPress}
                            style={styles.chart}
                        />

                        {/* Overlay for username label touch */}
                        <View style={styles.labelTouchOverlay}>
                            {dataByPOC.map((item, index) => {
                                const paddingRight = 40;
                                const chartUsableWidth = chartWidth - paddingRight;
                                const labelLeft = paddingRight + index * (chartUsableWidth / dataByPOC.length);
                                const labelWidth = (chartUsableWidth / dataByPOC.length) * 0.9;
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
                                            const createdCount = createdByMeIssues.filter(
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
                                        Created By Me Unresolved Issues
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
