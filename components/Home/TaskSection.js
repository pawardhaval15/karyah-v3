import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../theme/ThemeContext';
import { fetchIssuesByUser } from '../../utils/issues';
import { fetchMyTasks } from '../../utils/task';
import TaskCard from './TaskCard';

export default function TaskSection({ navigation, loading: parentLoading, refreshKey = 0 }) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('issues');
  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tasksData, issuesData] = await Promise.all([fetchMyTasks(), fetchIssuesByUser()]);
        setTasks(tasksData || []);
        setIssues(issuesData || []);

        // Check if there are any valid PENDING issues
        const pendingIssues = (issuesData || []).filter(issue => {
          const status = String(issue.status || '').toLowerCase();
          return status !== 'completed' && status !== 'resolved';
        });

        // If no pending issues exist, force switch to 'tasks' tab
        if (pendingIssues.length === 0) {
          setActiveTab('tasks');
        }

      } catch (err) {
        console.error('Error fetching tasks/issues:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  // Filter for badge count - Only Pending
  const unresolvedIssues = issues.filter(issue => {
    const status = String(issue.status || '').toLowerCase();
    return status !== 'completed' && status !== 'resolved';
  });

  // Filter for badge count - Only Incomplete
  const incompleteTasks = tasks.filter(task => {
    const isCompletedByPercent = (task.percent || task.progress || 0) === 100;
    const isCompletedByStatus = String(task.status || '').toLowerCase() === 'completed';
    return !isCompletedByPercent && !isCompletedByStatus;
  });

  // Select data source
  const data = activeTab === 'tasks' ? tasks : issues;

  // 1. Search Filter
  const searchedData = data.filter((item) => {
    const searchText = search.toLowerCase();
    const commonFields = (
      (item.title || item.taskName || item.issueTitle || item.name || '').toLowerCase().includes(searchText) ||
      (item.desc || item.description || '').toLowerCase().includes(searchText) ||
      (item.project?.projectName || item.project || item.projectName || '').toLowerCase().includes(searchText) ||
      (item.creatorName || item.createdBy || item.creator?.name || '').toLowerCase().includes(searchText)
    );
    return commonFields;
  });

  // 2. Sort Logic
  const getDaysDiff = (item) => {
    const dateVal = new Date(item.endDate || item.dueDate || item.date || 0);
    if (!dateVal.getTime()) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.ceil((dateVal - today) / (1000 * 60 * 60 * 24));
  };

  const sortByDueLogic = (a, b) => {
    const diffA = getDaysDiff(a);
    const diffB = getDaysDiff(b);

    const isOverdueA = diffA !== null && diffA < 0;
    const isOverdueB = diffB !== null && diffB < 0;

    if (isOverdueA && !isOverdueB) return -1;
    if (!isOverdueA && isOverdueB) return 1;
    if (isOverdueA && isOverdueB) return diffA - diffB;
    if (diffA !== null && diffB !== null) return diffA - diffB;
    if (diffA === null && diffB !== null) return 1;
    if (diffA !== null && diffB === null) return -1;
    return 0;
  };

  const sortedData = activeTab === 'issues'
    ? searchedData.sort((a, b) => {
        // Critical first
        if (a.isCritical && !b.isCritical) return -1;
        if (!a.isCritical && b.isCritical) return 1;
        return sortByDueLogic(a, b);
      })
    : searchedData.sort(sortByDueLogic);

  // 3. FINAL DISPLAY FILTER (Removes completed items)
  const displayData = sortedData.filter(item => {
    const status = String(item.status || '').toLowerCase();
    const progress = item.percent || item.progress || 0;

    if (activeTab === 'issues') {
      // Hide if Completed or Resolved
      const isCompleted = status === 'completed' || status === 'resolved' || progress === 100;
      return !isCompleted;
    } else {
      // Hide if Completed, 100%, or marked as Issue
      const isCompleted = status === 'completed' || progress === 100;
      const isMarkedAsIssue = item.isIssue === true;
      return !isCompleted && !isMarkedAsIssue;
    }
  });

  if (parentLoading || loading) {
    return (
      <View style={{ margin: 20, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color={theme.primary || '#366CD9'} />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 120 }}>
      {/* Section Heading */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          <Text>{t('my_issues_and_task')}</Text>
        </Text>
        <TouchableOpacity
          onPress={() =>
            activeTab === 'tasks'
              ? navigation.navigate('MyTasksScreen')
              : navigation.navigate('IssuesScreen')
          }
        >
          <Text style={[styles.viewAll, { color: theme.primary }]}>{t('view_all')}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        
        {/* Only show Issues tab if there are unresolved issues */}
        {unresolvedIssues.length > 0 && (
          <TouchableOpacity
            style={[
              styles.tabButton,
              { borderColor: theme.border },
              activeTab === 'issues' && { backgroundColor: theme.primary },
            ]}
            onPress={() => setActiveTab('issues')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather
                name="alert-circle"
                size={16}
                color={activeTab === 'issues' ? '#fff' : '#FF5252'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: theme.text },
                  activeTab === 'issues' && styles.activeTabText,
                ]}>
                {t('issues')}
              </Text>
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: activeTab === 'issues' ? 'rgba(255,255,255,0.3)' : '#FF525230',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 6,
                  paddingHorizontal: 5,
                }}>
                <Text
                  style={{
                    color: activeTab === 'issues' ? '#fff' : '#FF5252',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}>
                  {unresolvedIssues.length}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.tabButton,
            { borderColor: theme.border },
            activeTab === 'tasks' && { backgroundColor: theme.primary },
          ]}
          onPress={() => setActiveTab('tasks')}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather
              name="check-square"
              size={16}
              color={activeTab === 'tasks' ? '#fff' : '#4CAF50'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabText,
                { color: theme.text },
                activeTab === 'tasks' && styles.activeTabText,
              ]}>
              {t('tasks')}
            </Text>
            {incompleteTasks.length > 0 && (
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: activeTab === 'tasks' ? 'rgba(255,255,255,0.3)' : '#4CAF5030',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 6,
                  paddingHorizontal: 5,
                }}>
                <Text
                  style={{
                    color: activeTab === 'tasks' ? '#fff' : '#4CAF50',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}>
                  {incompleteTasks.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Search */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={activeTab === 'issues' ? t('search_placeholder_issues') : t('search_placeholder_tasks')}
          placeholderTextColor={theme.secondaryText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Grid Content */}
      <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
        {displayData.map((item, idx) => (
          <TouchableOpacity
            key={(item.id || item.taskId || idx) + '_item'}
            style={styles.cardWrapper}
            activeOpacity={0.8}
            onPress={() =>
              activeTab === 'tasks'
                ? navigation.navigate('TaskDetails', { taskId: item.id || item.taskId })
                : navigation.navigate('IssueDetails', { issueId: item.id || item.issueId, section: 'assigned' })
            }
          >
            <View style={{ position: 'relative' }}>
              <TaskCard
                title={item.taskName || item.title || item.issueTitle || item.name || t('untitled')}
                project={item.project?.projectName || item.project || item.projectName}
                percent={item.percent || item.progress || 0}
                desc={item.desc || item.description}
                date={item.date || item.dueDate || item.endDate}
                theme={theme}
                creatorName={item.creatorName || item.createdBy || item.creator?.name}
                isIssue={activeTab === 'issues'}
                issueStatus={item.status}
                isCritical={item.isCritical}
              />
              {/* Only show red dot if it is an issue AND critical */}
              {activeTab === 'issues' && item.isCritical && (
                <View style={styles.criticalDot} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTablet ? 10 : 6,
    paddingHorizontal: isTablet ? 20 : 20,
    paddingBottom: isTablet ? 24 : 20,
  },
  cardWrapper: {
    width: isTablet ? '23%' : '49%',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: isTablet ? 20 : 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '500',
    color: '#363942',
  },
  viewAll: {
    color: '#366CD9',
    fontWeight: '400',
    fontSize: 14,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: isTablet ? 16 : 12,
    marginHorizontal: isTablet ? 20 : 20,
    marginBottom: isTablet ? 16 : 12,
  },
  tabButton: {
    paddingVertical: isTablet ? 10 : 8,
    paddingHorizontal: isTablet ? 20 : 10,
    borderRadius: isTablet ? 20 : 20,
    marginRight: isTablet ? 0 : 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabText: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '400',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: isTablet ? 16 : 12,
    marginHorizontal: isTablet ? 20 : 20,
    marginBottom: isTablet ? 16 : 12,
    paddingHorizontal: isTablet ? 20 : 16,
    paddingVertical: isTablet ? 16 : 12,
  },
  searchInput: {
    flex: 1,
    fontSize: isTablet ? 16 : 16,
    fontWeight: '400',
    color: '#363942',
    paddingVertical: 0,
  },
  criticalDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 10,
    elevation: 5,
  },
});
