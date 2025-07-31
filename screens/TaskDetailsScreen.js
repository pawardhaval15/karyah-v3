import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider'; // Add this import
import AttachmentSheet from 'components/popups/AttachmentSheet';
import CoAdminListPopup from 'components/popups/CoAdminListPopup';
import { LinearGradient } from 'expo-linear-gradient';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AttachmentDrawer from '../components/issue details/AttachmentDrawer';
import AttachmentPreviewModal from '../components/issue details/AttachmentPreviewDrawer';
import ImageModal from '../components/issue details/ImageModal';
import AddSubTaskPopup from '../components/popups/AddSubTaskPopup';
import TaskChatPopup from '../components/popups/TaskChatPopup';
import useAttachmentPicker from '../components/popups/useAttachmentPicker';
import DateBox from '../components/project details/DateBox';
import FieldBox from '../components/task details/FieldBox';
import { useTheme } from '../theme/ThemeContext';
import { fetchProjectsByUser, fetchUserConnections } from '../utils/issues';
import {
  getTaskDetailsById,
  getTasksByProjectId,
  updateTaskDetails,
  updateTaskProgress,
} from '../utils/task';
import { fetchTaskMessages, sendTaskMessage } from '../utils/taskMessage';
import { getWorklistsByProjectId } from '../utils/worklist';

