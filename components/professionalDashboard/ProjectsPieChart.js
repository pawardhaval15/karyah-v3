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
import { getProjectById, getProjectsByUserId } from '../../utils/project';

const screenWidth = Dimensions.get('window').width;

export default function ProjectsPieChart({ theme }) {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedSlice, setSelectedSlice] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const fetchedProjects = await getProjectsByUserId();
                const projectsWithCounts = await Promise.all(
                    fetchedProjects.map(async (proj) => {
                        try {
                            const details = await getProjectById(proj.id);

                            // Only UNRESOLVED issues
                            const issuesCount = Array.isArray(details.issues)
                                ? details.issues.filter(
                                    (issue) =>
                                        !issue.issueStatus || 
                                        !['resolved', 'closed', 'done', 'completed'].includes(
                                            String(issue.issueStatus).toLowerCase()
                                        )
                                ).length
                                : 0;

                            // Only INCOMPLETE tasks (progress < 100)
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
                                endDate: proj.endDate,
                                count: totalCount,
                                issuesCount,
                                incompleteTasks,
                            };
                        } catch {
                            return {
                                id: proj.id,
                                name: proj.projectName,
                                endDate: proj.endDate,
                                count: 0,
                                issuesCount: 0,
                                incompleteTasks: 0,
                            };
                        }
                    })
                );
                
                // Filter projects with count > 0 and limit to 8 for better pie visibility
                const filteredProjects = projectsWithCounts
                    .filter(proj => proj.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8);
                
                setProjects(filteredProjects);
            } catch (err) {
                console.error('Error fetching projects data:', err);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <ActivityIndicator size="large" color={theme.primary} style={{ margin: 30 }} />;
    }

    if (!projects.length) {
        return (
            <View style={styles.messageWrap}>
                <Text style={{ color: theme.text }}>No project data available</Text>
            </View>
        );
    }

    // Helper function for consistent color coding
    const getProjectColor = (index, count) => {
        const colors = [
            '#DC2626', // Critical - red
            '#F59E0B', // High - amber
            '#3B82F6', // Medium - blue
            '#10B981', // Low - green
            '#8B5CF6', // Purple
            '#F97316', // Orange
            '#EF4444', // Red variant
            '#06B6D4', // Cyan
        ];
        return colors[index % colors.length];
    };

    // Prepare pie chart data
    const pieData = projects.map((proj, index) => ({
        name: proj.name,
        population: proj.count,
        color: getProjectColor(index, proj.count),
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
                        <Text style={[styles.title, { color: theme.text }]}>Project Distribution</Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                            issues & tasks by project
                        </Text>
                    </View>
                    <View style={[styles.totalBadge, { backgroundColor: theme.primary }]}>
                        <Text style={styles.totalText}>
                            {projects.reduce((sum, proj) => sum + proj.count, 0)}
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
                {projects.map((proj, index) => (
                    <TouchableOpacity
                        key={proj.id}
                        style={styles.legendItem}
                        onPress={() => setSelectedSlice(proj)}
                    >
                        <View style={[styles.legendDot, { backgroundColor: getProjectColor(index, proj.count) }]} />
                        <Text style={[styles.legendText, { color: theme.text }]}>
                            {proj.name} ({proj.count})
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
                            <View style={[styles.projectIcon, { 
                                backgroundColor: getProjectColor(
                                    projects.findIndex(proj => proj.id === selectedSlice?.id),
                                    selectedSlice?.count || 0
                                )
                            }]}>
                                <Ionicons name="construct-outline" size={18} color="#fff" />
                            </View>
                            <View style={styles.projectDetails}>
                                <Text style={[styles.projectName, { color: theme.text }]}>
                                    {selectedSlice?.name}
                                </Text>
                                <Text style={[styles.projectDate, { color: theme.secondaryText }]}>
                                    {selectedSlice?.endDate ? `Due: ${selectedSlice.endDate.slice(0, 10)}` : 'No due date'}
                                </Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => setSelectedSlice(null)}
                                style={styles.closeBtn}
                            >
                                <Ionicons name="close" size={20} color={theme.secondaryText} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalContent}>
                            <View style={styles.metricsRow}>
                                <View style={[styles.metricItem, { backgroundColor: `#FF6B6B20` }]}>
                                    <Text style={[styles.metricValue, { color: '#FF6B6B' }]}>
                                        {selectedSlice?.issuesCount || 0}
                                    </Text>
                                    <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>
                                        Issues
                                    </Text>
                                </View>
                                <View style={[styles.metricItem, { backgroundColor: `#3B82F620` }]}>
                                    <Text style={[styles.metricValue, { color: '#3B82F6' }]}>
                                        {selectedSlice?.incompleteTasks || 0}
                                    </Text>
                                    <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>
                                        Tasks
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.totalBox, { 
                                backgroundColor: `${getProjectColor(
                                    projects.findIndex(proj => proj.id === selectedSlice?.id),
                                    selectedSlice?.count || 0
                                )}15` 
                            }]}>
                                <Text style={[styles.totalNumber, { 
                                    color: getProjectColor(
                                        projects.findIndex(proj => proj.id === selectedSlice?.id),
                                        selectedSlice?.count || 0
                                    )
                                }]}>
                                    {selectedSlice?.count || 0}
                                </Text>
                                <Text style={[styles.totalLabel, { color: theme.secondaryText }]}>
                                    Total Outstanding
                                </Text>
                                <Text style={[styles.percentageText, { color: theme.secondaryText }]}>
                                    {((selectedSlice?.count || 0) / projects.reduce((sum, proj) => sum + proj.count, 0) * 100).toFixed(1)}% of total
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
        maxWidth: 320,
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
    projectIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    projectDetails: {
        flex: 1,
    },
    projectName: {
        fontWeight: '600',
        fontSize: 15,
        lineHeight: 18,
    },
    projectDate: {
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
    metricItem: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 24,
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '500',
        opacity: 0.8,
    },
    totalBox: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        width: '100%',
    },
    totalNumber: {
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 32,
        marginBottom: 4,
    },
    totalLabel: {
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
