import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Components
import ProjectHeader from '../components/Project/ProjectHeader';
import WorklistItem from '../components/Project/WorklistItem';
import AddTaskPopup from '../components/popups/AddTaskPopup';
import DependencyChartPopup from '../components/popups/DependencyChartPopup';
import MaterialRequestPopup from '../components/popups/MaterialRequestPopup';

// Hooks
import { useUserConnections } from '../hooks/useConnections';
import { useProjectRoles } from '../hooks/useProjectRoles';
import {
  useDeleteProject,
  useLeaveProject,
  useProjectDetails,
  useProjectStatistics,
  useTransferOwnership
} from '../hooks/useProjects';
import { useTaskMutations, useTasksByProject } from '../hooks/useTasks';
import { useUserDetails } from '../hooks/useUser';
import { useWorklists } from '../hooks/useWorklists';
import { useWorklistUIStore } from '../store/worklistUIStore';
import { useTheme } from '../theme/ThemeContext';

/**
 * ProjectDetailsScreen - Modernized and modular version of the project overview.
 * Features a shared codebase for Android/iOS with optimized list rendering and 
 * decoupled business logic.
 */
export default function ProjectDetailsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const { project, projectId: routeProjectId } = route.params || {};
  const finalProjectId = routeProjectId || project?.id;

  // --- State Management ---
  const {
    isCreateModalVisible,
    setCreateModalVisible,
    newWorklistName,
    setNewWorklistName,
    resetCreateForm,
  } = useWorklistUIStore();

  const [menuVisible, setMenuVisible] = useState(false);
  const [showDependencyChart, setShowDependencyChart] = useState(false);
  const [showMaterialRequestPopup, setShowMaterialRequestPopup] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTeam, setShowTeam] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedWorklistForTask, setSelectedWorklistForTask] = useState(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const [addTaskForm, setAddTaskForm] = useState({
    taskName: '',
    projectId: finalProjectId,
    taskWorklist: '',
    taskDeps: [],
    taskStart: '',
    taskEnd: '',
    taskAssign: '',
    taskDesc: '',
    tags: [],
    isIssue: false,
  });

  // --- Data Layer Hooks ---
  const { data: user } = useUserDetails();
  const userId = user?.id || user?._id || user?.userId || user?.user_id;
  const userName = user?.name;

  const {
    data: projectDetails,
    isLoading: isProjectLoading,
    refetch: refetchProject,
    isFetching: isProjectRefetching
  } = useProjectDetails(finalProjectId);

  const { data: allStats = [] } = useProjectStatistics();
  const projectStats = useMemo(() =>
    allStats.find(s => (s.id || s._id) === finalProjectId),
    [allStats, finalProjectId]);

  const {
    worklists,
    worklistsProgress,
    isLoading: isWorklistsLoading,
    refetch: refetchWorklists,
    createWorklist,
    deleteWorklist,
    isRefreshing: isWorklistsRefreshing
  } = useWorklists(finalProjectId);

  const { data: users = [] } = useUserConnections();
  const { data: projectTasks = [] } = useTasksByProject(finalProjectId);

  // Mutations
  const { invalidateTasks } = useTaskMutations();
  const leaveMutation = useLeaveProject();
  const transferMutation = useTransferOwnership();
  const deleteProjectMutation = useDeleteProject();

  // Roles Logic (Extracted)
  const { isCreator, isCoAdmin } = useProjectRoles(projectDetails, userId, userName);

  // --- Side Effects & Handlers ---
  useFocusEffect(
    useCallback(() => {
      refetchProject();
      refetchWorklists();
    }, [refetchProject, refetchWorklists])
  );

  const onRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([refetchProject(), refetchWorklists()]);
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refetchProject, refetchWorklists]);

  const handleAddTaskChange = (field, value) => {
    setAddTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenAddTask = useCallback((worklist) => {
    if (worklist) {
      setSelectedWorklistForTask(worklist);
      setAddTaskForm(prev => ({
        ...prev,
        taskWorklist: worklist.id || worklist._id,
        projectId: finalProjectId
      }));
    } else {
      setSelectedWorklistForTask(null);
      setAddTaskForm(prev => ({
        ...prev,
        taskWorklist: '',
        projectId: finalProjectId
      }));
    }
    setShowAddTask(true);
  }, [finalProjectId]);

  const handleAddTaskSubmit = useCallback(async (newTask) => {
    const worklistId = newTask?.worklistId || selectedWorklistForTask?.id || selectedWorklistForTask?._id;

    // Ensure UI updates after task creation
    invalidateTasks(worklistId, finalProjectId);
    refetchWorklists();
    refetchProject();

    setShowAddTask(false);
    setAddTaskForm(prev => ({
      ...prev,
      taskName: '',
      taskWorklist: '',
      taskDeps: [],
      taskStart: '',
      taskEnd: '',
      taskAssign: '',
      taskDesc: '',
      tags: [],
      isIssue: false,
    }));
  }, [finalProjectId, invalidateTasks, refetchProject, refetchWorklists, selectedWorklistForTask]);

  const handleCreateWorklist = useCallback(async () => {
    if (!newWorklistName.trim()) return Alert.alert(t('validation'), t('enter_name'));
    try {
      await createWorklist({ name: newWorklistName.trim() });
      resetCreateForm();
    } catch (error) {
      Alert.alert(t('error'), error.message || t('failed_to_create_worklist'));
    }
  }, [newWorklistName, createWorklist, resetCreateForm, t]);

  const handleDeleteWorklist = useCallback((id) => {
    Alert.alert(t('delete'), t('confirm_delete_worklist'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => deleteWorklist(id) },
    ]);
  }, [deleteWorklist, t]);

  const handleLeaveProject = useCallback(() => {
    Alert.alert(t('leave_project'), t('leave_project_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('leave'),
        style: 'destructive',
        onPress: () => leaveMutation.mutate(finalProjectId, {
          onSuccess: () => navigation.navigate('Home'),
          onError: (err) => Alert.alert(t('error'), err.message)
        })
      },
    ]);
  }, [t, leaveMutation, finalProjectId, navigation]);

  const handleTransferOwnership = useCallback((id, name) => {
    Alert.alert(
      t('confirm_handover'),
      t('confirm_transfer_to', { name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: () => transferMutation.mutate({ projectId: finalProjectId, newOwnerId: id }, {
            onSuccess: () => {
              setShowTransferModal(false);
              Alert.alert(t('success'), t('ownership_transferred'));
              refetchProject();
            },
            onError: (err) => Alert.alert(t('error'), err.message)
          })
        }
      ]
    );
  }, [transferMutation, finalProjectId, t, refetchProject]);

  // --- Render Helpers ---
  const listHeader = useMemo(() => (
    <ProjectHeader
      projectDetails={projectDetails}
      projectStats={projectStats}
      theme={theme}
      onBack={() => navigation.goBack()}
      onMenu={() => setMenuVisible(true)}
      onMaterial={() => setShowMaterialRequestPopup(true)}
      onChat={() => navigation.navigate('ProjectDiscussionScreen', {
        projectId: finalProjectId,
        projectName: projectDetails?.projectName
      })}
      onDependency={() => setShowDependencyChart(true)}
      setShowTeam={setShowTeam}
      showTeam={showTeam}
      setCreateModalVisible={setCreateModalVisible}
      onAddTask={() => handleOpenAddTask()}
    />
  ), [projectDetails, projectStats, theme, navigation, finalProjectId, showTeam, setCreateModalVisible, handleOpenAddTask]);

  const renderItem = useCallback(({ item, index }) => (
    <WorklistItem
      item={item}
      index={index}
      navigation={navigation}
      progress={worklistsProgress.find(p => p.worklistId === item.id)}
      theme={theme}
      onDelete={handleDeleteWorklist}
      t={t}
      onAddTask={handleOpenAddTask}
    />
  ), [navigation, worklistsProgress, theme, handleDeleteWorklist, t, handleOpenAddTask]);

  if (isProjectLoading || isWorklistsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!projectDetails) {
    return (
      <View style={styles.loadingContainer}>
        <Feather name="alert-triangle" size={48} color={theme.secondaryText} />
        <Text style={{ color: theme.text, marginTop: 12 }}>{t('project_not_found')}</Text>
        <TouchableOpacity onPress={onRefresh} style={[styles.primaryBtn, { marginTop: 20 }]}>
          <Text style={styles.primaryBtnText}>{t('retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={worklists}
        keyExtractor={(item, index) => item.id || item._id || index.toString()}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={10}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color={theme.secondaryText} />
            <Text style={{ marginTop: 12, color: theme.secondaryText }}>{t('no_worklists_found')}</Text>
          </View>
        }
      />

      {/* Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuPopup, { backgroundColor: theme.card }]}>
            {(isCreator || isCoAdmin) && (
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setMenuVisible(false);
                navigation.navigate('UpdateProjectScreen', { projectId: finalProjectId });
              }}>
                <Feather name="edit" size={18} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>{t('edit_project')}</Text>
              </TouchableOpacity>
            )}

            {isCreator && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => {
                  setMenuVisible(false);
                  setShowTransferModal(true);
                }}>
                  <Feather name="repeat" size={18} color={theme.text} />
                  <Text style={[styles.menuText, { color: theme.text }]}>{t('handover')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => {
                  setMenuVisible(false);
                  Alert.alert(t('delete'), t('confirm_delete_project'), [
                    { text: t('cancel') },
                    {
                      text: t('delete'),
                      style: 'destructive',
                      onPress: () => deleteProjectMutation.mutate(finalProjectId, {
                        onSuccess: () => navigation.goBack()
                      })
                    }
                  ]);
                }}>
                  <Feather name="trash-2" size={18} color="#FF3B30" />
                  <Text style={[styles.menuText, { color: '#FF3B30' }]}>{t('delete')}</Text>
                </TouchableOpacity>
              </>
            )}

            {!isCreator && (
              <TouchableOpacity style={styles.menuItem} onPress={() => {
                setMenuVisible(false);
                handleLeaveProject();
              }}>
                <Feather name="log-out" size={18} color="#FF3B30" />
                <Text style={[styles.menuText, { color: '#FF3B30' }]}>{t('leave_project')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transfer Ownership Modal */}
      <Modal visible={showTransferModal} transparent animationType="slide" onRequestClose={() => setShowTransferModal(false)}>
        <View style={styles.bottomModalOverlay}>
          <View style={[styles.bottomModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('handover_project')}</Text>
            <FlatList
              data={projectDetails?.coAdmins || []}
              keyExtractor={(item, index) => item.id || item._id || index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.memberListItem, { backgroundColor: theme.secCard }]}
                  onPress={() => handleTransferOwnership(item.id, item.name)}
                >
                  <Image
                    source={{ uri: item.profilePhoto || `https://ui-avatars.com/api/?name=${item.name}` }}
                    style={styles.memberAvatar}
                  />
                  <View>
                    <Text style={[styles.memberName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: theme.secondaryText }}>{t('co_admin')}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: theme.secondaryText, marginVertical: 20 }}>
                  {t('no_coadmins_available')}
                </Text>
              }
            />
            <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => setShowTransferModal(false)}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Worklist Modal */}
      <Modal visible={isCreateModalVisible} transparent animationType="slide" onRequestClose={resetCreateForm}>
        <View style={styles.bottomModalOverlay}>
          <View style={[styles.bottomModalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{t('new_worklist')}</Text>
            <TextInput
              placeholder={t('worklist_name_placeholder')}
              placeholderTextColor={theme.secondaryText}
              style={[styles.modalInput, { backgroundColor: theme.secCard, color: theme.text }]}
              value={newWorklistName}
              onChangeText={setNewWorklistName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, padding: 16 }} onPress={resetCreateForm}>
                <Text style={{ textAlign: 'center', color: theme.secondaryText }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 2, backgroundColor: theme.primary }]} onPress={handleCreateWorklist}>
                <Text style={styles.primaryBtnText}>{t('create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AddTaskPopup
        visible={showAddTask}
        onClose={() => setShowAddTask(false)}
        values={addTaskForm}
        onChange={handleAddTaskChange}
        onSubmit={handleAddTaskSubmit}
        theme={theme}
        projectId={finalProjectId}
        projectName={projectDetails?.projectName}
        worklistId={selectedWorklistForTask?.id}
        worklistName={selectedWorklistForTask?.name}
        projects={[{ id: finalProjectId, projectName: projectDetails?.projectName }]}
        users={users}
        worklists={worklists}
        projectTasks={projectTasks}
      />

      {showDependencyChart && (
        <DependencyChartPopup
          visible={true}
          onClose={() => setShowDependencyChart(false)}
          projectId={finalProjectId}
        />
      )}

      <MaterialRequestPopup
        visible={showMaterialRequestPopup}
        onClose={() => setShowMaterialRequestPopup(false)}
        projectId={finalProjectId}
        theme={theme}
        users={users}
      />
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  menuPopup: {
    position: 'absolute',
    top: 60,
    right: 20,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 160,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  menuItem: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontWeight: '600' },
  bottomModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomModalContent: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '80%'
  },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  modalInput: { padding: 16, borderRadius: 16, fontSize: 16, marginBottom: 24 },
  primaryBtn: { padding: 16, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '800' },
  memberListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12
  },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  memberName: { fontSize: 16, fontWeight: '700' },
});
