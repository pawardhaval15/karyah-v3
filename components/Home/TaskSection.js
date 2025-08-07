import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../../theme/ThemeContext';
import { fetchAssignedIssues } from '../../utils/issues';
import { fetchMyTasks } from '../../utils/task'; // <-- im
import TaskCard from './TaskCard';

export default function TaskSection({ navigation, loading: parentLoading, refreshKey = 0 }) {
  const theme = useTheme();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('issues');
  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [tasksData, issuesData] = await Promise.all([fetchMyTasks(), fetchAssignedIssues()]);
        setTasks(tasksData || []);
        setIssues(issuesData || []);
        // console.log('Fetched tasks:', tasksData);
        // console.log('Fetched issues:', issuesData);
      } catch (err) {
        console.error('Error fetching tasks/issues:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  const data = activeTab === 'tasks' ? tasks : issues;
  const filtered = data.filter((item) =>
    (item.title || item.issueTitle || '').toLowerCase().includes(search.toLowerCase())
  );

  // Sort issues: critical first, then by creation date (newest first)
  const sortedData = activeTab === 'issues'
    ? filtered.sort((a, b) => {
      // First sort by critical status
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;

      // Then sort by creation date (newest first)
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    })
    : filtered.sort((a, b) => {
      // For tasks, sort by due date (closest first), then by creation date
      const dueDateA = new Date(a.endDate || a.dueDate || 0);
      const dueDateB = new Date(b.endDate || b.dueDate || 0);

      if (dueDateA.getTime() && dueDateB.getTime()) {
        return dueDateA.getTime() - dueDateB.getTime();
      }

      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
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
        {/* <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {activeTab === 'tasks' ? 'My Tasks' : 'My Issues'}
          <Text style={[styles.count, { color: theme.text }]}> {sortedData.length}</Text>
        </Text> */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          <Text >My Issues & Task</Text>
        </Text>
        <TouchableOpacity
          onPress={() =>
            activeTab === 'tasks'
              ? navigation.navigate('MyTasksScreen')
              : navigation.navigate('IssuesScreen')
          }
        >
          <Text style={[styles.viewAll, { color: theme.primary }]}>View All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
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
              Issues
            </Text>
            {issues.length > 0 && (
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: activeTab === 'issues'
                    ? 'rgba(255,255,255,0.3)'
                    : '#FF525230', // #FF5252 with alpha for light badge
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
                  {issues.length}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
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
              Tasks
            </Text>
            {tasks.length > 0 && (
              <View
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: activeTab === 'tasks'
                    ? 'rgba(255,255,255,0.3)'
                    : '#4CAF5030', // #4CAF50 with alpha for badge
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
                  {tasks.length}
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
          placeholder={`Search your ${activeTab}`}
          placeholderTextColor={theme.secondaryText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
        {sortedData.map((item, idx) => (
          <TouchableOpacity
            key={(item.title || item.issueTitle || '') + idx}
            style={styles.cardWrapper}
            activeOpacity={0.8}
            onPress={() =>
              activeTab === 'tasks'
                ? navigation.navigate('TaskDetails', { taskId: item.id || item.taskId })
                : navigation.navigate('IssueDetails', { issueId: item.id || item.issueId, section: 'assigned' })
            }>
            <TaskCard
              title={item.title || item.issueTitle || item.name || 'Untitled'}
              project={item.project?.projectName || item.project || item.projectName}
              percent={item.percent || item.progress || 0}
              desc={item.desc || item.description}
              date={item.date || item.dueDate || item.endDate}
              theme={theme}
              creatorName={item.creatorName || item.createdBy || item.creator?.name}
              isIssue={activeTab === 'issues'}
              issueStatus={item.issueStatus}
              isCritical={item.isCritical}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cardWrapper: {
    width: '49%',
    marginBottom: 9,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#363942',
  },
  count: {
    color: '#222',
    fontWeight: '600',
    fontSize: 20,
    marginLeft: 8,
  },
  countsmall: {
    color: '#222',
    fontWeight: '400',
    fontSize: 16,
    marginLeft: 8,
  },
  viewAll: {
    color: '#366CD9',
    fontWeight: '400',
    fontSize: 14,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeTab: {
    backgroundColor: '#366CD9',
  },
  tabText: {
    fontSize: 15,
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
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    color: '#363942',
    paddingVertical: 0,
  },
  searchIcon: {
    marginLeft: 8,
  },
});
