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
  ScrollView,
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
import { bulkAssignTasks, getTasksByProjectId } from '../utils/task';
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
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showBulkAssignPopup, setShowBulkAssignPopup] = useState(false);
  const [bulkAssignUsers, setBulkAssignUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: [],
    progress: [],
    projects: [],
    assignedTo: []
  });
  const [taskCounts, setTaskCounts] = useState({
    mytasks: 0,
    createdby: 0
  });
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTasks(); // This already fetches based on activeTab
    setRefreshing(false);
  };

  // Fetch tasks whenever tab changes
  useFocusEffect(
    React.useCallback(() => {
      loadTasks();
      loadTaskCounts(); // Load counts for both tabs
      // Exit selection mode when switching tabs (but only reset, don't reload)
      setIsSelectionMode(false);
      setSelectedTasks([]);
      // Clear filters when switching tabs
      clearAllFilters();
      setShowFilters(false);
    }, [activeTab])
  );

  // Load task counts for both tabs
  const loadTaskCounts = async () => {
    try {
      const [myTasksData, createdByMeData] = await Promise.all([
        fetchMyTasks(),
        fetchTasksCreatedByMe()
      ]);
      setTaskCounts({
        mytasks: myTasksData.length,
        createdby: createdByMeData.length
      });
    } catch (error) {
      // If there's an error, keep existing counts
      console.error('Error loading task counts:', error);
    }
  };

  // Load tasks from API
  const loadTasks = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let data = [];
      if (activeTab === 'mytasks') {
        data = await fetchMyTasks();
        setTaskCounts(prev => ({ ...prev, mytasks: data.length }));
      } else {
        data = await fetchTasksCreatedByMe();
        setTaskCounts(prev => ({ ...prev, createdby: data.length }));
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

  const filteredTasks = tasks.filter((task) => {
    const searchMatch = (task.name || task.taskName || '').toLowerCase().includes(search.toLowerCase());
    
    // Status filter
    const statusMatch = filters.status.length === 0 || filters.status.includes(task.status);
    
    // Progress filter
    let progressMatch = true;
    if (filters.progress.length > 0) {
      const progress = task.progress || 0;
      progressMatch = filters.progress.some(range => {
        switch(range) {
          case 'not-started': return progress === 0;
          case 'in-progress': return progress > 0 && progress < 100;
          case 'completed': return progress === 100;
          default: return false;
        }
      });
    }
    
    // Project filter
    const projectMatch = filters.projects.length === 0 || 
      filters.projects.includes(
        task.projectName || 
        (task.project && task.project.projectName) || 
        (task.project && task.project.name) ||
        task.projectTitle ||
        (typeof task.project === 'string' ? task.project : null)
      );
    
    // Assigned to filter
    let assignedMatch = true;
    if (filters.assignedTo.length > 0) {
      if (activeTab === 'mytasks') {
        // For my tasks, filter by creator name
        assignedMatch = filters.assignedTo.includes(task.creatorName) ||
                       filters.assignedTo.includes(task.creator?.name);
      } else {
        // For created by me, filter by assigned user names
        if (task.assignedUserDetails && task.assignedUserDetails.length > 0) {
          assignedMatch = task.assignedUserDetails.some(user => 
            filters.assignedTo.includes(user.name)
          );
        } else {
          assignedMatch = false; // No assigned users, so doesn't match filter
        }
      }
    }
    
    return searchMatch && statusMatch && progressMatch && projectMatch && assignedMatch;
  });

  // Filter users based on search query and hide selected users
  const filteredUsers = users.filter((user) => {
    const userKey = user.id || user._id || user.userId || `user_${users.indexOf(user)}`;
    const matchesSearch =
      (user.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(userSearchQuery.toLowerCase());
    const isNotSelected = !bulkAssignUsers.includes(userKey);

    return matchesSearch && isNotSelected;
  });
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

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedTasks([]);
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks((prev) => {
      const newSelection = prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId];
      return newSelection;
    });
  };

  const handleBulkAssign = () => {

    if (selectedTasks.length === 0) {
      alert('Please select at least one task');
      return;
    }
    setShowBulkAssignPopup(true);
  };

  const submitBulkAssign = async () => {
    if (bulkAssignUsers.length === 0) {
      alert('Please select at least one user to assign');
      return;
    }

    // Double check we have tasks selected
    if (selectedTasks.length === 0) {
      alert('No tasks selected. Please go back and select tasks first.');
      return;
    }

    try {
      setLoading(true);

      // Call the bulk assign API
      const result = await bulkAssignTasks(selectedTasks, bulkAssignUsers);

      // Refresh the tasks list
      await loadTasks();

      // Reset selection state
      setIsSelectionMode(false);
      setSelectedTasks([]);
      setShowBulkAssignPopup(false);
      setBulkAssignUsers([]);
      setUserSearchQuery('');

      alert('Tasks assigned successfully!');
    } catch (error) {
      console.error('❌ Bulk assign failed:', error);
      alert('Failed to assign tasks: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(item => item !== value)
        : [...prev[filterType], value]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      status: [],
      progress: [],
      projects: [],
      assignedTo: []
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).reduce((count, filterArray) => count + filterArray.length, 0);
  };

  // Get unique values for filter options
  const getFilterOptions = () => {
    const statuses = [...new Set(tasks.map(task => task.status).filter(Boolean))];
    const projectOptions = [...new Set(tasks.map(task => 
      task.projectName || 
      (task.project && task.project.projectName) || 
      (task.project && task.project.name) ||
      task.projectTitle ||
      (typeof task.project === 'string' ? task.project : null)
    ).filter(Boolean))];
    
    let assignedOptions = [];
    if (activeTab === 'mytasks') {
      // For my tasks, show creators
      assignedOptions = [...new Set(tasks.map(task => 
        task.creatorName || (task.creator && task.creator.name)
      ).filter(Boolean))];
    } else {
      // For created by me, show assigned users
      const allAssignedUsers = tasks.flatMap(task => 
        task.assignedUserDetails ? task.assignedUserDetails.map(user => user.name || 'Unknown') : []
      );
      assignedOptions = [...new Set(allAssignedUsers)];
    }
    
    return { statuses, projectOptions, assignedOptions };
  };

  const { statuses, projectOptions, assignedOptions } = getFilterOptions();
  const closeModal = () => setModalTaskId(null);

  const renderItem = ({ item, index }) => {
    const taskName = item.name || item.taskName || 'Untitled Task';
    const taskId = item.id || item.taskId || item._id || `task_${index}`;
    const isSelected = selectedTasks.includes(taskId);

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
          onPress={() => {
            if (isSelectionMode) {
              toggleTaskSelection(taskId);
            } else {
              // Only navigate if we have a valid taskId
              const validTaskId = item.id || item.taskId || item._id;
              if (validTaskId) {
                navigation.navigate('TaskDetails', { taskId: validTaskId });
              }
            }
          }}
          style={[
            styles.taskCard,
            {
              backgroundColor: theme.card,
              borderColor: isSelected ? theme.primary : theme.border,
              borderWidth: isSelected ? 2 : 1,
            },
          ]}>
          {isSelectionMode && (
            <View
              style={[
                styles.selectionCircle,
                {
                  backgroundColor: isSelected ? theme.primary : 'transparent',
                  borderColor: theme.primary,
                },
              ]}>
              {isSelected && <MaterialIcons name="check" size={16} color="#fff" />}
            </View>
          )}

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
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.taskProject, { color: theme.secondaryText }]}>
              {item.projectName || 
               (item.project && item.project.projectName) || 
               (item.project && item.project.name) ||
               item.projectTitle ||
               item.project ||
               'No Project'}
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

        {modalTaskId === taskId && !isSelectionMode && (
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
          <Text style={styles.bannerTitle}>
            {isSelectionMode ? `${selectedTasks.length} Selected` : 'My Tasks'}
          </Text>
          <Text  style={styles.bannerDesc}>
            {isSelectionMode
              ? 'Select tasks to assign to users'
              : 'All tasks assigned to you or created by you are listed here.'}
          </Text>
        </View>

        {isSelectionMode ? (
          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={[
                styles.bannerAction,
                { marginRight: 8, backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
              onPress={handleBulkAssign}
              disabled={selectedTasks.length === 0}>
              <MaterialIcons name="group-add" size={18} color="#fff" />
              <Text style={[styles.bannerActionText, { marginLeft: 4 }]}>Assign</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bannerAction, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
              onPress={toggleSelectionMode}>
              <MaterialIcons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.normalActions}>
            {activeTab === 'createdby' && (
              <TouchableOpacity
                style={[
                  styles.bannerAction,
                  { marginRight: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
                ]}
                onPress={toggleSelectionMode}>
                <MaterialIcons name="checklist" size={18} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.bannerAction} onPress={() => setShowAddTaskPopup(true)}>
              <Text style={styles.bannerActionText}>Task</Text>
              <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
      {/* Search */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search tasks..."
          placeholderTextColor={theme.secondaryText}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity 
          style={[styles.filterButton, { 
            backgroundColor: getActiveFiltersCount() > 0 ? theme.primary + '15' : 'transparent',
            borderColor: getActiveFiltersCount() > 0 ? theme.primary : theme.border 
          }]}
          onPress={() => setShowFilters(!showFilters)}>
          <MaterialIcons 
            name="tune" 
            size={20} 
            color={getActiveFiltersCount() > 0 ? theme.primary : theme.secondaryText} 
          />
          {getActiveFiltersCount() > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {/* Tabs (pill design, with icons, like ProjectScreen) */}
      <View style={[styles.tabRow, { marginTop: 4 }]}>
        {[
          {
            key: 'mytasks',
            label: 'My Task',
            count: taskCounts.mytasks,
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
            count: taskCounts.createdby,
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
            {tab.count > 0 && (
              <View style={[
                styles.tabCountBadge,
                { backgroundColor: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : theme.primary + '20' }
              ]}>
                <Text style={[
                  styles.tabCountText,
                  { color: activeTab === tab.key ? '#fff' : theme.primary }
                ]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterHeaderText, { color: theme.text }]}>Filters</Text>
            <View style={styles.filterHeaderActions}>
              <TouchableOpacity onPress={clearAllFilters} style={styles.clearFiltersBtn}>
                <Text style={[styles.clearFiltersText, { color: theme.primary }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={16} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            style={styles.filtersScrollView}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}>
            
            {/* Status Filter */}
            {statuses.length > 0 && (
              <View style={styles.compactFilterSection}>
                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>Status</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}>
                  <View style={styles.compactChipsRow}>
                    {statuses.map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.compactChip,
                          {
                            backgroundColor: filters.status.includes(status) ? theme.primary : 'transparent',
                            borderColor: filters.status.includes(status) ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => toggleFilter('status', status)}>
                        <Text
                          style={[
                            styles.compactChipText,
                            { color: filters.status.includes(status) ? '#fff' : theme.text },
                          ]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Progress Filter */}
            <View style={styles.compactFilterSection}>
              <Text style={[styles.compactFilterTitle, { color: theme.text }]}>Progress</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalScroll}>
                <View style={styles.compactChipsRow}>
                  {[
                    { key: 'not-started', label: 'Not Started' },
                    { key: 'in-progress', label: 'In Progress' },
                    { key: 'completed', label: 'Completed' },
                  ].map((progressOption) => (
                    <TouchableOpacity
                      key={progressOption.key}
                      style={[
                        styles.compactChip,
                        {
                          backgroundColor: filters.progress.includes(progressOption.key) ? theme.primary : 'transparent',
                          borderColor: filters.progress.includes(progressOption.key) ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => toggleFilter('progress', progressOption.key)}>
                      <Text
                        style={[
                          styles.compactChipText,
                          { color: filters.progress.includes(progressOption.key) ? '#fff' : theme.text },
                        ]}>
                        {progressOption.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Projects Filter */}
            {projectOptions.length > 0 && (
              <View style={styles.compactFilterSection}>
                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>Projects</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}>
                  <View style={styles.compactChipsRow}>
                    {projectOptions.map((project) => (
                      <TouchableOpacity
                        key={project}
                        style={[
                          styles.compactChip,
                          {
                            backgroundColor: filters.projects.includes(project) ? theme.primary : 'transparent',
                            borderColor: filters.projects.includes(project) ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => toggleFilter('projects', project)}>
                        <Text
                          style={[
                            styles.compactChipText,
                            { color: filters.projects.includes(project) ? '#fff' : theme.text },
                          ]}
                          numberOfLines={1}>
                          {project.length > 10 ? project.substring(0, 10) + '...' : project}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Assigned To/By Filter */}
            {assignedOptions.length > 0 && (
              <View style={styles.compactFilterSection}>
                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>
                  {activeTab === 'mytasks' ? 'Assigned By' : 'Assigned To'}
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}>
                  <View style={styles.compactChipsRow}>
                    {assignedOptions.map((assignedPerson) => (
                      <TouchableOpacity
                        key={assignedPerson}
                        style={[
                          styles.compactChip,
                          {
                            backgroundColor: filters.assignedTo.includes(assignedPerson) ? theme.primary : 'transparent',
                            borderColor: filters.assignedTo.includes(assignedPerson) ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => toggleFilter('assignedTo', assignedPerson)}>
                        <Text
                          style={[
                            styles.compactChipText,
                            { color: filters.assignedTo.includes(assignedPerson) ? '#fff' : theme.text },
                          ]}
                          numberOfLines={1}>
                          {assignedPerson.length > 8 ? assignedPerson.substring(0, 8) + '...' : assignedPerson}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </View>
      )}

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
          {getActiveFiltersCount() > 0 ? 'No tasks match the selected filters.' : 'No tasks found.'}
        </Text>
      ) : (
        <>
          {getActiveFiltersCount() > 0 && (
            <Text style={[styles.filteredResultsText, { color: theme.secondaryText }]}>
              Showing {filteredTasks.length} of {tasks.length} tasks
            </Text>
          )}
          <FlatList
            data={filteredTasks}
            keyExtractor={(item, index) => {
              const key = item.taskId || item.id || item._id || `index_${index}`;
              return String(key);
            }}
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
        </>
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

      {/* Bulk Assignment Popup */}
      {showBulkAssignPopup && (
        <View style={styles.popupOverlay}>
          <View style={[styles.popupContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.popupTitle, { color: theme.text }]}>
              Assign {selectedTasks.length} Task{selectedTasks.length > 1 ? 's' : ''}
            </Text>

            {/* Search Bar */}
            <View
              style={[
                styles.userSearchContainer,
                { backgroundColor: theme.SearchBar, borderColor: theme.border },
              ]}>
              <MaterialIcons name="search" size={20} color={theme.secondaryText} />
              <TextInput
                style={[styles.userSearchInput, { color: theme.text }]}
                placeholder="Search users..."
                placeholderTextColor={theme.secondaryText}
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
              />
              {userSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setUserSearchQuery('')}>
                  <MaterialIcons name="clear" size={20} color={theme.secondaryText} />
                </TouchableOpacity>
              )}
            </View>

            {/* Selected Users Count */}
            <Text style={[styles.selectedUsersText, { color: theme.secondaryText }]}>
              {bulkAssignUsers.length} user{bulkAssignUsers.length !== 1 ? 's' : ''} selected
            </Text>

            {/* Show Selected Users */}
            {bulkAssignUsers.length > 0 && (
              <View style={styles.selectedUsersContainer}>
                <FlatList
                  horizontal
                  data={bulkAssignUsers}
                  keyExtractor={(userId) => String(userId)}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item: userId }) => {
                    const user = users.find((u) => {
                      const userKey = u.id || u._id || u.userId || `user_${users.indexOf(u)}`;
                      return userKey === userId;
                    });

                    if (!user) {
                      return (
                        <View
                          style={[
                            styles.selectedUserChip,
                            { backgroundColor: theme.primary + '20', borderColor: theme.primary },
                          ]}>
                          <Text
                            style={[styles.selectedUserChipText, { color: theme.primary }]}
                            numberOfLines={1}>
                            User {userId}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setBulkAssignUsers((prev) => prev.filter((id) => id !== userId));
                            }}
                            style={styles.removeUserButton}>
                            <MaterialIcons name="close" size={14} color={theme.primary} />
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    return (
                      <View
                        style={[
                          styles.selectedUserChip,
                          { backgroundColor: theme.primary + '20', borderColor: theme.primary },
                        ]}>
                        <Text
                          style={[styles.selectedUserChipText, { color: theme.primary }]}
                          numberOfLines={1}>
                          {user.name || 'Unknown User'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            setBulkAssignUsers((prev) => prev.filter((id) => id !== userId));
                          }}
                          style={styles.removeUserButton}>
                          <MaterialIcons name="close" size={14} color={theme.primary} />
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                />
              </View>
            )}

            <FlatList
              style={styles.usersList}
              data={filteredUsers}
              keyExtractor={(user, index) => {
                const key = user.id || user._id || user.userId || `user_${index}`;
                return String(key);
              }}
              showsVerticalScrollIndicator={true}
              renderItem={({ item: user }) => {
                const userKey = user.id || user._id || user.userId || `user_${users.indexOf(user)}`;
                const isSelected = bulkAssignUsers.includes(userKey);
                return (
                  <TouchableOpacity
                    style={[
                      styles.compactUserItem,
                      {
                        backgroundColor: isSelected ? theme.primary + '15' : 'transparent',
                        borderColor: isSelected ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => {
                      setBulkAssignUsers((prev) => {
                        if (prev.includes(userKey)) {
                          return prev.filter((id) => id !== userKey);
                        } else {
                          const newSelection = [...prev, userKey];
                          return newSelection;
                        }
                      });
                    }}>
                    <View style={[styles.compactUserAvatar, { backgroundColor: theme.avatarBg }]}>
                      <Text style={[styles.compactUserAvatarText, { color: theme.primary }]}>
                        {(user.name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.compactUserInfo}>
                      <Text
                        style={[styles.compactUserName, { color: theme.text }]}
                        numberOfLines={1}>
                        {user.name || 'Unknown User'}
                      </Text>
                      {user.email && (
                        <Text
                          style={[styles.compactUserEmail, { color: theme.secondaryText }]}
                          numberOfLines={1}>
                          {user.email}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.selectionIndicator,
                        {
                          backgroundColor: isSelected ? theme.primary : 'transparent',
                          borderColor: theme.primary,
                        },
                      ]}>
                      {isSelected && <MaterialIcons name="check" size={14} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.noUsersText, { color: theme.secondaryText }]}>
                  {bulkAssignUsers.length > 0 && users.length > 0
                    ? 'All matching users have been selected'
                    : userSearchQuery
                      ? 'No users found matching your search'
                      : 'No users available'}
                </Text>
              }
            />

            <View style={styles.popupActions}>
              <TouchableOpacity
                style={[styles.popupButton, styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => {
                  setShowBulkAssignPopup(false);
                  setBulkAssignUsers([]);
                  setUserSearchQuery('');
                }}>
                <Text style={[styles.popupButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.popupButton,
                  styles.assignButton,
                  {
                    backgroundColor: bulkAssignUsers.length === 0 ? theme.border : theme.primary,
                    opacity: bulkAssignUsers.length === 0 ? 0.5 : 1,
                  },
                ]}
                onPress={submitBulkAssign}
                disabled={bulkAssignUsers.length === 0}>
                <Text style={[styles.popupButtonText, { color: '#fff' }]}>
                  Assign ({bulkAssignUsers.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  tabCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '600',
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    fontWeight: '400',
  },
  filterButton: {
    position: 'relative',
    marginLeft: 8,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  filtersPanel: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    maxHeight: 180,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  filterHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearFiltersBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 4,
  },
  filtersScrollView: {
    maxHeight: 120,
  },
  compactFilterSection: {
    marginBottom: 12,
  },
  compactFilterTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    opacity: 0.8,
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  compactChipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 2,
  },
  compactChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactChipText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  filteredResultsText: {
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 8,
    fontStyle: 'italic',
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
    maxWidth: '80%',
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
    maxWidth: '55%',
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
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  normalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  popupContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    width: '92%',
    alignSelf: 'center',
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  userSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  userSearchInput: {
    flex: 1,
    fontSize: 15,
    marginLeft: 8,
    paddingVertical: 0,
  },
  selectedUsersText: {
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedUsersContainer: {
    marginBottom: 12,
    maxHeight: 50,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
    maxWidth: 120,
  },
  selectedUserChipText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
    flex: 1,
  },
  removeUserButton: {
    padding: 2,
  },
  usersList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  compactUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  compactUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  compactUserAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactUserInfo: {
    flex: 1,
  },
  compactUserName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  compactUserEmail: {
    fontSize: 12,
    fontWeight: '400',
  },
  selectionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noUsersText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic',
  },
  popupActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  popupButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  assignButton: {
    // backgroundColor set dynamically
  },
  popupButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
