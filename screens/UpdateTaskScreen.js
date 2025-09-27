import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import GradientButton from '../components/Login/GradientButton';
import AttachmentSheet from '../components/popups/AttachmentSheet';
import CustomPickerDrawer from '../components/popups/CustomPickerDrawer';
import FilePreviewModal from '../components/popups/FilePreviewModal';
import useAttachmentPicker from '../components/popups/useAttachmentPicker';
import useAudioRecorder from '../components/popups/useAudioRecorder';
import DateBox from '../components/task details/DateBox';
import FieldBox from '../components/task details/FieldBox';
import { useTheme } from '../theme/ThemeContext';
import { getUserConnections, searchConnections } from '../utils/connections';
import { getTaskDetailsById, updateTaskDetails } from '../utils/task';
export default function UpdateTaskScreen({ route, navigation }) {
  const { taskId, projects, users, worklists, projectTasks } = route.params;

  // Safe navigation function to handle cases where there's no previous screen
  const safeGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback to TaskDetails screen if no previous screen exists
      navigation.navigate('TaskDetails', { taskId });
    }
  };
  const { t } = useTranslation();
  const theme = useTheme();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allConnections, setAllConnections] = useState([]);
  const [filteredConnections, setFilteredConnections] = useState([]);
  // const [attachments, setAttachments] = useState([]);
  const [values, setValues] = useState({
    taskName: '',
    description: '',
    startDate: '',
    endDate: '',
    images: [],
    isIssue: false,
    isCritical: false,
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showWorklistPicker, setShowWorklistPicker] = useState(false);
  const [showDepPicker, setShowDepPicker] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const { attachments, pickAttachment, setAttachments, getFileType, getFileIcon, getFormattedSize } = useAttachmentPicker();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedDeps, setSelectedDeps] = useState([]);
  const [selectedDepIds, setSelectedDepIds] = useState([]);
  const taskValueKey = projectTasks.length && projectTasks[0]?.id !== undefined ? 'id' : 'taskId';

  const handleDepToggle = (taskId) => {
    setSelectedDepIds((prev) => {
      const idStr = String(taskId);
      return prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr];
    });
  };

  // Helper to convert content URI to file URI on Android
  async function getFileSystemUri(uri) {
    if (Platform.OS === 'android' && uri.startsWith('content://')) {
      try {
        // Copy file to app cache directory
        const fileName = uri.split('/').pop();
        const destPath = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: uri, to: destPath });
        return destPath;
      } catch (e) {
        console.warn('Failed to copy content uri to file uri:', e);
        return uri; // fallback
      }
    }
    return uri;
  }
  useEffect(() => {
    const selected = selectedDepIds
      .map((id) => projectTasks.find((t) => String(t[taskValueKey]) === id))
      .filter(Boolean);
    setSelectedDeps(selected);
  }, [selectedDepIds, projectTasks]);

  const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
    onRecordingFinished: (audioFile) => {
      setAttachments((prev) => [...prev, audioFile]);
      Alert.alert('Audio recorded and attached!');
    },
  });

  const handleUserToggle = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await getTaskDetailsById(taskId);
        console.log('Loaded task data:', res);
        
        setTask(res);
        setValues({
          taskName: res.taskName || res.name,
          description: res.description,
          startDate: res.startDate,
          endDate: res.endDate,
          isIssue: res.isIssue || false,
          isCritical: res.isCritical || false,
        });
        // Preload dependencies
        setSelectedDepIds((res.dependentTaskIds || []).map(String));

        console.log('res.assignedUserDetails', res.assignedUserDetails);
        setSelectedUsers(res.assignedUserDetails?.map((u) => u.userId) || []);

        // Load existing attachments into the hook
        if (Array.isArray(res.images) && res.images.length > 0) {
          const existingFiles = res.images.map((imageUrl, index) => {
            // Extract filename from URL
            const urlParts = imageUrl.split('/');
            const filename = urlParts[urlParts.length - 1] || `image-${index + 1}`;

            // Determine file type from URL or filename
            let fileType = 'application/octet-stream';
            const extension = filename.toLowerCase().split('.').pop();
            switch (extension) {
              case 'jpg':
              case 'jpeg':
              case 'png':
              case 'gif':
              case 'webp':
              case 'bmp':
                fileType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
                break;
              case 'pdf':
                fileType = 'application/pdf';
                break;
              case 'mp4':
              case 'mov':
              case 'avi':
                fileType = `video/${extension}`;
                break;
              case 'mp3':
              case 'wav':
              case 'm4a':
                fileType = `audio/${extension}`;
                break;
              default:
                fileType = 'application/octet-stream';
            }

            return {
              uri: imageUrl,
              name: filename,
              type: fileType,
              size: 0, // We don't know the size of existing files
              isExisting: true,
            };
          });
          console.log('Loading existing files:', existingFiles);
          setAttachments(existingFiles);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load task.');
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, []);

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };
  const handleUpdate = async () => {
    try {
      const newImages = [];
      for (const att of attachments) {
        if (att && !att.isExisting && att.uri) {
          let fileUri = att.uri;
          // Convert content:// URI to file:// on Android
          fileUri = await getFileSystemUri(fileUri);
          if (!fileUri.startsWith('file://')) {
            fileUri = `file://${fileUri}`;
          }

          // Fix MIME type: ensure it contains a slash '/'
          let mimeType = att.type;
          if (mimeType && !mimeType.includes('/')) {
            if (mimeType === 'image') mimeType = 'image/jpeg';
            else if (mimeType === 'video') mimeType = 'video/mp4';
            else mimeType = 'application/octet-stream';
          }

          newImages.push({
            uri: fileUri,
            name: att.name || fileUri.split('/').pop() || 'file',
            type: mimeType || 'application/octet-stream',
            isExisting: false,
          });
        }
      }
      console.log('[handleUpdate] newImages to upload:', newImages);

      const updatePayload = {
        taskName: values.taskName,
        description: values.description,
        startDate: values.startDate || new Date().toISOString(),
        endDate: values.endDate || new Date().toISOString(),
        assignedUserIds: selectedUsers,
        imagesToRemove: task?.imagesToRemove || [],
        attachments: newImages,
        dependentTaskIds: selectedDepIds.map(String),
        isIssue: values.isIssue,
        isCritical: values.isCritical,
      };
      console.log('[handleUpdate] Final updatePayload:', updatePayload);
      await updateTaskDetails(taskId, updatePayload);
      Alert.alert('Success', 'Task updated successfully.');
      navigation.replace('TaskDetails', { taskId, refreshedAt: Date.now() });
    } catch (err) {
      console.error('[UpdateTaskScreen] Update error:', err);
      Alert.alert('Error', 'Failed to update task.');
    }
  };

  // Remove this duplicate handleSearch function since we already have handleUserSearch
  const openUserPicker = async () => {
    setShowUserPicker(true);
    try {
      const connections = await getUserConnections();
      setAllConnections(connections || []);
    } catch (e) {
      setAllConnections([]);
    }
    setFilteredConnections([]);
    setSearchText('');
  };

  // --- Handler for searching connections ---
  const handleUserSearch = async (text) => {
    setSearchText(text);
    if (text.trim()) {
      try {
        const result = await searchConnections(text.trim());
        setFilteredConnections(result || []);
      } catch (e) {
        setFilteredConnections([]);
      }
    } else {
      setFilteredConnections([]);
    }
  };

  // --- Handler for selecting/removing users ---
  const handleUserSelect = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  if (loading || !task) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.background,
        }}>
        <Text style={{ color: theme.text }}>Loading...</Text>
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <TouchableOpacity style={styles.backBtn} onPress={safeGoBack}>
          <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
        </TouchableOpacity>
        {/* Header Card */}
        <LinearGradient
          colors={[theme.secondary, theme.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerCard}>
          <View>
            <Text style={styles.taskName}>{task.taskName || task.name}</Text>
            <Text style={styles.dueDate}>{t('due_date')}: {values.endDate?.split('T')[0] || '-'}</Text>
          </View>
        </LinearGradient>
        {/* Date Row */}
        <View style={styles.dateRow}>
          <DateBox
            label={t('start_date')}
            value={values.startDate}
            onChange={(date) => handleChange('startDate', date.toISOString())}
            theme={theme}
          />
          <DateBox
            label={t('end_date')}
            value={values.endDate}
            onChange={(date) => handleChange('endDate', date.toISOString())}
            theme={theme}
          />
        </View>
        {/* Editable Fields */}
        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>{t('task_name')}</Text>
          <TextInput
            value={values.taskName}
            placeholder={t('task_name')}
            placeholderTextColor={theme.secondaryText}
            onChangeText={(text) => handleChange('taskName', text)}
            style={[styles.inputValue, { color: theme.text }]}
          />
        </View>
        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text }]}>{t('description')}</Text>
          <TextInput
            value={values.description}
            placeholder={t('description')}
            placeholderTextColor={theme.secondaryText}
            onChangeText={(text) => handleChange('description', text)}
            multiline
            style={[styles.inputValue, { color: theme.text, minHeight: 60 }]}
          />
        </View>
        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 8 }]}>
            {t('assigned_users')}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openUserPicker}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              minHeight: 40,
              paddingRight: 15,
            }}>
            {selectedUsers.length === 0 && (
              <Text style={{ color: theme.secondaryText }}>Select Users</Text>
            )}
            {selectedUsers.map((id, idx) => {
              const user =
                allConnections.find((u) => u.userId === id) || users.find((u) => u.userId === id);
              const photo =
                user?.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';
              return (
                <Image
                  key={id}
                  source={{ uri: photo }}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: -10,
                    borderWidth: 2,
                    borderColor: theme.primary,
                    backgroundColor: '#fff',
                  }}
                />
              );
            })}
            <Feather
              name="chevron-right"
              size={20}
              color={theme.secondaryText}
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>

        <Modal
          visible={showUserPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowUserPicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
              <View
                style={{
                  backgroundColor: theme.card,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 20,
                  minHeight: 350,
                  maxHeight: '70%',
                }}>
                <Text
                  style={{ color: theme.text, fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>
                  Select Users
                </Text>
                {selectedUsers.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 8, minHeight: 54 }}
                    contentContainerStyle={{ alignItems: 'center', paddingVertical: 0 }}>
                    {selectedUsers.map((userId, idx) => {
                      const user =
                        allConnections.find((u) => u.userId === userId) ||
                        users.find((u) => u.userId === userId);
                      if (!user) return null;
                      return (
                        <TouchableOpacity
                          key={userId}
                          onPress={() => handleUserSelect(userId)}
                          style={{
                            alignItems: 'center',
                            marginLeft: idx === 0 ? 0 : 6,
                            position: 'relative',
                          }}>
                          <Image
                            source={{
                              uri:
                                user.profilePhoto ||
                                'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
                            }}
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              borderWidth: 2,
                              borderColor: theme.primary,
                            }}
                          />
                          <Feather
                            name="x-circle"
                            size={16}
                            color={theme.primary}
                            style={{ position: 'absolute', top: -6, right: -6 }}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
                <TextInput
                  placeholder={t("search_connections")}
                  placeholderTextColor={theme.secondaryText}
                  value={searchText}
                  onChangeText={handleUserSearch}
                  style={{
                    color: theme.text,
                    backgroundColor: theme.SearchBar,
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 16,
                    marginBottom: 10,
                    borderColor: theme.border,
                    borderWidth: 1,
                  }}
                />
                <ScrollView keyboardShouldPersistTaps="handled">
                  {(searchText.trim() ? filteredConnections : allConnections)
                    .slice(0, 10)
                    .map((item) => (
                      <TouchableOpacity
                        key={item.userId}
                        onPress={() => handleUserSelect(item.userId)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          borderBottomWidth: 0.5,
                          borderColor: theme.border,
                          backgroundColor: selectedUsers.includes(item.userId) ?
                            `${theme.primary}20` : 'transparent',
                          borderRadius: selectedUsers.includes(item.userId) ? 8 : 0,
                          paddingHorizontal: selectedUsers.includes(item.userId) ? 8 : 0,
                        }}>
                        <Image
                          source={{
                            uri:
                              item.profilePhoto ||
                              'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
                          }}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            marginRight: 10,
                            borderWidth: selectedUsers.includes(item.userId) ? 2 : 1,
                            borderColor: selectedUsers.includes(item.userId) ? theme.primary : theme.border,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            color: theme.text,
                            fontWeight: selectedUsers.includes(item.userId) ? '600' : '500'
                          }}>{item.name}</Text>
                          {item.phone && (
                            <Text style={{ fontSize: 12, color: theme.secondaryText }}>
                              {t('phone')}: {item.phone}
                            </Text>
                          )}
                        </View>
                        {selectedUsers.includes(item.userId) && (
                          <Feather name="check-circle" size={20} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity
                  style={{
                    marginTop: 18,
                    alignSelf: 'center',
                    backgroundColor: theme.primary,
                    borderRadius: 12,
                    paddingHorizontal: 32,
                    paddingVertical: 12,
                  }}
                  onPress={() => setShowUserPicker(false)}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t('done')}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 8 }]}>
            {t('dependent_tasks')}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowDepPicker(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
              minHeight: 40,
              paddingRight: 15,
            }}>
            {selectedDeps.length === 0 ? (
              <Text style={{ color: theme.secondaryText }}>{t('select_tasks')}</Text>
            ) : (
              selectedDeps.map((dep) => (
                <View
                  key={dep[taskValueKey]}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.card,
                    paddingVertical: 4,
                    paddingHorizontal: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    marginRight: 6,
                    marginBottom: 6,
                  }}>
                  <Text style={{ color: theme.text, marginRight: 4 }}>
                    {dep.name || dep.taskName || 'Unnamed Task'}
                  </Text>

                  <TouchableOpacity onPress={() => handleDepToggle(dep[taskValueKey])}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#E53935" />
                  </TouchableOpacity>
                </View>
              ))
            )}
            <Feather
              name="chevron-right"
              size={20}
              color={theme.secondaryText}
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </View>
        <CustomPickerDrawer
          visible={showDepPicker}
          onClose={() => setShowDepPicker(false)}
          data={projectTasks.filter((t) => String(t[taskValueKey]) !== String(taskId))}
          valueKey={taskValueKey}
          labelKey="name"
          selectedValue={selectedDepIds}
          onSelect={handleDepToggle}
          multiSelect={true}
          theme={theme}
          placeholder={t("search_task")}
          showImage={false}
        />
        <FieldBox
          label={t("addAttachments")}
          value=""
          placeholder={t("addAttachments")}
          theme={theme}
          editable={false}
          rightComponent={
            <>
              {attachments.length > 0 && (
                <TouchableOpacity
                  onPress={() => setShowPreviewModal(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.primary + '20',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    marginRight: 8
                  }}>
                  <Feather name="eye" size={16} color={theme.primary} />
                  <Text style={{
                    color: theme.primary,
                    fontSize: 12,
                    fontWeight: '500',
                    marginLeft: 4
                  }}>
                    {t("previewAttachments")} ({attachments.length})
                  </Text>
                </TouchableOpacity>
              )}
              <Feather
                name="paperclip"
                size={20}
                color="#888"
                style={{ marginLeft: 8 }}
                onPress={() => setShowAttachmentSheet(true)}
              />
              <MaterialCommunityIcons
                name={isRecording ? 'microphone' : 'microphone-outline'}
                size={20}
                color={isRecording ? '#E53935' : '#888'}
                style={{ marginLeft: 8 }}
                onPress={isRecording ? stopRecording : startRecording}
              />
              {isRecording && <Text style={{ color: '#E53935', marginLeft: 8 }}>{seconds}s</Text>}
            </>
          }
        />
        {/* Simplified Attachment Preview List */}
        {attachments.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8
            }}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t("added_attachments")} ({attachments.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowPreviewModal(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8
                }}>
                <Feather name="eye" size={16} color="white" />
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '500', marginLeft: 4 }}>
                  {t("preview_all")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick preview grid */}
            {Array.from({ length: Math.ceil(attachments.length / 2) }).map((_, rowIdx) => (
              <View
                key={rowIdx}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                {[0, 1].map((colIdx) => {
                  const idx = rowIdx * 2 + colIdx;
                  const att = attachments[idx];
                  if (!att) return <View key={colIdx} style={{ flex: 1 }} />;
                  return (
                    <TouchableOpacity
                      key={att.uri || att.name || idx}
                      onPress={() => setShowPreviewModal(true)}
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
                      {/* File type icon */}
                      <MaterialCommunityIcons
                        name={getFileIcon(att)}
                        size={24}
                        color={theme.primary}
                        style={{ marginRight: 8 }}
                      />

                      {/* File info */}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                          {(att.name || att.uri?.split('/').pop() || 'Attachment').length > 15
                            ? (att.name || att.uri?.split('/').pop()).slice(0, 12) + '...'
                            : att.name || att.uri?.split('/').pop()}
                        </Text>
                        <Text style={{ color: theme.secondaryText, fontSize: 11 }}>
                          {getFormattedSize(att.size || 0, att.isExisting)}
                        </Text>
                      </View>

                      {/* Remove button */}
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert(
                            'Remove File',
                            `Remove "${att.name || 'this file'}"?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove',
                                style: 'destructive',
                                onPress: () => {
                                  setAttachments((prev) => prev.filter((_, i) => i !== idx));
                                }
                              }
                            ]
                          );
                        }}
                        style={{ marginLeft: 8, padding: 4 }}>
                        <MaterialCommunityIcons name="close-circle" size={18} color="#E53935" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Issue Toggle */}
        <View style={[styles.toggleRow, { 
          backgroundColor: values.isIssue ? theme.criticalBg : theme.normalBg, 
          borderColor: values.isIssue ? theme.criticalBorder : theme.normalBorder 
        }]}>
          <View style={[styles.toggleIconBox, {
            backgroundColor: values.isIssue ? theme.criticalIconBg : theme.normalIconBg
          }]}>
            <MaterialIcons 
              name="priority-high" 
              size={20} 
              color={values.isIssue ? theme.criticalText : theme.normalText} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { 
              color: values.isIssue ? theme.criticalText : theme.normalText 
            }]}>
              {values.isIssue ? 'Issue Task' : 'Mark as Issue'}
            </Text>
            <Text style={[styles.toggleDesc, { color: theme.secondaryText }]}>
              {values.isIssue 
                ? 'This task is marked as an issue requiring attention'
                : 'Convert this task to an issue'
              }
            </Text>
          </View>
          <Switch
            value={values.isIssue || false}
            onValueChange={v => {
              handleChange('isIssue', v);
              // Reset critical flag when converting from issue to normal task
              if (!v && values.isCritical) {
                handleChange('isCritical', false);
              }
            }}
            trackColor={{ 
              false: '#ddd', 
              true: values.isIssue ? theme.criticalText : theme.primary 
            }}
            thumbColor="#fff"
          />
        </View>

        {/* Critical Toggle - Only show when task is an issue */}
        {values.isIssue && (
          <View style={[styles.toggleRow, { 
            backgroundColor: values.isCritical ? theme.criticalBg : theme.normalIssueBg,
            borderColor: values.isCritical ? theme.criticalBorder : theme.normalIssueBorder,
            marginTop: 8
          }]}>
            <View style={[styles.toggleIconBox, {
              backgroundColor: values.isCritical ? theme.criticalIconBg : theme.normalIssueIconBg
            }]}>
              <MaterialIcons 
                name="warning" 
                size={20} 
                color={values.isCritical ? theme.criticalText : theme.normalIssueText} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { 
                color: values.isCritical ? theme.criticalText : theme.normalIssueText 
              }]}>
                {values.isCritical ? 'Critical Issue' : 'Mark as Critical'}
              </Text>
              <Text style={[styles.toggleDesc, { color: theme.secondaryText }]}>
                {values.isCritical
                  ? 'This issue requires immediate attention'
                  : 'Mark this issue as critical'
                }
              </Text>
            </View>
            <Switch
              value={values.isCritical || false}
              onValueChange={v => handleChange('isCritical', v)}
              trackColor={{ 
                false: '#ddd', 
                true: theme.criticalText
              }}
              thumbColor="#fff"
            />
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

        <FilePreviewModal
          visible={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          attachments={attachments}
          onRemoveFile={(index) => {
            setAttachments(prev => prev.filter((_, i) => i !== index));
          }}
          theme={theme}
          getFileType={getFileType}
          getFileIcon={getFileIcon}
          getFormattedSize={getFormattedSize}
        />
      </ScrollView>
      <View style={styles.fixedButtonContainer}>
        <GradientButton title={t("save_changes")} onPress={handleUpdate} theme={theme} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    paddingTop: Platform.OS === 'ios' ? 70 : 25,
    marginLeft: 16,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    marginTop: 25,
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
  },
  dueDate: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.85,
    fontWeight: '400',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 22,
    marginBottom: 12,
    gap: 8,
  },
  fieldBox: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    minHeight: 54,
    paddingVertical: 8,
  },
  inputLabel: {
    color: '#222',
    fontWeight: '400',
    fontSize: 14,
    marginBottom: 2,
  },
  inputValue: {
    color: '#444',
    fontSize: 15,
    fontWeight: '400',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 10,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  toggleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
