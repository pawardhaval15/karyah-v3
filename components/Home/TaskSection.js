import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

// Hooks
import { useTaskFilter } from '../../hooks/useTaskFilter';
import { useIssuesByUser, useMyTasks } from '../../hooks/useTasks';
import { useTheme } from '../../theme/ThemeContext';

// Components
import TaskCard from './TaskCard';

const TabItem = memo(({ item, isActive, onPress, theme }) => (
  <TouchableOpacity
    style={[
      styles.tabButton,
      { borderColor: theme.border },
      isActive && { backgroundColor: theme.primary, borderColor: theme.primary },
    ]}
    onPress={() => onPress(item.id)}
  >
    <View style={styles.tabContent}>
      <Feather
        name={item.icon}
        size={16}
        color={isActive ? '#fff' : item.color}
        style={styles.tabIcon}
      />
      <Text style={[styles.tabText, { color: isActive ? '#fff' : theme.text }]}>
        {item.label}
      </Text>
      {item.count > 0 && (
        <View style={[styles.badge, { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : `${item.color}20` }]}>
          <Text style={[styles.badgeText, { color: isActive ? '#fff' : item.color }]}>
            {item.count}
          </Text>
        </View>
      )}
    </View>
  </TouchableOpacity>
));

const TaskSection = ({ navigation, loading: parentLoading }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('issues');

  const { data: tasks = [], isLoading: tasksLoading } = useMyTasks();
  const { data: issues = [], isLoading: issuesLoading } = useIssuesByUser();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Derived state for counts
  const pendingIssueCount = useMemo(() =>
    issues.filter(i => !['completed', 'resolved'].includes(String(i.status || '').toLowerCase())).length,
    [issues]);

  const incompleteTaskCount = useMemo(() =>
    tasks.filter(t => (t.percent || t.progress || 0) < 100 && String(t.status || '').toLowerCase() !== 'completed').length,
    [tasks]);

  const displayData = useTaskFilter(tasks, issues, activeTab, debouncedSearch);

  const handleCardPress = useCallback((item) => {
    const screen = activeTab === 'tasks' ? 'TaskDetails' : 'IssueDetails';
    const params = activeTab === 'tasks'
      ? { taskId: item.id || item.taskId }
      : { issueId: item.id || item.issueId, section: 'assigned' };
    navigation.navigate(screen, params);
  }, [navigation, activeTab]);

  const tabs = [
    ...(pendingIssueCount > 0 ? [{ id: 'issues', label: t('issues'), icon: 'alert-circle', color: '#FF5252', count: pendingIssueCount }] : []),
    { id: 'tasks', label: t('tasks'), icon: 'check-square', color: '#4CAF50', count: incompleteTaskCount }
  ];

  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleCardPress(item)}
      style={styles.cardContainer}
    >
      <TaskCard
        title={item.taskName || item.title || item.issueTitle || item.name || t('untitled')}
        project={item.project?.projectName || item.project || item.projectName}
        location={item.location || item.project?.location}
        percent={item.percent || item.progress || 0}
        date={item.date || item.dueDate || item.endDate}
        theme={theme}
        isIssue={activeTab === 'issues'}
        issueStatus={item.status}
        isCritical={item.isCritical}
      />
    </TouchableOpacity>
  ), [handleCardPress, activeTab, theme, t]);

  if (parentLoading || tasksLoading || issuesLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t('my_issues_and_task')}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate(activeTab === 'tasks' ? 'MyTasksScreen' : 'IssuesScreen')}>
          <Text style={[styles.viewAll, { color: theme.primary }]}>{t('view_all')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={tabs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TabItem
            item={item}
            isActive={activeTab === item.id}
            onPress={setActiveTab}
            theme={theme}
          />
        )}
        style={styles.tabList}
        contentContainerStyle={styles.tabContainer}
        showsHorizontalScrollIndicator={false}
      />

      <View style={[styles.searchContainer, { backgroundColor: theme.SearchBar }]}>
        <Feather name="search" size={16} color={theme.secondaryText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={activeTab === 'issues' ? t('search_placeholder_issues') : t('search_placeholder_tasks')}
          placeholderTextColor={theme.secondaryText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={displayData}
        renderItem={renderItem}
        keyExtractor={(item, idx) => (item.id || item.taskId || idx).toString()}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Text style={{ color: theme.secondaryText }}>{t('no_items_found')}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    paddingBottom: 100,
  },
  loaderContainer: {
    padding: 30,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabList: {
    marginBottom: 15,
  },
  tabContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  cardContainer: {
    width: '100%',
  },
  emptyView: {
    alignItems: 'center',
    padding: 40,
  }
});

export default memo(TaskSection);
