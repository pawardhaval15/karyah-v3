import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import InlineSubtaskModal from '../components/Task/InlineSubtaskModal';
import TaskCard from '../components/Task/TaskCard';
import TaskPopup from '../components/popups/TaskPopup';
import { useUserConnections } from '../hooks/useConnections';
import { useTaskMutations, useTasksByProject, useTasksByWorklist, useWorklistProgress } from '../hooks/useTasks';
import { useTaskListUIStore } from '../store/taskListUIStore';
import { useTheme } from '../theme/ThemeContext';

// --- Memoized Components ---

const TaskItem = memo(({ item, modalTaskId, handleSubtaskPress, navigation, theme, closeModal }) => {
  const onTaskPress = useCallback(() => {
    navigation.navigate('TaskDetails', { task: item });
  }, [navigation, item]);

  const onSubtaskPressDetail = useCallback((subtaskName) => {
    navigation.navigate('TaskDetails', {
      task: { ...item, title: subtaskName },
    });
  }, [navigation, item]);

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <TaskCard
        task={item}
        onSubtaskPress={() => handleSubtaskPress(item.id)}
        onTaskPress={onTaskPress}
        theme={theme}
      />
      {modalTaskId === item.id && (
        <InlineSubtaskModal
          task={item}
          onClose={closeModal}
          theme={theme}
          onSubtaskPress={onSubtaskPressDetail}
        />
      )}
    </Animated.View>
  );
});

// --- Main Screen ---

