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
  LayoutAnimation,
  UIManager
} from 'react-native';

// Adjust imports based on your folder structure
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

// --- ENABLE LAYOUT ANIMATION ---
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONSTANTS (MATCHING TASKFORM) ---
const TASK_MODES = [
  { id: 'LEGACY', name: 'Legacy Task' },
  { id: 'WORKFLOW', name: 'Workflow Task' },
];

const WORKFLOW_DATA = {
  PROCUREMENT: {
    name: "Procurement",
    stages: [
      { id: "DESIGN", name: "Design Pending" },
      { id: "MATERIAL_SELECTION", name: "Material Selection" },
      { id: "ORDER", name: "Order Pending" },
      { id: "ACCOUNTS", name: "Accounts Pending" },
      { id: "DISPATCH", name: "Dispatch" },
      { id: "DELIVERY", name: "Delivery" },
      { id: "INSTALLATION", name: "Installation" },
    ],
  },
  INTERIOR_DESIGN: {
    name: "Interior Design",
    stages: [
      { id: "DRAFTING", name: "Drafting Plan" },
      { id: "APPROVED_PLAN", name: "Approved Plan" },
      { id: "THEME", name: "Themed Plan" },
      { id: "CIVIL", name: "Civil" },
      { id: "ELECTRICAL", name: "Electrical" },
      { id: "PLUMBING", name: "Plumbing" },
      { id: "ACP", name: "ACP" },
      { id: "PAINTING", name: "Painting" },
      { id: "FURNISHING", name: "Furnishing" },
      { id: "POP", name: "POP" },
    ],
  },
};

const CATEGORY_OPTIONS = Object.keys(WORKFLOW_DATA).map(key => ({
  id: key,
  name: WORKFLOW_DATA[key].name
}));

