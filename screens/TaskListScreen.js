import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import InlineSubtaskModal from '../components/Task/InlineSubtaskModal';
import TaskCard from '../components/Task/TaskCard';
import TaskPopup from '../components/popups/TaskPopup';
import { useTheme } from '../theme/ThemeContext';
import { fetchUserConnections } from '../utils/issues';
import { getProjectById } from '../utils/project';
import { getTasksByProjectId, getTasksByWorklistId } from '../utils/task';
import { deleteWorklist, getProjectWorklistsProgress, updateWorklist } from '../utils/worklist';
import { useTranslation } from 'react-i18next';
export default function TaskListScreen({ navigation, route }) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [modalTaskId, setModalTaskId] = useState(null);
  const [showTaskPopup, setShowTaskPopup] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskForm, setTaskForm] = useState({
    taskName: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    progress: 0,
  });
  const [projectName, setProjectName] = useState('');
  const { project, worklist } = route.params || {};
  const projectId = project?.id || worklist?.projectId;
  const worklistId = worklist?.id;
  const worklistName = worklist?.name || 'Worklist';
  const [refreshing, setRefreshing] = useState(false);
  const [projectTasks, setProjectTasks] = useState([]); // ALL tasks in the project
  const { t } = useTranslation();
  // New state variables for worklist menu
  const [showWorklistMenu, setShowWorklistMenu] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedWorklistName, setEditedWorklistName] = useState('');
  const [worklistProgress, setWorklistProgress] = useState(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchTasks(),
      fetchAllProjectTasks(),
      fetchWorklistProgress(),
    ]);
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      if (worklistId && projectId) {
        fetchTasks();
        fetchAllProjectTasks();
        fetchWorklistProgress();
      }
    }, [worklistId, projectId])
  );

  useEffect(() => {
    const fetchProject = async () => {
      if (projectId) {
        try {
          const projectData = await getProjectById(projectId);
          setProjectName(projectData.name || projectData.projectName || 'Project');
        } catch (err) {
          console.error('Failed to fetch project:', err.message);
          setProjectName('Project Not Found');
        }
      }
    };
    fetchProject();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      if (!worklistId) {
        console.warn('No worklistId provided');
        setTasks([]);
        return;
      }
      const fetchedTasks = await getTasksByWorklistId(worklistId);
      setTasks(fetchedTasks || []);
    } catch (err) {
      console.error('Failed to load tasks:', err.message);
      setTasks([]);
    }
  };

  const fetchAllProjectTasks = async () => {
    try {
      if (!projectId) {
        console.warn('No projectId provided');
        setProjectTasks([]);
        return;
      }
      const allProjectTasks = await getTasksByProjectId(projectId);
      setProjectTasks(allProjectTasks || []);
    } catch (err) {
      console.error('Failed to load project tasks:', err.message);
      setProjectTasks([]);
    }
  };

  const fetchWorklistProgress = async () => {
    try {
      if (!projectId || !worklistId) {
        console.warn('No projectId or worklistId provided for progress');
        return;
      }
      const token = await AsyncStorage.getItem('token');
      const progressData = await getProjectWorklistsProgress(projectId, token);
      const currentWorklistProgress = progressData.find(p => p.worklistId === worklistId);
      setWorklistProgress(currentWorklistProgress);
    } catch (err) {
      console.error('Failed to load worklist progress:', err.message);
      setWorklistProgress(null);
    }
  };

  // Initial load
  useEffect(() => {
    const init = async () => {
      if (!worklistId || !projectId) return;

      setLoading(true);
      try {
        await Promise.all([
          fetchTasks(), 
          fetchAllProjectTasks(),
          fetchWorklistProgress()
        ]);
      } catch (err) {
        console.error('Initial load failed:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [worklistId, projectId]);

  const filtered = tasks.filter((t) => t.name?.toLowerCase().includes(search.toLowerCase()));
  // Sort: incomplete at top, completed (100%) at bottom
  const sortedTasks = filtered.slice().sort((a, b) => {
    const aCompleted = a.progress === 100;
    const bCompleted = b.progress === 100;
    if (aCompleted && !bCompleted) return 1;
    if (!aCompleted && bCompleted) return -1;
    return 0;
  });

  // Calculate worklist progress locally (fallback)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.progress === 100).length;
  const localProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Use API progress if available, otherwise fall back to local calculation
  const currentProgress = worklistProgress?.progress ?? localProgress;

  // Get progress color - single blue color
  const getProgressColor = () => {
    return '#366CD9'; // Always blue, matching the banner gradient
  };

  const handleSubtaskPress = (taskId) => {
    setModalTaskId(taskId === modalTaskId ? null : taskId);
  };

  const handleTaskChange = (field, value) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const data = await fetchUserConnections();
        setUsers(data || []);
      } catch (err) {
        console.error('Error fetching users:', err.message);
      }
    };
    fetchConnections();
  }, []);

  const handleTaskSubmit = () => {
    // implement API call to create task
    setShowTaskPopup(false);
    setTaskForm({
      taskName: '',
      description: '',
      assignedTo: '',
      dueDate: '',
    });
  };

  // Worklist menu handlers
  const handleEditWorklist = () => {
    setShowWorklistMenu(false);
    setEditedWorklistName(worklistName);
    setEditModalVisible(true);
  };

  const handleDeleteWorklist = () => {
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
              const token = await AsyncStorage.getItem('token');
              await deleteWorklist(worklistId, token);
              
              // Navigate back and trigger refresh on the previous screen
              navigation.navigate('WorklistScreen', { 
                project: project,
                refresh: Date.now() // Add timestamp to trigger refresh
              });
            } catch (error) {
              console.error('Failed to delete worklist:', error.message);
              Alert.alert('Error', 'Failed to delete worklist.');
            }
          },
        },
      ]
    );
  };

  const handleUpdateWorklist = async () => {
    if (!editedWorklistName.trim()) {
      Alert.alert('Validation', 'Please enter a worklist name.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      await updateWorklist(worklistId, editedWorklistName.trim(), token);
      setEditModalVisible(false);
      setEditedWorklistName('');
      // Update the route params with new name
      navigation.setParams({
        ...route.params,
        worklist: { ...worklist, name: editedWorklistName.trim() },
      });
    } catch (error) {
      console.error('Failed to update worklist:', error.message);
      Alert.alert('Error', error.message || 'Failed to update worklist.');
    }
  };
  const closeModal = () => setModalTaskId(null);
  const renderItem = ({ item }) => (
    <>
      <TaskCard
        task={item}
        onSubtaskPress={() => handleSubtaskPress(item.id)}
        onTaskPress={() => navigation.navigate('TaskDetails', { task: item })}
        theme={theme}
      />
      {modalTaskId === item.id && (
        <InlineSubtaskModal
          task={item}
          onClose={closeModal}
          theme={theme}
          onSubtaskPress={(subtaskName) =>
            navigation.navigate('TaskDetails', {
              task: { ...item, title: subtaskName },
            })
          }
        />
      )}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        paddingBottom: 0
      }}>
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setShowWorklistMenu(true)} 
          style={{ padding: 8 }}
        >
          <Feather name="more-vertical" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <LinearGradient
        colors={['#011F53', '#366CD9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>{worklistName}</Text>
          <Text style={styles.bannerDesc}>
            {worklistProgress?.totalTasks || totalTasks} {t('tasks', { count: worklistProgress?.totalTasks || totalTasks })} • {worklistProgress?.completedTasks || completedTasks} {t('completed')} • {currentProgress}% {t('done')}
          </Text>
        </View>
        <TouchableOpacity style={styles.bannerAction} onPress={() => setShowTaskPopup(true)}>
          <Text style={styles.bannerActionText}>{t('task')}</Text>
          <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Progress Section */}
      <View style={styles.progressSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>
            {t('progress')} ({worklistProgress?.completedTasks || completedTasks}/{worklistProgress?.totalTasks || totalTasks})
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getProgressColor() }]} />
            <Text style={[styles.statusText, { color: getProgressColor() }]}>
              {currentProgress}%
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBar, { 
          width: `${currentProgress}%`, 
          backgroundColor: getProgressColor() 
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
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.text, marginTop: 10 }}>Loading tasks...</Text>
        </View>
      ) : sortedTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={42} color="#AAA" />
          <Text style={styles.emptyText}>{t('no_tasks_found', { worklistName })}</Text>
        </View>
      ) : (
        <FlatList
          data={sortedTasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]} // Android
              tintColor={theme.primary} // iOS
            />
          }
        />
      )}
      <TaskPopup
        visible={showTaskPopup}
        onClose={() => setShowTaskPopup(false)}
        values={taskForm}
        onChange={handleTaskChange}
        onSubmit={handleTaskSubmit}
        theme={theme}
        projectId={projectId}
        projectName={projectName}
        worklistId={worklistId}
        worklistName={worklistName}
        users={users}
        projectTasks={projectTasks}
      />

      {/* Worklist Menu Modal */}
      {showWorklistMenu && (
        <Modal
          visible={showWorklistMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowWorklistMenu(false)}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
            activeOpacity={1}
            onPress={() => setShowWorklistMenu(false)}>
            <View
              style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? 80 : 35,
                right: 20,
                backgroundColor: theme.card,
                borderRadius: 10,
                paddingVertical: 8,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 6,
                elevation: 6,
                minWidth: 140,
                borderWidth: 1,
                borderColor: theme.border,
              }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
                onPress={handleEditWorklist}>
                <MaterialIcons
                  name="edit"
                  size={18}
                  color={theme.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: theme.primary, fontWeight: '500', fontSize: 15 }}>
                  {t('edit_worklist')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
                onPress={handleDeleteWorklist}>
                <MaterialIcons
                  name="delete-outline"
                  size={18}
                  color="#E53935"
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: '#E53935', fontWeight: '500', fontSize: 15 }}>
                  {t('delete_worklist')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Edit Worklist Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#00000088',
          }}>
          <View
            style={{ width: '85%', backgroundColor: theme.card, padding: 20, borderRadius: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: theme.text }}>
              {t('edit_worklist')}
            </Text>

            <TextInput
              placeholder={t('worklist_name')}
              placeholderTextColor={theme.secondaryText}
              value={editedWorklistName}
              onChangeText={setEditedWorklistName}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                marginBottom: 16,
                color: theme.text,
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
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

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 110,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '300',
    marginTop: 8,
  },
  backText: {
    fontSize: 18,
    fontWeight: '400',
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  bannerDesc: {
    color: '#e6eaf3',
    fontSize: 14,
    fontWeight: '400',
    maxWidth: '80%',
  },
  bannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerActionText: {
    color: '#fff',
    fontWeight: '400',
    fontSize: 15,
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
  },
  searchIcon: {
    marginRight: 8,
  },
  progressSection: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 12,
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
    width: '92%',
    height: 6,
    backgroundColor: '#ECF0FF',
    borderRadius: 6,
    marginHorizontal: '4%',
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 6,
  },
});
