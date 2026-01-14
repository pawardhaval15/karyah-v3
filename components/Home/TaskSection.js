import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useIssuesByUser, useMyTasks } from '../../hooks/useTasks';
import { useTheme } from '../../theme/ThemeContext';
import TaskCard from './TaskCard';

const TaskSection = ({ navigation, loading: parentLoading }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('issues'); // Default to tasks to avoid empty issue state switch blink

  // Debounce search input to avoid heavy re-renders on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: tasksRec = [], isLoading: tasksLoading } = useMyTasks();
  const { data: issuesRec = [], isLoading: issuesLoading } = useIssuesByUser();

  const loading = parentLoading || tasksLoading || issuesLoading;

  // Optimized navigation handlers
  const handleViewAll = useCallback(() => {
    activeTab === 'tasks'
      ? navigation.navigate('MyTasksScreen')
      : navigation.navigate('IssuesScreen');
  }, [navigation, activeTab]);

  const handleCardPress = useCallback((item) => {
    if (activeTab === 'tasks') {
      navigation.navigate('TaskDetails', { taskId: item.id || item.taskId });
    } else {
      navigation.navigate('IssueDetails', { issueId: item.id || item.issueId, section: 'assigned' });
    }
  }, [navigation, activeTab]);

  // Filter for badge count - Only Pending Issues
  const unresolvedIssues = useMemo(() => {
    return issuesRec.filter(issue => {
      const status = String(issue.status || '').toLowerCase();
      return status !== 'completed' && status !== 'resolved';
    });
  }, [issuesRec]);

  // Filter for badge count - Only Incomplete Tasks
  const incompleteTasks = useMemo(() => {
    return tasksRec.filter(task => {
      const isCompletedByPercent = (task.percent || task.progress || 0) === 100;
      const isCompletedByStatus = String(task.status || '').toLowerCase() === 'completed';
      return !isCompletedByPercent && !isCompletedByStatus;
    });
  }, [tasksRec]);

  // Select source data based on tab
  const sourceData = activeTab === 'tasks' ? tasksRec : issuesRec;

  // Centralized filter, search, sort, and limit logic
  const displayData = useMemo(() => {
    if (!sourceData) return [];

    // 1. Initial Filtering (Status-based)
    let filtered = sourceData.filter(item => {
      const status = String(item.status || '').toLowerCase();
      const progress = item.percent || item.progress || 0;

      if (activeTab === 'issues') {
        const isCompleted = status === 'completed' || status === 'resolved' || progress === 100;
        return !isCompleted;
      } else {
        const isCompleted = status === 'completed' || progress === 100;
        const isMarkedAsIssue = item.isIssue === true;
        return !isCompleted && !isMarkedAsIssue;
      }
    });

    // 2. Search (using debounced value)
    if (debouncedSearch) {
      const searchText = debouncedSearch.toLowerCase();
      filtered = filtered.filter((item) => {
        return (
          (item.title || item.taskName || item.issueTitle || item.name || '').toLowerCase().includes(searchText) ||
          (item.desc || item.description || '').toLowerCase().includes(searchText) ||
          (item.project?.projectName || item.project || item.projectName || '').toLowerCase().includes(searchText) ||
          (item.creatorName || item.createdBy || item.creator?.name || '').toLowerCase().includes(searchText)
        );
      });
    }

    // 3. Sorting (Optimized with pre-calculated date diffs)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...filtered].map(item => {
      // Pre-calculate date for sorting efficiency
      const dateVal = new Date(item.endDate || item.dueDate || item.date || 0);
      const diff = dateVal.getTime() ? (dateVal - today) / (1000 * 60 * 60 * 24) : null;
      return { ...item, _sortDiff: diff };
    }).sort((a, b) => {
      // Critical first for issues
      if (activeTab === 'issues') {
        if (a.isCritical && !b.isCritical) return -1;
        if (!a.isCritical && b.isCritical) return 1;
      }

      const diffA = a._sortDiff;
      const diffB = b._sortDiff;

      const isOverdueA = diffA !== null && diffA < 0;
      const isOverdueB = diffB !== null && diffB < 0;

      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;
      if (isOverdueA && isOverdueB) return diffA - diffB; // smallest number (most overdue) first

      if (diffA !== null && diffB !== null) return diffA - diffB;
      if (diffA === null && diffB !== null) return 1;
      if (diffA !== null && diffB === null) return -1;
      return 0;
    });

    // 4. Limit results (Home summary should be concise)
    return sorted.slice(0, 8);

  }, [sourceData, debouncedSearch, activeTab]);


  if (loading) {
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
        <TouchableOpacity onPress={handleViewAll}>
          <Text style={[styles.viewAll, { color: theme.primary }]}>{t('view_all')}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
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
      <View style={styles.gridContainer}>
        {displayData.map((item, idx) => (
          <TouchableOpacity
            key={(item.id || item.taskId || idx) + '_item'}
            style={styles.cardWrapper}
            activeOpacity={0.8}
            onPress={() => handleCardPress(item)}
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
              {activeTab === 'issues' && item.isCritical && (
                <View style={styles.criticalDot} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default memo(TaskSection);

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
    width: isTablet ? '23%' : '48%',
    marginBottom: 6,
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

