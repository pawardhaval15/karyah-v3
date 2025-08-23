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
import { getProjectById, getProjectsByUserId } from '../../utils/project';

const screenWidth = Dimensions.get('window').width;

export default function ProjectsSnagBarChart({ theme }) {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [selectedBar, setSelectedBar] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const fetchedProjects = await getProjectsByUserId();
                const projectsWithCounts = await Promise.all(
                    fetchedProjects.map(async (proj) => {
                        try {
                            const details = await getProjectById(proj.id);
                            console.log(`Project details for ID ${proj.id}:`, details);

                            // 1. Only UNRESOLVED issues
                            const issuesCount = Array.isArray(details.issues)
                                ? details.issues.filter(
                                    (issue) =>
                                        !issue.issueStatus || // no status = unresolved
                                        !['resolved', 'closed', 'done', 'completed'].includes(
                                            String(issue.issueStatus).toLowerCase()
                                        )
                                ).length
                                : 0;

                            // 2. Only INCOMPLETE tasks (progress < 100)
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
                                        : true // no progress means incomplete
                            ).length;

                            // Final count (exclude resolved issues and completed tasks)
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
                setProjects(projectsWithCounts);
            } catch (err) {
                console.error('Error fetching projects data:', err);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Add debug logging
    console.log('🔍 Projects Chart Data:', projects);
    console.log('🔍 Projects Chart Counts:', projects.map(p => p.count));

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

    // Show all projects, not just filtered ones for complete data visibility
    const displayProjects = projects; // Show all projects
    
    // Calculate dynamic chart width based on number of projects
    const barWidth = 80; // Width per bar including spacing
    const chartWidth = Math.max(screenWidth - 32, displayProjects.length * barWidth);
    
    // Helper function for consistent color coding
    const getProjectColor = (count) => {
        if (count === 0) return '#E5E7EB'; // Light gray for zero
        if (count >= 15) return '#DC2626'; // Red for critical
        if (count >= 8) return '#F59E0B'; // Amber for high
        if (count >= 3) return '#3B82F6'; // Blue for medium
        return '#10B981'; // Green for low
    };

    // Prepare chart data with better label management
    const chartData = {
        labels: displayProjects.map(p => {
            const name = p.name || 'Untitled';
            return name.length > 10 ? name.slice(0, 8) + '…' : name;
        }),
        datasets: [
            {
                data: displayProjects.map(p => Math.max(p.count, 0.1)), // Ensure no negative values, minimum 0.1 for visibility
                colors: displayProjects.map(p => () => getProjectColor(p.count))
            }
        ]
    };

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

    const handleBarPress = (data) => {
        const index = data.index;
        if (displayProjects[index]) {
            setSelectedBar({ ...displayProjects[index], index });
        }
    };

    return (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Compact Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={[styles.iconBadge, { backgroundColor: `${theme.primary}20` }]}>
                        <Ionicons name="construct" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.titleContent}>
                        <Text style={[styles.title, { color: theme.text }]}>Project Status</Text>
                        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
                            issues & tasks by project
                        </Text>
                    </View>
                    <View style={[styles.totalBadge, { backgroundColor: theme.primary }]}>
                        <Text style={[styles.totalText, { color: '#fff' }]}>
                            {projects.reduce((sum, p) => sum + p.count, 0)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Compact Legend */}
            <View style={styles.compactLegend}>
                <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: '#DC2626' }]} />
                    <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>Critical</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>High</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>Medium</Text>
                </View>
                <View style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>Low</Text>
                </View>
            </View>

            {/* Chart */}
            <View style={styles.chartSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.chartScrollContainer}>
                    <BarChart
                        data={chartData}
                        width={chartWidth} // Dynamic width based on number of projects
                        height={200}
                        chartConfig={chartConfig}
                        verticalLabelRotation={0}
                        showValuesOnTopOfBars={true}
                        fromZero={true}
                        onDataPointClick={handleBarPress}
                        style={styles.chart}
                    />
                </ScrollView>
            </View>

            {/* Compact Modern Modal */}
            <Modal transparent visible={!!selectedBar} animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={() => setSelectedBar(null)}
                >
                    <View style={[styles.compactModal, { 
                        backgroundColor: theme.card, 
                        borderColor: theme.border
                    }]}>
                        <View style={styles.modalHeader}>
                            <View style={[styles.projectIcon, { 
                                backgroundColor: getProjectColor(selectedBar?.count || 0)
                            }]}>
                                <Ionicons name="construct-outline" size={18} color="#fff" />
                            </View>
                            <View style={styles.projectDetails}>
                                <Text style={[styles.projectName, { color: theme.text }]}>
                                    {selectedBar?.name}
                                </Text>
                                <Text style={[styles.projectDate, { color: theme.secondaryText }]}>
                                    {selectedBar?.endDate ? `Due: ${selectedBar.endDate.slice(0, 10)}` : 'No due date'}
                                </Text>
                            </View>
                            <TouchableOpacity 
                                onPress={() => setSelectedBar(null)}
                                style={styles.closeBtn}
                            >
                                <Ionicons name="close" size={20} color={theme.secondaryText} />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modalContent}>
                            <View style={styles.metricsRow}>
                                <View style={[styles.metricItem, { backgroundColor: `#FF6B6B20` }]}>
                                    <Text style={[styles.metricValue, { color: '#FF6B6B' }]}>
                                        {selectedBar?.issuesCount || 0}
                                    </Text>
                                    <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>
                                        Issues
                                    </Text>
                                </View>
                                <View style={[styles.metricItem, { backgroundColor: `#3B82F620` }]}>
                                    <Text style={[styles.metricValue, { color: '#3B82F6' }]}>
                                        {selectedBar?.incompleteTasks || 0}
                                    </Text>
                                    <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>
                                        Tasks
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.totalBox, { 
                                backgroundColor: `${getProjectColor(selectedBar?.count || 0)}15` 
                            }]}>
                                <Text style={[styles.totalNumber, { 
                                    color: getProjectColor(selectedBar?.count || 0)
                                }]}>
                                    {selectedBar?.count || 0}
                                </Text>
                                <Text style={[styles.totalText, { color: theme.secondaryText }]}>
                                    Total Outstanding
                                </Text>
                            </View>
                            
                            <Text style={[styles.statusText, { color: theme.secondaryText }]}>
                                {selectedBar?.count >= 15 ? '🚨 Critical project needs attention' : 
                                 selectedBar?.count >= 8 ? '⚠️ Active monitoring required' : 
                                 selectedBar?.count >= 3 ? '📈 Progressing well' :
                                 selectedBar?.count > 0 ? '✅ Nearly complete' :
                                 '🎉 Project on track!'}
                            </Text>
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
        marginBottom: 12,
        width: '100%',
    },
    totalNumber: {
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 32,
        marginBottom: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.8,
        lineHeight: 16,
    },
});
