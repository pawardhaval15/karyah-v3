import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import AddTaskPopup from '../components/popups/AddTaskPopup';
import TagsManagementModal from '../components/popups/TagsManagementModal';
import TaskList from '../components/Task/TaskList';
import { useMyTasks, useTaskMutations, useTasksCreatedByMe } from '../hooks/useTasks';
import { useTaskStore } from '../store/taskStore';
import { useTheme } from '../theme/ThemeContext';
import { fetchProjectsByUser, fetchUserConnections } from '../utils/issues';
import { getTasksByProjectId } from '../utils/task';
import { getWorklistsByProjectId } from '../utils/worklist';


export default function MyTasksScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Store
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

  // Queries
  const { data: myTasks = [], isLoading: loadingMyTasks, refetch: refetchMyTasks } = useMyTasks();
  const { data: createdTasks = [], isLoading: loadingCreated, refetch: refetchCreated } = useTasksCreatedByMe();

  // useEffect(() => {
  //   if (myTasks) {
  //     console.log("mytasks data updated:", JSON.stringify(myTasks, null, 2));
  //   }
  // }, [myTasks]);

  // Mutations
  const { bulkAssign, updateTags, invalidateTasks } = useTaskMutations();

  // Local State (Forms & UI that doesn't need global persistence)
  const [showAddTaskPopup, setShowAddTaskPopup] = useState(false);
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
    tags: [],
    isIssue: false,
  });

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [showBulkAssignPopup, setShowBulkAssignPopup] = useState(false);
  const [bulkAssignUsers, setBulkAssignUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [selectedTaskForTags, setSelectedTaskForTags] = useState(null);

  // Derived State
  const tasks = activeTab === 'mytasks' ? myTasks : createdTasks;
  const loading = loadingMyTasks || loadingCreated;

  const taskCounts = useMemo(() => ({
    mytasks: myTasks.length,
    createdby: createdTasks.length
  }), [myTasks, createdTasks]);

  // Sort tasks: Chronological sequence (Overdue -> Upcoming -> No Date)
  // Pending tasks first, then Completed tasks
  const sortedTasks = useMemo(() => {
    const data = [...tasks];
    return data.sort((a, b) => {
      const isCompletedA = a.progress === 100 || a.status === 'Completed';
      const isCompletedB = b.progress === 100 || b.status === 'Completed';

      // 1. Separation: Pending first, Completed last
      if (isCompletedA && !isCompletedB) return 1;
      if (!isCompletedA && isCompletedB) return -1;

      // 2. Sorting Logic (applies to both Pending vs Pending AND Completed vs Completed)
      // Priority: Has Date (Overdue/Upcoming) > No Date
      // Within Has Date: Ascending (Oldest/Overdue first -> Future)

      const dateAStr = a.endDate || a.dueDate;
      const dateBStr = b.endDate || b.dueDate;
      const dateA = dateAStr ? new Date(dateAStr).getTime() : null;
      const dateB = dateBStr ? new Date(dateBStr).getTime() : null;

      const hasDateA = dateA && !isNaN(dateA);
      const hasDateB = dateB && !isNaN(dateB);

      if (hasDateA && hasDateB) {
        return dateA - dateB;
      }
      if (hasDateA && !hasDateB) return -1;
      if (!hasDateA && hasDateB) return 1;

      // 3. Both no date: Sort by creation (newest first)
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [tasks]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchMyTasks(),
      refetchCreated(),
      // Also refresh projects/users if needed
      fetchProjectsByUser().then(setProjects),
      fetchUserConnections().then(setUsers)
    ]);
  }, [refetchMyTasks, refetchCreated]);

  useFocusEffect(
    useCallback(() => {
      // Optional: Refetch on focus to ensure data is fresh
      refetchMyTasks();
      refetchCreated();
      setIsSelectionMode(false);
      setSelectedTasks([]);
    }, [refetchMyTasks, refetchCreated])
  );

  // Fetch projects and users on mount
  useEffect(() => {
    const loadAuxData = async () => {
      try {
        const [p, u] = await Promise.all([
          fetchProjectsByUser(),
          fetchUserConnections()
        ]);
        setProjects(p || []);
        setUsers(u || []);
      } catch (err) {
        console.error('Failed to load projects/users', err);
      }
    };
    loadAuxData();
  }, []);

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
        console.error('Failed to fetch project details:', e);
        setWorklists([]);
        setProjectTasks([]);
      }
    };
    fetchProjectDetails();
  }, [addTaskForm.projectId]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return sortedTasks.filter((task) => {
      // 1. Search (Global)
      const taskNameMatch = (task.name || task.taskName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const projectName = (task.project?.name || task.project?.projectName || task.projectTitle || '').toLowerCase();
      const searchMatch = taskNameMatch || projectName.includes(searchQuery.toLowerCase());

      // 2. Status Filter
      const taskStatus = task.status || (task.mode === 'WORKFLOW' ? 'Active Workflow' : 'Pending');
      const statusMatch = filters.status.length === 0 || filters.status.includes(taskStatus);

      // 3. Project Filter
      const taskProjectName = task.project?.name || task.project?.projectName || 'No Project';
      const projectMatch = filters.projects.length === 0 || filters.projects.includes(taskProjectName);

      // 4. Assigned/Creator Filter
      let assignedMatch = true;
      if (filters.assignedTo.length > 0) {
        if (activeTab === 'mytasks') {
          const creatorName = task.creator?.name || task.creator?.username || task.creatorName;
          assignedMatch = filters.assignedTo.includes(creatorName);
        } else {
          if (task.assignedUserDetails && task.assignedUserDetails.length > 0) {
            assignedMatch = task.assignedUserDetails.some((user) => filters.assignedTo.includes(user.name));
          } else {
            assignedMatch = false;
          }
        }
      }

      // 5. Location Filter
      const locationMatch = filters.locations.length === 0 || filters.locations.includes(task.project?.location);

      // 6. Tags Filter
      const tagsMatch = filters.tags.length === 0 || (task.tags && task.tags.some(tag => filters.tags.includes(tag)));

      // 7. Category Filter
      const categoryMatch = !filters.category || filters.category.length === 0 || filters.category.includes(task.category);

      // 8. Mode Filter
      const modeMatch = !filters.mode || filters.mode.length === 0 || filters.mode.includes(task.mode);

      return searchMatch && statusMatch && projectMatch && assignedMatch && locationMatch && tagsMatch && categoryMatch && modeMatch;
    });
  }, [sortedTasks, searchQuery, filters, activeTab]);

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
      tags: [], // Reset tags
      isIssue: false, // Reset isIssue
    });
    if (newTask) {
      setTasks((prev) => [newTask, ...prev]);
    }
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

    if (selectedTasks.length === 0) {
      alert('No tasks selected. Please go back and select tasks first.');
      return;
    }

    try {
      await bulkAssign.mutateAsync({
        taskIds: selectedTasks,
        userIds: bulkAssignUsers
      });

      setIsSelectionMode(false);
      setSelectedTasks([]);
      setShowBulkAssignPopup(false);
      setBulkAssignUsers([]);
      setUserSearchQuery('');

      alert('Tasks assigned successfully!');
    } catch (error) {
      console.error(' Bulk assign failed:', error);
      alert('Failed to assign tasks: ' + error.message);
    }
  };

  const handleTagsManagement = (task) => {
    setSelectedTaskForTags(task);
    setShowTagsModal(true);
  };

  const handleSaveTags = async (taskId, newTags) => {
    try {
      const cleanedTags = newTags.filter(
        (tag) => tag && typeof tag === 'string' && tag.trim().length > 0
      );

      await updateTags.mutateAsync({
        taskId,
        tags: cleanedTags
      });

      console.log('Tags saved successfully');
    } catch (error) {
      console.error(' Failed to save tags:', error);
      throw error;
    }
  };

  // Filter Options
  const {
    statuses,
    projectOptions,
    assignedOptions,
    locations,
    tagOptions,
    modeOptions,
    categoryOptions
  } = useMemo(() => {
    const defaultOptions = {
      statuses: [],
      projectOptions: [],
      assignedOptions: [],
      locations: [],
      tagOptions: [],
      modeOptions: [],
      categoryOptions: []
    };

    if (tasks.length === 0) return defaultOptions;

    const uniqueStatuses = new Set();
    const uniqueProjects = new Set();
    const uniquePeople = new Set();
    const uniqueLocations = new Set();
    const uniqueTags = new Set();
    const uniqueCategories = new Set();
    const uniqueModes = new Set();

    tasks.forEach(t => {
      // Status
      uniqueStatuses.add(t.status || (t.mode === 'WORKFLOW' ? 'Active Workflow' : 'Pending'));

      // Project
      const projName = t.project?.name || t.project?.projectName || 'No Project';
      uniqueProjects.add(projName);

      // Assigned/Creator
      if (activeTab === 'mytasks') {
        const name = t.creator?.name || t.creator?.username || t.creatorName;
        if (name) uniquePeople.add(name);
      } else {
        if (t.assignedUserDetails) {
          t.assignedUserDetails.forEach(u => u.name && uniquePeople.add(u.name));
        }
      }

      // Location
      if (t.project?.location) uniqueLocations.add(t.project.location);

      // Tags
      if (t.tags) t.tags.forEach(tag => tag && uniqueTags.add(tag));

      // Category & Mode
      if (t.category) uniqueCategories.add(t.category);
      if (t.mode) uniqueModes.add(t.mode);
    });

    return {
      statuses: Array.from(uniqueStatuses),
      projectOptions: Array.from(uniqueProjects),
      assignedOptions: Array.from(uniquePeople),
      locations: Array.from(uniqueLocations),
      tagOptions: Array.from(uniqueTags),
      categoryOptions: Array.from(uniqueCategories),
      modeOptions: Array.from(uniqueModes)
    };
  }, [tasks, activeTab]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.backBtn}
            activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={theme.text} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {isSelectionMode ? `${selectedTasks.length} Selected` : t('my_tasks')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRightActions}>
          {isSelectionMode ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleBulkAssign}
                disabled={selectedTasks.length === 0}
                style={{ padding: 8 }}>
                <MaterialIcons
                  name="group-add"
                  size={22}
                  color={selectedTasks.length === 0 ? theme.secondaryText : theme.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleSelectionMode} style={{ padding: 8 }}>
                <MaterialIcons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.compactSearchBar,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                <MaterialIcons
                  name="search"
                  size={18}
                  color={theme.secondaryText}
                  style={{ marginRight: 6 }}
                />
                <TextInput
                  style={[styles.compactSearchInput, { color: theme.text }]}
                  placeholder={t('search_tasks')}
                  placeholderTextColor={theme.secondaryText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialIcons name="close" size={16} color={theme.secondaryText} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.compactFilterTrigger,
                  {
                    borderColor: getActiveFiltersCount() > 0 ? theme.primary : theme.border,
                    backgroundColor:
                      getActiveFiltersCount() > 0 ? theme.primary + '10' : theme.card,
                  },
                ]}
                onPress={() => setShowFilters(!showFilters)}>
                <Feather
                  name="sliders"
                  size={18}
                  color={getActiveFiltersCount() > 0 ? theme.primary : theme.secondaryText}
                />
                {getActiveFiltersCount() > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.badgeText}>{getActiveFiltersCount()}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.avatarBg }]}
                onPress={() => setShowAddTaskPopup(true)}>
                <Feather name="plus" size={18} color={theme.primary} />
              </TouchableOpacity>
              {activeTab === 'createdby' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.avatarBg }]}
                  onPress={toggleSelectionMode}>
                  <MaterialIcons name="checklist" size={18} color={theme.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
      {/* Legend for Issue Indicator */}
      {/* <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={styles.legendRedDot} />
          <Text style={[styles.legendText, { color: theme.secondaryText }]}>Issue Task</Text>
        </View>
      </View> */}
      {/* Tabs (pill design, with icons, like ProjectScreen) */}
      <View style={[styles.tabRow, { marginTop: 4 }]}>
        {[
          {
            key: 'mytasks',
            label: t('my_tasks'),
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
            label: t('created_by_me'),
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
              <View
                style={[
                  styles.tabCountBadge,
                  {
                    backgroundColor:
                      activeTab === tab.key ? 'rgba(255,255,255,0.3)' : theme.primary + '20',
                  },
                ]}>
                <Text
                  style={[
                    styles.tabCountText,
                    { color: activeTab === tab.key ? '#fff' : theme.primary },
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
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          layout={Layout.springify()}
          style={[styles.filtersPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterHeaderText, { color: theme.text }]}>{t('filters')}</Text>
            <View style={styles.filterHeaderActions}>
              <TouchableOpacity onPress={clearAllFilters} style={styles.clearFiltersBtn}>
                <Text style={[styles.clearFiltersText, { color: theme.primary }]}>
                  {t('clear')}
                </Text>
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
                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>
                  {t('status')}
                </Text>
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
                            backgroundColor: filters.status.includes(status)
                              ? theme.primary
                              : 'transparent',
                            borderColor: filters.status.includes(status)
                              ? theme.primary
                              : theme.border,
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
            {/* Projects Filter */}
            {projectOptions.length > 0 && (
              <View style={styles.compactFilterSection}>
                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>
                  {t('projects')}
                </Text>
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
                            backgroundColor: filters.projects.includes(project)
                              ? theme.primary
                              : 'transparent',
                            borderColor: filters.projects.includes(project)
                              ? theme.primary
                              : theme.border,
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
            {/* Location Filter */}
            {locations.length > 0 && (
              <View style={styles.compactFilterSection}>
                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>
                  {t('location')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}>
                  <View style={styles.compactChipsRow}>
                    {locations.map((location) => (
                      <TouchableOpacity
                        key={location}
                        style={[
                          styles.compactChip,
                          {
                            backgroundColor: filters.locations.includes(location)
                              ? theme.primary
                              : 'transparent',
                            borderColor: filters.locations.includes(location)
                              ? theme.primary
                              : theme.border,
                          },
                        ]}
                        onPress={() => toggleFilter('locations', location)}>
                        <Text
                          style={[
                            styles.compactChipText,
                            { color: filters.locations.includes(location) ? '#fff' : theme.text },
                          ]}
                          numberOfLines={1}>
                          {location.length > 10 ? location.substring(0, 10) + '...' : location}
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
                  {activeTab === 'mytasks' ? t('assigned_by') : t('assigned_to')}
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
                            backgroundColor: filters.assignedTo.includes(assignedPerson)
                              ? theme.primary
                              : 'transparent',
                            borderColor: filters.assignedTo.includes(assignedPerson)
                              ? theme.primary
                              : theme.border,
                          },
                        ]}
                        onPress={() => toggleFilter('assignedTo', assignedPerson)}>
                        <Text
                          style={[
                            styles.compactChipText,
                            {
                              color: filters.assignedTo.includes(assignedPerson)
                                ? '#fff'
                                : theme.text,
                            },
                          ]}
                          numberOfLines={1}>
                          {assignedPerson.length > 8
                            ? assignedPerson.substring(0, 8) + '...'
                            : assignedPerson}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
            {/* Tags Filter */}
            {tagOptions.length > 0 && (
              <View style={styles.compactFilterSection}>
                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>Tags</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.horizontalScroll}>
                  <View style={styles.compactChipsRow}>
                    {tagOptions.map((tag) => (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.compactChip,
                          {
                            backgroundColor: filters.tags.includes(tag)
                              ? theme.primary
                              : theme.card,
                            borderColor: filters.tags.includes(tag) ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => toggleFilter('tags', tag)}>
                        <Text
                          style={[
                            styles.compactChipText,
                            {
                              color: filters.tags.includes(tag) ? '#ffffff' : theme.text,
                            },
                          ]}
                          numberOfLines={1}>
                          #{tag.length > 8 ? tag.substring(0, 8) + '...' : tag}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </Animated.View>
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
      ) : (
        <TaskList
          tasks={filteredTasks}
          theme={theme}
          isSelectionMode={isSelectionMode}
          selectedTasks={selectedTasks}
          onToggleSelection={toggleTaskSelection}
          onTaskPress={(item) => {
            const validTaskId = item.id || item.taskId || item._id;
            if (validTaskId) {
              navigation.navigate('TaskDetails', { taskId: validTaskId });
            }
          }}
          onSubtaskNavigate={(subtaskId) => navigation.navigate('TaskDetails', { taskId: subtaskId })}
          onTagsManagement={handleTagsManagement}
          activeTab={activeTab}
          refreshControl={
            <RefreshControl
              refreshing={loadingMyTasks || loadingCreated}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={
            getActiveFiltersCount() > 0 ? (
              <Text style={[styles.filteredResultsText, { color: theme.secondaryText }]}>
                Showing {filteredTasks.length} of {tasks.length} tasks
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: theme.secondaryText, marginTop: 40 }}>
              {getActiveFiltersCount() > 0 ? 'No tasks match the selected filters.' : 'No tasks found.'}
            </Text>
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
      {/* Tags Management Modal */}
      <TagsManagementModal
        visible={showTagsModal}
        onClose={() => {
          setShowTagsModal(false);
          setSelectedTaskForTags(null);
        }}
        task={selectedTaskForTags}
        onSave={handleSaveTags}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  headerLeft: {
    flexShrink: 1,
    maxWidth: '40%',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerRightActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  compactSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
  },
  compactSearchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    padding: 0,
    height: '100%',
  },
  compactFilterTrigger: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 0,
    marginHorizontal: 16,
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
    display: 'none',
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
  legendContainer: {
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
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
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
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
