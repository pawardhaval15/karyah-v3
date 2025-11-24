import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AttachmentSheet from 'components/popups/AttachmentSheet';
import TaskReassignPopup from 'components/popups/TaskReassignPopup';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  TouchableWithoutFeedback,
  View
} from 'react-native';
import AttachmentDrawer from '../components/issue details/AttachmentDrawer';
import AttachmentPreviewModal from '../components/issue details/AttachmentPreviewDrawer';
import ImageModal from '../components/issue details/ImageModal';
import useAttachmentPicker from '../components/popups/useAttachmentPicker';
import useAudioRecorder from '../components/popups/useAudioRecorder';
import FieldBox from '../components/task details/FieldBox';
import { useTheme } from '../theme/ThemeContext';
import { getUserNameFromToken } from '../utils/auth'; // import this
import { fetchTaskMessages, sendTaskMessage } from '../utils/taskMessage';
import {
  deleteIssue,
  fetchIssueById,
  resolveIssueByAssignedUser,
  updateIssue,
} from '../utils/issues';
import TaskChatPopup from '../components/popups/TaskChatPopup';
import { deleteTask, getTaskDetailsById, resolveCriticalOrIssueTask, updateTask } from '../utils/task';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  return date.toLocaleDateString('en-GB');
}
export default function IssueDetailsScreen({ navigation, route }) {
  const theme = useTheme();
  const { issueId } = route.params || {};
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState(null);
  const [editFields, setEditFields] = useState({
    issueTitle: '',
    description: '',
    dueDate: '',
  });
  const { t } = useTranslation();
  // Add menuVisible state for three-dots menu
  const [menuVisible, setMenuVisible] = useState(false);
  // Attachment state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [remark, setRemark] = useState('');
  const [drawerAttachments, setDrawerAttachments] = useState([]);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const { attachments, pickAttachment, setAttachments } = useAttachmentPicker();
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showIssueTitleModal, setShowIssueTitleModal] = useState(false);
  const [showAttachmentPreviewModal, setShowAttachmentPreviewModal] = useState(false);
  const [showIssueDetails, setShowIssueDetails] = useState(false);
  const [showTaskChat, setShowTaskChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [task, setTask] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    getUserNameFromToken().then(setUserName);
  }, []);
  const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
    onRecordingFinished: (audio) => {
      setAttachments((prev) => [...prev, audio]);
    },
  });
  const userImg = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';

  // Helper function to refresh issue data
  const refreshIssueData = async () => {
    try {
      if (issue?.isIssue) {
        const updated = await getTaskDetailsById(issue.taskId);
        setIssue(updated);
      } else {
        const updated = await fetchIssueById(issue?.issueId || issueId);
        setIssue(updated);
      }

    } catch (error) {
      console.error('Failed to refresh issue data:', error.message);
    }
  };

  useEffect(() => {
    if (!issueId) {
      console.log('No issueId provided');
      return;
    }

    console.log('Starting to fetch issue with ID:', issueId);
    setLoading(true);

    // Try to fetch as task-based issue first, then fall back to traditional issue
    const fetchIssueData = async () => {
      try {
        console.log('Attempting to fetch task with ID:', issueId);
        // First try to fetch as a task (for task-based issues)
        const taskData = await getTaskDetailsById(issueId);
        console.log('Task fetch result:', taskData);

        if (taskData) {
          // We found a task, now check if it's marked as an issue
          if (taskData.isIssue) {
            // This is a task marked as an issue
            setIssue(taskData);
            console.log('✅ Successfully fetched Task-based Issue:', taskData);
            setEditFields({
              issueTitle: taskData.taskName || '',
              description: taskData.description || '',
              dueDate: taskData.endDate || '',
            });
            return;
          } else {
            // Task exists but it's not marked as an issue, this shouldn't happen
            console.log('⚠️ Task found but not marked as issue:', taskData);
            throw new Error('Task is not marked as an issue');
          }
        } else {
          console.log('⚠️ No task data returned');
          throw new Error('No task data found');
        }
      } catch (taskError) {
        console.log('❌ Task fetch failed, trying traditional issue:', taskError.message);

        try {
          console.log('Attempting to fetch traditional issue with ID:', issueId);
          // Fall back to traditional issue fetching
          const issueData = await fetchIssueById(issueId);
          console.log('Traditional issue fetch result:', issueData);

          if (issueData) {
            setIssue(issueData);
            console.log('✅ Successfully fetched Traditional Issue:', issueData);
            setEditFields({
              issueTitle: issueData.issueTitle || '',
              description: issueData.description || '',
              dueDate: issueData.dueDate || '',
            });
            return;
          } else {
            console.log('⚠️ No traditional issue data returned');
            throw new Error('No traditional issue data found');
          }
        } catch (issueError) {
          console.error('❌ Traditional issue fetch failed:', issueError.message);
        }
      }
      // If we reach here, both attempts failed
      console.error('❌ Failed to fetch issue data from both sources');
      setIssue(null);
    };

    fetchIssueData().finally(() => {
      console.log('Fetch complete, setting loading to false');
      setLoading(false);
    });
  }, [issueId]);

  useEffect(() => {
    if (issue && issue.isIssue && issue.taskId) {
      setTask({
        ...issue,
        id: issue.taskId,       // Provide .id field for compatibility
        taskId: issue.taskId,   // Provide .taskId as string
        name: issue.taskName
      });
    } else {
      setTask(null);
    }
  }, [issue]);

  // Fetch chat messages when popup opens
  useEffect(() => {
    if (showTaskChat && task && (task.taskId || task.id || task._id)) {
      setChatLoading(true);
      fetchTaskMessages(task.taskId || task.id || task._id)
        .then(setChatMessages)
        .catch(() => setChatMessages([]))
        .finally(() => setChatLoading(false));
    }
  }, [showTaskChat, task]);

  // Send chat message
  const handleSendChatMessage = async (msg, attachments = [], mentions = []) => {
    const taskId = task?.taskId || task?.id || task?._id;
    if (!taskId) {
      Alert.alert('No task selected', 'Cannot send message: no task available.');
      return;
    }
    try {
      const safeMsg = msg && msg.trim() ? msg : attachments.length > 0 ? ' ' : '';
      if (!safeMsg && attachments.length === 0) return;
      const newMsg = await sendTaskMessage({
        taskId,
        message: safeMsg,
        attachments,
        mentions,
      });
      setChatMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send message');
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (!remark.trim() && attachments.length === 0) {
      Alert.alert('Please enter remarks or add attachments.');
      return;
    }
    setLoading(true);
    try {
      if (issue?.isIssue) {
        // Handle task-based issue resolution using the specific resolve API
        const resolveData = {
          remarks: remark.trim(), // Include remarks
          resolvedImages: attachments.map((att, idx) => {
            let fileUri = att.uri;
            if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
              fileUri = `file://${fileUri}`;
            }
            let mimeType = att.mimeType || att.type || 'application/octet-stream';
            if (mimeType && !mimeType.includes('/')) {
              if (mimeType === 'image') mimeType = 'image/jpeg';
              else if (mimeType === 'video') mimeType = 'video/mp4';
              else mimeType = 'application/octet-stream';
            }
            return {
              uri: fileUri,
              name: att.name || fileUri.split('/').pop() || `file_${idx}`,
              type: mimeType,
            };
          })
        };
        // Use the dedicated resolve critical/issue task API
        await resolveCriticalOrIssueTask(issue.taskId, resolveData);
        Alert.alert('Success', 'Issue task completed successfully');
      } else {
        // Handle traditional issue resolution
        const resolvedImages = attachments.map((att, idx) => {
          let fileUri = att.uri;
          if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
            fileUri = `file://${fileUri}`;
          }
          let mimeType = att.mimeType || att.type || 'application/octet-stream';
          if (mimeType && !mimeType.includes('/')) {
            if (mimeType === 'image') mimeType = 'image/jpeg';
            else if (mimeType === 'video') mimeType = 'video/mp4';
            else mimeType = 'application/octet-stream';
          }
          return {
            uri: fileUri,
            name: att.name || fileUri.split('/').pop() || `file_${idx}`,
            type: mimeType,
          };
        });

        await resolveIssueByAssignedUser({
          issueId,
          remarks: remark,
          resolvedImages,
          issueStatus: 'completed',  // Changed from 'resolved' to 'completed'
        });
        Alert.alert('Success', 'Issue completed successfully');
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit resolution');
    } finally {
      setLoading(false);
    }
  };
  // Merge all attachments for drawer
  const allAttachments = [
    // For task-based issues, use images and resolvedImages
    ...(issue?.isIssue ? (issue.images || []) : (issue?.unresolvedImages || [])),
    ...(issue?.resolvedImages || []),
    ...attachments,
  ];

  // Check if current user is the creator
  const isCreator = userName && issue && (issue?.creatorName === userName || issue?.creator?.name === userName);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!issue) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
        <Text style={{ fontSize: 18, color: theme.text, textAlign: 'center' }}>
          Issue not found or failed to load
        </Text>
        <TouchableOpacity
          style={{
            marginTop: 20,
            paddingVertical: 12,
            paddingHorizontal: 20,
            backgroundColor: theme.primary,
            borderRadius: 8,
          }}
          onPress={() => navigation.goBack()}>
          <Text style={{ color: '#fff', fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: Platform.OS === 'ios' ? 65 : 25,
            marginLeft: 16,
            marginBottom: 10,
            justifyContent: 'space-between',
          }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
            <Text style={{ fontSize: 18, color: theme.text, fontWeight: '400', marginLeft: 2 }}>
              {t('back')}
            </Text>
          </TouchableOpacity>
          {userName && (issue?.creatorName === userName || issue?.creator?.name === userName) ? (
            isEditing ? (
              <TouchableOpacity
                onPress={async () => {
                  // Validate at least one field is filled
                  if (
                    !editFields.issueTitle.trim() &&
                    !editFields.description.trim() &&
                    !editFields.dueDate
                  ) {
                    Alert.alert('Error', 'Please fill at least one field to update the issue.');
                    return;
                  }
                  try {
                    setLoading(true);
                    // Check if this is a task-based issue
                    if (issue.isIssue) {
                      // Update task-based issue
                      const updatePayload = {
                        taskName: editFields.issueTitle.trim() || undefined,
                        description: editFields.description.trim() || undefined,
                        endDate: editFields.dueDate || undefined,
                      };
                      // Remove undefined values
                      Object.keys(updatePayload).forEach(key => {
                        if (updatePayload[key] === undefined) {
                          delete updatePayload[key];
                        }
                      });
                      await updateTask(issue.taskId, updatePayload);
                      // Show appropriate success message
                      Alert.alert('Success', 'Issue updated successfully.');
                      // Refresh the task data
                      const updated = await getTaskDetailsById(issue.taskId);
                      setIssue(updated);
                    } else {
                      // Handle traditional issue update
                      // Prepare update payload, separating new files and existing URLs
                      let assignedUserId = '';
                      if (issue.assignTo) {
                        // If assignTo is an object, get userId or id property
                        if (
                          typeof issue.assignTo === 'object' &&
                          (issue.assignTo.userId || issue.assignTo.id)
                        ) {
                          assignedUserId = String(issue.assignTo.userId || issue.assignTo.id);
                        } else if (
                          typeof issue.assignTo === 'number' ||
                          /^\d+$/.test(issue.assignTo)
                        ) {
                          assignedUserId = String(issue.assignTo);
                        }
                      }
                      // Only send assignTo if it's a valid integer string
                      let updatePayload = {
                        issueId: issue.issueId,
                        issueTitle: editFields.issueTitle.trim() || undefined,
                        description: editFields.description.trim() || undefined,
                        dueDate: editFields.dueDate || undefined,
                        isCritical: editFields.isCritical,
                        ...(assignedUserId ? { assignTo: assignedUserId } : {}),
                      };
                      // Separate existing URLs and new files
                      let existingUnresolvedImages = [];
                      let newUnresolvedImages = [];
                      if (Array.isArray(issue.unresolvedImages)) {
                        existingUnresolvedImages = issue.unresolvedImages.filter(
                          (img) => typeof img === 'string' && !img.startsWith('file://')
                        );
                      }
                      if (attachments && attachments.length > 0) {
                        newUnresolvedImages = attachments
                          .filter(att => att.uri)
                          .map((att, idx) => {
                            let fileUri = att.uri;
                            if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
                              fileUri = `file://${fileUri}`;
                            }
                            let mimeType = att.mimeType || att.type || 'application/octet-stream';
                            if (mimeType && !mimeType.includes('/')) {
                              if (mimeType === 'image') mimeType = 'image/jpeg';
                              else if (mimeType === 'video') mimeType = 'video/mp4';
                              else mimeType = 'application/octet-stream';
                            }
                            return {
                              uri: fileUri,
                              name: att.name || (fileUri.split('/').pop() || `file_${idx}`),
                              type: mimeType,
                            };
                          });
                      }
                      // Only send new files as unresolvedImages (for FormData)
                      if (newUnresolvedImages.length > 0) {
                        updatePayload.unresolvedImages = newUnresolvedImages;
                      }
                      // Optionally, send existing URLs in a separate field if backend supports it
                      if (existingUnresolvedImages.length > 0) {
                        updatePayload.existingUnresolvedImages = existingUnresolvedImages;
                      }
                      await updateIssue(updatePayload);
                      Alert.alert('Success', 'Issue updated successfully.');
                      const updated = await fetchIssueById(issue.issueId);
                      setIssue(updated);
                    }
                    setIsEditing(false);
                    // Clear attachments after successful update
                    setAttachments([]);
                  } catch (err) {
                    let errorMsg = 'Failed to update issue';
                    if (err && (typeof err === 'string' || typeof err?.message === 'string')) {
                      errorMsg = err.message || err;
                    }
                    Alert.alert('Error', errorMsg);
                  } finally {
                    setLoading(false);
                  }
                }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 18,
                  backgroundColor: theme.primary,
                  borderRadius: 8,
                  marginRight: 20,
                }}>
                <Text style={{ color: '#fff', fontWeight: '500', fontSize: 16 }}>{t('save')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setMenuVisible(true)}
                style={{ padding: 8, marginRight: 8 }}>
                <Feather name="more-vertical" size={22} color={theme.text} />
              </TouchableOpacity>
            )
          ) : null}
        </View>
        {(() => {
          return (
            userName &&
            (issue?.creatorName === userName || issue?.creator?.name === userName) && (
              <Modal
                visible={menuVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setMenuVisible(false)}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
                  activeOpacity={1}
                  onPress={() => setMenuVisible(false)}>
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
                    }}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                      }}
                      onPress={() => {
                        setMenuVisible(false);
                        setIsEditing(true);
                      }}>
                      <Feather
                        name="edit"
                        size={18}
                        color={theme.primary}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={{ color: theme.primary, fontWeight: '500', fontSize: 15 }}>
                        {t('edit')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                      }}
                      onPress={async () => {
                        setMenuVisible(false);
                        // Confirm delete
                        Alert.alert('Delete Issue', 'Are you sure you want to delete this issue?', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                if (issue.isIssue) {
                                  // Delete task-based issue
                                  await deleteTask(issue.taskId);
                                } else {
                                  // Delete traditional issue
                                  await deleteIssue(issue.issueId);
                                }
                                // Signal IssuesScreen to refresh
                                navigation.navigate('IssuesScreen', { refresh: true });
                              } catch (err) {
                                Alert.alert(
                                  'Delete Failed',
                                  err.message || 'Could not delete issue.'
                                );
                              }
                            },
                          },
                        ]);
                      }}>
                      <Feather
                        name="trash-2"
                        size={18}
                        color="#E53935"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={{ color: theme.dangerText, fontWeight: '500', fontSize: 15 }}>
                        {t('delete')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
            )
          );
        })()}
        <LinearGradient
          colors={['#011F53', '#366CD9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            borderRadius: 16,
            marginHorizontal: 16,
            marginBottom: 12,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            overflow: 'hidden',
          }}>
          <View>
            {isEditing ? (
              <TextInput
                style={{ color: '#fff', fontSize: 22, fontWeight: '600', padding: 0, margin: 0 }}
                value={editFields.issueTitle}
                onChangeText={(text) => setEditFields((f) => ({ ...f, issueTitle: text }))}
                placeholder="Issue Title"
                placeholderTextColor="#e6eaf3"
              />
            ) : (
              <TouchableOpacity onPress={() => setShowIssueTitleModal(true)}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600' }} numberOfLines={2} ellipsizeMode="tail">
                  {/* Display task name for task-based issues, issueTitle for traditional issues */}
                  {issue.isIssue ? issue.taskName : issue.issueTitle}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.bannerDesc, { color: '#e6eaf3' }]}>{t('all_issues_details')}</Text>
          </View>
        </LinearGradient>

        {/* Issue Details Toggle Section */}
        <View style={[styles.issueDetailsHeader, {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }]}>
          <Text style={[styles.attachmentLabel, { color: theme.text }]}>{t('issue_details')}</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {/* Show/Hide Details Button */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.card,
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: theme.border,
                marginRight: 6,
              }}
              onPress={() => setShowIssueDetails(!showIssueDetails)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={showIssueDetails ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={18}
                color={theme.primary}
                style={{ marginRight: 6 }}
              />
              <Text style={{ color: theme.primary, fontWeight: '400', fontSize: 13 }}>
                {showIssueDetails ? t('hide_details') : t('show_details')}
              </Text>
            </TouchableOpacity>

            {/* Task Chat Button, with "Task Chat" label */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (task && (task.taskId || task.id || task._id)) {
                  setShowTaskChat(true);
                } else {
                  Alert.alert('Chat unavailable', 'No task associated with this issue.');
                }
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.card,
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <MaterialIcons name="chat" size={18} color={theme.primary} style={{ marginRight: 6 }} />
              <Text style={{ color: theme.text, fontWeight: '400', fontSize: 13 }}>{t('chat')}</Text>
            </TouchableOpacity>
          </View>
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

        {showIssueDetails && (
          <>
            <FieldBox
              label={t('project_name')}
              value={issue.isIssue ? (issue.projectName || '') : (issue.projectName || '')}
              placeholder={t('project_name')}
              theme={theme}
              editable={false}
            />
            <FieldBox
              label={t('location')}
              value={issue.isIssue ? (issue.location || '') : (issue.location || '')}
              placeholder={t('location')}
              theme={theme}
              editable={false}
            />
            <FieldBox
              label={t('created_by') || 'Created By'}
              value={issue.isIssue ? (issue.creatorName || issue.creator?.name || '') : (issue.creatorName || issue.creator?.name || '')}
              placeholder={t('created_by') || 'Created By'}
              theme={theme}
              editable={false}
              rightComponent={
                issue.isIssue ? (
                  issue.creator?.profilePhoto ? (
                    <Image
                      source={{ uri: issue.creator.profilePhoto }}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        marginLeft: 10,
                        borderWidth: 2,
                        borderColor: theme.border,
                      }}
                    />
                  ) : (
                    <Image
                      source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        marginLeft: 10,
                        borderWidth: 2,
                        borderColor: theme.border,
                      }}
                    />
                  )
                ) : (
                  issue.creator?.profilePhoto ? (
                    <Image
                      source={{ uri: issue.creator.profilePhoto }}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        marginLeft: 10,
                        borderWidth: 2,
                        borderColor: theme.border,
                      }}
                    />
                  ) : (
                    <Image
                      source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        marginLeft: 10,
                        borderWidth: 2,
                        borderColor: theme.border,
                      }}
                    />
                  )
                )
              }
            />
            <FieldBox
              label={t('description')}
              value={isEditing ? editFields.description : issue.description}
              placeholder={t('description')}
              multiline
              theme={theme}
              editable={isEditing}
              onChangeText={(text) => isEditing && setEditFields((f) => ({ ...f, description: text }))}
            />
          </>
        )}

        {/* Added Attachments Section */}
        <View style={styles.attachmentSection}>
          <View style={styles.attachmentHeader}>
            <Text style={[styles.attachmentLabel, { color: theme.text }]}>{t('added_attachments')}</Text>
            {isEditing && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary + '15' }]}
                onPress={() => setShowAttachmentSheet(true)}>
                <MaterialIcons name="add" size={16} color={theme.primary} />
                <Text style={[styles.addButtonText, { color: theme.primary }]}>{t('add_files')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={[
              styles.attachmentCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            {attachments.length > 0 ||
              ((issue?.isIssue ? (issue.images && issue.images.length > 0) : (issue?.unresolvedImages && issue.unresolvedImages.length > 0))) ? (
              <>
                <Text style={[styles.attachmentCount, { color: theme.text }]}>
                  {isEditing
                    ? `${attachments.length} attachment${attachments.length !== 1 ? 's' : ''} selected`
                    : `${allAttachments.length} file${allAttachments.length !== 1 ? 's' : ''} attached`}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.viewFilesButton,
                      { backgroundColor: theme.primary + '10', borderColor: theme.primary },
                    ]}
                    onPress={() => {
                      setDrawerVisible(true);
                      setDrawerAttachments(isEditing ? attachments : allAttachments);
                    }}>
                    <MaterialIcons name="folder-open" size={16} color={theme.primary} />
                    <Text style={[styles.viewFilesText, { color: theme.primary }]}>{t('view_files')}</Text>
                  </TouchableOpacity>

                  {/* Preview Button for newly added attachments in editing mode */}
                  {isEditing && attachments.length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.viewFilesButton,
                        { backgroundColor: theme.secondary + '10', borderColor: theme.secondary || theme.primary },
                      ]}
                      onPress={() => setShowAttachmentPreviewModal(true)}>
                      <MaterialIcons name="preview" size={16} color={theme.secondary || theme.primary} />
                      <Text style={[styles.viewFilesText, { color: theme.secondary || theme.primary }]}>Preview</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.noAttachmentContainer}>
                <MaterialCommunityIcons name="file-outline" size={40} color={theme.secondaryText} />
                <Text style={[styles.noAttachmentText, { color: theme.secondaryText }]}>{t('no_attachments_added')}</Text>
                {isEditing && (
                  <Text style={[styles.tapToAddText, { color: theme.secondaryText }]}>
                    {t('tap_to_add_files')}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Show attachment previews in edit mode */}
          {isEditing && attachments.length > 0 && (
            <View style={styles.attachmentPreviewContainer}>
              {attachments.map((att, idx) => (
                <View
                  key={att.uri || att.name || idx}
                  style={[
                    styles.attachmentPreviewItem,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}>
                  <View style={styles.attachmentPreviewContent}>
                    {/* File type icon/preview */}
                    {att.type && att.type.startsWith('image') ? (
                      <Image source={{ uri: att.uri }} style={styles.attachmentPreviewImage} />
                    ) : att.type && att.type.startsWith('audio') ? (
                      <View style={[styles.attachmentIconContainer, { backgroundColor: theme.secCard }]}>
                        <MaterialCommunityIcons name="music-note" size={20} color={theme.primary} />
                      </View>
                    ) : (
                      <View style={[styles.attachmentIconContainer, { backgroundColor: theme.secCard }]}>
                        <MaterialCommunityIcons
                          name="file-document-outline"
                          size={20}
                          color={theme.secondaryText}
                        />
                      </View>
                    )}

                    {/* File name */}
                    <Text
                      style={[styles.attachmentPreviewName, { color: theme.text }]}
                      numberOfLines={1}>
                      {(att.name || att.uri?.split('/').pop() || 'Attachment').length > 25
                        ? (att.name || att.uri?.split('/').pop()).slice(0, 22) + '...'
                        : att.name || att.uri?.split('/').pop()}
                    </Text>
                  </View>

                  {/* Remove button */}
                  <TouchableOpacity
                    onPress={() => {
                      setAttachments((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    style={styles.removeAttachmentButton}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#E53935" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <AttachmentSheet
            visible={showAttachmentSheet}
            onClose={() => setShowAttachmentSheet(false)}
            onPick={async (type) => {
              await pickAttachment(type);
              setShowAttachmentSheet(false);
            }}
          />
        </View>

        <FieldBox
          label={t('assigned_to')}
          value={
            issue.isIssue
              ? (Array.isArray(issue.assignedUserDetails) && issue.assignedUserDetails.length > 0
                ? issue.assignedUserDetails.map(user => user.name).join(', ')
                : 'Not assigned')
              : (issue.assignTo?.userName || '')
          }
          placeholder={t('assigned_to')}
          rightComponent={
            issue.isIssue && Array.isArray(issue.assignedUserDetails) && issue.assignedUserDetails.length > 0 ? (
              <Image
                source={{ uri: issue.assignedUserDetails[0].profilePhoto || userImg }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 20,
                  marginLeft: 10,
                  borderWidth: 2,
                  borderColor: theme.border,
                }}
              />
            ) : !issue.isIssue && issue.assignTo?.profilePhoto ? (
              <Image
                source={{ uri: issue.assignTo.profilePhoto }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 20,
                  marginLeft: 10,
                  borderWidth: 2,
                  borderColor: theme.border,
                }}
              />
            ) : (
              <Image
                source={{ uri: userImg }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 20,
                  marginLeft: 10,
                  borderWidth: 2,
                  borderColor: theme.border,
                }}
              />
            )
          }
          theme={theme}
        />
        <FieldBox
          label={t('due_date')}
          value={
            isEditing
              ? editFields.dueDate
                ? formatDate(editFields.dueDate)
                : ''
              : formatDate(issue.isIssue ? issue.endDate : issue.dueDate)
          }
          placeholder={t("due_date")}
          theme={theme}
          editable={false}
          onPress={isEditing ? () => setShowDueDatePicker(true) : undefined}
          rightComponent={
            isEditing ? <MaterialIcons name="date-range" size={22} color={theme.primary} /> : null
          }
        />
        {showDueDatePicker && (
          <DateTimePicker
            value={editFields.dueDate ? new Date(editFields.dueDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDueDatePicker(false);
              if (selectedDate) {
                setEditFields((f) => ({ ...f, dueDate: selectedDate.toISOString() }));
              }
            }}
            textColor={theme.buttonText}
            accentColor={theme.buttonText}
          />
        )}

        <View
          style={{ height: 1, backgroundColor: theme.border, marginTop: 18, marginHorizontal: 20 }}
        />
        {(issue.status === 'Completed' || issue.issueStatus === 'resolved' || issue.issueStatus === 'completed') && (
          <View style={{ marginHorizontal: 0, marginTop: 16 }}>
            {/* Resolved Attachments Section */}
            <View style={styles.attachmentSection}>
              <View style={styles.attachmentHeader}>
                <Text style={[styles.attachmentLabel, { color: theme.text }]}>{t('resolved_attachments')}</Text>
              </View>

              <View style={[styles.attachmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {Array.isArray(issue.resolvedImages) && issue.resolvedImages.length > 0 ? (
                  <>
                    <Text style={[styles.attachmentCount, { color: theme.text }]}>
                      {`${issue.resolvedImages.length} file${issue.resolvedImages.length !== 1 ? 's' : ''} attached`}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.viewFilesButton,
                        { backgroundColor: theme.primary + '10', borderColor: theme.primary },
                      ]}
                      onPress={() => {
                        setDrawerVisible(true);
                        setDrawerAttachments(issue.resolvedImages || []);
                      }}>
                      <MaterialIcons name="folder-open" size={16} color={theme.primary} />
                      <Text style={[styles.viewFilesText, { color: theme.primary }]}>{t('view_files')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.noAttachmentContainer}>
                    <MaterialCommunityIcons name="file-outline" size={40} color={theme.secondaryText} />
                    <Text style={[styles.noAttachmentText, { color: theme.secondaryText }]}>{t('no_resolution_attachments')}</Text>
                  </View>
                )}
              </View>
            </View>

          </View>
        )}
        {issue.status !== 'Completed' &&
          issue.issueStatus !== 'resolved' &&
          issue.issueStatus !== 'completed' && (
            <View style={{ marginBottom: 24 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  justifyContent: 'flex-start',
                  alignSelf: 'flex-start',
                }}>
                <Text
                  style={{
                    fontWeight: '400',
                    paddingHorizontal: 0,
                    fontSize: 16,
                    color: theme.text,
                  }}>
                  {t("resolve_issue")}
                </Text>
              </View>
              {/* Note for attachments and description */}
              <View style={{ marginHorizontal: 20, marginBottom: 8 }}>
                <Text style={{ color: theme.dangerText, fontSize: 13, fontWeight: '500' }}>
                  {t("resolution_note")}
                </Text>
              </View>
              <View
                style={[
                  styles.inputBox,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder={t("addAttachments")}
                  placeholderTextColor={theme.secondaryText}
                  editable={false}
                />
                {/* Preview Button */}
                {attachments.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setShowAttachmentPreviewModal(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.primary + '20',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      marginRight: 8
                    }}>
                    <MaterialIcons name="preview" size={16} color={theme.primary} />
                    <Text style={{
                      color: theme.primary,
                      fontSize: 12,
                      fontWeight: '500',
                      marginLeft: 4
                    }}>
                      Preview ({attachments.length})
                    </Text>
                  </TouchableOpacity>
                )}
                <Feather
                  name="paperclip"
                  size={20}
                  color={theme.secondaryText}
                  style={styles.inputIcon}
                  onPress={() => setShowAttachmentSheet(true)}
                />
                <MaterialCommunityIcons
                  name={isRecording ? 'microphone' : 'microphone-outline'}
                  size={20}
                  color={isRecording ? '#E53935' : theme.secondaryText}
                  style={styles.inputIcon}
                  onPress={isRecording ? stopRecording : startRecording}
                />
                {isRecording && <Text style={{ color: theme.dangerText, marginLeft: 8 }}>{seconds}s</Text>}
              </View>
              {attachments.length > 0 && (
                <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
                  {Array.from({ length: Math.ceil(attachments.length / 2) }).map((_, rowIdx) => (
                    <View
                      key={rowIdx}
                      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      {[0, 1].map((colIdx) => {
                        const idx = rowIdx * 2 + colIdx;
                        const att = attachments[idx];
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
                            {att.type?.startsWith('image') && (
                              <TouchableOpacity>
                                <Image
                                  source={{ uri: att.uri }}
                                  style={{ width: 25, height: 25, borderRadius: 6, marginRight: 8 }}
                                />
                              </TouchableOpacity>
                            )}
                            {att.type?.startsWith('audio') && (
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
                            )}
                            {!att.type?.startsWith('image') && !att.type?.startsWith('audio') && (
                              <MaterialCommunityIcons
                                name="file-document-outline"
                                size={28}
                                color="#888"
                                style={{ marginRight: 8 }}
                              />
                            )}
                            <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>
                              {(att.name || att.uri?.split('/').pop() || 'Attachment').length > 20
                                ? (att.name || att.uri?.split('/').pop()).slice(0, 15) + '...'
                                : att.name || att.uri?.split('/').pop()}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                setAttachments((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              style={{ marginLeft: 8 }}>
                              <MaterialCommunityIcons
                                name="close-circle"
                                size={22}
                                color="#E53935"
                              />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}
              <AttachmentSheet
                visible={showAttachmentSheet}
                onClose={() => setShowAttachmentSheet(false)}
                onPick={async (type) => {
                  await pickAttachment(type);
                  setShowAttachmentSheet(false);
                }}
              />
              {/* <FieldBox
                label={t("resolution_remark")}
                value={remark}
                onChangeText={setRemark}
                placeholder={t("describe_resolution")}
                multiline
                theme={theme}
                editable={true}
              /> */}
            </View>
          )}

        {/* Resolution Buttons */}
        <View style={{ marginHorizontal: 20, marginTop: 30, marginBottom: 20 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 16,
            }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: (issue.status === 'Completed' || issue.issueStatus === 'resolved' || issue.issueStatus === 'completed')
                  ? theme.secCard
                  : theme.primary + '15',
                borderRadius: 16,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: (issue.status === 'Completed' || issue.issueStatus === 'resolved' || issue.issueStatus === 'completed')
                  ? theme.border
                  : theme.primary,
                opacity: (issue.status === 'Completed' || issue.issueStatus === 'resolved' || issue.issueStatus === 'completed') ? 0.5 : 1,
              }}
              onPress={() => setShowReassignModal(true)}
              disabled={issue.status === 'Completed' || issue.issueStatus === 'resolved' || issue.issueStatus === 'completed'}>
              <Text style={{
                color: (issue.status === 'Completed' || issue.issueStatus === 'resolved' || issue.issueStatus === 'completed')
                  ? theme.secondaryText
                  : theme.primary,
                fontWeight: '600',
                fontSize: 16
              }}>
                {t("no_reassign") || "no_reassign"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: (issue.status === 'Completed' || issue.issueStatus === 'resolved' || issue.issueStatus === 'completed')
                  ? theme.secCard
                  : theme.primary,
                borderRadius: 16,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: (issue.status === 'Completed' || issue.issueStatus === 'resolved' || issue.issueStatus === 'completed')
                  ? theme.border
                  : theme.primary,
                opacity: (() => {
                  const isResolved = issue.status === 'Completed' || issue.issueStatus === 'resolved' || issue.issueStatus === 'completed';
                  const hasNoContent = attachments.length === 0 && !remark;

                  if (isResolved) return 0.5;
                  if (hasNoContent) return 0.7;
                  return 1;
                })(),
              }}
              onPress={handleSubmit}
              disabled={(() => {
                const isResolved = issue.status === 'Completed' || issue.issueStatus === 'resolved';
                const hasNoContent = attachments.length === 0 && !remark;

                return isResolved || hasNoContent;
              })()}
            >
              <Text style={{
                color: (issue.status === 'Completed' || issue.issueStatus === 'resolved')
                  ? theme.secondaryText
                  : '#fff',
                fontWeight: '600',
                fontSize: 16
              }}>
                {(issue.status === 'Completed' || issue.issueStatus === 'resolved')
                  ? (t('resolved') || 'Resolved')
                  : (t('submit_resolution') || 'Submit Resolution')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
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
      <TaskReassignPopup
        visible={showReassignModal}
        onClose={async (wasReassigned = false) => {
          setShowReassignModal(false);
          if (wasReassigned) {
            // Navigate back to IssuesScreen after successful reassignment
            navigation.navigate('IssuesScreen', { refresh: true });
          }
          // Don't do anything if just canceled - stay on current screen
        }}
        taskId={issue?.isIssue ? issue.taskId : (issue?.issueId || issueId)}
        currentAssignees={issue?.assignedUserDetails || []}
        theme={theme}
        isCreator={isCreator}
      />

      {/* Issue Title Modal */}
      <Modal
        visible={showIssueTitleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIssueTitleModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowIssueTitleModal(false)}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.35)',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={{
                width: 280,
                borderRadius: 14,
                borderWidth: 1,
                padding: 18,
                alignItems: 'center',
                elevation: 8,
                backgroundColor: theme.card,
                borderColor: theme.border
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '700',
                  marginBottom: 12,
                  color: theme.text
                }}>Issue Title</Text>
                <Text style={{
                  color: theme.text,
                  fontSize: 16,
                  textAlign: 'center',
                  lineHeight: 22,
                  marginBottom: 12
                }}>
                  {issue?.isIssue ? issue?.taskName : issue?.issueTitle}
                </Text>
                <TouchableOpacity
                  style={{
                    marginTop: 10,
                    alignSelf: 'center',
                    paddingVertical: 6,
                    paddingHorizontal: 18,
                    borderRadius: 8,
                    backgroundColor: 'rgba(52, 120, 246, 0.08)',
                  }}
                  onPress={() => setShowIssueTitleModal(false)}>
                  <Text style={{ color: theme.primary, fontWeight: '500' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Attachment Preview Modal */}
      <Modal
        visible={showAttachmentPreviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAttachmentPreviewModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            flex: 1,
            marginTop: Platform.OS === 'ios' ? 50 : 25,
            backgroundColor: theme.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: theme.text
              }}>
                Attachment Preview ({attachments.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowAttachmentPreviewModal(false)}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: theme.card,
                }}>
                <MaterialIcons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Attachment List */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
              {attachments.map((att, index) => (
                <View
                  key={att.uri || att.name || index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    marginBottom: 12,
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}>

                  {/* File Icon/Preview */}
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 8,
                    backgroundColor: theme.primary + '10',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}>
                    {att.type?.startsWith('image') ? (
                      <Image
                        source={{ uri: att.uri }}
                        style={{
                          width: 50,
                          height: 50,
                          borderRadius: 8,
                        }}
                        resizeMode="cover"
                      />
                    ) : att.type?.startsWith('audio') ? (
                      <MaterialCommunityIcons name="music-note" size={24} color={theme.primary} />
                    ) : att.type?.startsWith('video') ? (
                      <MaterialCommunityIcons name="video" size={24} color={theme.primary} />
                    ) : (
                      <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.primary} />
                    )}
                  </View>

                  {/* File Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: theme.text,
                      marginBottom: 4,
                    }} numberOfLines={1}>
                      {att.name || att.uri?.split('/').pop() || 'Unknown File'}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: theme.secondaryText,
                      marginBottom: 4,
                    }}>
                      {att.type || 'Unknown Type'}
                    </Text>
                    {att.size && (
                      <Text style={{
                        fontSize: 12,
                        color: theme.secondaryText,
                      }}>
                        {(att.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {/* Play button for audio/video */}
                    {(att.type?.startsWith('audio') || att.type?.startsWith('video')) && (
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            const { Sound } = await import('expo-av');
                            const { sound } = await Sound.createAsync({ uri: att.uri });
                            await sound.playAsync();
                          } catch (error) {
                            Alert.alert('Error', 'Could not play file');
                          }
                        }}
                        style={{
                          padding: 8,
                          borderRadius: 20,
                          backgroundColor: theme.primary + '20',
                        }}>
                        <MaterialCommunityIcons name="play" size={16} color={theme.primary} />
                      </TouchableOpacity>
                    )}

                    {/* Remove button */}
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(
                          'Remove Attachment',
                          'Are you sure you want to remove this attachment?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: () => {
                                setAttachments(prev => prev.filter((_, i) => i !== index));
                              }
                            }
                          ]
                        );
                      }}
                      style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: '#FF453A20',
                      }}>
                      <MaterialCommunityIcons name="delete" size={16} color="#FF453A" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {attachments.length === 0 && (
                <View style={{
                  alignItems: 'center',
                  paddingVertical: 40,
                }}>
                  <MaterialCommunityIcons name="file-outline" size={60} color={theme.secondaryText} />
                  <Text style={{
                    fontSize: 16,
                    color: theme.secondaryText,
                    marginTop: 16,
                  }}>
                    No attachments to preview
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  issueDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 9,
    marginBottom: 18,
  },
  issueDetailsTitle: {
    fontWeight: '500',
    fontSize: 16,
    // color moved to inline style for theme responsiveness
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor moved to inline style for theme responsiveness
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewDetailsBtnText: {
    // color moved to inline style for theme responsiveness
    fontWeight: '400',
    fontSize: 14,
    marginLeft: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
    paddingRight: 8,
    // color moved to inline style for theme responsiveness
  },
  inputIcon: {
    marginLeft: 8,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  attachmentBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 8,
    borderWidth: 1,
    // borderColor and backgroundColor moved to inline style for theme responsiveness
    borderRadius: 10,
    marginRight: 12,
  },
  attachmentImage: {
    width: 25,
    height: 25,
    borderRadius: 6,
    marginRight: 8,
    // backgroundColor moved to inline style for theme responsiveness
  },
  attachmentFileName: {
    // color moved to inline style for theme responsiveness
    fontSize: 13,
    flex: 1,
  },
  removeIcon: {
    marginLeft: 8,
  },
  bannerDesc: {
    // color moved to inline style for theme responsiveness
    fontSize: 14,
    fontWeight: '400',
    maxWidth: '80%',
    marginTop: 5,
  },
  // New attachment section styles
  attachmentSection: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  attachmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  attachmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  attachmentCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    minHeight: 80,
    justifyContent: 'center',
  },
  attachmentCount: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  viewFilesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 4,
  },
  viewFilesText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noAttachmentContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  noAttachmentText: {
    fontSize: 16,
    // color moved to inline style for theme responsiveness
    marginTop: 8,
    marginBottom: 4,
  },
  tapToAddText: {
    fontSize: 12,
    // color moved to inline style for theme responsiveness
    textAlign: 'center',
    marginTop: 4,
  },
  attachmentPreviewContainer: {
    marginTop: 12,
    gap: 8,
  },
  attachmentPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  attachmentPreviewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentPreviewImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 12,
  },
  attachmentIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    // backgroundColor moved to inline style for theme responsiveness
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  attachmentPreviewName: {
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  removeAttachmentButton: {
    padding: 4,
  },
  criticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    // backgroundColor, borderColor moved to inline style for theme responsiveness
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  criticalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    // backgroundColor moved to inline style for theme responsiveness
    alignItems: 'center',
    justifyContent: 'center',
  },
  criticalLabel: {
    // color moved to inline style for theme responsiveness
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 2,
  },
  criticalDesc: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  criticalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  criticalStatusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
