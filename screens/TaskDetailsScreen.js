import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { ResizeMode, Video } from 'expo-av';
import { jwtDecode } from 'jwt-decode';
import React, { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Alert,
  Dimensions,
  Image,
  Modal, Platform,
  RefreshControl,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedProps,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import AttachmentDrawer from '../components/issue details/AttachmentDrawer';
import AttachmentPreviewModal from '../components/issue details/AttachmentPreviewDrawer';
import ImageModal from '../components/issue details/ImageModal';
import AddSubTaskPopup from '../components/popups/AddSubTaskPopup';
import AttachmentSheet from '../components/popups/AttachmentSheet';
import MaterialRequestPopup from '../components/popups/MaterialRequestPopup';
import TaskChatPopup from '../components/popups/TaskChatPopup';
import VoiceRecorderPopup from '../components/popups/VoiceRecorderPopup';

// ... existing imports

import TaskReassignPopup from '../components/popups/TaskReassignPopup';
import useAttachmentPicker from '../components/popups/useAttachmentPicker';
import { useTheme } from '../theme/ThemeContext';
import { fetchProjectsByUser, fetchUserConnections } from '../utils/issues';

import {
  deleteTask, getTaskDetailsById, getTasksByProjectId,
  holdTask,
  moveTaskToNextStage,
  reopenTask,
  updateTask,
  updateTaskDetails,
  updateTaskFlags, updateTaskProgress
} from '../utils/task';
import { fetchTaskMessages, sendTaskMessage } from '../utils/taskMessage';
import { getWorklistsByProjectId } from '../utils/worklist';

const { width: screenWidth } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CircularProgress = memo(({ percentage, size = 100, strokeWidth = 8, theme }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const animatedProgress = useSharedValue(percentage);

  useEffect(() => {
    animatedProgress.value = withTiming(percentage, { duration: 1000 });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    const offset = circumference - (Math.min(100, Math.max(0, animatedProgress.value)) / 100) * circumference;
    return {
      strokeDashoffset: offset,
    };
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: size * 0.2, fontWeight: '700', color: theme.text }}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
});

const ActivityChart = memo(({ theme }) => {
  return (
    <View style={{ height: 80, width: '100%' }}>
      <Svg width="100%" height="80" viewBox="0 0 100 40" preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.primary} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={theme.primary} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path
          d="M0,35 Q10,32 20,34 T40,25 T60,28 T80,15 T100,10 V40 H0 Z"
          fill="url(#grad)"
        />
        <Path
          d="M0,35 Q10,32 20,34 T40,25 T60,28 T80,15 T100,10"
          fill="none"
          stroke={theme.primary}
          strokeWidth="1.5"
        />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 }}>
        {['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <Text key={day} style={{ fontSize: 9, color: theme.secondaryText }}>{day}</Text>
        ))}
      </View>
    </View>
  );
});

