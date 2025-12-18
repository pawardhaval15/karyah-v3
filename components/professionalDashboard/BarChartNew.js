import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getProjectById, getProjectsByUserId } from '../../utils/project';

const screenWidth = Dimensions.get('window').width;

export default function ProjectsSnagLineChart({ theme, refreshKey }) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [selectedBar, setSelectedBar] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const fetchedProjects = await getProjectsByUserId();
        const projectsWithCounts = await Promise.all(
          fetchedProjects.map(async (proj) => {
            try {
              const details = await getProjectById(proj.id);
              // console.log(`Project details for ID ${proj.id}:`, details);

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
                (task) => (typeof task.progress === 'number' ? task.progress < 100 : true) // no progress means incomplete
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
  }, [refreshKey]);

  // Add debug logging
  // console.log('🔍 Projects Chart Data:', projects);
  // console.log(
  //   '🔍 Projects Chart Counts:',
  //   projects.map((p) => p.count)
  // );

  if (loading) {
    return <ActivityIndicator size="large" color={theme.primary} style={{ margin: 30 }} />;
  }

  // Show all projects, not just filtered ones for complete data visibility
  const displayProjects = projects.length > 0 ? projects : []; // Show all projects or empty array

  // Calculate dynamic chart width based on number of projects
  const dataPointSpacing = 60; // Spacing between data points
  const chartWidth = Math.max(screenWidth - 32, displayProjects.length * dataPointSpacing);

  // Helper function for consistent color coding
  const getProjectColor = (count) => {
    if (count === 0) return '#E5E7EB'; // Light gray for zero
    if (count >= 15) return '#DC2626'; // Red for critical
    if (count >= 8) return '#F59E0B'; // Amber for high
    if (count >= 3) return '#3B82F6'; // Blue for medium
    return '#10B981'; // Green for low
  };

  // Prepare chart data for line chart with better label management
  const chartData = {
    labels: displayProjects.length > 0 
      ? displayProjects.map((p) => {
          const name = p.name || 'Untitled';
          // Shorter labels to prevent overlap
          return name.length > 6 ? name.slice(0, 5) + '…' : name;
        })
      : ['No Data'], // Show placeholder when no data
    datasets: [
      {
        data: displayProjects.length > 0 
          ? displayProjects.map((p) => Math.max(p.count, 0))
          : [0], // Show zero line when no data
        color: (opacity = 1) => theme.primary || `rgba(54, 108, 217, ${opacity})`, // Line color
        strokeWidth: 3, // Line thickness
      },
    ],
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
      strokeDasharray: '',
      stroke: theme.border || '#E5E7EB',
      strokeOpacity: 0.3,
    },
    propsForLabels: {
      fontSize: 10,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.primary || '#366CD9',
    },
    fillShadowGradient: theme.primary || '#366CD9',
    fillShadowGradientOpacity: 0.1,
  };

  const handleDataPointClick = (data) => {
    // console.log('🔍 Data point clicked - Raw data:', data);

    // For LineChart onDataPointClick, data structure is simpler
    let index = -1;

    if (data && typeof data.index !== 'undefined') {
      index = data.index;
    } else if (data && typeof data.dataIndex !== 'undefined') {
      index = data.dataIndex;
    } else if (data && data.value && chartData?.datasets?.[0]?.data) {
      // Find index by matching the value in the dataset
      index = chartData.datasets[0].data.findIndex(val => Math.abs(val - data.value) < 0.01);
    }
    // console.log('🔍 Calculated index:', index);
    // console.log('🔍 Available projects:', displayProjects.length);

    if (index >= 0 && index < displayProjects.length && displayProjects[index]) {
      console.log('Selected project:', displayProjects[index]);
      setSelectedBar({ ...displayProjects[index], index });
    } else {
      console.log('Failed to find project at index:', index);
      // Fallback: show first project for testing
      if (displayProjects.length > 0) {
        console.log('Fallback: showing first project');
        setSelectedBar({ ...displayProjects[0], index: 0 });
      }
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBadge, { backgroundColor: `${theme.primary}20` }]}>
            <Ionicons name="trending-up" size={20} color={theme.primary} />
          </View>
          <View style={styles.titleContent}>
            <Text style={[styles.title, { color: theme.text }]}>Project Status</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              issues & tasks by project
            </Text>
          </View>
          <View style={[styles.totalBadge, { backgroundColor: theme.primary }]}>
            <Text style={[styles.totalText, { color: '#fff' }]}>
              {displayProjects.length > 0 ? projects.reduce((sum, p) => sum + p.count, 0) : 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Compact Legend */}
      <View style={styles.compactLegend}>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: theme.primary }]} />
          <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>Outstanding Items</Text>
        </View>
        <View style={styles.legendRow}>
          <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>Trend over projects</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartSection}>
        <View style={styles.chartContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            <View style={styles.chartWrapper}>
              <LineChart
                data={chartData}
                width={Math.max(screenWidth - 64, Math.max(displayProjects.length, 1) * 60)}
                height={220}
                chartConfig={chartConfig}
                verticalLabelRotation={0}
                fromZero={true}
                withInnerLines={true}
                withOuterLines={false}
                withVerticalLines={false}
                withHorizontalLines={true}
                withDots={displayProjects.length > 0}
                withShadow={displayProjects.length > 0}
                style={styles.chart}
                onDataPointClick={displayProjects.length > 0 ? handleDataPointClick : undefined}
              />

              {/* Add overlay for label touches - only when data available */}
              {displayProjects.length > 0 && (
                <View style={styles.labelTouchOverlay}>
                  {displayProjects.map((project, index) => {
                    const chartWidth = Math.max(screenWidth - 64, displayProjects.length * 60);
                    const dataPointSpacing = chartWidth / displayProjects.length;
                    const labelHeight = 40; // Estimate vertical label area
                    const paddingRight = 40; // Chart internal side padding, adjust if needed
                    const chartUsableWidth = Math.max(screenWidth - 64, displayProjects.length * 60) - paddingRight;
                    const labelLeft = paddingRight + index * chartUsableWidth / displayProjects.length;
                    return (
                      <TouchableOpacity
                        key={`label-touch-${index}`}
                        style={[
                          styles.labelTouchRegion,
                          {
                            left: labelLeft,
                            width: chartUsableWidth / displayProjects.length * 0.9, // 90% to cover most of label area
                            height: labelHeight,
                            top: 180, // as needed for label position
                            // borderColor: 'red',
                            // borderWidth: 1,
                          }
                        ]}
                        onPress={() => setSelectedBar({ ...project, index })}
                        activeOpacity={0.7}
                      >
                        {/* Optional: Highlight label on touch */}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Empty state overlay */}
              {displayProjects.length === 0 && (
                <View style={styles.emptyStateOverlay}>
                  <Ionicons name="bar-chart-outline" size={32} color={theme.border} />
                  <Text style={[styles.emptyStateText, { color: theme.secondaryText }]}>
                    No project data available
                  </Text>
                </View>
              )}
            </View>

          </ScrollView>
        </View>
      </View>

      {/* Enhanced Interactive Modal */}
      <Modal transparent visible={!!selectedBar} animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setSelectedBar(null)}
          activeOpacity={1}>
          <TouchableOpacity
            style={[
              styles.compactModal,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.projectIcon,
                  {
                    backgroundColor: getProjectColor(selectedBar?.count || 0),
                  },
                ]}>
                <Ionicons name="construct-outline" size={18} color="#fff" />
              </View>
              <View style={styles.projectDetails}>
                <Text style={[styles.projectName, { color: theme.text }]}>{selectedBar?.name}</Text>
                <Text style={[styles.projectDate, { color: theme.secondaryText }]}>
                  {selectedBar?.endDate
                    ? `Due: ${selectedBar.endDate.slice(0, 10)}`
                    : 'No due date'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBar(null)} style={styles.closeBtn}>
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
                    Open Issues
                  </Text>
                </View>
                <View style={[styles.metricItem, { backgroundColor: `#3B82F620` }]}>
                  <Text style={[styles.metricValue, { color: '#3B82F6' }]}>
                    {selectedBar?.incompleteTasks || 0}
                  </Text>
                  <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>
                    Pending Tasks
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.totalBox,
                  {
                    backgroundColor: `${getProjectColor(selectedBar?.count || 0)}15`,
                  },
                ]}>
                <Text
                  style={[
                    styles.totalNumber,
                    {
                      color: getProjectColor(selectedBar?.count || 0),
                    },
                  ]}>
                  {selectedBar?.count || 0}
                </Text>
                <Text style={[styles.totalLabel, { color: theme.secondaryText }]}>
                  Total Outstanding Items
                </Text>
              </View>

              <View
                style={[
                  styles.statusContainer,
                  {
                    backgroundColor: `${getProjectColor(selectedBar?.count || 0)}10`,
                  },
                ]}>
                <Text style={[styles.statusText, { color: theme.secondaryText }]}>
                  {selectedBar?.count >= 15
                    ? 'Critical: Immediate attention required'
                    : selectedBar?.count >= 8
                      ? '⚠️ High: Active monitoring needed'
                      : selectedBar?.count >= 3
                        ? '📈 Medium: Progressing well'
                        : selectedBar?.count > 0
                          ? 'Low: Nearly complete'
                          : 'Complete: Project on track!'}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: `${theme.primary}20` }]}
                  onPress={() => {
                    console.log('View project details:', selectedBar);
                    navigation.navigate('ProjectDetailsScreen', { projectId: selectedBar.id });
                    setSelectedBar(null);
                  }}>
                  <Ionicons name="eye-outline" size={16} color={theme.primary} />
                  <Text style={[styles.actionBtnText, { color: theme.primary }]}>View Details</Text>
                </TouchableOpacity>
              </View>
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
    left: 0,
    right: 0,
    height: 40,
    flexDirection: 'row',
    pointerEvents: 'box-none',
  },
  labelTouchRegion: {
    position: 'absolute',
    backgroundColor: 'transparent', // Invisible, only touchable
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },

  card: {
    borderRadius: 12,
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
  chartContainer: {
    width: '100%',
    alignItems: 'center',
  },
  chartWrapper: {
    position: 'relative',
  },
  emptyStateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
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
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180, // Cover the chart area, not labels
    flexDirection: 'row',
  },
  invisibleBar: {
    height: '100%',
    backgroundColor: 'transparent',
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
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  statusContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