export default function UpdateTaskScreen({ route, navigation }) {
  const {
    taskId,
    projects = [],
    users = [],
    projectTasks = []
  } = route.params || {};

  const safeGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('TaskDetails', { taskId });
    }
  };

  const { t } = useTranslation();
  const theme = useTheme();

  // --- STATE ---
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Connections / Users
  const [allConnections, setAllConnections] = useState([]);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchText, setSearchText] = useState('');

  // Pickers Visibility
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showDepPicker, setShowDepPicker] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // NEW PICKERS (For Additional Options)
  const [showModePicker, setShowModePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showApproverPicker, setShowApproverPicker] = useState(false);

  // UI Toggle
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);

  // Form Values
  const [values, setValues] = useState({
    taskName: '',
    description: '',
    startDate: '',
    endDate: '',

    // Workflow / Advanced
    taskMode: 'LEGACY',
    category: null,
    currentStage: null,

    // Flags
    isIssue: false,
    isCritical: false,
    isApprovalNeeded: false,
    approvalRequiredBy: null,
  });

  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [selectedDepIds, setSelectedDepIds] = useState([]);

  const { attachments, pickAttachment, setAttachments, getFileType, getFileIcon, getFormattedSize } = useAttachmentPicker();

  // Derived Values
  const taskValueKey = (projectTasks.length > 0 && projectTasks[0]?.id !== undefined) ? 'id' : 'taskId';

  // Resolving Names for UI
  const selectedApprover = users.find(u => u.userId === values.approvalRequiredBy);
  const selectedCategoryName = values.category ? WORKFLOW_DATA[values.category]?.name : null;
  const availableStages = values.category ? WORKFLOW_DATA[values.category]?.stages : [];
  const selectedStageName = values.currentStage
    ? availableStages.find(s => s.id === values.currentStage)?.name
    : null;

  // Dependency Objects
  const selectedDeps = selectedDepIds
    .map(id => projectTasks.find(t => String(t[taskValueKey]) === id))
    .filter(Boolean);

  // --- ANIMATION TOGGLE ---
  const toggleAdditionalOptions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdditionalOptions(!showAdditionalOptions);
  };

  // --- HANDLERS ---
  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleDepToggle = (taskIdVal) => {
    setSelectedDepIds((prev) => {
      const idStr = String(taskIdVal);
      return prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr];
    });
  };

  const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
    onRecordingFinished: (audioFile) => {
      setAttachments((prev) => [...prev, audioFile]);
      Alert.alert('Audio recorded and attached!');
    },
  });

  async function getFileSystemUri(uri) {
    if (Platform.OS === 'android' && uri.startsWith('content://')) {
      try {
        const fileName = uri.split('/').pop();
        const destPath = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.copyAsync({ from: uri, to: destPath });
        return destPath;
      } catch (e) {
        return uri;
      }
    }
    return uri;
  }

  // --- LOAD DATA ---
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await getTaskDetailsById(taskId);
        console.log('Loaded task data:', res);
        setTask(res);

        // Determine Mode based on existing category
        const mode = res.category ? 'WORKFLOW' : 'LEGACY';

        setValues({
          taskName: res.taskName || res.name || '',
          description: res.description || '',
          startDate: res.startDate || new Date().toISOString(),
          endDate: res.endDate || new Date().toISOString(),

          taskMode: mode,
          category: res.category || null,
          currentStage: res.currentStage || res.stage || null,

          isIssue: res.isIssue === true || res.isIssue === 'true',
          isCritical: res.isCritical === true || res.isCritical === 'true',
          isApprovalNeeded: res.isApprovalNeeded === true || res.isApprovalNeeded === 'true',
          approvalRequiredBy: res.approvalRequiredBy || null,
        });

        setSelectedDepIds((res.dependentTaskIds || []).map(String));

        if (res.assignedUserDetails && Array.isArray(res.assignedUserDetails)) {
          setSelectedUsers(res.assignedUserDetails.map((u) => u.userId));
        } else if (res.assignedUserIds && Array.isArray(res.assignedUserIds)) {
          setSelectedUsers(res.assignedUserIds.map(String));
        }

        if (Array.isArray(res.images) && res.images.length > 0) {
          const existingFiles = res.images.map((imageUrl, index) => {
            const urlParts = imageUrl.split('/');
            const filename = urlParts[urlParts.length - 1] || `image-${index + 1}`;
            const extension = filename.toLowerCase().split('.').pop();
            let fileType = 'application/octet-stream';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) fileType = 'image/jpeg';
            else if (['mp4', 'mov', 'avi'].includes(extension)) fileType = 'video/mp4';
            else if (['pdf'].includes(extension)) fileType = 'application/pdf';
            return { uri: imageUrl, name: filename, type: fileType, size: 0, isExisting: true, originalIndex: index };
          });
          setAttachments(existingFiles);
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load task data.');
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [taskId]);

  const handleUpdate = async () => {
    try {
      const newImages = [];
      for (const att of attachments) {
        if (att && !att.isExisting && att.uri) {
          let fileUri = att.uri;
          fileUri = await getFileSystemUri(fileUri);
          if (!fileUri.startsWith('file://')) fileUri = `file://${fileUri}`;
          newImages.push({
            uri: fileUri,
            name: att.name || 'file',
            type: att.type || 'application/octet-stream',
          });
        }
      }

      // Prepare Update Payload matching TaskForm structure
      const isWorkflow = values.taskMode === 'WORKFLOW';

      const updatePayload = {
        taskName: values.taskName,
        description: values.description,
        startDate: values.startDate,
        endDate: values.endDate,
        assignedUserIds: selectedUsers,
        imagesToRemove: imagesToRemove,
        attachments: newImages,
        dependentTaskIds: selectedDepIds.map(String),

        // Workflow / Flags
        category: isWorkflow ? values.category : null,
        // Send stage only if selected, backend usually handles progression
        stage: isWorkflow ? values.currentStage : null,

        isIssue: values.isIssue,
        isCritical: values.isCritical,
        isApprovalNeeded: values.isApprovalNeeded,
        approvalRequiredBy: values.isApprovalNeeded ? values.approvalRequiredBy : null,
      };

      // Basic Validation
      if (isWorkflow && !values.category) {
        Alert.alert('Validation Error', 'Please select a Category for Workflow Task');
        return;
      }
      if (values.isApprovalNeeded && !values.approvalRequiredBy) {
        Alert.alert('Validation Error', 'Please select an approver.');
        return;
      }

      console.log('[handleUpdate] Sending Payload:', JSON.stringify(updatePayload, null, 2));
      await updateTaskDetails(taskId, updatePayload);
      Alert.alert('Success', 'Task updated successfully.');
      navigation.replace('TaskDetails', { taskId, refreshedAt: Date.now() });
    } catch (err) {
      console.error('[UpdateTaskScreen] Update error:', err);
      Alert.alert('Error', 'Failed to update task.');
    }
  };

  // --- HELPER UI ---
  const handleRemoveAttachment = (att, indexInView) => {
    if (att.isExisting && att.originalIndex !== undefined) {
      setImagesToRemove(prev => [...prev, att.originalIndex]);
    }
    setAttachments(prev => prev.filter((_, i) => i !== indexInView));
  };

  const openUserPicker = async () => {
    setShowUserPicker(true);
    try {
      const connections = await getUserConnections();
      setAllConnections(connections || []);
    } catch (e) { setAllConnections([]); }
    setFilteredConnections([]);
    setSearchText('');
  };

  const handleUserSearch = async (text) => {
    setSearchText(text);
    if (text.trim()) {
      try {
        const result = await searchConnections(text.trim());
        setFilteredConnections(result || []);
      } catch (e) { setFilteredConnections([]); }
    } else { setFilteredConnections([]); }
  };

  const handleUserSelect = (userId) => {
    setSelectedUsers((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  if (loading || !task) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Back Button */}
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

        {/*  CORE FIELDS  */}

        {/* Name Input */}
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

        {/* Description Input */}
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

        {/* Date Row */}
        <View style={styles.dateRow}>
          <DateBox label={t('start_date')} value={values.startDate} onChange={(date) => handleChange('startDate', date.toISOString())} theme={theme} />
          <DateBox label={t('end_date')} value={values.endDate} onChange={(date) => handleChange('endDate', date.toISOString())} theme={theme} />
        </View>

        {/* Assigned Users */}
        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 8 }]}>{t('assigned_users')}</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={openUserPicker} style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', minHeight: 40, paddingRight: 15 }}>
            {selectedUsers.length === 0 && <Text style={{ color: theme.secondaryText }}>Select Users</Text>}
            {selectedUsers.map((id) => {
              const user = allConnections.find((u) => u.userId === id) || users.find((u) => u.userId === id);
              return (
                <Image key={id} source={{ uri: user?.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: -10, borderWidth: 2, borderColor: theme.primary, backgroundColor: '#fff' }} />
              );
            })}
            <Feather name="chevron-right" size={20} color={theme.secondaryText} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>

        {/* Attachments */}
        <FieldBox
          label={t("addAttachments")}
          value=""
          placeholder={t("addAttachments")}
          theme={theme}
          editable={false}
          rightComponent={
            <>
              {attachments.length > 0 && (
                <TouchableOpacity onPress={() => setShowPreviewModal(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 }}>
                  <Feather name="eye" size={16} color={theme.primary} />
                  <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '500', marginLeft: 4 }}>{t("previewAttachments")} ({attachments.length})</Text>
                </TouchableOpacity>
              )}
              <Feather name="paperclip" size={20} color="#888" style={{ marginLeft: 8 }} onPress={() => setShowAttachmentSheet(true)} />
              <MaterialCommunityIcons name={isRecording ? 'microphone' : 'microphone-outline'} size={20} color={isRecording ? '#E53935' : '#888'} style={{ marginLeft: 8 }} onPress={isRecording ? stopRecording : startRecording} />
              {isRecording && <Text style={{ color: '#E53935', marginLeft: 8 }}>{seconds}s</Text>}
            </>
          }
        />
        {/* Attachment List */}
        {attachments.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
            {Array.from({ length: Math.ceil(attachments.length / 2) }).map((_, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                {[0, 1].map((colIdx) => {
                  const idx = rowIdx * 2 + colIdx;
                  const att = attachments[idx];
                  if (!att) return <View key={colIdx} style={{ flex: 1 }} />;
                  return (
                    <TouchableOpacity key={att.uri || idx} onPress={() => setShowPreviewModal(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', padding: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 10, backgroundColor: theme.card, marginRight: colIdx === 0 ? 12 : 0 }}>
                      <MaterialCommunityIcons name={getFileIcon(att)} size={24} color={theme.primary} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>{(att.name || att.uri?.split('/').pop() || 'File').slice(0, 15)}...</Text>
                        <Text style={{ color: theme.secondaryText, fontSize: 11 }}>{getFormattedSize(att.size || 0, att.isExisting)}</Text>
                      </View>
                      <TouchableOpacity onPress={(e) => { e.stopPropagation(); Alert.alert('Remove', 'Delete?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => handleRemoveAttachment(att, idx) }]); }} style={{ marginLeft: 8, padding: 4 }}>
                        <MaterialCommunityIcons name="close-circle" size={18} color="#E53935" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* ADDITIONAL OPTIONS TOGGLE */}

        <TouchableOpacity style={styles.additionalOptionsBtn} onPress={toggleAdditionalOptions} activeOpacity={0.7}>
          <Text style={[styles.additionalOptionsText, { color: theme.primary }]}>
            {showAdditionalOptions ? "- Hide Additional Options" : "+ Show Additional Options"}
          </Text>
        </TouchableOpacity>

        {/* EXPANDABLE SECTION */}

        {showAdditionalOptions && (
          <View style={styles.additionalSection}>

            {/* 1. Dependencies */}
            <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 4 }]}>{t('dependent_tasks')}</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowDepPicker(true)} style={styles.pickerTrigger}>
                <Text style={{ color: selectedDeps.length ? theme.text : theme.secondaryText, fontSize: 15 }}>
                  {selectedDeps.length ? selectedDeps.map(t => t.name || `Task ${t[taskValueKey]}`).join(', ') : t('select_dependencies')}
                </Text>
                <Feather name="chevron-down" size={20} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            {/* 2. Task Mode */}
            <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 4 }]}>Task Mode</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setShowModePicker(true)} style={styles.pickerTrigger}>
                <Text style={{ color: values.taskMode ? theme.text : theme.secondaryText, fontSize: 15 }}>
                  {TASK_MODES.find(m => m.id === values.taskMode)?.name || values.taskMode}
                </Text>
                <Feather name="chevron-down" size={20} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>

            {/* 3. Category (If Workflow) */}
            {values.taskMode === 'WORKFLOW' && (
              <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 4 }]}>Category <Text style={{ color: 'red' }}>*</Text></Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setShowCategoryPicker(true)} style={styles.pickerTrigger}>
                  <Text style={{ color: values.category ? theme.text : theme.secondaryText, fontSize: 15 }}>
                    {selectedCategoryName || "Select Category"}
                  </Text>
                  <Feather name="chevron-down" size={20} color={theme.secondaryText} />
                </TouchableOpacity>
              </View>
            )}

            {/* 4. Stage (If Workflow + Category) */}
            {values.taskMode === 'WORKFLOW' && values.category && (
              <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 4 }]}>Current Stage</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setShowStagePicker(true)} style={styles.pickerTrigger}>
                  <Text style={{ color: values.currentStage ? theme.text : theme.secondaryText, fontSize: 15 }}>
                    {selectedStageName || "Select Stage"}
                  </Text>
                  <Feather name="chevron-down" size={20} color={theme.secondaryText} />
                </TouchableOpacity>
              </View>
            )}

            {/* 5. Flags (Issue, Critical, Approval) */}
            <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.toggleIconBox, { backgroundColor: '#FFF4E5' }]}>
                <Feather name="alert-triangle" size={20} color="#FF6B35" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Mark as Issue</Text>
              </View>
              <Switch value={values.isIssue} onValueChange={v => handleChange('isIssue', v)} trackColor={{ false: '#ddd', true: '#FF6B35' }} thumbColor="#fff" />
            </View>

            <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
              <View style={[styles.toggleIconBox, { backgroundColor: 'rgba(229, 57, 53, 0.1)' }]}>
                <Feather name="zap" size={20} color="#E53935" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Mark as Critical</Text>
              </View>
              <Switch value={values.isCritical} onValueChange={v => handleChange('isCritical', v)} trackColor={{ false: '#ddd', true: '#E53935' }} thumbColor="#fff" />
            </View>

            <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
              <View style={[styles.toggleIconBox, { backgroundColor: 'rgba(54, 108, 217, 0.1)' }]}>
                <Feather name="check-circle" size={20} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: theme.text }]}>Approval Required</Text>
              </View>
              <Switch value={values.isApprovalNeeded} onValueChange={v => handleChange('isApprovalNeeded', v)} trackColor={{ false: '#ddd', true: theme.primary }} thumbColor="#fff" />
            </View>

            {/* 6. Approver Picker (If Approval Needed) */}
            {values.isApprovalNeeded && (
              <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
                <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 4 }]}>Select Approver <Text style={{ color: 'red' }}>*</Text></Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => setShowApproverPicker(true)} style={styles.pickerTrigger}>
                  <Text style={{ color: selectedApprover ? theme.text : theme.secondaryText, fontSize: 15 }}>
                    {selectedApprover ? selectedApprover.name : "Select Approver"}
                  </Text>
                  <Feather name="chevron-down" size={20} color={theme.secondaryText} />
                </TouchableOpacity>
              </View>
            )}

          </View>
        )}
        {/* User Picker */}
        <Modal
          visible={showUserPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowUserPicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1, justifyContent: 'flex-end' }}>
              <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: 350, maxHeight: '70%' }}>
                <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>Select Users</Text>
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
                    borderWidth: 1
                  }} />
                <ScrollView keyboardShouldPersistTaps="handled">
                  {(searchText.trim() ? filteredConnections : allConnections).slice(0, 10).map((item) => (
                    <TouchableOpacity
                      key={item.userId}
                      onPress={() => handleUserSelect(item.userId)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        borderBottomWidth: 0.5,
                        borderColor: theme.border,
                        backgroundColor: selectedUsers.includes(item.userId) ? `${theme.primary}20` : 'transparent',
                        borderRadius: selectedUsers.includes(item.userId) ? 8 : 0,
                        paddingHorizontal: selectedUsers.includes(item.userId) ? 8 : 0
                      }}>
                      <Image source={{ uri: item.profilePhoto || 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
                      <Text style={{ color: theme.text, fontWeight: '500', flex: 1 }}>{item.name}</Text>
                      {selectedUsers.includes(item.userId) && <Feather name="check-circle" size={20} color={theme.primary} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={{ marginTop: 18, alignSelf: 'center', backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 }} onPress={() => setShowUserPicker(false)}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t('done')}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
        {/* Custom Pickers */}
        <CustomPickerDrawer
          visible={showDepPicker}
          onClose={() => setShowDepPicker(false)}
          data={projectTasks.filter(t => String(t[taskValueKey]) !== String(taskId))}
          valueKey={taskValueKey} labelKey="name"
          selectedValue={selectedDepIds}
          onSelect={handleDepToggle}
          multiSelect={true}
          theme={theme}
          placeholder={t("search_task")}
        />

        <CustomPickerDrawer visible={showModePicker} onClose={() => setShowModePicker(false)} data={TASK_MODES} valueKey="id" labelKey="name" selectedValue={[values.taskMode]} onSelect={(id) => { handleChange('taskMode', id); if (id === 'LEGACY') { handleChange('category', null); handleChange('currentStage', null); } setShowModePicker(false); }} multiSelect={false} theme={theme} placeholder="Select Task Mode" />

        <CustomPickerDrawer visible={showCategoryPicker} onClose={() => setShowCategoryPicker(false)} data={CATEGORY_OPTIONS} valueKey="id" labelKey="name" selectedValue={[values.category]} onSelect={(id) => { handleChange('category', id); handleChange('currentStage', null); setShowCategoryPicker(false); }} multiSelect={false} theme={theme} placeholder="Select Category" />

        <CustomPickerDrawer visible={showStagePicker} onClose={() => setShowStagePicker(false)} data={availableStages} valueKey="id" labelKey="name" selectedValue={[values.currentStage]} onSelect={(id) => { handleChange('currentStage', id); setShowStagePicker(false); }} multiSelect={false} theme={theme} placeholder="Select Stage" />

        <CustomPickerDrawer visible={showApproverPicker} onClose={() => setShowApproverPicker(false)} data={users} valueKey="userId" labelKey="name" imageKey="profilePhoto" selectedValue={[values.approvalRequiredBy]} onSelect={(id) => { handleChange('approvalRequiredBy', id); setShowApproverPicker(false); }} multiSelect={false} theme={theme} placeholder="Select Approver" showImage={true} />

        <AttachmentSheet visible={showAttachmentSheet} onClose={() => setShowAttachmentSheet(false)} onPick={async (type) => { await pickAttachment(type); setShowAttachmentSheet(false); }} />
        <FilePreviewModal visible={showPreviewModal} onClose={() => setShowPreviewModal(false)} attachments={attachments} onRemoveFile={(index) => handleRemoveAttachment(attachments[index], index)} theme={theme} getFileType={getFileType} getFileIcon={getFileIcon} getFormattedSize={getFormattedSize} />

      </ScrollView>
      <View style={styles.fixedButtonContainer}>
        <GradientButton title={t("save_changes")} onPress={handleUpdate} theme={theme} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backBtn: { paddingTop: Platform.OS === 'ios' ? 70 : 25, marginLeft: 16, marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 18, fontWeight: '400' },
  headerCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginTop: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  taskName: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 6 },
  dueDate: { color: '#fff', fontSize: 13, opacity: 0.85, fontWeight: '400' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 22, marginBottom: 12, gap: 8 },
  fieldBox: { flexDirection: 'column', borderRadius: 10, borderWidth: 1, marginHorizontal: 20, marginBottom: 12, paddingHorizontal: 14, minHeight: 54, paddingVertical: 8 },
  inputLabel: { fontWeight: '400', fontSize: 14, marginBottom: 2 },
  inputValue: { fontSize: 15, fontWeight: '400', paddingVertical: 4, paddingHorizontal: 0 },
  fixedButtonContainer: { position: 'absolute', bottom: 20, left: 16, right: 16, zIndex: 10, elevation: 5 },

  // Toggle Styles matching TaskForm logic but adapted for UpdateScreen
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 0, // Tight spacing in additional section
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
  },

  // New Styles for Expandable Section
  additionalOptionsBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 5,
    marginBottom: 5,
  },
  additionalOptionsText: {
    fontSize: 15,
    fontWeight: '600',
  },
  additionalSection: {
    marginTop: 10,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  }
});