export default function TaskListScreen({ navigation, route }) {
  const theme = useTheme();
  const { t } = useTranslation();

  const { project, worklist } = route.params || {};
  const projectId = project?.id || worklist?.projectId;
  const worklistId = worklist?.id;
  const worklistName = worklist?.name || 'Worklist';

  // --- Zustand Store ---
  const {
    search,
    setSearch,
    modalTaskId,
    setModalTaskId,
    showTaskPopup,
    setShowTaskPopup,
    showWorklistMenu,
    setShowWorklistMenu,
    editModalVisible,
    setEditModalVisible,
    editedWorklistName,
    setEditedWorklistName,
    taskForm,
    setTaskForm,
    resetTaskForm,
  } = useTaskListUIStore();

  // --- React Query ---
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks, isRefetching } = useTasksByWorklist(worklistId);
  const { data: projectTasks = [] } = useTasksByProject(projectId);
  const { data: worklistProgressData, refetch: refetchProgress } = useWorklistProgress(projectId, worklistId);
  const { data: users = [] } = useUserConnections();

  const {
    createTask: createTaskMutation,
    updateWorklist: updateWorklistMutation,
    deleteWorklist: deleteWorklistMutation,
  } = useTaskMutations();

  // --- Handlers ---

  const onRefresh = useCallback(async () => {
    refetchTasks();
    refetchProgress();
  }, [refetchTasks, refetchProgress]);

  useFocusEffect(
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );

  const handleSubtaskPress = useCallback((taskId) => {
    setModalTaskId(taskId === modalTaskId ? null : taskId);
  }, [modalTaskId, setModalTaskId]);

  const closeModal = useCallback(() => setModalTaskId(null), [setModalTaskId]);

  const handleTaskChange = useCallback((field, value) => {
    setTaskForm({ [field]: value });
  }, [setTaskForm]);

  const handleTaskSubmit = useCallback(async () => {
    try {
      await createTaskMutation.mutateAsync({
        ...taskForm,
        projectId,
        worklistId,
      });
      resetTaskForm();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create task');
    }
  }, [taskForm, projectId, worklistId, createTaskMutation, resetTaskForm]);

  const handleEditWorklist = useCallback(() => {
    setShowWorklistMenu(false);
    setEditedWorklistName(worklistName);
    setEditModalVisible(true);
  }, [worklistName, setShowWorklistMenu, setEditedWorklistName, setEditModalVisible]);

  const handleUpdateWorklist = useCallback(async () => {
    if (!editedWorklistName.trim()) {
      Alert.alert('Validation', 'Please enter a worklist name.');
      return;
    }
    try {
      await updateWorklistMutation.mutateAsync({ id: worklistId, name: editedWorklistName.trim() });
      setEditModalVisible(false);
      setEditedWorklistName('');
      navigation.setParams({
        ...route.params,
        worklist: { ...worklist, name: editedWorklistName.trim() },
      });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update worklist.');
    }
  }, [editedWorklistName, worklistId, worklist, updateWorklistMutation, setEditModalVisible, setEditedWorklistName, navigation, route.params]);

  const handleDeleteWorklist = useCallback(() => {
    setShowWorklistMenu(false);
    Alert.alert(
      'Delete Worklist',
      'Deleting this worklist will also delete all its associated tasks. Do you still want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorklistMutation.mutateAsync(worklistId);
              navigation.navigate('WorklistScreen', { project });
            } catch (error) {
              Alert.alert('Error', 'Failed to delete worklist.');
            }
          },
        },
      ]
    );
  }, [worklistId, project, deleteWorklistMutation, navigation, setShowWorklistMenu]);

  // --- Memoized Values ---

  const sortedTasks = useMemo(() => {
    return tasks
      .filter((t) => t.name?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const aCompleted = a.progress === 100;
        const bCompleted = b.progress === 100;
        if (aCompleted && !bCompleted) return 1;
        if (!aCompleted && bCompleted) return -1;
        return 0;
      });
  }, [tasks, search]);

  const progressInfo = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.progress === 100).length;
    const localPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total: worklistProgressData?.totalTasks ?? total,
      completed: worklistProgressData?.completedTasks ?? completed,
      percent: worklistProgressData?.progress ?? localPercent,
    };
  }, [tasks, worklistProgressData]);

  const renderItem = useCallback(({ item }) => (
    <TaskItem
      item={item}
      modalTaskId={modalTaskId}
      handleSubtaskPress={handleSubtaskPress}
      navigation={navigation}
      theme={theme}
      closeModal={closeModal}
    />
  ), [modalTaskId, handleSubtaskPress, navigation, theme, closeModal]);

  // --- Render ---

  if (tasksLoading && !isRefetching) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 20 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowWorklistMenu(true)} style={{ padding: 8 }}>
          <Feather name="more-vertical" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <Animated.View entering={FadeInRight.duration(500)}>
        <LinearGradient
          colors={[theme.secondary, theme.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{worklistName}</Text>
            <Text style={styles.bannerDesc}>
              {progressInfo.total} {t('tasks', { count: progressInfo.total })} • {progressInfo.completed} {t('completed')} • {progressInfo.percent}% {t('done')}
            </Text>
          </View>
          <TouchableOpacity style={styles.bannerAction} onPress={() => setShowTaskPopup(true)}>
            <Text style={styles.bannerActionText}>{t('task')}</Text>
            <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>
            {t('progress')} ({progressInfo.completed}/{progressInfo.total})
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.statusText, { color: theme.primary }]}>
              {progressInfo.percent}%
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
        <View style={[styles.progressBar, {
          width: `${progressInfo.percent}%`,
          backgroundColor: theme.primary
        }]} />
      </View>

      <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
        <MaterialIcons name="search" size={22} color={theme.text} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t('search_task')}
          placeholderTextColor={theme.secondaryText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={sortedTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={() => (
          !tasksLoading && (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="error-outline" size={42} color={theme.secondaryText} />
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                {t('no_tasks_found', { worklistName })}
              </Text>
            </View>
          )
        )}
      />

      <TaskPopup
        visible={showTaskPopup}
        onClose={resetTaskForm}
        values={taskForm}
        onChange={handleTaskChange}
        onSubmit={handleTaskSubmit}
        theme={theme}
        projectId={projectId}
        projectName={project?.name || worklistName}
        worklistId={worklistId}
        worklistName={worklistName}
        users={users}
        projectTasks={projectTasks}
      />

      {/* Menu / Edit Modals Implementation Simplified with Zustand */}
      <Modal visible={showWorklistMenu} transparent animationType="fade" onRequestClose={() => setShowWorklistMenu(false)}>
        <TouchableOpacity style={styles.menuDim} activeOpacity={1} onPress={() => setShowWorklistMenu(false)}>
          <View style={[styles.menuContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEditWorklist}>
              <MaterialIcons name="edit" size={18} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={{ color: theme.primary, fontWeight: '500', fontSize: 15 }}>{t('edit_worklist')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteWorklist}>
              <MaterialIcons name="delete-outline" size={18} color="#E53935" style={{ marginRight: 8 }} />
              <Text style={{ color: '#E53935', fontWeight: '500', fontSize: 15 }}>{t('delete_worklist')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('edit_worklist')}</Text>
            <TextInput
              placeholder={t('worklist_name')}
              placeholderTextColor={theme.secondaryText}
              value={editedWorklistName}
              onChangeText={setEditedWorklistName}
              style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={{ color: theme.secondaryText, fontSize: 16 }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateWorklist}>
                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 18,
    fontWeight: '400',
  },
  banner: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 110,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  bannerDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '400',
    maxWidth: '80%',
  },
  bannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerActionText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
  },
  progressSection: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontWeight: '400',
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontWeight: '500',
    fontSize: 14,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 6,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 6,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  searchIcon: {
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '300',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  menuDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  menuContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 55,
    right: 20,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
    minWidth: 160,
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    alignItems: 'center',
  },
});