export default function TaskDetailsScreen({ route, navigation }) {
  // Store decoded token globally for this component
  const decodedRef = useRef(null);
  const { taskId, refreshedAt } = route.params;
  // Safe navigation function to handle cases where there's no previous screen
  const safeGoBack = () => {
    navigation.goBack();
  };
  const theme = useTheme();
  const [task, setTask] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stageLoading, setStageLoading] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showAddSubTaskPopup, setShowAddSubTaskPopup] = useState(false);
  const [showTaskChat, setShowTaskChat] = useState(false);
  const [showMaterialRequest, setShowMaterialRequest] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [addSubTask, setAddSubTask] = useState({
    taskName: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    projectId: '',
    taskWorklist: '',
    parentTaskId: '',
    isIssue: false,
  });
  const [UpdateTaskScreen, setUpdateTaskScreen] = useState({
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
  const [users, setUsers] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [worklists, setWorklists] = useState([]);
  const [projects, setProjects] = useState([]);
  const isInitialProgressSet = useRef(false);
  const isSlidingRef = useRef(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const { t } = useTranslation();
  // When task loads, set initial progress only once
  useEffect(() => {
    if (task && !isInitialProgressSet.current) {
      setEditableProgress(task.progress ?? 0);
      isInitialProgressSet.current = true;
    }
  }, [task]);
  // Reset flag when taskId changes (new screen)
  useEffect(() => {
    isInitialProgressSet.current = false;
  }, [taskId]);

  // Prevent flicker: debounce and don't overwrite while sliding
  useEffect(() => {
    // Only update editableProgress if not sliding and value is different
    if (!isSlidingRef.current && task && task.progress !== editableProgress) {
      const timeout = setTimeout(() => {
        setEditableProgress(task.progress ?? 0);
      }, 250); // Slightly longer debounce for smoother UX

      return () => clearTimeout(timeout);
    }
  }, [task?.progress, editableProgress]);

  const [showAssignedUserPopup, setShowAssignedUserPopup] = useState(false);
  const [showCreatorPopup, setShowCreatorPopup] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [remark, setRemark] = useState('');
  const [drawerAttachments, setDrawerAttachments] = useState([]);
  const [editableProgress, setEditableProgress] = useState(null);
  const [showSave, setShowSave] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const lastProgressRef = useRef(task?.progress ?? 0);
  const [showCoAdminListPopup, setShowCoAdminListPopup] = useState(false);
  const [coAdminListPopupData, setCoAdminListPopupData] = useState([]);
  const [coAdminListPopupTitle, setCoAdminListPopupTitle] = useState('');
  const [showDependentPopup, setShowDependentPopup] = useState(false);
  const [subtaskSearch, setSubtaskSearch] = useState('');
  const [showTaskNameModal, setShowTaskNameModal] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const {
    attachments: newAttachments,
    pickAttachment,
    clearAttachments,
    setAttachments: setNewAttachments,
    attaching,
  } = useAttachmentPicker();
  const [editValues, setEditValues] = useState({
    taskName: '',
    description: '',
    startDate: '',
    endDate: '',
    isIssue: false,
    isCritical: false,
  });
  // Fix for ReferenceError: showAttachmentSheet
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isGalleryExpanded, setIsGalleryExpanded] = useState(false);

  const handleAudioRecorded = (file) => {
    if (file && file.uri) {
      setNewAttachments(prev => [...prev, file]);
      // Alert.alert('Success', 'Audio recording added to staging!');
    }
  };

  // New Function to handle Stage Movement
  const handleNextStage = async () => {
    if (!task) return;

    const stages = task.workflowStages || [];
    const totalStages = stages.length;
    // Check if we are at the end (User input validation)
    const isLastStage = task.currentStageIndex >= totalStages - 1;

    if (isLastStage) {
      Alert.alert('Completed', 'This task is already in the final stage.');
      return;
    }

    try {
      setStageLoading(true);

      // 1. Call API: The backend now performs the move, calculates progress, and updates status
      const updatedTaskData = await moveTaskToNextStage(task.id || task.taskId);

      // 2. Update Local State (Visuals)
      // We merge the backend response directly into our local task state
      setTask((prev) => ({
        ...prev,
        ...updatedTaskData, // Contains: currentStage, progress, etc.
        // Fallback: If backend didn't return 'status', infer it locally based on progress
        status: updatedTaskData.progress === 100 ? 'Completed' : (updatedTaskData.status || prev.status),
        // Fallback: If backend didn't return 'currentStageIndex', increment locally
        currentStageIndex: updatedTaskData.currentStageIndex ?? (prev.currentStageIndex + 1)
      }));

      // 3. Update the slider/progress bar ref so it matches the backend's calculation
      if (updatedTaskData.progress !== undefined) {
        setEditableProgress(updatedTaskData.progress);
        lastProgressRef.current = updatedTaskData.progress;

        Alert.alert('Success', `Moved to next stage! Progress updated to ${updatedTaskData.progress}%`);
      } else {
        Alert.alert('Success', 'Moved to next stage!');
      }

    } catch (error) {
      console.error('Stage update failed:', error);
      Alert.alert('Error', error.message || 'Failed to move stage');
    } finally {
      setStageLoading(false);
    }
  };

  // HOLD & REOPEN HANDLERS
  const handleHoldTask = async () => {
    if (!holdReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for putting this task on hold.');
      return;
    }
    try {
      setLoading(true);
      await holdTask(task.id || task.taskId, holdReason);

      // Refresh task
      const updatedTask = await getTaskDetailsById(task.id || task.taskId);
      setTask(updatedTask);

      setShowHoldModal(false);
      setHoldReason('');
      Alert.alert('Success', 'Task put on hold successfully.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to hold task');
    } finally {
      setLoading(false);
    }
  };

  const handleReopenTask = async () => {
    Alert.alert(
      'Reopen Task',
      'Are you sure you want to reopen this task? It will be moved to In Progress/Pending.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reopen',
          onPress: async () => {
            try {
              setLoading(true);
              await reopenTask(task.id || task.taskId);
              const updatedTask = await getTaskDetailsById(task.id || task.taskId);
              setTask(updatedTask);
              Alert.alert('Success', 'Task reopened successfully.');
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to reopen task');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (task) {
      setEditValues({
        taskName: task.taskName || '',
        description: task.description || '',
        startDate: task.startDate || '',
        endDate: task.endDate || '',
        isIssue: task.isIssue || false,
        isCritical: task.isCritical || false,
      });
    }
  }, [task]);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const connections = await fetchUserConnections();
        setUsers(connections || []);
      } catch (err) {
        console.error('Failed to fetch connections:', err.message);
        setUsers([]);
      }
    };

    fetchConnections();
  }, []);

  useEffect(() => {
    if (showTaskChat) {
      setChatLoading(true);
      fetchTaskMessages(task.id || task._id || task.taskId)
        .then(setChatMessages)
        .catch((err) => {
          setChatMessages([]);
          // Optionally show error
        })
        .finally(() => setChatLoading(false));
    }
  }, [showTaskChat, task]);

  const handleSendChatMessage = async (msg, attachments = [], mentions = []) => {
    try {
      // Don't set loading state - let the popup handle optimistic updates
      const safeMsg = msg && msg.trim() ? msg : attachments.length > 0 ? ' ' : '';
      if (!safeMsg && attachments.length === 0) return; // nothing to send

      const newMsg = await sendTaskMessage({
        taskId: task.id || task._id || task.taskId,
        message: safeMsg,
        attachments: attachments,
        mentions: mentions,
      });
      // Add the server response to messages (this will replace the optimistic message)
      setChatMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      // Handle error - the popup will show failed status
      console.error('Failed to send message:', err);
      Alert.alert('Error', err.message || 'Failed to send message');
      throw err; // Re-throw so the popup can handle the error state
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
        if (UpdateTaskScreen.projectId) {
          const worklistData = await getWorklistsByProjectId(UpdateTaskScreen.projectId, token);
          setWorklists(worklistData || []);
          // Fetch tasks by projectId
          const tasks = await getTasksByProjectId(UpdateTaskScreen.projectId);
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
  }, [UpdateTaskScreen.projectId]);

  // useEffect(() => {
  //     if (task) {
  //         setEditableProgress(task.progress || 0);
  //     }
  // }, [task]);

  const handleSaveProgress = async () => {
    // Here you would call your API to update the progress
    // For now, just update the task state locally
    setTask((prev) => ({ ...prev, progress: editableProgress }));
    setShowSave(false);
    // Optionally, show a toast or feedback
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      getTaskDetailsById(taskId),
    ]);
    setRefreshing(false);
  };
  useFocusEffect(
    React.useCallback(() => {
      const fetchTaskData = async () => {
        const data = await getTaskDetailsById(taskId);
        setTask(data);
      };
      fetchTaskData();
    }, [taskId]),
  );

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const data = await getTaskDetailsById(taskId);
        setTask(data);
        console.log('Fetched task details:', data);
      } catch (err) {
        console.error('Failed to fetch task:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [taskId, refreshedAt]);

  const allAttachments = task?.images || [];

  useEffect(() => {
    if (task) {
      setAddSubTask((prev) => ({
        ...prev,
        projectId: task.projectId,
        taskProject: task.projectId,
        taskWorklist: task.worklistId,
        parentTaskId: taskId,
        parentId: taskId,
      }));
    }
  }, [task, taskId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!addSubTask.projectId) return;
        const token = await AsyncStorage.getItem('token');
        const [worklistsRes, tasksRes] = await Promise.all([
          getWorklistsByProjectId(addSubTask.projectId, token),
          getTasksByProjectId(addSubTask.projectId, token),
        ]);
        setWorklists(worklistsRes || []);
        // console.log('Fetched worklists:', worklistsRes);
        // console.log('Fetched project tasks:', tasksRes);
        setProjectTasks(tasksRes || []);
      } catch (err) {
        console.error('Error fetching worklists or project tasks:', err.message);
        setWorklists([]);
        setProjectTasks([]);
      }
    };
    fetchData();
  }, [addSubTask.projectId]);

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
  const handleTaskChange = (field, value) => {
    setAddSubTask((prev) => ({ ...prev, [field]: value }));
  };
  const handleTaskSubmit = async () => {
    console.log('Submit subtask:', addSubTask);
    setAddSubTask({
      taskName: '',
      description: '',
      assignedTo: '',
      dueDate: '',
      projectId: task.projectId,
      taskWorklist: task.worklistId,
      isIssue: false,
    });
    setShowAddSubTaskPopup(false);
    // Refresh task data to show new subtask immediately
    try {
      const refreshedTask = await getTaskDetailsById(taskId);
      setTask(refreshedTask);
    } catch (err) {
      console.error('Failed to refresh task after subtask creation:', err);
    }
  };
  useEffect(() => {
    const getUserIdFromToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          let decoded = null;
          try {
            decoded = jwtDecode(token);
            decodedRef.current = decoded;
          } catch (e) {
            console.log('[TaskDetailsScreen] Failed to decode token:', e);
          }
          // Try common user id fields
          const userId = decoded?.id || decoded?._id || decoded?.userId || decoded?.user_id || null;
          setCurrentUserId(userId);
          const name = decoded?.name || null;
          setUserName(name);
          // console.log('[TaskDetailsScreen] Decoded userId from token:', userId, 'Decoded:', decoded);
        }
      } catch (err) {
        setCurrentUserId(null);
        setUserName(null);
        console.log('[TaskDetailsScreen] Error fetching token:', err);
      }
    };
    getUserIdFromToken();
  }, []);

  async function handleUpdateProgress(value, prevProgress) {
    try {
      const taskIdToSend = task.id || task._id || task.taskId || taskId;
      const updatedProgress = await updateTaskProgress(taskIdToSend, value);
      setTask((prev) => ({ ...prev, progress: updatedProgress }));
      setEditableProgress(updatedProgress);
      lastProgressRef.current = updatedProgress;
      if (task.subTasks?.length > 0 && value < 100) {
        Alert.alert('Subtasks Exist', 'Please update the progress of subtasks as well.');
      }
    } catch (err) {
      setEditableProgress(prevProgress); // Revert to last known good state
      let message = 'Failed to update progress.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed?.message) message = parsed.message;
      } catch {
        message = err.message;
      }
      Alert.alert("Progress Can't Be Changed", message);
      console.error('Failed to update progress:', err);
    }
  }

  useEffect(() => {
    if (typeof task?.progress === 'number') {
      lastProgressRef.current = task.progress;
    }
  }, [task?.progress]);
  // Allow edit if the logged-in user's name matches the creatorName (case-insensitive, trimmed)
  const creatorName = task?.creatorName || task?.creator?.name || null;
  const creatorUserId = task?.creatorUserId || task?.creatorID || task?.creator?._id || task?.creator?.id;

  const isCreator =
    (userName && creatorName && userName.trim().toLowerCase() === creatorName.trim().toLowerCase()) ||
    (currentUserId && creatorUserId && String(currentUserId) === String(creatorUserId));
  // console.log('[TaskDetailsScreen] Matching userName:', userName, 'with creatorName:', creatorName, '| isCreator:', isCreator);
  // console.log('[TaskDetailsScreen] userName:', userName, '| creatorName:', creatorName, '| isCreator:', isCreator);
  // Filter subtasks based on search
  const filteredSubtasks = (task?.subTasks || []).filter((sub) => {
    if (!subtaskSearch.trim()) return true;
    const searchLower = subtaskSearch.toLowerCase();
    const taskName = (sub.taskName || sub.name || '').toLowerCase();
    const description = (sub.description || '').toLowerCase();
    const assignedUsers = (sub.assignedUserDetails || [])
      .map((u) => (u.name || '').toLowerCase())
      .join(' ');

    return (
      taskName.includes(searchLower) ||
      description.includes(searchLower) ||
      assignedUsers.includes(searchLower)
    );
  });

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.background,
        }}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginBottom: 18 }} />
        <Text style={{ color: theme.text }}>Loading task...</Text>
      </View>
    );
  }
  if (!task) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.background,
        }}>
        <Text style={{ color: theme.text }}>Task not found.</Text>
      </View>
    );
  }
  // Workflow Helper Variables
  const isWorkflowTask = !!task.category;
  const workflowStages = task.workflowStages || [];
  const currentStageIndex = task.currentStageIndex || 0;
  const currentStageLabel = workflowStages[currentStageIndex]?.label || task.currentStage || 'Unknown';
  const isTaskCompleted = isWorkflowTask
    ? currentStageIndex >= (workflowStages.length - 1)
    : task.progress === 100;

  return (
    <View style={[styles.mainContainer, { backgroundColor: theme.background, paddingTop: Platform.OS === 'ios' ? 60 : 20 }]}>
      {/* Top Navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 }}>
        <TouchableOpacity style={styles.backBtn} onPress={safeGoBack}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>{t('task_details') || 'Task Details'}</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Feather name="more-vertical" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {/* Premium Top Card */}
        <Animated.View entering={FadeInUp.delay(200)} style={[styles.premiumTopCard, { backgroundColor: theme.card }]}>
          <View style={{ flex: 1, marginRight: 15 }}>
            <TouchableOpacity onPress={() => setShowTaskNameModal(true)}>
              <Text style={[styles.premiumTaskName, { color: theme.text }]} numberOfLines={2}>
                {task.taskName}
              </Text>
            </TouchableOpacity>

            <View style={styles.premiumDueRow}>
              <Feather name="calendar" size={16} color={theme.primary} />
              <Text style={styles.premiumDueText}>
                Due: {task.endDate ? new Date(task.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-'}
              </Text>
            </View>

            <View style={styles.premiumDueRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                <Feather name="briefcase" size={16} color={theme.primary} />
                <Text style={[styles.premiumDueText, { flexShrink: 1 }]}>
                  {typeof task.projectName === 'object' ? task.projectName?.name : task.projectName || '-'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16, flexShrink: 1 }}>
                <Feather name="map-pin" size={16} color={theme.primary} />
                <Text style={[styles.premiumDueText, { flexShrink: 1 }]}>
                  {task.location}
                </Text>
              </View>
            </View>

            <View style={styles.statusBadgeRow}>
              {task.status === 'Hold' ? (
                <View style={[styles.statusBadge, { backgroundColor: theme.issueBadgeBg || '#FF9800' }]}>
                  <Text style={styles.statusBadgeText}>ON HOLD</Text>
                </View>
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: task.progress === 100 ? '#4CAF50' : theme.primary }]}>
                  <Text style={styles.statusBadgeText}>
                    {task.progress === 100 ? 'COMPLETED' : (task.status?.toUpperCase() || 'IN PROGRESS')}
                  </Text>
                </View>
              )}
              {task.isCritical && (
                <View style={[styles.statusBadge, { backgroundColor: theme.dangerText || '#E53935' }]}>
                  <Text style={styles.statusBadgeText}>CRITICAL</Text>
                </View>
              )}
            </View>
            {task.description ? (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 13, color: theme.secondaryText, lineHeight: 18 }} numberOfLines={3}>
                  {task.description}
                </Text>
              </View>
            ) : null}
          </View>

          <View>
            <CircularProgress
              percentage={task.progress ?? editableProgress ?? 0}
              size={90}
              strokeWidth={10}
              theme={theme}
            />
          </View>
        </Animated.View>

        {/* Circular Action Buttons Row */}
        <Animated.View entering={FadeInUp.delay(800)} style={styles.actionCircleRow}>
          <View style={styles.actionCircleContainer}>
            <TouchableOpacity style={[styles.actionCircle, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setShowTaskChat(true)}>
              <Feather name="message-circle" size={24} color={theme.issueText} />
            </TouchableOpacity>
            <Text style={styles.actionCircleLabel}>Chat</Text>
          </View>

          <View style={styles.actionCircleContainer}>
            <TouchableOpacity style={[styles.actionCircle, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setIsGalleryExpanded(!isGalleryExpanded)}>
              <Feather name="file-text" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.actionCircleLabel}>Docs</Text>
          </View>

          <View style={styles.actionCircleContainer}>
            <TouchableOpacity style={[styles.actionCircle, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setShowReassignModal(true)}>
              <Ionicons name="people-outline" size={24} color="#21B573" />
            </TouchableOpacity>
            <Text style={styles.actionCircleLabel}>Team</Text>
          </View>

          <View style={styles.actionCircleContainer}>
            <TouchableOpacity style={[styles.actionCircle, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setShowMaterialRequest(true)}>
              <Feather name="package" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.actionCircleLabel}>Materials</Text>
          </View>

          <View style={styles.actionCircleContainer}>
            <TouchableOpacity style={[styles.actionCircle, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setShowDependentPopup(true)}>
              <Feather name="link" size={24} color={theme.issueText} />
            </TouchableOpacity>
            <Text style={styles.actionCircleLabel}>Dependency</Text>
          </View>
        </Animated.View>

        {/* Attachments Section - MOVED & CONDITIONAL */}
        {isGalleryExpanded && (
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.workflowCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: -10 }]}>
            {/* Header Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
                {t("attachments")} ({allAttachments.length})
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                {/* Mic Icon */}
                <TouchableOpacity onPress={() => setShowVoiceRecorder(true)}>
                  <Feather name="mic" size={22} color={theme.primary} />
                </TouchableOpacity>

                {/* Add Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                  onPress={() => setShowAttachmentSheet(true)}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* PREVIEW LIST FOR NEW (UNSAVED) ATTACHMENTS (Before Upload) */}
            {newAttachments.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={{
                  backgroundColor: theme.background,
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme.primary,
                  borderStyle: 'dashed'
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary, marginBottom: 8 }}>
                    Ready to Upload ({newAttachments.length})
                  </Text>
                  {/* List of new files to be uploaded */}
                  {Array.from({ length: Math.ceil(newAttachments.length / 2) }).map((_, rowIdx) => (
                    <View
                      key={rowIdx}
                      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      {[0, 1].map((colIdx) => {
                        const idx = rowIdx * 2 + colIdx;
                        const att = newAttachments[idx];
                        if (!att) return <View key={colIdx} style={{ flex: 1 }} />;
                        return (
                          <View
                            key={att.uri || att.name || idx}
                            style={{
                              flex: 1,
                              flexDirection: 'row',
                              alignItems: 'center',
                              padding: 8,
                              borderWidth: 1,
                              borderColor: theme.border,
                              borderRadius: 8,
                              backgroundColor: theme.card,
                              marginRight: colIdx === 0 ? 8 : 0,
                            }}>
                            {/* Thumbnail Preview */}
                            {(() => {
                              const type = att.type || '';
                              const name = att.name || '';
                              const isImage = type.startsWith('image') || name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                              const isVideo = type.startsWith('video') || name.match(/\.(mp4|mov|avi|mkv|webm)$/i);
                              const isPdf = type.includes('pdf') || name.match(/\.pdf$/i);
                              const isAudio = type.startsWith('audio') || name.match(/\.(mp3|wav|m4a|aac)$/i);
                              const isWord = type.includes('word') || type.includes('document') || name.match(/\.(doc|docx)$/i);
                              const isExcel = type.includes('sheet') || type.includes('excel') || name.match(/\.(xls|xlsx)$/i);

                              if (isImage) return <Image source={{ uri: att.uri }} style={{ width: 24, height: 24, borderRadius: 4, marginRight: 8 }} />;
                              if (isVideo) return (
                                <View style={{ width: 24, height: 24, borderRadius: 4, marginRight: 8, overflow: 'hidden', backgroundColor: '#000' }}>
                                  <Video
                                    source={{ uri: att.uri }}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode={ResizeMode.COVER}
                                    useNativeControls={false}
                                    shouldPlay={false}
                                    isMuted={true}
                                  />
                                </View>
                              );
                              if (isPdf) return <MaterialCommunityIcons name="file-pdf-box" size={24} color="#F44336" style={{ marginRight: 8 }} />;
                              if (isAudio) return <MaterialCommunityIcons name="file-music-outline" size={24} color="#2196F3" style={{ marginRight: 8 }} />;
                              if (isWord) return <MaterialCommunityIcons name="file-word-box" size={24} color="#1976D2" style={{ marginRight: 8 }} />;
                              if (isExcel) return <MaterialCommunityIcons name="file-excel-box" size={24} color="#4CAF50" style={{ marginRight: 8 }} />;
                              return <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.secondaryText} style={{ marginRight: 8 }} />;
                            })()}
                            <Text style={{ color: theme.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                              {(att.name || 'File').slice(0, 15)}
                            </Text>
                            {/* Remove from staging */}
                            <TouchableOpacity
                              onPress={() => setNewAttachments((prev) => prev.filter((_, i) => i !== idx))}
                              style={{ marginLeft: 4 }}>
                              <MaterialCommunityIcons name="close" size={18} color="#E53935" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                  {/* UPLOAD ACTION BUTTON */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: theme.primary,
                      borderRadius: 8,
                      paddingVertical: 12,
                      alignItems: 'center',
                      marginTop: 4,
                    }}
                    disabled={uploadingAttachment}
                    onPress={async () => {
                      setUploadingAttachment(true);
                      try {
                        // Pass taskName and description so they don't get overwritten with null
                        await updateTaskDetails(task.id || task._id || task.taskId, {
                          taskName: task.taskName,
                          description: task.description,
                          attachments: newAttachments,
                        });
                        clearAttachments();
                        // Refresh task details to show new attachments immediately
                        const updated = await getTaskDetailsById(task.id || task._id || task.taskId);
                        setTask(updated);
                        Alert.alert('Success', 'Attachment(s) uploaded successfully!');
                      } catch (err) {
                        console.error('Upload Error:', err);
                        Alert.alert('Error', err.message || 'Failed to upload attachments.');
                      }
                      setUploadingAttachment(false);
                    }}>
                    {uploadingAttachment ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                        Upload {newAttachments.length} {newAttachments.length === 1 ? 'File' : 'Files'} Now
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {allAttachments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {allAttachments.map((att, index) => {
                  const url = att.url || att.uri || (typeof att === 'string' ? att : '');
                  const type = att.type || '';
                  const extension = url ? url.split('.').pop().toLowerCase().split('?')[0] : '';

                  const isImage = type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(extension);
                  const isVideo = type.includes('video') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension);
                  const isPdf = type.includes('pdf') || extension === 'pdf';
                  const isAudio = type.includes('audio') || ['mp3', 'wav', 'm4a', 'aac'].includes(extension);
                  const isWord = type.includes('word') || type.includes('document') || ['doc', 'docx'].includes(extension);
                  const isExcel = type.includes('sheet') || type.includes('excel') || ['xls', 'xlsx'].includes(extension);

                  return (
                    <TouchableOpacity key={index} onPress={() => { setPreviewIndex(index); setPreviewVisible(true); }}>
                      <View style={{
                        width: 80,
                        height: 80,
                        borderRadius: 12,
                        backgroundColor: theme.background,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: theme.border
                      }}>
                        {isImage ? (
                          <Image
                            source={{ uri: url }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : isVideo ? (
                          <View style={{ width: '100%', height: '100%', backgroundColor: '#000' }}>
                            <Video
                              source={{ uri: url }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode={ResizeMode.COVER}
                              useNativeControls={false}
                              shouldPlay={false}
                              isMuted={true}
                            />
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                              <Feather name="play-circle" size={24} color="#fff" />
                            </View>
                          </View>
                        ) : isPdf ? (
                          <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#FFEBEE' }}>
                            <MaterialCommunityIcons name="file-pdf-box" size={32} color="#F44336" />
                            <Text style={{ fontSize: 9, color: '#F44336', marginTop: 4, fontWeight: '700' }}>PDF</Text>
                          </View>
                        ) : isAudio ? (
                          <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#E3F2FD' }}>
                            <MaterialCommunityIcons name="file-music-outline" size={32} color="#2196F3" />
                            <Text style={{ fontSize: 9, color: '#2196F3', marginTop: 4, fontWeight: '700' }}>AUDIO</Text>
                          </View>
                        ) : isWord ? (
                          <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#E8F5E9' }}>
                            <MaterialCommunityIcons name="file-word-box" size={32} color="#1976D2" />
                            <Text style={{ fontSize: 9, color: '#1976D2', marginTop: 4, fontWeight: '700' }}>DOC</Text>
                          </View>
                        ) : isExcel ? (
                          <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#E8F5E9' }}>
                            <MaterialCommunityIcons name="file-excel-box" size={32} color="#4CAF50" />
                            <Text style={{ fontSize: 9, color: '#4CAF50', marginTop: 4, fontWeight: '700' }}>XLS</Text>
                          </View>
                        ) : (
                          <Feather name="file-text" size={30} color={theme.primary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : newAttachments.length === 0 && (
              <View style={{
                height: 100,
                borderWidth: 1,
                borderColor: theme.border,
                borderStyle: 'dashed',
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.background + '50'
              }}>
                <Text style={{ color: theme.secondaryText, fontStyle: 'italic', fontSize: 14 }}>No attachments yet</Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Stats Grid - COMMENTED OUT
        <Animated.View entering={FadeInUp.delay(400)} style={styles.statsGrid}>
          <TouchableOpacity style={styles.statsCard} onPress={() => setShowDependentPopup(true)}>
            <View style={[styles.statsIconContainer, { backgroundColor: theme.issueBg }]}>
              <Feather name="link" size={20} color={theme.issueText} />
            </View>
            <Text style={styles.statsLabel}>Dependency</Text>
            <Text style={styles.statsValue}>{task.dependentTasks?.length || 0} Critical</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statsCard} onPress={() => setShowSubtasks(!showSubtasks)}>
            <View style={[styles.statsIconContainer, { backgroundColor: theme.normalBg }]}>
              <Feather name="layers" size={20} color={theme.normalText} />
            </View>
            <Text style={styles.statsLabel}>Subtasks</Text>
            <Text style={styles.statsValue}>{task.subTasks?.length || 0} Total</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statsCard} onPress={() => setShowMaterialRequest(true)}>
            <View style={[styles.statsIconContainer, { backgroundColor: '#F0FFF4' }]}>
              <Feather name="package" size={20} color="#21B573" />
            </View>
            <Text style={styles.statsLabel}>Materials</Text>
            <Text style={styles.statsValue}>Requirements</Text>
          </TouchableOpacity>
        </Animated.View>
        */}

        <TaskChatPopup
          visible={showTaskChat}
          onClose={() => setShowTaskChat(false)}
          messages={chatMessages}
          onSend={handleSendChatMessage}
          theme={theme}
          currentUserId={currentUserId}
          loading={chatLoading}
          users={users}
          task={task}
        />
        <MaterialRequestPopup
          visible={showMaterialRequest}
          onClose={() => setShowMaterialRequest(false)}
          taskId={task.id || task._id || task.taskId}
          projectId={task.projectId}
          theme={theme}
        />
        <TaskReassignPopup
          visible={showReassignModal}
          onClose={(wasReassigned) => {
            setShowReassignModal(false);
          }}
          taskId={task?.id || task?._id || task?.taskId}
          theme={theme}
          currentAssignees={task?.assignedUserDetails || []}
          isCreator={isCreator}
        />

        {isWorkflowTask ? (
          // WORKFLOW MODE VIEW
          <Animated.View entering={FadeInDown.delay(900)} style={[styles.workflowCard, { backgroundColor: theme.card, borderColor: theme.border + '50', elevation: 2 }]}>
            <View style={styles.workflowHeader}>
              <MaterialCommunityIcons name="transit-connection-variant" size={20} color={theme.primary} />
              <Text style={[styles.workflowTitle, { color: theme.text }]}>
                WORKFLOW STAGE
              </Text>
              <View style={[styles.stageBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.stageBadgeText, { color: theme.primary }]}>
                  {task.category?.replace('_', ' ')}
                </Text>
              </View>
            </View>

            <View style={styles.stepperContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingVertical: 10 }}>
                {workflowStages.map((stage, index) => {
                  const isCompleted = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex;

                  return (
                    <View key={stage.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ alignItems: 'center' }}>
                        <View style={[
                          styles.stepNode,
                          isCompleted ? { backgroundColor: '#21B573', borderColor: '#21B573' } :
                            isCurrent ? { backgroundColor: theme.primary, borderColor: theme.primary } :
                              { backgroundColor: theme.card, borderColor: theme.border }
                        ]}>
                          {isCompleted ? (
                            <Feather name="check" size={12} color="#fff" />
                          ) : (
                            <Text style={[styles.stepNumber, { color: isCurrent ? '#fff' : theme.secondaryText }]}>
                              {index + 1}
                            </Text>
                          )}
                        </View>
                        {isCurrent && (
                          <Text style={[styles.stepLabelActive, { color: theme.primary }]} numberOfLines={1}>
                            {stage.label}
                          </Text>
                        )}
                      </View>
                      {index < workflowStages.length - 1 && (
                        <View style={[
                          styles.stepLine,
                          (index < currentStageIndex) ? { backgroundColor: '#21B573' } : { backgroundColor: theme.border }
                        ]} />
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {!isTaskCompleted && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 10 }]}
                onPress={handleNextStage}
                disabled={stageLoading}
              >
                {stageLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionBtnText}>Mark as Complete</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {isTaskCompleted && (
              <View style={[styles.completedBanner, { backgroundColor: '#21B57320', marginTop: 10 }]}>
                <Feather name="check" size={16} color="#21B573" />
                <Text style={{ color: '#21B573', fontWeight: '600', marginLeft: 6 }}>Workflow Completed</Text>
              </View>
            )}
          </Animated.View>
        ) : (
          // LEGACY MODE VIEW (Circularly styled slider area)
          task && typeof editableProgress === 'number' && (
            <Animated.View entering={FadeInDown.delay(900)} style={[styles.chartCard, { backgroundColor: theme.card, paddingVertical: 20 }]}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, marginBottom: 15 }}>
                {t('update_progress') || 'Update Progress'}: {editableProgress}%
              </Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0}
                maximumValue={100}
                step={1}
                minimumTrackTintColor={theme.primary}
                maximumTrackTintColor={theme.border}
                thumbTintColor={theme.primary}
                value={editableProgress ?? 0}
                onValueChange={(value) => {
                  isSlidingRef.current = true;
                  setEditableProgress(value);
                }}
                onSlidingComplete={async (value) => {
                  isSlidingRef.current = false;
                  const prevProgress = lastProgressRef.current;
                  if (value === 100) {
                    Alert.alert(
                      'Complete Task?',
                      'Are you sure you want to mark this task as 100% complete?',
                      [
                        { text: 'No', style: 'cancel', onPress: () => setEditableProgress(prevProgress) },
                        { text: 'Yes', onPress: async () => await handleUpdateProgress(value, prevProgress) },
                      ]
                    );
                  } else {
                    await handleUpdateProgress(value, prevProgress);
                  }
                }}
              />
            </Animated.View>
          )
        )}

        {/* Velocity Chart Card */}
        <Animated.View entering={FadeInUp.delay(600)} style={[styles.chartCard, { backgroundColor: theme.card }]}>
          <Text style={styles.chartTitle}>Task Velocity</Text>
          <ActivityChart theme={theme} />
        </Animated.View>



        <Modal
          visible={showDependentPopup}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDependentPopup(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}>
            <View
              style={{
                backgroundColor: theme.card,
                borderRadius: 18,
                paddingVertical: 18,
                paddingHorizontal: 18,
                maxHeight: '80%',
                width: '100%',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.08,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 8,
                elevation: 8,
              }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  marginBottom: 18,
                  color: theme.text,
                  letterSpacing: 0.2,
                }}>
                {t("task_dependencies")}
              </Text>
              <ScrollView
                style={{ width: '100%', maxHeight: 380 }}
                contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 8 }}
                showsVerticalScrollIndicator={true}>
                {task.dependentTasks.map((t, idx) => {
                  const name = typeof t === 'string' ? t : t.taskName || t.name || '';
                  const progress = typeof t === 'object' && t.progress != null ? t.progress : 0;
                  const statusText = progress < 70 ? 'In Progress' : 'Ready to Proceed';
                  const statusColor = progress < 70 ? '#f59e42' : theme.success || '#2e7d32';
                  const avatarText = name ? name[0].toUpperCase() : '?';
                  const taskId = typeof t === 'object' ? t.id || t.taskId || t._id : null;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: theme.secCard,
                        borderRadius: 12,
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: theme.border,
                        shadowColor: '#000',
                        shadowOpacity: 0.06,
                        shadowOffset: { width: 0, height: 1 },
                        shadowRadius: 4,
                      }}
                      onPress={() => {
                        if (taskId) {
                          setShowDependentPopup(false);
                          navigation.push('TaskDetails', {
                            taskId: taskId,
                            refreshedAt: Date.now(),
                          });
                        }
                      }}
                      activeOpacity={taskId ? 0.7 : 1}>
                      {/* Avatar/Initial */}
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: theme.avatarBg || '#e0e7ef',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12,
                        }}>
                        <Text
                          style={{
                            color: theme.primary,
                            fontSize: 16,
                            fontWeight: '700',
                          }}>
                          {avatarText}
                        </Text>
                      </View>
                      {/* Task Details */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: theme.text,
                            fontWeight: '600',
                            fontSize: 15,
                            marginBottom: 2,
                          }}>
                          {name || 'Unnamed Task'}
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: statusColor,
                            fontWeight: '500',
                            marginBottom: 2,
                          }}>
                          {statusText}
                        </Text>
                        {t.description && (
                          <Text
                            style={{
                              color: theme.textSecondary || '#7986a0',
                              fontSize: 12,
                              marginTop: 2,
                            }}>
                            {t.description}
                          </Text>
                        )}
                      </View>
                      {/* Progress Circle */}
                      <View style={{ marginLeft: 12 }}>
                        <CircularProgress percentage={progress} size={48} strokeWidth={4} theme={theme} />
                      </View>
                      {/* Navigation indicator */}
                      {taskId && (
                        <View style={{ marginLeft: 8 }}>
                          <Feather name="chevron-right" size={16} color={theme.secondaryText} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                onPress={() => setShowDependentPopup(false)}
                style={{
                  marginTop: 14,
                  alignSelf: 'center',
                  backgroundColor: theme.primary,
                  paddingVertical: 8,
                  paddingHorizontal: 36,
                  borderRadius: 16,
                  shadowColor: theme.primary,
                  shadowOpacity: 0.12,
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 6,
                }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{t("close")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* Subtasks Section */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.premiumSectionTitle}>
            {t("subtasks")} ({task.subTasks?.length || 0})
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 10
            }}
            onPress={() => setShowAddSubTaskPopup(true)}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {(!task.subTasks || task.subTasks.length === 0) ? (
          <View style={{ marginHorizontal: 20, padding: 20, backgroundColor: theme.card, borderRadius: 18, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: theme.secondaryText }}>{t("no_subtasks_available")}</Text>
          </View>
        ) : (
          filteredSubtasks.map((sub, idx) => {
            const assignee = sub.assignedUserDetails?.[0];
            const initials = assignee?.name ? assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'T';

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.premiumSubtaskCard, { backgroundColor: theme.card }]}
                onPress={() => {
                  setSubtaskSearch('');
                  navigation.push('SubTaskDetails', {
                    taskId: sub.id || sub.taskId || sub._id,
                    parentTaskId: task.id || task.taskId,
                    refreshedAt: Date.now(),
                  });
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[styles.subtaskAvatarContainer, { backgroundColor: theme.normalIconBg || theme.primary }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{initials}</Text>
                </View>

                <View style={styles.subtaskInfo}>
                  <Text style={[styles.subtaskNameText, { color: theme.text }]} numberOfLines={1}>
                    {sub.taskName || sub.name}
                  </Text>
                  <Text style={[styles.subtaskUserText, { color: theme.secondaryText }]} numberOfLines={1}>
                    {assignee?.name || 'Unassigned'}
                  </Text>
                </View>

                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress
                    percentage={sub.progress ?? 0}
                    size={42}
                    strokeWidth={4}
                    theme={theme}
                  />
                </View>
              </TouchableOpacity>
            )
          })
        )}


      </ScrollView>
      {/* Options Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={{
            position: 'absolute', top: Platform.OS === 'ios' ? 80 : 35, right: 20,
            backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8,
            shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 6, minWidth: 160
          }}>
            {/* Edit */}
            <TouchableOpacity style={styles.menuOption} onPress={() => { setMenuVisible(false); navigation.navigate('UpdateTaskScreen', { taskId: task.id || task._id || task.taskId, projects, users, worklists, projectTasks }); }}>
              <Feather name="edit" size={18} color="#366CD9" style={{ marginRight: 8 }} />
              <Text style={{ color: '#366CD9', fontSize: 15 }}>{t("edit")}</Text>
            </TouchableOpacity>
            {/* Hold / Reopen Logic (Only if creator AND Legacy Mode) */}
            {isCreator && !isWorkflowTask && (
              <>
                <View style={styles.menuDivider} />
                {task.status === 'Hold' ? (
                  <TouchableOpacity style={styles.menuOption} onPress={() => { setMenuVisible(false); handleReopenTask(); }}>
                    <Feather name="play-circle" size={18} color="#4CAF50" style={{ marginRight: 8 }} />
                    <Text style={{ color: '#4CAF50', fontSize: 15 }}>Reopen Task</Text>
                  </TouchableOpacity>
                ) : (
                  task.status !== 'Completed' && (
                    <TouchableOpacity style={styles.menuOption} onPress={() => { setMenuVisible(false); setShowHoldModal(true); }}>
                      <Feather name="pause-circle" size={18} color="#FF9800" style={{ marginRight: 8 }} />
                      <Text style={{ color: '#FF9800', fontSize: 15 }}>Hold Task</Text>
                    </TouchableOpacity>
                  )
                )}
              </>
            )}
            {/* Delete (Only creator) */}
            {isCreator && (
              <>
                <View style={styles.menuDivider} />
                <TouchableOpacity style={styles.menuOption} onPress={() => {
                  setMenuVisible(false);
                  Alert.alert(t('delete_task'), t('delete_task_confirmation'), [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('delete'), style: 'destructive', onPress: async () => { /* Delete logic */ await deleteTask(task.id || task._id || task.taskId); safeGoBack(); } },
                  ]);
                }}>
                  <Feather name="trash-2" size={18} color="#E53935" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#E53935', fontSize: 15 }}>{t("delete")}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Hold Task Modal */}
      <Modal visible={showHoldModal} transparent animationType="slide" onRequestClose={() => setShowHoldModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Hold Task</Text>
            <Text style={{ color: theme.secondaryText, marginBottom: 10 }}>Please provide a reason for putting this task on hold.</Text>

            <TextInput
              style={[styles.modalInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Enter reason..."
              placeholderTextColor={theme.secondaryText}
              value={holdReason}
              onChangeText={setHoldReason}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowHoldModal(false)} style={{ padding: 10 }}>
                <Text style={{ color: theme.secondaryText }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleHoldTask} style={{ padding: 10, backgroundColor: '#FF9800', borderRadius: 8 }}>
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm Hold</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <VoiceRecorderPopup
        visible={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onRecord={handleAudioRecorded}
        theme={theme}
      />
      {/* Subtask Popup with updated props */}
      <AddSubTaskPopup
        visible={showAddSubTaskPopup}
        onClose={() => setShowAddSubTaskPopup(false)}
        values={addSubTask}
        onChange={handleTaskChange}
        onSubmit={handleTaskSubmit}
        theme={theme}
        projectId={task.projectId}
        projectName={task.projectName}
        worklistId={task.worklistId}
        worklistName={task.worklistName}
        users={users}
        projectTasks={projectTasks}
        worklists={worklists}
        parentTaskId={taskId}
      />
      <AttachmentSheet
        visible={showAttachmentSheet}
        onClose={() => setShowAttachmentSheet(false)}
        onPick={async (type) => {
          const files = await pickAttachment(type);
          console.log('Files returned from picker:', files);
          setShowAttachmentSheet(false);
        }}
      />
      <AttachmentDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        attachments={drawerAttachments.length ? drawerAttachments : allAttachments}
        theme={theme}
        onAttachmentPress={(item, index) => {
          setPreviewIndex(index);
          setDrawerVisible(false); // Close drawer first
          setTimeout(() => {
            setPreviewVisible(true);
          }, Platform.OS === 'ios' ? 400 : 100); // Wait for modal close animation
        }}
      />
      <ImageModal
        visible={imageModalVisible}
        image={selectedImage}
        onClose={() => setImageModalVisible(false)}
        theme={theme}
      />
      <AttachmentPreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        attachments={drawerAttachments.length > 0 ? drawerAttachments : allAttachments}
        initialIndex={previewIndex}
        theme={theme}
      />
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditModal(false)}>
        <View style={{ flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' }}>
          <View
            style={{
              backgroundColor: theme.card,
              margin: 24,
              borderRadius: 18,
              padding: 20,
            }}>
            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 18, marginBottom: 18 }}>
              {t("edit_task")}
            </Text>
            <TextInput
              value={editValues.taskName}
              placeholder={t("task_name")}
              placeholderTextColor={theme.secondaryText}
              onChangeText={(text) => setEditValues((v) => ({ ...v, taskName: text }))}
              style={{
                color: theme.text,
                borderBottomWidth: 1,
                borderColor: theme.border,
                marginBottom: 14,
                fontSize: 16,
              }}
            />
            <TextInput
              value={editValues.description}
              placeholder={t("description")}
              placeholderTextColor={theme.secondaryText}
              onChangeText={(text) => setEditValues((v) => ({ ...v, description: text }))}
              style={{
                color: theme.text,
                borderBottomWidth: 1,
                borderColor: theme.border,
                marginBottom: 14,
                fontSize: 16,
              }}
              multiline
            />
            {/* You can add date pickers for startDate/endDate if needed */}
            <View
              style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 }}>
              <TextInput
                value={editValues.startDate ? editValues.startDate.split('T')[0] : ''}
                placeholder={t("start_date")}
                placeholderTextColor={theme.secondaryText}
                onChangeText={(text) => setEditValues((v) => ({ ...v, startDate: text }))}
                style={{
                  color: theme.text,
                  borderBottomWidth: 1,
                  borderColor: theme.border,
                  flex: 1,
                  marginRight: 8,
                }}
              />
              <TextInput
                value={editValues.endDate ? editValues.endDate.split('T')[0] : ''}
                placeholder={t("end_date")}
                placeholderTextColor={theme.secondaryText}
                onChangeText={(text) => setEditValues((v) => ({ ...v, endDate: text }))}
                style={{
                  color: theme.text,
                  borderBottomWidth: 1,
                  borderColor: theme.border,
                  flex: 1,
                }}
              />
            </View>
            {/* Issue Toggle */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              marginBottom: 18,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: theme.text,
                  fontSize: 16,
                  fontWeight: '500',
                  marginBottom: 4,
                }}>
                  Convert to Issue
                </Text>
                <Text style={{
                  color: theme.secondaryText,
                  fontSize: 14,
                  lineHeight: 18,
                }}>
                  {editValues.isIssue
                    ? 'This task will appear in the issues section'
                    : 'Convert this task to an issue'
                  }
                </Text>
              </View>
              <Switch
                value={editValues.isIssue}
                onValueChange={(value) => setEditValues((v) => ({
                  ...v,
                  isIssue: value,
                  // If converting from issue to normal task, also reset critical flag
                  isCritical: value ? v.isCritical : false
                }))}
                trackColor={{ false: '#ddd', true: theme.primary }}
                thumbColor="#fff"
                ios_backgroundColor="#ddd"
              />
            </View>
            {/* Critical Toggle - Only show when isIssue is true */}
            {editValues.isIssue && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                marginBottom: 18,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: '500',
                    marginBottom: 4,
                  }}>
                    Mark as Critical
                  </Text>
                  <Text style={{
                    color: theme.secondaryText,
                    fontSize: 14,
                    lineHeight: 18,
                  }}>
                    {editValues.isCritical
                      ? 'This issue will be marked as critical and require immediate attention'
                      : 'Mark this issue as critical for higher priority'
                    }
                  </Text>
                </View>
                <Switch
                  value={editValues.isCritical}
                  onValueChange={(value) => setEditValues((v) => ({ ...v, isCritical: value }))}
                  trackColor={{ false: '#ddd', true: theme.criticalText }}
                  thumbColor="#fff"
                  ios_backgroundColor="#ddd"
                />
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity style={{ marginRight: 16 }} onPress={() => setShowEditModal(false)}>
                <Text style={{ color: theme.secondaryText, fontSize: 16 }}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 8,
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                }}
                onPress={async () => {
                  try {
                    // Check if flags changed
                    const flagsChanged = editValues.isIssue !== task.isIssue || editValues.isCritical !== task.isCritical;
                    // Update basic task fields first
                    const updated = await updateTask(task.id || task._id || task.taskId, {
                      taskName: editValues.taskName,
                      description: editValues.description,
                      startDate: editValues.startDate,
                      endDate: editValues.endDate,
                    });
                    // Update flags separately to preserve assigned users
                    if (flagsChanged) {
                      await updateTaskFlags(task.id || task._id || task.taskId, {
                        isIssue: editValues.isIssue,
                        isCritical: editValues.isCritical,
                      });
                    }
                    // Refresh task data
                    const refreshedTask = await getTaskDetailsById(task.id || task._id || task.taskId);
                    setTask(refreshedTask);
                    setShowEditModal(false);
                    let message = 'Task updated successfully!';
                    if (editValues.isIssue !== task.isIssue) {
                      message = editValues.isIssue
                        ? 'Task converted to issue successfully!'
                        : 'Issue converted back to task successfully!';
                    } else if (editValues.isCritical !== task.isCritical) {
                      message = editValues.isCritical
                        ? 'Issue marked as critical successfully!'
                        : 'Issue no longer marked as critical!';
                    }

                    Alert.alert('Success', message);
                  } catch (err) {
                    Alert.alert('Error', err.message || 'Failed to update task.');
                  }
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t("save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Task Name Modal */}
      <Modal
        visible={showTaskNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTaskNameModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowTaskNameModal(false)}>
          <View style={styles.coAdminPopupOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={[styles.coAdminPopup, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.coAdminPopupTitle, { color: theme.text }]}>{t("task_name")}</Text>
                <Text style={[{ color: theme.text, fontSize: 16, textAlign: 'center', lineHeight: 22, marginBottom: 12 }]}>
                  {task?.taskName}
                </Text>
                <TouchableOpacity
                  style={styles.coAdminPopupCloseBtn}
                  onPress={() => setShowTaskNameModal(false)}>
                  <Text style={{ color: theme.primary, fontWeight: '500' }}>{t('Close')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  subtasksCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 0,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  // Menu Styles
  menuOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  menuDivider: { height: 1, backgroundColor: '#EEE', marginVertical: 2 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContainer: { borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 10, height: 80, textAlignVertical: 'top', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  // NEW STYLES FOR WORKFLOW UI
  workflowCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    // Shadow for iOS/Android
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  workflowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  workflowTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
    letterSpacing: 0.5,
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stepperContainer: {
    marginBottom: 20,
    height: 60, // Fixed height for scroll area
  },
  stepNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '700',
  },
  stepLine: {
    width: 30,
    height: 2,
    marginHorizontal: -2, // pull closer to nodes
    zIndex: 1,
  },
  stepLabelActive: {
    position: 'absolute',
    top: 28,
    fontSize: 10,
    fontWeight: '600',
    width: 80,
    textAlign: 'center',
  },
  currentStageBox: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  currentStageLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  currentStageValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  subtasksTitle: {
    fontWeight: '500',
    fontSize: 16,
    color: '#222',
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    paddingVertical: 4,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  subtaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  subtaskIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F2F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subtaskIconText: {
    color: '#366CD9',
    fontWeight: 'bold',
    fontSize: 16,
  },
  subtaskName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#222',
    marginBottom: 0,
  },
  subtaskDesc: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
  },
  subtaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtaskAssignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subtaskAssigned: {
    color: '#888',
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '400',
  },
  progressBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
  },
  subtaskAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  subTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 9,
    marginBottom: 18,
  },
  viewSubtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewSubtaskBtnText: {
    color: '#2563EB',
    fontWeight: '400',
    fontSize: 14,
    marginLeft: 6,
  },
  addSubTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addSubTaskBtnText: {
    color: '#2563EB',
    fontWeight: '400',
    fontSize: 14,
    marginLeft: 6,
  },
  subtaskListContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  subtaskListTitle: {
    fontWeight: '600',
    fontSize: 16,
    color: '#222',
    marginBottom: 10,
  },
  noSubtasksText: {
    color: '#888',
    alignSelf: 'center',
    marginVertical: 14,
    fontStyle: 'italic',
    fontSize: 14,
  },
  backBtn: {
    marginTop: 0,
    marginLeft: 16,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 18,
    color: '#222',
    fontWeight: '400',
    marginLeft: 0,
  },
  headerCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  taskName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
    maxWidth: '85%',
  },
  dueDate: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.85,
    fontWeight: '400',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 22,
    marginBottom: 8,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontWeight: '400',
    fontSize: 16,
    color: '#222',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#21B573',
    marginRight: 6,
    fontWeight: '400',
  },
  statusText: {
    color: '#21B573',
    fontWeight: '400',
    fontSize: 14,
  },
  progressBarBg: {
    width: '90%',
    height: 6,
    backgroundColor: '#ECF0FF',
    borderRadius: 6,
    marginHorizontal: '5%',
    marginBottom: 18,
  },
  progressBar: {
    color: '#FFFFFF',
    height: 6,
    backgroundColor: '#366CD9',
    borderRadius: 6,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#222',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldIcon: {
    marginRight: 10,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 22,
    marginBottom: 12,
    gap: 8, // if supported, otherwise use marginRight on DateBox
  },
  dateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    padding: 12,
    marginRight: 8,
  },
  dateLabel: {
    color: '#888',
    fontSize: 13,
  },
  dateValue: {
    color: '#222',
    fontSize: 15,
    fontWeight: 'bold',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginLeft: 10,
  },
  // subTaskHeader: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  //   marginHorizontal: 20,
  //   marginTop: 9,
  //   marginBottom: 18,
  // },
  subTaskTitle: {
    fontWeight: '500',
    fontSize: 16,
    color: '#222',
  },
  addSubTask: {
    backgroundColor: '#E0E7FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    color: '#1B6DC1',
    fontWeight: '500',
    fontSize: 14,
  },
  subTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    justifyContent: 'space-between',
  },
  subTaskName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
  },
  subTaskDesc: {
    color: '#888',
    fontSize: 14,
  },
  subTaskAssigned: {
    color: '#bbb',
    fontSize: 13,
  },
  worklistBtn: {
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 32,
    borderRadius: 12,
    overflow: 'hidden',
  },
  worklistBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  worklistBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 10,
    elevation: 5,
  },
  coAdminPopupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  coAdminPopup: {
    width: 280,
    minHeight: 200,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  coAdminPopupTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  coAdminPopupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  coAdminPopupCloseBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 120, 246, 0.08)',
  },
  premiumSubtaskCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  subtaskAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subtaskInfo: {
    flex: 1,
  },
  subtaskNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D1B3E',
  },
  subtaskUserText: {
    fontSize: 12,
    color: '#7B8794',
    marginTop: 2,
  },
  // Premium Task Details Styles
  mainContainer: {
    flex: 1,
  },
  premiumTopCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    padding: 24,
    marginTop: 10,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 8,
  },
  premiumTaskName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0D1B3E',
    marginBottom: 8,
  },
  premiumDueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumDueText: {
    fontSize: 13,
    color: '#7B8794',
    marginLeft: 6,
    fontWeight: '500',
  },
  statusBadgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  statsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F2F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statsLabel: {
    fontSize: 11,
    color: '#7B8794',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statsValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D1B3E',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    marginHorizontal: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D1B3E',
    marginBottom: 16,
  },
  actionCircleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 30,
  },
  actionCircleContainer: {
    alignItems: 'center',
    gap: 10,
  },
  actionCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E4E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  actionCircleLabel: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '600',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  premiumSectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0D1B3E',
  },
});
