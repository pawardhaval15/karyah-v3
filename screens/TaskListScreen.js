import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import TaskCard from '../components/Task/TaskCard';
import InlineSubtaskModal from '../components/Task/InlineSubtaskModal';
import TaskPopup from '../components/popups/TaskPopup';
import { useTheme } from '../theme/ThemeContext';
import { getTasksByWorklistId } from '../utils/task';
import { getProjectById } from '../utils/project';
import { getTasksByProjectId } from '../utils/task';
import { fetchUserConnections } from '../utils/issues';
import { Platform } from 'react-native';
import { RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchTasks(),
      fetchAllProjectTasks() // ✅ Now calling this too!
    ]);
    setRefreshing(false);
  };

  useFocusEffect(
    React.useCallback(() => {
      if (worklistId && projectId) {
        fetchTasks();
        fetchAllProjectTasks(); // ✅ Now calling this!
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
      const fetchedTasks = await getTasksByWorklistId(worklistId);
      setTasks(fetchedTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err.message);
    }
  };

  const fetchAllProjectTasks = async () => {
    try {
      if (projectId) {
        const allProjectTasks = await getTasksByProjectId(projectId);
        setProjectTasks(allProjectTasks || []);
      }
    } catch (err) {
      console.error('Failed to load project tasks:', err.message);
      setProjectTasks([]);
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
          fetchAllProjectTasks()
        ]);
      } catch (err) {
        console.error(' Initial load failed:', err);
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

  const handleSubtaskPress = (taskId) => {
    setModalTaskId(taskId === modalTaskId ? null : taskId);
  };

  const handleTaskChange = (field, value) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const [projects, connections] = await Promise.all([
          fetchProjectsByUser(),
          fetchUserConnections()
        ]);
        setProjects(projects || []);
        setUsers(connections || []);
        if (taskForm.projectId) {
          const { getWorklistsByProjectId } = await import('../utils/worklist');
          const worklistData = await getWorklistsByProjectId(taskForm.projectId, token);
          setWorklists(worklistData || []);
          // Fetch tasks by projectId
          const tasks = await getTasksByProjectId(taskForm.projectId);
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
  }, [taskForm.projectId]);

  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const data = await fetchUserConnections();
        setUsers(data || []);
      } catch (err) {
        console.error("Error fetching users:", err.message);
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
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
      </TouchableOpacity>

      <LinearGradient
        colors={['#011F53', '#366CD9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>{worklistName}</Text>
          <Text style={styles.bannerDesc}>
            This list contains all the tasks under your selected worklist.
          </Text>
        </View>
        <TouchableOpacity style={styles.bannerAction} onPress={() => setShowTaskPopup(true)}>
          <Text style={styles.bannerActionText}>Task</Text>
          <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </LinearGradient>

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
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.text, marginTop: 10 }}>Loading tasks...</Text>
        </View>
      ) : sortedTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={42} color="#AAA" />
          <Text style={styles.emptyText}>No Tasks Found for {worklistName}</Text>
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
              colors={[theme.primary]}         // Android
              tintColor={theme.primary}        // iOS
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // marginTop: 5,
  },
  emptyText: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '300', // lightweight font
    marginTop: 8,
  },

  bannerTitle: {
    color: '#fff',
    fontSize: 22,
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
});
