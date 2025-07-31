import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import InlineSubtaskModal from '../components/Task/InlineSubtaskModal';
import AddTaskPopup from '../components/popups/AddTaskPopup';
import CustomCircularProgress from '../components/task details/CustomCircularProgress';
import { useTheme } from '../theme/ThemeContext';
import { fetchProjectsByUser, fetchUserConnections } from '../utils/issues';
import { getTasksByProjectId } from '../utils/task';
import { fetchMyTasks, fetchTasksCreatedByMe } from '../utils/taskUtils';
export default function MyTasksScreen({ navigation }) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [modalTaskId, setModalTaskId] = useState(null);
  const [activeTab, setActiveTab] = useState('mytasks');
  const [showAddTaskPopup, setShowAddTaskPopup] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [worklists, setWorklists] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [addTaskForm, setAddTaskForm] = useState({
    taskName: '',
    taskProject: '',
    taskWorklist: '',
    taskDeps: '',
    taskStart: '',
    taskEnd: '',
    taskAssign: '',
    taskDesc: '',
    projectId: '',
  });
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks(); // This already fetches based on activeTab
    setRefreshing(false);
  };

  // Fetch tasks whenever tab changes
  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
    }, [activeTab])
  );

  // Load tasks from API
  const loadTasks = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let data = [];
      if (activeTab === 'mytasks') {
        data = await fetchMyTasks();
      } else {
        data = await fetchTasksCreatedByMe();
      }
      // 👇 SORT HERE: Move completed (100%) tasks to the end
      data.sort((a, b) => {
        const aProgress = a.progress || 0;
        const bProgress = b.progress || 0;
        if (aProgress === 100 && bProgress !== 100) return 1;
        if (aProgress !== 100 && bProgress === 100) return -1;
        return 0; // maintain relative order otherwise
      });
      setTasks(data);
    } catch (error) {
      setErrorMsg(error.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');

        const [projects, connections] = await Promise.all([
          fetchProjectsByUser(),
          fetchUserConnections(),
        ]);

        setProjects(projects || []);
        setUsers(connections || []);

        if (addTaskForm.projectId) {
          const { getWorklistsByProjectId } = await import('../utils/worklist');
          const worklistData = await getWorklistsByProjectId(addTaskForm.projectId, token);
          setWorklists(worklistData || []);

          // Fetch tasks by projectId
          const tasks = await getTasksByProjectId(addTaskForm.projectId);
          setProjectTasks(tasks || []);
        } else {
          setWorklists([]);
          setProjectTasks([]); // Reset if no project selected
        }
      } catch (e) {
        setProjects([]);
        setUsers([]);
        setWorklists([]);
        setProjectTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [addTaskForm.projectId]);

  const filteredTasks = tasks.filter((task) =>
    (task.name || task.taskName || '').toLowerCase().includes(search.toLowerCase())
  );
  const handleTaskChange = (field, value) => {
    setAddTaskForm((prev) => ({ ...prev, [field]: value }));
  };
  // Accepts the new task as an argument and prepends it to the tasks array
  const handleTaskSubmit = (newTask) => {
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
    });
    if (newTask) {
      setTasks((prev) => [newTask, ...prev]);
    }
  };

  const handleSubtaskPress = (taskId) => {
    setModalTaskId(taskId === modalTaskId ? null : taskId);
  };
  const closeModal = () => setModalTaskId(null);
  const renderItem = ({ item }) => {
    const taskName = item.name || item.taskName || 'Untitled Task';
    // Show "Assigned By" for my tasks; "Assigned To" for created by me
    const assignedInfoLabel = activeTab === 'mytasks' ? 'Assigned By:' : 'Assigned To:';
    // Get creator name or assigned user names
    const assignedInfoValue =
      activeTab === 'mytasks'
        ? item.creatorName || (item.creator && item.creator.name) || 'Unknown'
        : (item.assignedUserDetails && item.assignedUserDetails.map((u) => u.name).join(', ')) ||
          'Unassigned';

    return (
      <>
        <TouchableOpacity
          onPress={() => navigation.navigate('TaskDetails', { taskId: item.taskId || item.id })}
          style={[styles.taskCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: theme.avatarBg || '#F2F6FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}>
            <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 18 }}>
              {(taskName.charAt(0) || '?').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.taskTitle, { color: theme.text }]}>
              {taskName}
            </Text>
            <Text style={[styles.taskProject, { color: theme.secondaryText }]}>
              {item.projectName || (item.project && item.project.projectName) || 'No Project'}
            </Text>

            <View style={styles.assignedInfoRow}>
              <Text style={[styles.assignedInfoLabel, { color: theme.secondaryText }]}>
                {assignedInfoLabel}{' '}
              </Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.assignedInfoValue, { color: theme.text }]}>
                {assignedInfoValue}
              </Text>
            </View>
          </View>

          <View>
            <CustomCircularProgress percentage={item.progress || 0} />
          </View>
        </TouchableOpacity>

        {modalTaskId === (item.id || item.taskId) && (
          <InlineSubtaskModal
            task={item}
            onClose={closeModal}
            onSubtaskPress={(subtaskId) =>
              navigation.navigate('TaskDetails', { taskId: subtaskId })
            }
            theme={theme}
          />
        )}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
      </TouchableOpacity>

      <LinearGradient
        colors={[theme.secondary, theme.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>My Tasks</Text>
          <Text style={styles.bannerDesc}>
            All tasks assigned to you or created by you are listed here.
          </Text>
        </View>
        <TouchableOpacity style={styles.bannerAction} onPress={() => setShowAddTaskPopup(true)}>
          <Text style={styles.bannerActionText}>Task</Text>
          <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </LinearGradient>
      {/* Search */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
        <MaterialIcons name="search" size={22} color={theme.text} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search Task"
          placeholderTextColor={theme.secondaryText}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {/* Tabs (pill design, with icons, like ProjectScreen) */}
      <View style={[styles.tabRow, { marginTop: 4 }]}>
        {[
          {
            key: 'mytasks',
            label: 'My Task',
            icon: (
              <Feather
                name="user-check"
                size={15}
                color={activeTab === 'mytasks' ? '#fff' : theme.primary}
                style={{ marginRight: 4 }}
              />
            ),
          },
          {
            key: 'createdby',
            label: 'Created by Me',
            icon: (
              <Feather
                name="edit-3"
                size={15}
                color={activeTab === 'createdby' ? '#fff' : '#366CD9'}
                style={{ marginRight: 4 }}
              />
            ),
          },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={{
              backgroundColor: activeTab === tab.key ? theme.primary : 'transparent',
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginRight: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
            onPress={() => setActiveTab(tab.key)}>
            {tab.icon}
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: activeTab === tab.key ? '#fff' : theme.secondaryText,
              }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List or Loading/Error */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 30 }} />
      ) : errorMsg ? (
        <Text
          style={{
            color: 'red',
            marginTop: 30,
            textAlign: 'center',
            fontWeight: '600',
          }}>
          {errorMsg}
        </Text>
      ) : filteredTasks.length === 0 ? (
        <Text style={{ textAlign: 'center', color: theme.secondaryText, marginTop: 40 }}>
          No tasks found.
        </Text>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => (item.id || item.taskId || '').toString()}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary]} // For Android
              tintColor={theme.primary} // For iOS
            />
          }
        />
      )}

      <AddTaskPopup
        visible={showAddTaskPopup}
        onClose={() => setShowAddTaskPopup(false)}
        values={addTaskForm}
        onChange={handleTaskChange}
        onSubmit={handleTaskSubmit}
        theme={theme}
        projects={projects}
        users={users}
        worklists={worklists}
        projectTasks={projectTasks}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    marginTop: Platform.OS === 'ios' ? 70 : 25,
    marginLeft: 16,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
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
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 2,
  },
  bannerDesc: {
    fontSize: 14,
    fontWeight: '400',
    maxWidth: '80%',
    color: '#e6eaf3',
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
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 0,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 6,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '400',
  },
  activeTabText: {
    color: '#fff',
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
    paddingVertical: 0,
    fontWeight: '400',
  },
  searchIcon: {
    marginRight: 8,
  },

  // Task Card styles
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
  },
  taskTitle: {
    fontWeight: '500',
    fontSize: 16,
    marginBottom: 4,
    maxWidth: '80%',
  },
  taskProject: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 0,
  },
  assignedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignedInfoLabel: {
    fontSize: 13,
    fontWeight: '400',
  },
  assignedInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '60%',
  },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  progressText: {
    fontWeight: '600',
    fontSize: 12,
  },
});
