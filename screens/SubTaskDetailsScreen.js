import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider'; // Add this import
import AttachmentSheet from 'components/popups/AttachmentSheet';
import CoAdminListPopup from 'components/popups/CoAdminListPopup';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator, Alert, Image, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import AttachmentDrawer from '../components/issue details/AttachmentDrawer';
import AttachmentPreviewModal from '../components/issue details/AttachmentPreviewDrawer';
import ImageModal from '../components/issue details/ImageModal';
import AddSubTaskPopup from '../components/popups/AddSubTaskPopup';
import MaterialRequestPopup from '../components/popups/MaterialRequestPopup';
import TaskChatPopup from '../components/popups/TaskChatPopup';
import TaskReassignPopup from '../components/popups/TaskReassignPopup';
import useAttachmentPicker from '../components/popups/useAttachmentPicker';
import DateBox from '../components/project details/DateBox';
import CustomCircularProgress from '../components/task details/CustomCircularProgress';
import FieldBox from '../components/task details/FieldBox';
import { useTheme } from '../theme/ThemeContext';
import { fetchProjectsByUser, fetchUserConnections } from '../utils/issues';
import {
    deleteTask,
    getTaskDetailsById,
    getTasksByProjectId,
    holdTask,
    moveTaskToNextStage,
    reopenTask,
    updateTask,
    updateTaskDetails,
    updateTaskFlags,
    updateTaskProgress,
} from '../utils/task';
import { fetchTaskMessages, sendTaskMessage } from '../utils/taskMessage';
import { getWorklistsByProjectId } from '../utils/worklist';