export default function TaskDetailsScreen({ route, navigation }) {
  // Store decoded token globally for this component
  const decodedRef = useRef(null);
  const { taskId, refreshedAt } = route.params;
  const theme = useTheme();
  const [task, setTask] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showAddSubTaskPopup, setShowAddSubTaskPopup] = useState(false);
  const [showTaskChat, setShowTaskChat] = useState(false);
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
  // Chat attachments state is now managed here for per-attachment removal
  const [chatAttachments, setChatAttachments] = useState([]);
  const [chatAttaching, setChatAttaching] = useState(false);
  const isInitialProgressSet = useRef(false);
  const isSlidingRef = useRef(false);

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

  const { pickAttachment: pickChatAttachment, clearAttachments: clearChatAttachments } =
    useAttachmentPicker();
  // Handler to pick and add attachments for chat
  const handlePickChatAttachment = async (type) => {
    setChatAttaching(true);
    try {
      const files = await pickChatAttachment(type);
      if (files && Array.isArray(files)) {
        setChatAttachments((prev) => [...prev, ...files]);
      } else if (files) {
        setChatAttachments((prev) => [...prev, files]);
      }
    } catch (e) {
      // Optionally log error
    }
    setChatAttaching(false);
  };

  // Handler to clear all chat attachments
  const handleClearChatAttachments = () => {
    setChatAttachments([]);
    clearChatAttachments();
  };

  // Handler to remove a single chat attachment by index
  const handleRemoveChatAttachment = (idx) => {
    setChatAttachments((prev) => prev.filter((_, i) => i !== idx));
  };
  const [showAssignedUserPopup, setShowAssignedUserPopup] = useState(false);
  const [showCreatorPopup, setShowCreatorPopup] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
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
  });
  // Fix for ReferenceError: showAttachmentSheet
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);

  useEffect(() => {
    if (task) {
      setEditValues({
        taskName: task.taskName || '',
        description: task.description || '',
        startDate: task.startDate || '',
        endDate: task.endDate || '',
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

  const handleSendChatMessage = async (msg, attachments = []) => {
    try {
      setChatLoading(true);
      // Always send a non-empty string for message
      const safeMsg = msg && msg.trim() ? msg : attachments.length > 0 ? ' ' : '';
      if (!safeMsg && attachments.length === 0) return; // nothing to send
      const newMsg = await sendTaskMessage({
        taskId: task.id || task._id || task.taskId,
        message: safeMsg,
        attachments: attachments,
      });
      setChatMessages((prev) => [...prev, newMsg]);
      clearChatAttachments();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send message');
    }
    setChatLoading(false);
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
          const { getWorklistsByProjectId } = await import('../utils/worklist');
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

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const data = await getTaskDetailsById(taskId);
        // console.log('Fetched task:', data);
        setTask(data);
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
      }));
    }
  }, [task]);

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
  const handleTaskSubmit = () => {
    console.log('Submit subtask:', addSubTask);
    setAddSubTask({
      taskName: '',
      description: '',
      assignedTo: '',
      dueDate: '',
      projectId: task.projectId,
      taskWorklist: task.worklistId,
    });
    setShowAddSubTaskPopup(false);
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
  const isCreator =
    userName && creatorName && userName.trim().toLowerCase() === creatorName.trim().toLowerCase();
  // console.log('[TaskDetailsScreen] Matching userName:', userName, 'with creatorName:', creatorName, '| isCreator:', isCreator);
//   console.log('[TaskDetailsScreen] userName:', userName, '| creatorName:', creatorName, '| isCreator:', isCreator);

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

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        paddingTop: Platform.OS === 'ios' ? 70 : 25,
      }}>
      <ScrollView contentContainerStyle={{ paddingBottom: showSubtasks ? 60 : 80 }}>
        {/* Top Navigation */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
        </TouchableOpacity>
        {/* Header */}
        <LinearGradient
          colors={[theme.secondary, theme.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerCard}>
          <View>
            <Text style={styles.taskName} numberOfLines={2} ellipsizeMode="tail">
              {task.taskName}
            </Text>
            <Text style={styles.dueDate}>
              Due Date: {task.endDate ? new Date(task.endDate).toDateString() : '-'}
            </Text>
          </View>
          {isCreator && (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('UpdateTaskScreen', {
                  taskId: task.id || task._id || task.taskId,
                  projects,
                  users,
                  worklists,
                  projectTasks,
                })
              }
              style={{
                padding: 8,
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 8,
              }}>
              <MaterialIcons name="edit" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </LinearGradient>
        {/* Task Chat Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowTaskChat(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            backgroundColor: theme.card,
            borderRadius: 18,
            paddingHorizontal: 14,
            paddingVertical: 7,
            marginHorizontal: 20,
            marginTop: 0,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: theme.border,
          }}>
          <MaterialIcons name="chat" size={18} color={theme.primary} style={{ marginRight: 7 }} />
          <Text style={{ color: theme.text, fontWeight: '400', fontSize: 13 }}>Task Chat</Text>
        </TouchableOpacity>
        <TaskChatPopup
          visible={showTaskChat}
          onClose={() => setShowTaskChat(false)}
          messages={chatMessages}
          onSend={handleSendChatMessage}
          theme={theme}
          currentUserId={currentUserId}
          loading={chatLoading}
          attachments={chatAttachments}
          setAttachments={setChatAttachments}
          pickAttachment={handlePickChatAttachment}
          clearAttachments={handleClearChatAttachments}
          removeAttachment={handleRemoveChatAttachment}
          attaching={chatAttaching}
        />
        {task && typeof editableProgress === 'number' && (
          <View style={{ marginHorizontal: 22, marginTop: 0, marginBottom: 10 }}>
            <Text
              style={{
                color: theme.text,
                fontWeight: '500',
                fontSize: 16,
                marginBottom: 8,
              }}>
              Progress: {editableProgress}%
            </Text>
            <Slider
              style={{ width: '100%', height: 18 }}
              minimumValue={0}
              maximumValue={100}
              step={1}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor={theme.secCard}
              thumbTintColor={theme.primary}
              value={editableProgress ?? 0}
              onValueChange={(value) => {
                isSlidingRef.current = true;
                setEditableProgress(value);
              }}
              onSlidingComplete={async (value) => {
                isSlidingRef.current = false;
                // Save previous progress before change
                const prevProgress = lastProgressRef.current;

                // If user sets progress to 100, ask for confirmation
                if (value === 100) {
                  Alert.alert(
                    'Complete Task?',
                    'Are you sure you want to mark this task as 100% complete?',
                    [
                      {
                        text: 'No',
                        style: 'cancel',
                        onPress: () => {
                          setEditableProgress(prevProgress);
                        },
                      },
                      {
                        text: 'Yes',
                        style: 'default',
                        onPress: async () => {
                          await handleUpdateProgress(value, prevProgress);
                        },
                      },
                    ]
                  );
                } else {
                  await handleUpdateProgress(value, prevProgress);
                }
              }}
            />
          </View>
        )}
        <FieldBox
          label="Selected Project"
          value={
            typeof task.projectName === 'object'
              ? typeof task.projectName.name === 'string'
                ? task.projectName.name
                : JSON.stringify(task.projectName)
              : typeof task.projectName === 'string'
                ? task.projectName
                : '-'
          }
          theme={theme}
        />
        <FieldBox
          label="Selected Worklist"
          value={
            Array.isArray(worklists)
              ? worklists.find((wl) => wl.id === task.worklistId)?.name || '-'
              : '-'
          }
          theme={theme}
        />
        {/* Dates and status */}
        <View style={styles.dateRow}>
          <DateBox label="Start Date" value={new Date(task.startDate)} theme={theme} />
          <DateBox label="End Date" value={new Date(task.endDate)} theme={theme} />
        </View>
        <TouchableOpacity
          onPress={() => {
            setCoAdminListPopupTitle('Assigned Users');
            setCoAdminListPopupData(task.assignedUserDetails || []);
            setShowCoAdminListPopup(true);
          }}
          activeOpacity={0.85}
          style={[
            styles.fieldBox,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          ]}>
          <Text style={[styles.inputLabel, { color: theme.text, flex: 1 }]}>Assigned Users</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {task.assignedUserDetails?.slice(0, 6).map((user, index) => {
              const hasPhoto = user.profilePhoto && user.profilePhoto !== '';
              return (
                <View
                  key={user.userId}
                  style={{
                    marginLeft: index === 0 ? 0 : -12,
                    zIndex: 10 - index,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: theme.primary,
                    backgroundColor: theme.mode === 'dark' ? '#23272f' : '#F8F9FB',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                  {hasPhoto ? (
                    <Image
                      source={{ uri: user.profilePhoto }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                      }}
                      onError={() => {
                        user.profilePhoto = '';
                      }}
                    />
                  ) : (
                    <Image
                      source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                      }}
                    />
                  )}
                </View>
              );
            })}
            {task.assignedUserDetails?.length > 6 && (
              <View
                style={{
                  marginLeft: -12,
                  zIndex: 0,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.buttonBg,
                  borderWidth: 1.5,
                  borderColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ color: theme.buttonText, fontWeight: '600', fontSize: 12 }}>
                  +{task.assignedUserDetails.length - 6}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {/* Task Creator */}
        <TouchableOpacity
          onPress={() => {
            setCoAdminListPopupTitle('Task Creator');
            setCoAdminListPopupData(
              task.creatorName ? [{ name: task.creatorName, profilePhoto: task.creatorPhoto }] : []
            );
            setShowCoAdminListPopup(true);
          }}
          activeOpacity={0.85}
          style={[
            styles.fieldBox,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          ]}>
          <Text style={[styles.inputLabel, { color: theme.text, flex: 1 }]}>Task Creator</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(() => {
              const hasPhoto = task.creatorPhoto && task.creatorPhoto !== '';
              return (
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor: theme.primary,
                    backgroundColor: theme.mode === 'dark' ? '#23272f' : '#F8F9FB',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                  {hasPhoto ? (
                    <Image
                      source={{ uri: task.creatorPhoto }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                      }}
                      onError={() => {
                        task.creatorPhoto = '';
                      }}
                    />
                  ) : (
                    <Image
                      source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                      }}
                    />
                  )}
                </View>
              );
            })()}
          </View>
        </TouchableOpacity>
        <CoAdminListPopup
          visible={showCoAdminListPopup}
          onClose={() => setShowCoAdminListPopup(false)}
          data={coAdminListPopupData}
          theme={theme}
          title={coAdminListPopupTitle}
        />
        <FieldBox
          label="Added Attachments"
          value=""
          placeholder="Added Attachments"
          rightComponent={
            allAttachments.length > 0 && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 0,
                  paddingHorizontal: 6,
                  backgroundColor: theme.secCard,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignSelf: 'center',
                }}
                onPress={() => {
                  setDrawerVisible(true);
                  setDrawerAttachments(task.images || []);
                }}>
                <MaterialIcons name="folder" size={18} color={theme.primary} />
                <Text style={{ color: theme.primary, fontWeight: '500' }}> Open</Text>
              </TouchableOpacity>
            )
          }
          theme={theme}
          containerStyle={{ alignItems: 'center' }}
        />
        <FieldBox
          label="Add Attachments"
          value=""
          placeholder="Add Attachments"
          rightComponent={
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 0,
                paddingHorizontal: 6,
                backgroundColor: theme.secCard,
                borderRadius: 8,
                justifyContent: 'center',
                alignSelf: 'center',
              }}
              onPress={() => {
                setShowAttachmentSheet(true);
              }}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder=""
                placeholderTextColor={theme.secondaryText}
                editable={false}
              />
              <Feather
                name="paperclip"
                size={20}
                color="#888"
                style={styles.inputIcon}
                onPress={() => setShowAttachmentSheet(true)}
              />
              {(uploadingAttachment || attaching) && (
                <Text style={{ color: theme.primary, marginLeft: 8 }}>
                  {uploadingAttachment ? 'Uploading...' : 'Attaching...'}
                </Text>
              )}
            </TouchableOpacity>
          }
          theme={theme}
          containerStyle={{ alignItems: 'center' }}
        />
        {newAttachments.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
            {/* Show two attachments per row */}
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
                        justifyContent: 'flex-start',
                        padding: 8,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 10,
                        backgroundColor: theme.card,
                        marginRight: colIdx === 0 ? 12 : 0,
                      }}>
                      {/* Preview for images */}
                      {att.type && att.type.startsWith('image') ? (
                        <TouchableOpacity
                          onPress={() => {
                            /* Optionally open image in modal */
                          }}>
                          <Image
                            source={{ uri: att.uri }}
                            style={{ width: 25, height: 25, borderRadius: 6, marginRight: 8 }}
                          />
                        </TouchableOpacity>
                      ) : null}

                      {/* Preview for audio */}
                      {att.type && att.type.startsWith('audio') ? (
                        <TouchableOpacity
                          onPress={async () => {
                            const { Sound } = await import('expo-av');
                            const { sound } = await Sound.createAsync({ uri: att.uri });
                            await sound.playAsync();
                          }}
                          style={{ marginRight: 8 }}>
                          <MaterialCommunityIcons
                            name="play-circle-outline"
                            size={28}
                            color="#1D4ED8"
                          />
                        </TouchableOpacity>
                      ) : null}

                      {/* File/document icon for other types */}
                      {!att.type?.startsWith('image') && !att.type?.startsWith('audio') ? (
                        <MaterialCommunityIcons
                          name="file-document-outline"
                          size={28}
                          color="#888"
                          style={{ marginRight: 8 }}
                        />
                      ) : null}

                      {/* File name */}
                      <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>
                        {(att.name || att.uri?.split('/').pop() || 'Attachment').length > 20
                          ? (att.name || att.uri?.split('/').pop()).slice(0, 15) + '...'
                          : att.name || att.uri?.split('/').pop()}
                      </Text>

                      {/* Remove button */}
                      <TouchableOpacity
                        onPress={() => {
                          // Use setNewAttachments from useAttachmentPicker
                          setNewAttachments((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        style={{ marginLeft: 8 }}>
                        <MaterialCommunityIcons name="close-circle" size={22} color="#E53935" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            ))}
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                borderRadius: 8,
                paddingHorizontal: 18,
                paddingVertical: 10,
                alignItems: 'center',
                marginTop: 6,
              }}
              disabled={uploadingAttachment}
              onPress={async () => {
                setUploadingAttachment(true);
                try {
                  await updateTaskDetails(task.id || task._id || task.taskId, {
                    attachments: newAttachments,
                  });
                  clearAttachments();
                  // Refresh task details to show new attachments
                  const updated = await getTaskDetailsById(task.id || task._id || task.taskId);
                  setTask(updated);
                  Alert.alert('Success', 'Attachment(s) added!');
                } catch (err) {
                  Alert.alert('Error', err.message || 'Failed to add attachment.');
                }
                setUploadingAttachment(false);
              }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {uploadingAttachment ? 'Uploading...' : 'Upload to Task'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <AttachmentSheet
          visible={showAttachmentSheet}
          onClose={() => setShowAttachmentSheet(false)}
          onPick={async (type) => {
            const files = await pickAttachment(type);
            console.log('Files returned from picker:', files);
            setShowAttachmentSheet(false);
          }}
        />
        <FieldBox
          label="Description"
          value={task.description || ''}
          editable={false}
          multiline={true}
          theme={theme}
        />
        {/* Dependencies */}
        {Array.isArray(task.dependentTasks) && task.dependentTasks.length > 0 && (
          <FieldBox
            label="Dependent Task(s)"
            value={task.dependentTasks
              .map((t) => {
                const name = typeof t === 'string' ? t : t.taskName || t.name || '';
                const progress = typeof t === 'object' && t.progress != null ? t.progress : null;

                let statusText = '';
                if (progress !== null) {
                  statusText = progress < 70 ? ' 🟠 In Progress' : ' ✅ Ready to Proceed';
                }

                return name
                  ? `• ${name} (${progress !== null ? progress + '%' : 'N/A'})${statusText}`
                  : '';
              })
              .filter(Boolean)
              .join('\n')}
            rightComponent={<Feather name="link" size={18} color={theme.text} />}
            theme={theme}
          />
        )}
        {/* Subtasks */}
        <View style={styles.subTaskHeader}>
          <TouchableOpacity
            style={[
              styles.viewSubtaskBtn,
              {
                backgroundColor: theme.buttonBg,
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
              },
            ]}
            onPress={() => setShowSubtasks((prev) => !prev)}
            activeOpacity={0.85}>
            <Feather
              name={showSubtasks ? 'chevron-down' : 'chevron-up'}
              size={18}
              color={theme.buttonText}
            />
            <Text
              style={[
                styles.viewSubtaskBtnText,
                { color: theme.buttonText, fontWeight: '400', fontSize: 14, marginLeft: 8 },
              ]}>
              {showSubtasks ? 'Hide Subtasks' : 'View All Subtasks'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.primary,
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 16,
              marginLeft: 10,
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
            }}
            onPress={() => setShowAddSubTaskPopup(true)}
            activeOpacity={0.85}>
            <Feather name="plus" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '400', fontSize: 14, marginLeft: 8 }}>
              Add Subtask
            </Text>
          </TouchableOpacity>
        </View>
        {showSubtasks && (
          <View
            style={[
              styles.subtasksCard,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}>
            <Text style={[styles.subtasksTitle, { color: theme.text }]}>Subtasks</Text>
            {task.subTasks.length === 0 ? (
              <Text style={[styles.noSubtasksText, { color: theme.secondaryText }]}>
                No subtasks available
              </Text>
            ) : (
              task.subTasks.map((sub, idx) => (
                <View key={idx} style={[styles.subtaskRow, { backgroundColor: theme.secCard }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subtaskName, { color: theme.text }]}>{sub.taskName}</Text>
                    <Text style={[styles.subtaskDesc, { color: theme.secondaryText }]}>
                      {sub.description}
                    </Text>
                    <Text style={[styles.subtaskAssigned, { color: theme.secondaryText }]}>
                      Assigned To {sub.assignedUserDetails?.map((u) => u.name).join(', ') || 'N/A'}
                    </Text>
                    <Text style={[styles.subtaskProgress, { color: theme.secondaryText }]}>
                      Progress: {sub.progress ?? 0}%
                    </Text>
                  </View>
                  <Image
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }}
                    style={[styles.subtaskAvatar, { borderColor: theme.border }]}
                  />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
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
      <AttachmentDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        attachments={drawerAttachments.length ? drawerAttachments : allAttachments}
        theme={theme}
        onAttachmentPress={(item) => {
          setSelectedAttachment(item);
          setPreviewVisible(true);
          setDrawerVisible(false);
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
        onClose={() => {
          setPreviewVisible(false);
          setSelectedAttachment(null);
        }}
        attachment={selectedAttachment}
        theme={theme}
        onImagePress={(uri) => {
          setSelectedImage(uri);
          setImageModalVisible(true);
          setPreviewVisible(false);
        }}
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
              Edit Task
            </Text>
            <TextInput
              value={editValues.taskName}
              placeholder="Task Name"
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
              placeholder="Description"
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
                placeholder="Start Date"
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
                placeholder="End Date"
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
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity style={{ marginRight: 16 }} onPress={() => setShowEditModal(false)}>
                <Text style={{ color: theme.secondaryText, fontSize: 16 }}>Cancel</Text>
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
                    const updated = await updateTask(task.id || task._id || task.taskId, {
                      name: editValues.taskName,
                      description: editValues.description,
                      startDate: editValues.startDate,
                      endDate: editValues.endDate,
                    });
                    setTask(updated);
                    setShowEditModal(false);
                    Alert.alert('Success', 'Task updated!');
                  } catch (err) {
                    Alert.alert('Error', err.message || 'Failed to update task.');
                  }
                }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  subtasksTitle: {
    fontWeight: '500',
    fontSize: 16,
    color: '#222',
    marginBottom: 10,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  subtaskName: {
    fontWeight: '400',
    fontSize: 15,
    color: '#222',
    marginBottom: 6,
  },
  subtaskDesc: {
    color: '#888',
    fontSize: 13,
    marginBottom: 2,
  },
  subtaskAssigned: {
    color: '#bbb',
    fontSize: 12,
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
    marginTop: 24,
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
    fontSize: 16,
    fontWeight: '400',
    color: '#222',
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
  subTaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 9,
    marginBottom: 18,
  },
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
});
