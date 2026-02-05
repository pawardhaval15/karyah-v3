import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Components
import MyTasksFilterPanel from '../components/Task/MyTasksFilterPanel';
import MyTasksHeader from '../components/Task/MyTasksHeader';
import MyTasksTabs from '../components/Task/MyTasksTabs';
import TaskList from '../components/Task/TaskList';
import AddTaskPopup from '../components/popups/AddTaskPopup';
import BulkAssignPopup from '../components/popups/BulkAssignPopup';
import TagsManagementModal from '../components/popups/TagsManagementModal';

// Hooks
import { useMyTasks, useTaskMutations, useTasksCreatedByMe } from '../hooks/useTasks';
import { useTasksLogic } from '../hooks/useTasksLogic';
import { useTaskStore } from '../store/taskStore';
import { useTheme } from '../theme/ThemeContext';
import { fetchProjectsByUser, fetchUserConnections } from '../utils/issues';
import { getTasksByProjectId } from '../utils/task';
import { getWorklistsByProjectId } from '../utils/worklist';

/**
 * MyTasksScreen - A high-performance screen for managing personal and created tasks.
 * Optimized for large datasets with modular architecture and efficient state management.
 */
export default function MyTasksScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Zustand Store
  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    showFilters,
    setShowFilters,
    filters,
    toggleFilter,
    clearAllFilters,
    getActiveFiltersCount
  } = useTaskStore();

  // Data Queries
  const {
    data: myTasks = [],
    isLoading: loadingMyTasks,
    isError: errorMyTasks,
    refetch: refetchMyTasks
  } = useMyTasks();

  const {
    data: createdTasks = [],
    isLoading: loadingCreated,
    isError: errorCreated,
    refetch: refetchCreated
  } = useTasksCreatedByMe();

  // Mutations
  const { bulkAssign, updateTags, invalidateTasks } = useTaskMutations();

  // Local UI State
  const [showAddTaskPopup, setShowAddTaskPopup] = useState(false);
  const [showBulkAssignPopup, setShowBulkAssignPopup] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [selectedTaskForTags, setSelectedTaskForTags] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [worklists, setWorklists] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);

  const [addTaskForm, setAddTaskForm] = useState({
    taskName: '',
    projectId: '',
    taskWorklist: '',
    taskDeps: [],
    taskStart: '',
    taskEnd: '',
    taskAssign: '',
    taskDesc: '',
    tags: [],
    isIssue: false,
  });

  // Derived Data & Logic
  const currentTasksPool = activeTab === 'mytasks' ? myTasks : createdTasks;
  const isLoading = loadingMyTasks || loadingCreated;
  const isError = (errorMyTasks || errorCreated) && currentTasksPool.length === 0;

  const taskCounts = useMemo(() => ({
    mytasks: myTasks.length,
    createdby: createdTasks.length
  }), [myTasks.length, createdTasks.length]);

  const { filteredTasks, filterOptions } = useTasksLogic(
    currentTasksPool,
    searchQuery,
    filters,
    activeTab
  );

  // Initial Data Fetch
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [p, u] = await Promise.all([
          fetchProjectsByUser(),
          fetchUserConnections()
        ]);
        setProjects(p || []);
        setUsers(u || []);
      } catch (err) {
        console.error('[MyTasksScreen] Failed to load auxiliary data:', err);
      }
    };
    loadInitialData();
  }, []);

  // Fetch Project-Specific Details for Add Task Form
  useEffect(() => {
    const fetchProjectDetails = async () => {
      if (!addTaskForm.projectId) {
        setWorklists([]);
        setProjectTasks([]);
        return;
      }

      try {
        const token = await AsyncStorage.getItem('token');
        const [w, t] = await Promise.all([
          getWorklistsByProjectId(addTaskForm.projectId, token),
          getTasksByProjectId(addTaskForm.projectId)
        ]);
        setWorklists(w || []);
        setProjectTasks(t || []);
      } catch (e) {
        console.error('[MyTasksScreen] Failed to fetch project details:', e);
      }
    };
    fetchProjectDetails();
  }, [addTaskForm.projectId]);

  // Focus Handlers
  useFocusEffect(
    useCallback(() => {
      refetchMyTasks();
      refetchCreated();
      return () => {
        setIsSelectionMode(false);
        setSelectedTasks([]);
      };
    }, [refetchMyTasks, refetchCreated])
  );

  // Handlers
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        refetchMyTasks(),
        refetchCreated(),
        fetchProjectsByUser().then(setProjects),
        fetchUserConnections().then(setUsers)
      ]);
    } catch (error) {
      console.error('[MyTasksScreen] Refresh failed:', error);
    }
  }, [refetchMyTasks, refetchCreated]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    setSelectedTasks([]);
  }, []);

  const toggleTaskSelection = useCallback((taskId) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  }, []);

  const handleBulkAssignSubmit = useCallback(async (userIds) => {
    if (selectedTasks.length === 0) return;

    try {
      await bulkAssign.mutateAsync({
        taskIds: selectedTasks,
        userIds: userIds
      });

      setIsSelectionMode(false);
      setSelectedTasks([]);
      setShowBulkAssignPopup(false);
      Alert.alert(t('success'), t('tasks_assigned_successfully'));
    } catch (error) {
      Alert.alert(t('error'), t('failed_to_assign_tasks') + ': ' + error.message);
    }
  }, [selectedTasks, bulkAssign, t]);

  const handleTaskSubmit = useCallback((newTask) => {
    setShowAddTaskPopup(false);
    setAddTaskForm({
      taskName: '',
      projectId: '',
      taskWorklist: '',
      taskDeps: [],
      taskStart: '',
      taskEnd: '',
      taskAssign: '',
      taskDesc: '',
      tags: [],
      isIssue: false,
    });
    if (newTask) {
      invalidateTasks(newTask.worklistId, newTask.projectId);
      refetchMyTasks();
      refetchCreated();
    }
  }, [invalidateTasks, refetchMyTasks, refetchCreated]);

  const handleSaveTags = useCallback(async (taskId, newTags) => {
    try {
      const cleanedTags = newTags.filter(t => t && typeof t === 'string' && t.trim());
      await updateTags.mutateAsync({ taskId, tags: cleanedTags });
    } catch (error) {
      console.error('[MyTasksScreen] Tag update failed:', error);
      throw error;
    }
  }, [updateTags]);

  // UI Renderers
  if (isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Feather name="alert-circle" size={50} color={theme.secondaryText} />
        <Text style={{ color: theme.text, marginTop: 16, fontWeight: '700' }}>{t('something_went_wrong')}</Text>
        <TouchableOpacity onPress={handleRefresh} style={[styles.retryBtn, { backgroundColor: theme.primary }]}>
          <Text style={styles.retryBtnText}>{t('retry')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <MyTasksHeader
        navigation={navigation}
        theme={theme}
        t={t}
        isSelectionMode={isSelectionMode}
        selectedCount={selectedTasks.length}
        toggleSelectionMode={toggleSelectionMode}
        handleBulkAssign={() => setShowBulkAssignPopup(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        activeFiltersCount={getActiveFiltersCount()}
        setShowAddTaskPopup={setShowAddTaskPopup}
        activeTab={activeTab}
      />

      <MyTasksTabs
        theme={theme}
        t={t}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        taskCounts={taskCounts}
      />

      {showFilters && (
        <MyTasksFilterPanel
          theme={theme}
          t={t}
          filters={filters}
          filterOptions={filterOptions}
          toggleFilter={toggleFilter}
          clearAllFilters={clearAllFilters}
          setShowFilters={setShowFilters}
          activeTab={activeTab}
        />
      )}

      {isLoading && currentTasksPool.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <TaskList
          tasks={filteredTasks}
          theme={theme}
          isSelectionMode={isSelectionMode}
          selectedTasks={selectedTasks}
          onToggleSelection={toggleTaskSelection}
          onTaskPress={(item) => navigation.navigate('TaskDetails', { taskId: item.id || item.taskId || item._id })}
          onSubtaskNavigate={(id) => navigation.navigate('TaskDetails', { taskId: id })}
          onTagsManagement={(task) => { setSelectedTaskForTags(task); setShowTagsModal(true); }}
          activeTab={activeTab}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            getActiveFiltersCount() > 0 ? (
              <Text style={[styles.filteredResultsText, { color: theme.secondaryText }]}>
                {t('showing_results', { count: filteredTasks.length, total: currentTasksPool.length })}
              </Text>
            ) : null
          }
        />
      )}

      <AddTaskPopup
        visible={showAddTaskPopup}
        onClose={() => setShowAddTaskPopup(false)}
        values={addTaskForm}
        onChange={(f, v) => setAddTaskForm(prev => ({ ...prev, [f]: v }))}
        onSubmit={handleTaskSubmit}
        theme={theme}
        projects={projects}
        users={users}
        worklists={worklists}
        projectTasks={projectTasks}
      />

      <BulkAssignPopup
        visible={showBulkAssignPopup}
        onClose={() => setShowBulkAssignPopup(false)}
        onSubmit={handleBulkAssignSubmit}
        selectedTasksCount={selectedTasks.length}
        users={users}
        theme={theme}
        t={t}
      />

      <TagsManagementModal
        visible={showTagsModal}
        onClose={() => { setShowTagsModal(false); setSelectedTaskForTags(null); }}
        task={selectedTaskForTags}
        onSave={handleSaveTags}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filteredResultsText: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 10,
    fontStyle: 'italic',
  }
});
