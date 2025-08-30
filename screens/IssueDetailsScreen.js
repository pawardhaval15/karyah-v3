import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import ReassignPopup from 'components/popups/AssignUserPopup';
import AttachmentSheet from 'components/popups/AttachmentSheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AttachmentDrawer from '../components/issue details/AttachmentDrawer';
import AttachmentPreviewModal from '../components/issue details/AttachmentPreviewDrawer';
import ImageModal from '../components/issue details/ImageModal';
import useAttachmentPicker from '../components/popups/useAttachmentPicker';
import useAudioRecorder from '../components/popups/useAudioRecorder';
import FieldBox from '../components/task details/FieldBox';
import { useTheme } from '../theme/ThemeContext';
import { getUserNameFromToken } from '../utils/auth'; // import this
import {
  approveIssue,
  deleteIssue,
  fetchIssueById,
  resolveIssueByAssignedUser,
  updateIssue,
} from '../utils/issues';
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  return date.toLocaleDateString('en-GB');
}
export default function IssueDetailsScreen({ navigation, route }) {
  const theme = useTheme();
  const { issueId, section } = route.params || {};
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState(null);
  const [editFields, setEditFields] = useState({
    issueTitle: '',
    description: '',
    dueDate: '',
    isCritical: false,
  });
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
  useEffect(() => {
    getUserNameFromToken().then(setUserName);
  }, []);
  const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
    onRecordingFinished: (audio) => {
      setAttachments((prev) => [...prev, audio]);
    },
  });
  const userImg = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
  useEffect(() => {
    if (!issueId) return;
    setLoading(true);
    fetchIssueById(issueId)
      .then((data) => {
        setIssue(data);
        console.log('Fetched Issue:', data);
        setEditFields({
          issueTitle: data.issueTitle || '',
          description: data.description || '',
          dueDate: data.dueDate || '',
          isCritical: data.isCritical || false,
        });
      })
      .catch(() => setIssue(null))
      .finally(() => setLoading(false));
  }, [issueId]);

  const handleSubmit = async () => {
    if (!remark.trim() && attachments.length === 0) {
      Alert.alert('Please enter remarks or add attachments.');
      return;
    }
    setLoading(true);
    try {
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
        issueStatus: 'resolved',
      });
      Alert.alert('Submitted successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit resolution');
    } finally {
      setLoading(false);
    }
  };
  // Merge all attachments for drawer
  const allAttachments = [
    ...(issue?.unresolvedImages || []),
    ...(issue?.resolvedImages || []),
    ...(section === 'assigned' ? attachments : []),
  ];
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
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: Platform.OS === 'ios' ? 70 : 25,
            marginLeft: 16,
            marginBottom: 18,
            justifyContent: 'space-between',
          }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
            <Text style={{ fontSize: 18, color: theme.text, fontWeight: '400', marginLeft: 2 }}>
              Back
            </Text>
          </TouchableOpacity>
          {userName && issue?.creatorName === userName ? (
            isEditing ? (
              <TouchableOpacity
                onPress={async () => {
                  // Validate at least one field is filled
                  if (
                    !editFields.issueTitle.trim() &&
                    !editFields.description.trim() &&
                    !editFields.dueDate &&
                    editFields.isCritical === (issue.isCritical || false)
                  ) {
                    Alert.alert('Error', 'Please fill at least one field to update the issue.');
                    return;
                  }
                  try {
                    setLoading(true);
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
                      // You can add issueStatus, remarks, removeImages, removeResolvedImages if needed
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
                <Text style={{ color: '#fff', fontWeight: '500', fontSize: 16 }}>Save</Text>
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
            issue?.creatorName === userName && (
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
                        Edit
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
                                await deleteIssue(issue.issueId);
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
                      <Text style={{ color: '#E53935', fontWeight: '500', fontSize: 15 }}>
                        Delete
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
            minHeight: 110,
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
                  {issue.issueTitle}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.bannerDesc}>All issues details are listed here.</Text>
          </View>
        </LinearGradient>
        <FieldBox
          label="PROJECT NAME"
          value={issue.projectName || ''}
          placeholder="Project Name"
          theme={theme}
          editable={false}
        />
        <FieldBox
          label="LOCATION"
          value={issue.projectLocation || ''}
          placeholder="Location"
          theme={theme}
          editable={false}
        />
        <FieldBox
          label="DESCRIPTION"
          value={isEditing ? editFields.description : issue.description}
          placeholder="Description"
          multiline
          theme={theme}
          editable={isEditing}
          onChangeText={(text) => isEditing && setEditFields((f) => ({ ...f, description: text }))}
        />

        {/* Added Attachments Section */}
        <View style={styles.attachmentSection}>
          <View style={styles.attachmentHeader}>
            <Text style={[styles.attachmentLabel, { color: theme.text }]}>ADDED ATTACHMENTS</Text>
            {isEditing && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary + '15' }]}
                onPress={() => setShowAttachmentSheet(true)}>
                <MaterialIcons name="add" size={16} color={theme.primary} />
                <Text style={[styles.addButtonText, { color: theme.primary }]}>Add Files</Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={[
              styles.attachmentCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            {attachments.length > 0 ||
              (issue?.unresolvedImages && issue.unresolvedImages.length > 0) ? (
              <>
                <Text style={[styles.attachmentCount, { color: theme.text }]}>
                  {isEditing
                    ? `${attachments.length} attachment${attachments.length !== 1 ? 's' : ''} selected`
                    : `${allAttachments.length} file${allAttachments.length !== 1 ? 's' : ''} attached`}
                </Text>
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
                  <Text style={[styles.viewFilesText, { color: theme.primary }]}>View Files</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noAttachmentContainer}>
                <MaterialCommunityIcons name="file-outline" size={40} color="#888" />
                <Text style={styles.noAttachmentText}>No attachments added</Text>
                {isEditing && (
                  <Text style={styles.tapToAddText}>
                    Tap "Add Files" to attach documents, images, or audio
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
                      <View style={styles.attachmentIconContainer}>
                        <MaterialCommunityIcons name="music-note" size={20} color="#1D4ED8" />
                      </View>
                    ) : (
                      <View style={styles.attachmentIconContainer}>
                        <MaterialCommunityIcons
                          name="file-document-outline"
                          size={20}
                          color="#888"
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
          label="ASSIGNED TO"
          value={issue.assignTo?.userName || ''}
          placeholder="Assigned To"
          rightComponent={
            issue.assignTo?.profilePhoto ? (
              <Image
                source={{ uri: issue.assignTo.profilePhoto }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 20,
                  marginLeft: 10,
                  borderWidth: 2,
                  borderColor: '#e6eaf3',
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
                  borderColor: '#e6eaf3',
                }}
              />
            )
          }
          theme={theme}
        />

        <FieldBox
          label="DUE DATE"
          value={
            isEditing
              ? editFields.dueDate
                ? formatDate(editFields.dueDate)
                : ''
              : formatDate(issue.dueDate)
          }
          placeholder="Due Date"
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

        {/* Critical Toggle - Matching IssuePopup Design */}
        <View style={[styles.criticalRow, {
          backgroundColor: isEditing
            ? theme.criticalBg
            : (issue.isCritical ? theme.criticalBg : theme.normalBg),
          borderColor: isEditing
            ? theme.criticalBorder
            : (issue.isCritical ? theme.criticalBorder : theme.normalBorder),
        }]}>
          <View style={[styles.criticalIconBox, {
            backgroundColor: isEditing
              ? theme.criticalIconBg
              : (issue.isCritical ? theme.criticalIconBg : theme.normalIconBg),
          }]}>
            <MaterialIcons
              name="priority-high"
              size={24}
              color={isEditing
                ? theme.criticalText
                : (issue.isCritical ? theme.criticalText : theme.normalText)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.criticalLabel, {
              color: isEditing
                ? theme.criticalText
                : (issue.isCritical ? theme.criticalText : theme.normalText),
            }]}>
              {isEditing ? 'Critical Issue?' : (issue.isCritical ? 'Critical Issue' : 'Normal Priority')}
            </Text>
            <Text style={[styles.criticalDesc, { color: theme.text }]}>
              {isEditing
                ? 'Turn on the toggle only if the Issue needs immediate attention.'
                : (issue.isCritical
                  ? 'This issue requires immediate attention.'
                  : 'This issue has normal priority.'
                )
              }
            </Text>
          </View>
          {isEditing ? (
            <Switch
              value={editFields.isCritical}
              onValueChange={(value) => setEditFields((f) => ({ ...f, isCritical: value }))}
              trackColor={{ false: '#ddd', true: theme.criticalText }}
              thumbColor="#fff"
            />
          ) : (
            <View style={[styles.criticalStatusBadge, {
              backgroundColor: issue.isCritical ? theme.criticalBadgeBg : theme.normalBadgeBg,
            }]}>
              <Text style={[styles.criticalStatusText, {
                color: issue.isCritical ? theme.criticalBadgeText : theme.normalBadgeText,
              }]}>
                {issue.isCritical ? 'CRITICAL' : 'NORMAL'}
              </Text>
            </View>
          )}
        </View>

        <View
          style={{ height: 1, backgroundColor: '#e6eaf3', marginTop: 18, marginHorizontal: 20 }}
        />
        {section === 'created' && issue.issueStatus === 'pending_approval' && (
          <View style={{ marginHorizontal: 0, marginTop: 16 }}>
            {/* Resolved Attachments Section */}
            <View style={styles.attachmentSection}>
              <View style={styles.attachmentHeader}>
                <Text style={[styles.attachmentLabel, { color: theme.text }]}>RESOLVED ATTACHMENTS</Text>
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
                      <Text style={[styles.viewFilesText, { color: theme.primary }]}>View Files</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.noAttachmentContainer}>
                    <MaterialCommunityIcons name="file-outline" size={40} color="#888" />
                    <Text style={styles.noAttachmentText}>No resolution attachments</Text>
                  </View>
                )}
              </View>
            </View>

            <FieldBox
              label="RESOLUTION REMARK"
              value={issue.remarks || ''}
              placeholder="No resolution remark"
              multiline
              theme={theme}
              editable={false}
            />
          </View>
        )}
        {section === 'assigned' && issue.issueStatus === 'resolved' && (
          <View style={{ marginHorizontal: 0, marginTop: 16 }}>
            {/* Resolved Attachments Section */}
            <View style={styles.attachmentSection}>
              <View style={styles.attachmentHeader}>
                <Text style={[styles.attachmentLabel, { color: theme.text }]}>RESOLVED ATTACHMENTS</Text>
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
                      <Text style={[styles.viewFilesText, { color: theme.primary }]}>View Files</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.noAttachmentContainer}>
                    <MaterialCommunityIcons name="file-outline" size={40} color="#888" />
                    <Text style={styles.noAttachmentText}>No resolution attachments</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Show previous resolution remark */}
            <FieldBox
              label="RESOLUTION REMARK"
              value={issue.remarks || ''}
              placeholder="No resolution remark"
              multiline
              theme={theme}
              editable={false}
            />
          </View>
        )}
        {section === 'assigned' &&
          issue.issueStatus !== 'resolved' &&
          issue.issueStatus !== 'pending_approval' && (
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
                  Resolve Issue
                </Text>
              </View>
              {/* Note for attachments and description */}
              <View style={{ marginHorizontal: 20, marginBottom: 8 }}>
                <Text style={{ color: '#E53935', fontSize: 13, fontWeight: '500' }}>
                  Note: You must add at least one attachment and enter a description to submit the resolution.
                </Text>
              </View>
              <View
                style={[
                  styles.inputBox,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  placeholder="Add Attachments"
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
                <MaterialCommunityIcons
                  name={isRecording ? 'microphone' : 'microphone-outline'}
                  size={20}
                  color={isRecording ? '#E53935' : '#888'}
                  style={styles.inputIcon}
                  onPress={isRecording ? stopRecording : startRecording}
                />
                {isRecording && <Text style={{ color: '#E53935', marginLeft: 8 }}>{seconds}s</Text>}
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
                              borderColor: '#ccc',
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
              <FieldBox
                label="RESOLUTION REMARK"
                value={remark}
                onChangeText={setRemark}
                placeholder="Describe how the issue was resolved..."
                multiline
                theme={theme}
                editable={true}
              />
            </View>
          )}
        {section === 'created' && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: isEditing ? 'flex-end' : 'space-between',
              marginHorizontal: 20,
              marginTop: 20,
              gap: 12,
            }}>
            {!isEditing && (
              <>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: theme.secondaryButton + '11',
                    borderRadius: 16,
                    paddingVertical: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.secondaryButton,
                  }}
                  onPress={() => setShowReassignModal(true)}>
                  <Text style={{ color: theme.secondaryButton, fontWeight: '600', fontSize: 16 }}>
                    No, Re-assign
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: issue.issueStatus === 'unresolved' || issue.isApproved === true
                      ? '#222'
                      : theme.buttonText + '22',
                    borderRadius: 16,
                    paddingVertical: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: issue.issueStatus === 'unresolved' || issue.isApproved === true
                      ? '#999'
                      : theme.buttonText,
                    opacity: issue.issueStatus === 'unresolved' || issue.isApproved === true
                      ? 0.5
                      : 1,
                  }}
                  onPress={async () => {
                    if (issue.issueStatus === 'unresolved') {
                      Alert.alert('Cannot Approve', 'Issue must be resolved before it can be approved.');
                      return;
                    }
                    try {
                      setLoading(true);
                      await approveIssue(issue.issueId);
                      Alert.alert('Success', 'Issue approved and marked as resolved.');
                      const updated = await fetchIssueById(issueId);
                      setIssue(updated);
                    } catch (err) {
                      Alert.alert('Error', err.message || 'Failed to approve issue');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={issue.isApproved === true || issue.issueStatus === 'unresolved'}>
                  <Text style={{
                    color: issue.issueStatus === 'unresolved' || issue.isApproved === true
                      ? '#FAFAFA'
                      : theme.buttonText,
                    fontWeight: '700',
                    fontSize: 16
                  }}>
                    {issue.issueStatus === 'resolved' ? 'Resolved' : 'Approve & Complete'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        {section === 'assigned' && (
          <View style={{ marginHorizontal: 20, marginTop: 20 }}>
            <TouchableOpacity
              style={{
                backgroundColor: theme.card,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.buttonText,
                opacity:
                  issue.issueStatus === 'pending_approval' ||
                    issue.issueStatus === 'resolved' ||
                    attachments.length === 0 ||
                    !remark
                    ? 0.5
                    : 1,
              }}
              onPress={handleSubmit}
              disabled={
                issue.issueStatus === 'pending_approval' ||
                issue.issueStatus === 'resolved' ||
                attachments.length === 0 ||
                !remark
              }>
              <Text style={{ color: theme.buttonText, fontWeight: '600', fontSize: 16 }}>
                {issue.issueStatus === 'resolved'
                  ? 'Resolved'
                  : issue.issueStatus === 'pending_approval'
                    ? 'Waiting for Approval'
                    : 'Submit Resolution'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
      <ReassignPopup
        visible={showReassignModal}
        onClose={async () => {
          setShowReassignModal(false);
          setLoading(true);
          try {
            const updated = await fetchIssueById(issueId);
            setIssue(updated);
          } catch { }
          setLoading(false);
        }}
        issueId={issue?.issueId || issueId}
        currentAssignee={issue?.assignTo}
        theme={theme}
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
                  {issue?.issueTitle}
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
    </View>
  );
}
const styles = StyleSheet.create({
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
    color: '#222',
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
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    marginRight: 12,
  },
  attachmentImage: {
    width: 25,
    height: 25,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#eee',
  },
  attachmentFileName: {
    color: '#444',
    fontSize: 13,
    flex: 1,
  },
  removeIcon: {
    marginLeft: 8,
  },
  bannerDesc: {
    color: '#e6eaf3',
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
    color: '#888',
    marginTop: 8,
    marginBottom: 4,
  },
  tapToAddText: {
    fontSize: 12,
    color: '#aaa',
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FF7D66',
    padding: 12,
    gap: 12,
  },
  criticalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FEC8BE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  criticalLabel: {
    color: '#FF2700',
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
