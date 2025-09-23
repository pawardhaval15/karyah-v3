import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchMyTasks } from '../../utils/task';

export default function CriticalIssueCard({ onViewAll, theme, refreshKey = 0 }) {
  const [criticalIssues, setCriticalIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const numColumns = 2;

  useEffect(() => {
    const fetchCriticalIssues = async () => {
      try {
        setLoading(true);
        // Fetch all tasks and filter for issues that are critical or unresolved
        const allTasks = await fetchMyTasks();
        
        // Filter tasks that are issues (isIssue: true)
        const issueTasks = allTasks?.filter(task => task.isIssue === true) || [];
        
        // Filter for critical or unresolved issues
        const criticalOrUnresolvedIssues = issueTasks.filter(task => {
          const status = (task.status || '').toLowerCase();
          const progress = task.progress || 0;
          const hasResolvedImages = task.resolvedImages && task.resolvedImages.length > 0;
          
          // Show critical issues OR unresolved issues
          return task.isCritical || (
            status !== 'completed' || 
            progress < 100 || 
            !hasResolvedImages
          );
        });
        
        setCriticalIssues(criticalOrUnresolvedIssues);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching critical issues:', error);
        setCriticalIssues([]);
        setLoading(false);
      }
    };

    fetchCriticalIssues();
  }, [refreshKey]);

  // Filter for display (already filtered in useEffect, but keeping for any additional client-side filtering)
  const visibleIssues = criticalIssues.filter(issue => {
    const status = (issue.status || '').toLowerCase();
    const progress = issue.progress || 0;
    const hasResolvedImages = issue.resolvedImages && issue.resolvedImages.length > 0;
    
    // Show if not fully resolved
    return status !== 'completed' || progress < 100 || !hasResolvedImages || issue.isCritical;
  });

  return (
    <View style={[styles.card, { backgroundColor: theme.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Critical Issues</Text>
        <View style={[styles.totalBadge, { backgroundColor: '#FF4D4F' }]}>
          <Text style={styles.totalBadgeText}>{visibleIssues.length}</Text>
        </View>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={[styles.viewAllText, { color: theme.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
      ) : (
        <FlatList
          data={visibleIssues}
          keyExtractor={(item, index) =>
            (item.id?.toString() || index.toString())
          }
          key={`critical-issues-${numColumns}`}
          numColumns={numColumns}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.taskCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  flex: 1,
                  margin: 6,
                  minWidth: 0, // Prevent overflow
                },
              ]}
              onPress={() => {
                // Navigate to task details since these are tasks with isIssue flag
                console.log('Navigate to task details:', item.id);
                // You may want to navigate to a specific issue screen or task screen
                // navigation.navigate('TaskDetailsScreen', { taskId: item.id });
                
                // For now, using existing navigation - you may need to adjust this
                navigation.navigate('IssueDetails', {
                  issueId: item.id,
                  section: "assigned",
                });
              }}
              activeOpacity={0.85}
            >
              <View style={styles.content}>
                <View style={styles.row}>
                  <Text
                    style={[styles.taskTitle, { color: theme.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {typeof item.name === 'object' 
                      ? (item.name?.name || 'Untitled Issue')
                      : (item.name || 'Untitled Issue')
                    }
                  </Text>
                </View>
                <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text
                    style={[styles.taskSubTitle, { color: theme.secondaryText, flex: 1 }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {typeof item.project === 'object' 
                      ? (item.project?.projectName || item.project?.name || '—')
                      : (item.projectName || '—')
                    }
                  </Text>
                  <Text numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                      color:
                        item.status === 'Completed' ? theme.primary :
                          item.status === 'In Progress' ? '#FFC107' :
                            '#FF6F3C',
                      fontSize: 11,
                      fontWeight: '400',
                      textTransform: 'capitalize',
                      marginLeft: 6,
                      fontStyle: 'italic',
                      flexShrink: 0,
                      maxWidth: 60,
                    }}>
                    {item.isCritical ? 'Critical' : (item.status || 'Pending').replace(/([a-z])([A-Z])/g, '$1 $2')}
                  </Text>
                </View>
              </View>
              <View style={[styles.progressBarContainer, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: '100%',
                      backgroundColor: '#FF5252',
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const CARD_HEIGHT = 68;

const styles = StyleSheet.create({
  card: {
    marginBottom: 2,
    overflow: 'hidden',
    alignItems: 'stretch',
    backgroundColor: '#fff',
    height: undefined,
    justifyContent: 'space-between',
    padding: 0,
    paddingHorizontal: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#222',
    flex: 1,
  },
  totalBadge: {
    backgroundColor: '#FF4D4F',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBadgeText: {
    color: '#fff',
    fontWeight: '400',
    fontSize: 14,
  },
  viewAllText: {
    color: '#366CD9',
    fontWeight: '400',
    fontSize: 13,
  },
  taskCard: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 0,
    overflow: 'hidden',
    alignItems: 'stretch',
    backgroundColor: '#fff',
    height: CARD_HEIGHT,
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    marginBottom: 2,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginRight: 0,
  },
  taskSubTitle: {
    fontSize: 12,
    fontWeight: '400',
    flexShrink: 1,
    maxWidth: '100%',
    textAlign: 'left',
  },
  progressBarContainer: {
    flexDirection: 'row',
    height: 2,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  progressBar: {
    height: 2,
    borderRadius: 0,
  },
});