export default function SubTaskDetailsScreen({ route, navigation }) {
    // Store decoded token globally for this component
    const decodedRef = useRef(null);
    const { taskId, refreshedAt } = route.params;
    // Safe navigation function to handle cases where there's no previous screen
    const safeGoBack = () => {
        if (navigation.canGoBack()) {
            navigation.navigate('MyTasksScreen');
        } else {
            // Fallback to MyTasks screen if no previous screen exists
            navigation.navigate('MyTasksScreen');
        }
    };
    const handleGoBack = () => {
        // Instead of goBack(), always navigate to TaskDetails with refreshedAt param to force refresh
        if (route.params?.parentTaskId) {
            navigation.navigate('TaskDetails', {
                taskId: route.params.parentTaskId,
                refreshedAt: Date.now(), // unique param forces effect refresh
            });
        } else {
            // Fallback: navigate to MyTasksScreen
            navigation.navigate('MyTasksScreen');
        }
    };

    const handleGoBackWithRefresh = () => {
        navigation.navigate('TaskDetails', {
            taskId: route.params?.parentTaskId || task.id || task._id || task.taskId,
            refreshedAt: Date.now(),
        });
    };

    const theme = useTheme();
    const [task, setTask] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [userName, setUserName] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSubtasks, setShowSubtasks] = useState(false);
    const [stageLoading, setStageLoading] = useState(false);
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [holdReason, setHoldReason] = useState('');
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

    // New Function to handle Stage Movement
    const handleNextStage = async () => {
        if (!task) return;

        const stages = task.workflowStages || [];
        const totalStages = stages.length;
        const isLastStage = task.currentStageIndex >= totalStages - 1;

        if (isLastStage) {
            Alert.alert('Completed', 'This task is already in the final stage.');
            return;
        }

        try {
            setStageLoading(true);
            const updatedTaskData = await moveTaskToNextStage(task.id || task.taskId);

            let newProgress = updatedTaskData.progress;
            if (newProgress === undefined && totalStages > 1) {
                const newIndex = updatedTaskData.currentStageIndex !== undefined
                    ? updatedTaskData.currentStageIndex
                    : task.currentStageIndex + 1;
                newProgress = Math.round((newIndex / (totalStages - 1)) * 100);
            }

            // Update Progress in Backend
            await updateTaskProgress(task.id || task.taskId, newProgress);

            setTask((prev) => ({
                ...prev,
                ...updatedTaskData,
                progress: newProgress,
                status: newProgress === 100 ? 'Completed' : 'In Progress'
            }));

            setEditableProgress(newProgress);
            lastProgressRef.current = newProgress;

            Alert.alert('Success', `Moved to next stage! Progress updated to ${newProgress}%`);
        } catch (error) {
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

    useEffect(() => {
        const fetchTask = async () => {
            try {
                const data = await getTaskDetailsById(taskId);
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
                        console.log('[SubTaskDetailsScreen] Failed to decode token:', e);
                    }
                    // Try common user id fields
                    const userId = decoded?.id || decoded?._id || decoded?.userId || decoded?.user_id || null;
                    setCurrentUserId(userId);
                    const name = decoded?.name || null;
                    setUserName(name);
                    // console.log('[SubTaskDetailsScreen] Decoded userId from token:', userId, 'Decoded:', decoded);
                }
            } catch (err) {
                setCurrentUserId(null);
                setUserName(null);
                console.log('[SubTaskDetailsScreen] Error fetching token:', err);
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
    // console.log('[SubTaskDetailsScreen] Matching userName:', userName, 'with creatorName:', creatorName, '| isCreator:', isCreator);
    //   console.log('[SubTaskDetailsScreen] userName:', userName, '| creatorName:', creatorName, '| isCreator:', isCreator);

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
        <View
            style={{
                flex: 1,
                backgroundColor: theme.background,
                paddingTop: Platform.OS === 'ios' ? 70 : 25,
            }}>
            <ScrollView contentContainerStyle={{ paddingBottom: showSubtasks ? 60 : 80 }}>
                {/* Top Navigation */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 10,
                    }}>
                    <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                        <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
                        <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
                        <Feather name="more-vertical" size={22} color={theme.text} />
                    </TouchableOpacity>
                </View>
                {/* Header */}
                <LinearGradient
                    colors={[theme.secondary, theme.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerCard}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                        {/* Task Info: flex 1, wraps properly */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                            <TouchableOpacity onPress={() => setShowTaskNameModal(true)}>
                                <Text
                                    style={[
                                        styles.taskName,
                                        {
                                            flexShrink: 1,
                                            flexWrap: 'wrap',
                                            fontWeight: '600',
                                            color: '#fff',
                                            fontSize: 20,
                                            minWidth: 0, // Adds proper text ellipsis handling
                                        }
                                    ]}
                                    numberOfLines={2}
                                    ellipsizeMode="tail"
                                >
                                    {task.taskName}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.dueDate}>
                                {t('due_date')}: {task.endDate ? new Date(task.endDate).toDateString() : '-'}
                            </Text>
                            {/* STATUS BADGES ROW */}
                            <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                                {/* Hold Badge */}
                                {task.status === 'Hold' && (
                                    <View style={{
                                        backgroundColor: '#FF9800', // Orange for Hold
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 6,
                                        alignSelf: 'flex-start'
                                    }}>
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>ON HOLD</Text>
                                    </View>
                                )}

                                {/* Completed Badge (Optional but useful) */}
                                {(task.status === 'Completed' || task.progress === 100) && (
                                    <View style={{
                                        backgroundColor: '#4CAF50', // Green for Completed
                                        paddingHorizontal: 8,
                                        paddingVertical: 3,
                                        borderRadius: 6,
                                        alignSelf: 'flex-start'
                                    }}>
                                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>COMPLETED</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        {/* Details Button: stays at right, never hidden */}
                        <TouchableOpacity
                            onPress={() => setShowTaskDetails((prev) => !prev)}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 12,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.3)',
                                marginLeft: 12, // Spacing from task name
                                alignSelf: 'flex-start',
                            }}>
                            <MaterialIcons name="description" size={16} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                                {t('details')}
                            </Text>
                            <MaterialIcons
                                name={showTaskDetails ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                size={16}
                                color="#fff"
                                style={{ marginLeft: 4 }}
                            />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
                {/* Task Action Buttons */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginHorizontal: 20,
                        marginTop: 0,
                        marginBottom: 12,
                        gap: 10,
                    }}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowTaskChat(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: theme.card,
                            borderRadius: 18,
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderWidth: 1,
                            borderColor: theme.border,
                        }}>
                        <MaterialIcons name="chat" size={18} color={theme.primary} style={{ marginRight: 7 }} />
                        <Text style={{ color: theme.text, fontWeight: '400', fontSize: 13 }}>{t('chat')}</Text>
                    </TouchableOpacity>
                    {/* Reassign Task button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowReassignModal(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: theme.card,
                            borderRadius: 18,
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderWidth: 1,
                            borderColor: theme.border,
                        }}>
                        <MaterialIcons name="swap-horiz" size={18} color="#FF6B35" style={{ marginRight: 7 }} />
                        <Text style={{ color: theme.text, fontWeight: '400', fontSize: 13 }}>{t('reassign')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowMaterialRequest(true)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: theme.card,
                            borderRadius: 18,
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderWidth: 1,
                            borderColor: theme.border,
                        }}>
                        <MaterialIcons name="inventory" size={18} color="#FF9800" style={{ marginRight: 7 }} />
                        <Text style={{ color: theme.text, fontWeight: '400', fontSize: 13 }}>{t('requirements')}</Text>
                    </TouchableOpacity>
                </View>
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
                        if (wasReassigned) {
                            // Navigate back since user is no longer assigned to this task
                            navigation.goBack();
                        }
                    }}
                    taskId={task?.id || task?._id || task?.taskId}
                    theme={theme}
                    currentAssignees={task?.assignedUserDetails || []}
                    isCreator={isCreator}
                />

                {isWorkflowTask ? (
                    //WORKFLOW MODE VIEW
                    <View style={[styles.workflowCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.workflowHeader}>
                            <MaterialCommunityIcons name="transit-connection-variant" size={20} color={theme.primary} />
                            <Text style={[styles.workflowTitle, { color: theme.text }]}>WORKFLOW STAGE</Text>
                            <View style={[styles.stageBadge, { backgroundColor: theme.primary + '20' }]}>
                                <Text style={[styles.stageBadgeText, { color: theme.primary }]}>{task.category?.replace('_', ' ')}</Text>
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
                                                <View style={[styles.stepNode, isCompleted ? { backgroundColor: '#21B573', borderColor: '#21B573' } : isCurrent ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.card, borderColor: theme.border }]}>
                                                    {isCompleted ? <Feather name="check" size={12} color="#fff" /> : <Text style={[styles.stepNumber, { color: isCurrent ? '#fff' : theme.secondaryText }]}>{index + 1}</Text>}
                                                </View>
                                                {isCurrent && <Text style={[styles.stepLabelActive, { color: theme.primary }]} numberOfLines={1}>{stage.label}</Text>}
                                            </View>
                                            {index < workflowStages.length - 1 && <View style={[styles.stepLine, (index < currentStageIndex) ? { backgroundColor: '#21B573' } : { backgroundColor: theme.border }]} />}
                                        </View>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        <View style={styles.currentStageBox}>
                            <Text style={[styles.currentStageLabel, { color: theme.secondaryText }]}>CURRENT STAGE</Text>
                            <Text style={[styles.currentStageValue, { color: theme.text }]}>{currentStageLabel}</Text>
                        </View>

                        {!isTaskCompleted && (
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={handleNextStage} disabled={stageLoading}>
                                {stageLoading ? <ActivityIndicator color="#fff" size="small" /> : <><Feather name="check-circle" size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.actionBtnText}>Mark as Complete</Text></>}
                            </TouchableOpacity>
                        )}

                        {isTaskCompleted && (
                            <View style={[styles.completedBanner, { backgroundColor: '#21B57320' }]}>
                                <Feather name="check" size={16} color="#21B573" />
                                <Text style={{ color: '#21B573', fontWeight: '600', marginLeft: 6 }}>Workflow Completed</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    // LEGACY MODE VIEW
                    task && typeof editableProgress === 'number' && (
                        <View style={{ marginHorizontal: 22, marginTop: 0, marginBottom: 10 }}>
                            <Text style={{ color: theme.text, fontWeight: '500', fontSize: 16, marginBottom: 8 }}>{t('progress')}: {editableProgress}%</Text>
                            <Slider
                                style={{ width: '100%', height: 18 }}
                                minimumValue={0} maximumValue={100} step={1}
                                minimumTrackTintColor={theme.primary} maximumTrackTintColor={theme.secCard} thumbTintColor={theme.primary}
                                value={editableProgress ?? 0}
                                onValueChange={(value) => { isSlidingRef.current = true; setEditableProgress(value); }}
                                onSlidingComplete={async (value) => {
                                    isSlidingRef.current = false;
                                    const prevProgress = lastProgressRef.current;
                                    if (value === 100) {
                                        Alert.alert('Complete Task?', 'Mark as 100% complete?', [
                                            { text: 'No', style: 'cancel', onPress: () => setEditableProgress(prevProgress) },
                                            { text: 'Yes', onPress: async () => await handleUpdateProgress(value, prevProgress) },
                                        ]);
                                    } else {
                                        await handleUpdateProgress(value, prevProgress);
                                    }
                                }}
                            />
                        </View>
                    )
                )}
                {showTaskDetails && (
                    <>
                        <FieldBox
                            label={t("selected_project")}
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
                            label={t("selected_worklist")}
                            value={
                                Array.isArray(worklists)
                                    ? worklists.find((wl) => wl.id === task.worklistId)?.name || '-'
                                    : '-'
                            }
                            theme={theme}
                        />
                        {/* Dates and status */}
                        <View style={styles.dateRow}>
                            <DateBox label={t("start_date")} value={new Date(task.startDate)} theme={theme} />
                            <DateBox label={t("end_date")} value={new Date(task.endDate)} theme={theme} />
                        </View>
                        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={[styles.inputLabel, { color: theme.text, marginBottom: 6, paddingTop: 6 }]}>
                                    {t("assigned_users")}
                                </Text>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setCoAdminListPopupTitle(t("assigned_users"));
                                        setCoAdminListPopupData(task.assignedUserDetails || []);
                                        setShowCoAdminListPopup(true);
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}>
                                    {/* User names */}
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '400' }}>
                                            {task.assignedUserDetails?.length > 0
                                                ? task.assignedUserDetails
                                                    .slice(0, 2)
                                                    .map((user) => user.name)
                                                    .join(', ') +
                                                (task.assignedUserDetails.length > 2
                                                    ? ` +${task.assignedUserDetails.length - 2} more`
                                                    : '')
                                                : 'No users assigned'}
                                        </Text>
                                    </View>
                                    {/* Stacked avatars */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {task.assignedUserDetails?.slice(0, 4).map((user, index) => {
                                            const hasPhoto = user.profilePhoto && user.profilePhoto !== '';
                                            return (
                                                <View
                                                    key={user.userId || index}
                                                    style={{
                                                        marginLeft: index === 0 ? 0 : -16,
                                                        zIndex: task.assignedUserDetails.length - index,
                                                    }}>
                                                    <Image
                                                        source={{
                                                            uri: hasPhoto
                                                                ? user.profilePhoto
                                                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`,
                                                        }}
                                                        style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 20,
                                                            borderWidth: 2,
                                                            borderColor: theme.primary,
                                                            backgroundColor: theme.mode === 'dark' ? '#23272f' : '#F8F9FB',
                                                        }}
                                                    />
                                                </View>
                                            );
                                        })}
                                        {task.assignedUserDetails?.length > 4 && (
                                            <View
                                                style={{
                                                    marginLeft: -16,
                                                    zIndex: 0,
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: 20,
                                                    backgroundColor: theme.buttonBg,
                                                    borderWidth: 2,
                                                    borderColor: theme.primary,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}>
                                                <Text style={{ color: theme.buttonText, fontWeight: '600', fontSize: 12 }}>
                                                    +{task.assignedUserDetails.length - 4}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={[styles.inputLabel, { color: theme.text, marginBottom: 8, paddingTop: 6 }]}>
                                    {t("task_creator")}
                                </Text>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setCoAdminListPopupTitle(t('task_creator'));
                                        setCoAdminListPopupData(
                                            task.creatorName
                                                ? [{ name: task.creatorName, profilePhoto: task.creatorPhoto }]
                                                : []
                                        );
                                        setShowCoAdminListPopup(true);
                                    }}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}>
                                    {/* Creator name */}
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '400' }}>
                                            {task.creatorName || 'Unknown Creator'}
                                        </Text>
                                    </View>
                                    {/* Creator avatar */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Image
                                            source={{
                                                uri:
                                                    task.creatorPhoto && task.creatorPhoto !== ''
                                                        ? task.creatorPhoto
                                                        : `https://ui-avatars.com/api/?name=${encodeURIComponent(task.creatorName || 'Creator')}&background=random`,
                                            }}
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 20,
                                                borderWidth: 2,
                                                borderColor: theme.primary,
                                                backgroundColor: theme.mode === 'dark' ? '#23272f' : '#F8F9FB',
                                            }}
                                        />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <CoAdminListPopup
                            visible={showCoAdminListPopup}
                            onClose={() => setShowCoAdminListPopup(false)}
                            data={coAdminListPopupData}
                            theme={theme}
                            title={coAdminListPopupTitle}
                        /></>)}

                {/* Critical Toggle - Only show when task is an issue */}
                {task.isIssue && (
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: task.isCritical ? theme.criticalBg : theme.normalIssueBg,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: task.isCritical ? theme.criticalBorder : theme.normalIssueBorder,
                        marginHorizontal: 20,
                        marginBottom: 16,
                        padding: 12,
                        gap: 12,
                    }}>
                        <View style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            backgroundColor: task.isCritical ? theme.criticalIconBg : theme.normalIssueIconBg,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <MaterialIcons
                                name="warning"
                                size={24}
                                color={task.isCritical ? theme.criticalText : theme.normalIssueText}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                color: task.isCritical ? theme.criticalText : theme.normalIssueText,
                                fontWeight: '700',
                                fontSize: 16,
                                marginBottom: 2,
                            }}>
                                {task.isCritical ? 'Critical Issue' : 'Normal Issue'}
                            </Text>
                            <Text style={{
                                fontSize: 13,
                                fontWeight: '400',
                                lineHeight: 18,
                                color: theme.text,
                            }}>
                                {task.isCritical
                                    ? 'This issue requires immediate attention'
                                    : 'Toggle to mark this issue as critical'
                                }
                            </Text>
                        </View>
                        {/* Show toggle for task creator */}
                        {isCreator ? (
                            <Switch
                                value={task.isCritical || false}
                                onValueChange={async (value) => {
                                    try {
                                        setLoading(true);
                                        console.log('Updating task isCritical:', { taskId, value });

                                        // Use updateTaskFlags to preserve assigned users
                                        const flags = {
                                            isCritical: value
                                        };
                                        await updateTaskFlags(taskId, flags);

                                        // Refresh the task data
                                        const updatedTask = await getTaskDetailsById(taskId);
                                        setTask(updatedTask);

                                        console.log('Task critical status updated successfully:', { taskId, isCritical: value });
                                        Alert.alert(
                                            'Success',
                                            value
                                                ? 'Issue marked as critical successfully.'
                                                : 'Issue no longer marked as critical.'
                                        );
                                    } catch (err) {
                                        console.error('Error updating task critical status:', err);
                                        Alert.alert('Error', err.message || 'Failed to update critical status');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                trackColor={{
                                    false: '#ddd',
                                    true: theme.criticalText
                                }}
                                thumbColor="#fff"
                            />
                        ) : (
                            // Show status badge for non-creators
                            <View style={{
                                backgroundColor: task.isCritical ? theme.criticalBadgeBg : theme.normalIssueBadgeBg,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 12,
                            }}>
                                <Text style={{
                                    color: task.isCritical ? theme.criticalBadgeText : theme.normalIssueBadgeText,
                                    fontWeight: '600',
                                    fontSize: 12,
                                }}>
                                    {task.isCritical ? 'CRITICAL' : 'NORMAL'}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                <FieldBox
                    label={t("description")}
                    value={task.description || ''}
                    editable={false}
                    multiline={true}
                    theme={theme}
                />
                <FieldBox
                    label={t("added_attachments")}
                    value=""
                    placeholder={
                        allAttachments.length === 0 ? t('no_attachments') : t('tap_on_view_to_see_attachments')
                    }
                    rightComponent={
                        allAttachments.length > 0 && (
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingVertical: 6,
                                    paddingHorizontal: 12,
                                    backgroundColor: theme.primary,
                                    borderRadius: 8,
                                    justifyContent: 'center',
                                }}
                                onPress={() => {
                                    setDrawerVisible(true);
                                    setDrawerAttachments(task.images || []);
                                }}>
                                <MaterialIcons name="folder" size={16} color="#fff" />
                                <Text style={{ color: '#fff', fontWeight: '500', marginLeft: 4, fontSize: 12 }}>
                                    {t("view")} ({allAttachments.length})
                                </Text>
                            </TouchableOpacity>
                        )
                    }
                    theme={theme}
                />
                <FieldBox
                    label={t("add_new_attachments")}
                    value=""
                    placeholder={t("tap_to_add_attachments")}
                    rightComponent={
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                backgroundColor: theme.secCard,
                                borderRadius: 8,
                                justifyContent: 'center',
                            }}
                            onPress={() => setShowAttachmentSheet(true)}>
                            <Feather name="paperclip" size={16} color={theme.primary} />
                            <Text style={{ color: theme.primary, fontWeight: '500', marginLeft: 4, fontSize: 12 }}>
                                {uploadingAttachment
                                    ? t('uploading')
                                    : attaching
                                        ? t('attaching')
                                        : t('add_files')}
                            </Text>

                        </TouchableOpacity>
                    }
                    theme={theme}
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
                                                        try {
                                                            const { sound } = await Audio.Sound.createAsync({ uri: att.uri });
                                                            await sound.playAsync();
                                                        } catch (error) {
                                                            console.error('Failed to play audio:', error);
                                                            Alert.alert('Error', 'Could not play audio file');
                                                        }
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

                {/* Resolved Attachments Section - Only show for issue tasks with resolved attachments */}
                {task.isIssue &&
                    Array.isArray(task.resolvedImages) &&
                    task.resolvedImages.length > 0 && (
                        <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 8,
                            }}>
                                <Text style={{
                                    fontSize: 12,
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    color: theme.text,
                                }}>
                                    {t('resolved_attachments') || 'Resolved Attachments'}
                                </Text>
                            </View>
                            <View style={{
                                borderRadius: 12,
                                borderWidth: 1,
                                padding: 16,
                                minHeight: 80,
                                justifyContent: 'center',
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                            }}>
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: '500',
                                    marginBottom: 8,
                                    color: theme.text,
                                }}>
                                    {`${task.resolvedImages.length} file${task.resolvedImages.length !== 1 ? 's' : ''} attached`}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 8,
                                            paddingHorizontal: 12,
                                            borderRadius: 8,
                                            borderWidth: 1,
                                            alignSelf: 'flex-start',
                                            gap: 4,
                                            backgroundColor: theme.primary + '10',
                                            borderColor: theme.primary,
                                        }}
                                        onPress={() => {
                                            setDrawerAttachments(task.resolvedImages || []);
                                            setDrawerVisible(true);
                                        }}>
                                        <MaterialIcons name="folder-open" size={16} color={theme.primary} />
                                        <Text style={{
                                            fontSize: 14,
                                            fontWeight: '500',
                                            color: theme.primary,
                                        }}>
                                            {t('view_files') || 'View Files'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                {/* Dependencies */}
                {/* Dependencies Section with Icons */}
                {Array.isArray(task.dependentTasks) && task.dependentTasks.length > 0 && (
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setShowDependentPopup(true)}>
                        <View style={[
                            styles.fieldBox,
                            {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                                alignItems: 'center', // Align chevron vertically center
                                height: 'auto',       // Allow height to grow (Responsive)
                                paddingVertical: 12   // Add padding for multiline content
                            }
                        ]}>
                            <View style={{ flex: 1 }}>
                                {/* Label */}
                                <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 8 }]}>
                                    {t("dependent_tasks")}
                                </Text>
                                {/* List Items */}
                                <View>
                                    {task.dependentTasks.slice(0, 2).map((t, index) => {
                                        const name = typeof t === 'string' ? t : t.taskName || t.name || '';
                                        const progress = typeof t === 'object' && t.progress != null ? t.progress : null;
                                        // Logic for Status
                                        const isInProgress = progress !== null && progress < 70;
                                        const isReady = progress !== null && progress >= 70;

                                        return (
                                            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                                                <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>
                                                    • {name} {progress !== null ? `(${progress}%)` : ''}
                                                </Text>
                                                {/* Status Icon & Text */}
                                                {progress !== null && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                                                        {isInProgress ? (
                                                            <Feather name="loader" size={14} color="#f59e42" />
                                                        ) : (
                                                            <Feather name="check-circle" size={14} color={theme.success || '#2e7d32'} />
                                                        )}
                                                        <Text style={{
                                                            fontSize: 13,
                                                            color: isInProgress ? '#f59e42' : (theme.success || '#2e7d32'),
                                                            marginLeft: 4,
                                                            fontWeight: '500'
                                                        }}>
                                                            {isInProgress ? 'In Progress' : 'Ready'}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                    {/* "Show More" Text */}
                                    {task.dependentTasks.length > 2 && (
                                        <Text style={{ color: theme.secondaryText, fontSize: 13, marginTop: 2, fontStyle: 'italic' }}>
                                            + {task.dependentTasks.length - 2} more...
                                        </Text>
                                    )}
                                </View>
                            </View>
                            {/* Right Chevron */}
                            <Feather name="chevron-right" size={18} color={theme.text} />
                        </View>
                    </TouchableOpacity>
                )}
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
                                                <CustomCircularProgress percentage={progress} size={48} strokeWidth={4} />
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
                <View style={[styles.subTaskHeader, { marginTop: 0 }]}>
                    <TouchableOpacity
                        style={[
                            styles.viewSubtaskBtn,
                            {
                                backgroundColor: theme.secCard,
                                borderRadius: 12,
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                flexDirection: 'row',
                                borderWidth: 1,
                                alignItems: 'center',
                                borderColor: theme.border,
                            },
                        ]}
                        onPress={() => {
                            setShowSubtasks((prev) => !prev);
                            // Clear search when hiding subtasks
                            if (showSubtasks) {
                                setSubtaskSearch('');
                            }
                        }}
                        activeOpacity={0.85}>
                        <Feather
                            name={showSubtasks ? 'chevron-down' : 'chevron-up'}
                            size={18}
                            color={theme.text}
                        />
                        <Text
                            style={[
                                styles.viewSubtaskBtnText,
                                { color: theme.text, fontWeight: '500', fontSize: 14, marginLeft: 8 },
                            ]}
                        >
                            {showSubtasks
                                ? t('hide_subtasks')
                                : t('view_subtasks', { count: task.subTasks?.length || 0 })}

                            {subtaskSearch && showSubtasks && ` • ${t('found_subtasks', { count: filteredSubtasks.length })}`}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: theme.primary,
                            borderRadius: 12,
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            marginLeft: 10,
                            shadowColor: '#000',
                            shadowOpacity: 0.1,
                            shadowOffset: { width: 0, height: 2 },
                            shadowRadius: 4,
                            elevation: 3,
                        }}
                        onPress={() => setShowAddSubTaskPopup(true)}
                        activeOpacity={0.85}>
                        <Feather name="plus" size={18} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14, marginLeft: 8 }}>
                            {t("add_subtask")}
                        </Text>
                    </TouchableOpacity>
                </View>
                {showSubtasks && (
                    <View
                        style={[
                            styles.subtasksCard,
                            { backgroundColor: theme.card, borderColor: theme.border, marginTop: 0 },
                        ]}>
                        <Text style={[styles.subtasksTitle, { color: theme.text, marginBottom: 16 }]}>
                            {t("subtasks")} ({task.subTasks?.length || 0})
                        </Text>
                        {/* Search Bar */}
                        {(task.subTasks?.length || 0) > 0 && (
                            <View
                                style={[
                                    styles.searchContainer,
                                    { backgroundColor: theme.secCard, borderColor: theme.border },
                                ]}>
                                <Feather
                                    name="search"
                                    size={16}
                                    color={theme.secondaryText}
                                    style={{ marginRight: 8 }}
                                />
                                <TextInput
                                    style={[styles.searchInput, { color: theme.text }]}
                                    placeholder={t("search_subtasks")}
                                    placeholderTextColor={theme.secondaryText}
                                    value={subtaskSearch}
                                    onChangeText={setSubtaskSearch}
                                />
                                {subtaskSearch.length > 0 && (
                                    <TouchableOpacity onPress={() => setSubtaskSearch('')} style={{ padding: 4 }}>
                                        <Feather name="x" size={16} color={theme.secondaryText} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        {!task.subTasks || task.subTasks.length === 0 ? (
                            <Text style={[styles.noSubtasksText, { color: theme.secondaryText }]}>
                                {t("no_subtasks_available")}
                            </Text>
                        ) : filteredSubtasks.length === 0 ? (
                            <Text style={[styles.noSubtasksText, { color: theme.secondaryText }]}>
                                {t("no_subtasks_found", { query: subtaskSearch })}
                            </Text>
                        ) : (
                            filteredSubtasks.map((sub, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.subtaskCard,
                                        { backgroundColor: theme.card, borderColor: theme.border },
                                    ]}
                                    onPress={() => {
                                        // Reset subtask search when navigating
                                        setSubtaskSearch('');
                                        // Navigate to subtask details
                                        navigation.push('TaskDetails', {
                                            taskId: sub.id || sub.taskId || sub._id,
                                            refreshedAt: Date.now(),
                                        });
                                    }}
                                    activeOpacity={0.85}>
                                    <View style={[styles.subtaskIcon, { backgroundColor: theme.avatarBg }]}>
                                        <Text style={[styles.subtaskIconText, { color: theme.primary }]}>
                                            {(sub.taskName || sub.name || 'T')[0]}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.subtaskName, { color: theme.text }]}>
                                            {sub.taskName || sub.name}
                                        </Text>
                                        <View style={styles.subtaskMeta}>
                                            <View style={styles.subtaskAssignedRow}>
                                                <Feather name="user" size={12} color={theme.secondaryText} />
                                                <Text style={[styles.subtaskAssigned, { color: theme.secondaryText }]}>
                                                    {sub.assignedUserDetails?.map((u) => u.name).join(', ') || 'Unassigned'}
                                                </Text>
                                            </View>
                                            <View
                                                style={[styles.progressBadge, { backgroundColor: theme.primary + '15' }]}>
                                                <Text style={[styles.progressText, { color: theme.primary }]}>
                                                    {sub.progress ?? 0}%
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                )}
            </ScrollView>
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
                                        { text: t('delete'), style: 'destructive', onPress: async () => { /* Delete logic */ await deleteTask(task.id || task._id || task.taskId);; safeGoBack(); } },
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
                                    {task?.name}
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

    workflowCard: { marginHorizontal: 20, marginTop: 10, marginBottom: 20, borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
    workflowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    workflowTitle: { fontSize: 14, fontWeight: '700', marginLeft: 8, flex: 1, letterSpacing: 0.5 },
    stageBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    stageBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    stepperContainer: { marginBottom: 20, height: 60 },
    stepNode: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    stepNumber: { fontSize: 10, fontWeight: '700' },
    stepLine: { width: 30, height: 2, marginHorizontal: -2, zIndex: 1 },
    stepLabelActive: { position: 'absolute', top: 28, fontSize: 10, fontWeight: '600', width: 80, textAlign: 'center' },
    currentStageBox: { alignItems: 'center', marginBottom: 16, paddingVertical: 10, backgroundColor: '#F8F9FA', borderRadius: 12 },
    currentStageLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
    currentStageValue: { fontSize: 18, fontWeight: '700' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
    actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    completedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
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
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     justifyContent: 'space-between',
    //     marginHorizontal: 20,
    //     marginTop: 9,
    //     marginBottom: 18,
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
});
