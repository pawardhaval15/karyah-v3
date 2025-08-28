import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { fetchAssignedIssues, fetchCreatedByMeIssues } from '../../utils/issues';

const screenWidth = Dimensions.get('window').width;

export default function IssuesPieChart({ theme }) {
    const [loading, setLoading] = useState(true);
    const [dataByPOC, setDataByPOC] = useState([]);
    const [selectedSlice, setSelectedSlice] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Get logged-in user info from AsyncStorage
                const loggedInUserIdRaw = await AsyncStorage.getItem('userId');
                const loggedInUserName = await AsyncStorage.getItem('userName');

                // Normalize logged-in userId to number if possible
                const loggedInUserId = loggedInUserIdRaw
                    ? (isNaN(Number(loggedInUserIdRaw)) ? loggedInUserIdRaw : Number(loggedInUserIdRaw))
                    : null;

                // Fetch both assigned and created by me issues
                const [assignedIssues, createdByMeIssues] = await Promise.all([
                    fetchAssignedIssues(),
                    fetchCreatedByMeIssues(),
                ]);

                // Helper to normalize issues for consistent assigned user info
                const normalizeIssues = (issues, isCreatedByMe = false) =>
                    issues.map(issue => ({
                        id: issue.issueId || issue.id,
                        status: (issue.issueStatus || '').toLowerCase(),
                        assignedUserId: isCreatedByMe ? issue.assignToUserId : issue.assignTo,
                        assignedUserName: isCreatedByMe ? issue.assignToUserName : null,
                    }));

                const normalizedCreated = normalizeIssues(createdByMeIssues, true);
                const normalizedAssigned = normalizeIssues(assignedIssues, false);

                // Create a map from assigned user ID to name using createdByMe data
                const userIdToName = {};
                normalizedCreated.forEach(issue => {
                    if (issue.assignedUserId && issue.assignedUserName) {
                        userIdToName[issue.assignedUserId] = issue.assignedUserName;
                    }
                });

                // For assigned issues, fill in user name from map or generate fallback name
                normalizedAssigned.forEach(issue => {
                    if (issue.assignedUserId && !userIdToName[issue.assignedUserId]) {
                        userIdToName[issue.assignedUserId] = `User-${issue.assignedUserId}`;
                    }
                });

                // Add logged-in user explicitly to userIdToName map
                if (loggedInUserId && loggedInUserName) {
                    userIdToName[loggedInUserId] = loggedInUserName;
                }

                // Filter unresolved issues helper
                const isUnresolved = (status) =>
                    !status || !['resolved', 'closed', 'done', 'completed'].includes(status);

                // Combine normalized lists filtering only unresolved
                const combinedIssues = [
                    ...normalizedCreated.filter(issue => isUnresolved(issue.status)),
                    ...normalizedAssigned.filter(issue => isUnresolved(issue.status)),
                ];

                // Group by assignedUserId counting issues
                const grouped = {};
                combinedIssues.forEach(issue => {
                    const userId = issue.assignedUserId;
                    if (userId) {
                        grouped[userId] = (grouped[userId] || 0) + 1;
                    }
                });

                // Prepare chart data array with better data validation
                const chartData = Object.entries(grouped)
                    .map(([userId, count]) => ({
                        userId: String(userId),
                        userName: userIdToName[userId] || `User-${userId}`,
                        count: Math.max(count, 0),
                    }))
                    .filter(item => item.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8); // Limit to 8 slices for better pie chart visibility

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

    // Helper function for consistent color coding
    const getIssueColor = (index, count) => {
        const colors = [
            '#FF2700', // Critical - red
            '#FF9500', // High - orange  
            '#366CD9', // Medium - primary blue
            '#10B981', // Low - green
            '#8B5CF6', // Purple
            '#F59E0B', // Amber
            '#EF4444', // Red variant
            '#06B6D4', // Cyan
        ];
        return colors[index % colors.length];
    };

    // Prepare pie chart data
    const pieData = dataByPOC.map((item, index) => ({
        name: item.userName,
        population: item.count,
        color: getIssueColor(index, item.count),
        legendFontColor: theme.text,
        legendFontSize: 12,
    }));

    const chartConfig = {
        backgroundColor: theme.card,
        backgroundGradientFrom: theme.card,
        backgroundGradientTo: theme.card,
        color: (opacity = 1) => theme.text,
        labelColor: (opacity = 1) => theme.text,
        style: {
            borderRadius: 8,
        },
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={[styles.iconBadge, { backgroundColor: `${theme.primary}20` }]}>
                        <Ionicons name="pie-chart" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.titleContent}>
                        <Text style={[styles.title, { color: theme.text }]}>Issues Distribution</Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                            by team member
                        </Text>
                    </View>
                    <View style={[styles.totalBadge, { backgroundColor: theme.primary }]}>
                        <Text style={styles.totalText}>
                            {dataByPOC.reduce((sum, item) => sum + item.count, 0)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Pie Chart */}
            <View style={styles.chartSection}>
                <PieChart
                    data={pieData}
                    width={screenWidth - 64}
                    height={180}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    center={[0, 0]}
                    absolute
                />
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                {dataByPOC.map((item, index) => (
                    <TouchableOpacity
                        key={item.userId}
                        style={styles.legendItem}
                        onPress={() => setSelectedSlice(item)}
                    >
                        <View style={[styles.legendDot, { backgroundColor: getIssueColor(index, item.count) }]} />
                        <Text ellipsizeMode='tail' numberOfLines={1} style={[styles.legendText, { color: theme.text }]}>
                            {item.userName} ({item.count})
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Modal for slice details */}
            <Modal transparent visible={!!selectedSlice} animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setSelectedSlice(null)}
                >
                    <View style={[styles.modal, { 
                        backgroundColor: theme.card, 
                        borderColor: theme.border 
                    }]}>
                        <View style={styles.modalHeader}>
                            <View style={[styles.userAvatar, { 
                                backgroundColor: getIssueColor(
                                    dataByPOC.findIndex(item => item.userId === selectedSlice?.userId),
                                    selectedSlice?.count || 0
                                )
                            }]}>
                                <Ionicons name="person" size={20} color="#fff" />
                            </View>
                            <View style={styles.userDetails}>
                                <Text style={[styles.userName, { color: theme.text }]}>
                                    {selectedSlice?.userName}
                                </Text>
                                <Text style={[styles.userRole, { color: theme.secondaryText }]}>
                                    Team Member
                                </Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => setSelectedSlice(null)}
                                style={styles.closeBtn}
                            >
                                <Ionicons name="close" size={18} color={theme.secondaryText} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalContent}>
                            <View style={[styles.metricBox, { 
                                backgroundColor: `${getIssueColor(
                                    dataByPOC.findIndex(item => item.userId === selectedSlice?.userId),
                                    selectedSlice?.count || 0
                                )}15` 
                            }]}>
                                <Text style={[styles.metricNumber, { 
                                    color: getIssueColor(
                                        dataByPOC.findIndex(item => item.userId === selectedSlice?.userId),
                                        selectedSlice?.count || 0
                                    )
                                }]}>
                                    {selectedSlice?.count}
                                </Text>
                                <Text style={[styles.metricText, { color: theme.secondaryText }]}>
                                    Unresolved Issues
                                </Text>
                                <Text style={[styles.percentageText, { color: theme.secondaryText }]}>
                                    {((selectedSlice?.count || 0) / dataByPOC.reduce((sum, item) => sum + item.count, 0) * 100).toFixed(1)}% of total
                                </Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
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
    chartSection: {
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
        paddingLeft: '50%',
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        paddingHorizontal: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        marginRight: 16,
        maxWidth: '45%',
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    legendText: {
        fontSize: 12,
        fontWeight: '500',
        flexShrink: 1,
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
    modal: {
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
    metricBox: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        width: '100%',
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
        marginBottom: 4,
    },
    percentageText: {
        fontSize: 11,
        fontWeight: '400',
        opacity: 0.7,
    },
});
