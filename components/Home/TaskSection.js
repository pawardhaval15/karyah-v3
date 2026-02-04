import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useIssuesByUser, useMyTasks } from '../../hooks/useTasks';
import { useTheme } from '../../theme/ThemeContext';
import TaskCard from './TaskCard';

const TaskSection = ({ navigation, loading: parentLoading }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('issues'); // Default to issues

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
        const isCompleted = (status === 'completed' || status === 'resolved' || progress === 100) && status !== 'reopen';
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

    // 3. Sorting
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...filtered].map(item => {
      const dateVal = new Date(item.endDate || item.dueDate || item.date || 0);
      const diff = dateVal.getTime() ? (dateVal - today) / (1000 * 60 * 60 * 24) : null;
      return { ...item, _sortDiff: diff };
    }).sort((a, b) => {
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
      if (isOverdueA && isOverdueB) return diffA - diffB;

      if (diffA !== null && diffB !== null) return diffA - diffB;
      if (diffA === null && diffB !== null) return 1;
      if (diffA !== null && diffB === null) return -1;
      return 0;
    });

    return sorted.slice(0, 8);
  }, [sourceData, debouncedSearch, activeTab]);

  const renderItem = useCallback(({ item, index }) => (
    <TouchableOpacity
      style={styles.cardWrapper}
      activeOpacity={0.8}
      onPress={() => handleCardPress(item)}
    >
      <View style={{ position: 'relative' }}>
        <TaskCard
          title={item.taskName || item.title || item.issueTitle || item.name || t('untitled')}
          project={item.project?.projectName || item.project || item.projectName}
          location={item.location || item.project?.location}
          percent={item.percent || item.progress || 0}
          desc={item.desc || item.description}
          date={item.date || item.dueDate || item.endDate}
          theme={theme}
          creatorName={item.creatorName || item.createdBy || item.creator?.name}
          isIssue={activeTab === 'issues'}
          issueStatus={item.status}
          isCritical={item.isCritical}
        />
        {/* {activeTab === 'issues' && item.isCritical && (
          <View style={styles.criticalDot} />
        )} */}
      </View>
    </TouchableOpacity>
  ), [handleCardPress, activeTab, theme, t]);

  const keyExtractor = useCallback((item, idx) => (item.id || item.taskId || idx).toString(), []);

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
      <View style={{ marginBottom: 12 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            ...(unresolvedIssues.length > 0 ? [{ id: 'issues', label: t('issues'), icon: 'alert-circle', color: '#FF5252', count: unresolvedIssues.length }] : []),
            { id: 'tasks', label: t('tasks'), icon: 'check-square', color: '#4CAF50', count: incompleteTasks.length }
          ]}
          contentContainerStyle={styles.tabRow}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tabButton,
                { borderColor: theme.border },
                activeTab === item.id && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab(item.id)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather
                  name={item.icon}
                  size={16}
                  color={activeTab === item.id ? '#fff' : item.color}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: theme.text },
                    activeTab === item.id && styles.activeTabText,
                  ]}>
                  {item.label}
                </Text>
                {item.count > 0 && (
                  <View
                    style={{
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      backgroundColor: activeTab === item.id ? 'rgba(255,255,255,0.3)' : `${item.color}30`,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginLeft: 6,
                      paddingHorizontal: 5,
                    }}>
                    <Text
                      style={{
                        color: activeTab === item.id ? '#fff' : item.color,
                        fontSize: 11,
                        fontWeight: 'bold',
                      }}>
                      {item.count}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

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

      {/* List Content */}
      <FlatList
        data={displayData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        contentContainerStyle={styles.listContainer}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={false}
      />
    </View>
  );
};

export default memo(TaskSection);

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 10,
  },
  cardWrapper: {
    width: '100%',
    marginBottom: 0,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  viewAll: {
    fontWeight: '400',
    fontSize: 14,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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

