import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import DateBox from 'components/task details/DateBox';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, LayoutAnimation, Platform, UIManager } from 'react-native';
import { getProjectById } from '../../utils/project';
import { createTask } from '../../utils/task';
import AttachmentSheet from '../popups/AttachmentSheet';
import CustomPickerDrawer from '../popups/CustomPickerDrawer';
import FilePreviewModal from '../popups/FilePreviewModal';
import useAttachmentPicker from '../popups/useAttachmentPicker';
import useAudioRecorder from '../popups/useAudioRecorder';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- DATA CONSTANTS ---

const TASK_MODES = [
  { id: 'LEGACY', name: 'Legacy Task' },
  { id: 'WORKFLOW', name: 'Workflow Task' },
];

const WORKFLOW_DATA = {
  PROCUREMENT: {
    name: "Procurement",
    stages: [
      { id: "REQUIREMENT_LIST", name: "Requirement List Pending" },
      { id: "QUOTATION_PENDING", name: "Quotation Pending" },
      { id: "ORDER_PENDING", name: "Order Pending" },
      { id: "PAYMENT_PENDING", name: "Payment Pending" },
      { id: "DISPATCH_PENDING", name: "Dispatch Pending" },
      { id: "DELIVERY_PENDING", name: "Delivery Pending" },
    ],
  },
  INTERIOR_DESIGN: {
    name: "Interior Design",
    stages: [
      { id: "DRAFT_PLANS", name: "Draft Plans Pending" },
      { id: "THEME_PLANS", name: "Theme Plans Pending" },
      { id: "CIVIL_MAISON_PLANS", name: "Civil (Maison) Plans Pending" },
      { id: "PLUMBING_PLANS", name: "Plumbing Plans Pending" },
      { id: "ELECTRICAL_PLANS", name: "Electrical Plans Pending" },
      { id: "FURNITURE_PLANS", name: "Furniture Plans Pending" },
      { id: "FURNISHING_PLANS", name: "Furnishing Plans Pending" },
      { id: "FACADE_PLANS", name: "Facade Plans Pending" },
      { id: "OTHER_PLANS", name: "Other Plans Pending" },
    ],
  },
};

const CATEGORY_OPTIONS = Object.keys(WORKFLOW_DATA).map(key => ({
  id: key,
  name: WORKFLOW_DATA[key].name
}));

export default function TaskForm({
  values,
  onChange,
  onSubmit,
  theme,
  projectId,
  worklistId,
  worklistName,
  users = [],
  projectTasks = [],
}) {
  const [projectName, setProjectName] = useState('');
  // UI State
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
  // Pickers State
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showDepPicker, setShowDepPicker] = useState(false);
  const [showApproverPicker, setShowApproverPicker] = useState(false);
  // New Workflow UI States
  const [taskMode, setTaskMode] = useState('LEGACY'); // 'LEGACY' or 'WORKFLOW'
  const [showModePicker, setShowModePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const { t } = useTranslation();
  const { attachments, pickAttachment, setAttachments, getFileType, getFileIcon, getFormattedSize } = useAttachmentPicker();
  const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
    onRecordingFinished: (audioFile) => {
      const newAttachments = [...attachments, audioFile];
      setAttachments(newAttachments);
      onChange('attachments', newAttachments);
      Alert.alert('Audio recorded and attached!');
    }
  });
  // Sync attachments
  useEffect(() => {
    onChange('attachments', attachments);
  }, [attachments]);

  useEffect(() => {
    if (values.attachments && Array.isArray(values.attachments) && values.attachments.length > 0) {
      setAttachments(values.attachments);
    }
  }, [values.attachments]);

  // Sync Project/Worklist
  useEffect(() => {
    if (projectId) {
      onChange('taskProject', projectId);
      const fetchProject = async () => {
        try {
          const res = await getProjectById(projectId);
          const name = res.name || res.projectName || 'Project';
          setProjectName(name);
        } catch (err) {
          setProjectName('Project Not Found');
        }
      };
      fetchProject();
    }
    if (worklistId) {
      onChange('taskWorklist', worklistId);
    }
  }, [projectId, worklistId]);

  // Derived Values for UI
  const taskValueKey = projectTasks.length && projectTasks[0]?.id !== undefined ? 'id' : 'taskId';
  const selectedDepIds = Array.isArray(values.taskDeps) ? values.taskDeps.map(String) : [];
  const selectedDeps = selectedDepIds
    .map(id => projectTasks.find(t => String(t[taskValueKey]) === id))
    .filter(Boolean);

  const selectedApprover = users.find(u => u.userId === values.approvalRequiredBy);
  // Get Category Name for display
  const selectedCategoryName = values.category 
    ? WORKFLOW_DATA[values.category]?.name 
    : null;
  // Get Stage Name for display
  const availableStages = values.category ? WORKFLOW_DATA[values.category]?.stages : [];
  const selectedStageName = values.currentStage 
    ? availableStages.find(s => s.id === values.currentStage)?.name 
    : null;
  const toggleAdditionalOptions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdditionalOptions(!showAdditionalOptions);
  };
  const isValidDate = (date) => {
    return date && !isNaN(new Date(date).getTime());
  };
  const handleTaskCreate = async () => {
    try {
      const startDate = isValidDate(values.startDate)
        ? new Date(values.startDate).toISOString().slice(0, 19).replace('T', ' ')
        : (values.startDate === undefined || values.startDate === null || values.startDate === '')
          ? new Date().toISOString().slice(0, 19).replace('T', ' ')
          : null;
      const endDate = isValidDate(values.endDate)
        ? new Date(values.endDate).toISOString().slice(0, 19).replace('T', ' ')
        : (values.endDate === undefined || values.endDate === null || values.endDate === '')
          ? new Date().toISOString().slice(0, 19).replace('T', ' ')
          : null;
      const assignedUserIds = Array.isArray(values.assignTo)
        ? values.assignTo.map(id => Number(id)).filter(Boolean)
        : [];
      const dependentTaskIds = Array.isArray(values.taskDeps)
        ? values.taskDeps.map((id) => String(id))
        : [];
      const parentId = values.parentId ? Number(values.parentId) : undefined;
      const images = attachments.map(att => ({
        uri: att.uri,
        name: att.name || att.uri?.split('/').pop(),
        type: att.mimeType || att.type || 'application/octet-stream',
      }));
      let tagsArray = [];
      if (values.tags && typeof values.tags === 'string') {
        tagsArray = values.tags.split(',').map(t => t.trim()).filter(Boolean);
      }
      // Prepare payload based on Mode
      const isWorkflow = taskMode === 'WORKFLOW';
      const taskData = {
        name: values.taskName,
        description: values.taskDesc,
        assignedUserIds,
        dependentTaskIds,
        startDate,
        endDate,
        worklistId: values.taskWorklist,
        projectId: values.taskProject,
        status: isWorkflow ? undefined : 'Pending', // Let backend handle status if workflow
        progress: 0,
        images,
        // Workflow Logic
        category: isWorkflow ? values.category : null,
        currentStage: isWorkflow ? values.currentStage : null, // Pass initial stage if selected
        tags: tagsArray,
        isIssue: values.isIssue || false,
        isCritical: values.isCritical || false,
        isApprovalNeeded: values.isApprovalNeeded || false,
        approvalRequiredBy: values.isApprovalNeeded ? values.approvalRequiredBy : null,
        ...(parentId && { parentId }),
      };
      // Validation
      if (!values.taskName) {
        Alert.alert('Validation Error', 'Task Name is required');
        return;
      }
      if (isWorkflow && !values.category) {
        Alert.alert('Validation Error', 'Please select a Category for Workflow Task');
        return;
      }
      if (taskData.isApprovalNeeded && !taskData.approvalRequiredBy) {
        Alert.alert('Validation Error', 'Please select an approver since approval is required.');
        return;
      }
      await createTask(taskData);
      Alert.alert('Success', 'Task created successfully!');
      onSubmit();
    } catch (error) {
      console.error('Create task failed:', error.message);
      Alert.alert('Error', error.message || 'Failed to create task');
    }
  };
  // Generic Toggle Handlers
  const handleUserToggle = (userId) => {
    const current = values.assignTo || [];
    const updated = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
    onChange('assignTo', updated);
  };
  const handleDepToggle = (taskId) => {
    const current = Array.isArray(values.taskDeps) ? [...values.taskDeps] : [];
    const id = String(taskId);
    const updated = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    onChange('taskDeps', updated);
  };
  return (
    <>
      {/* =================================================================================== */}
      {/* 🟢 CORE FIELDS (Always Visible) */}
      {/* =================================================================================== */}
      {/* --- Task Name --- */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={t("task_name")}
          placeholderTextColor="#bbb"
          value={values.taskName}
          onChangeText={(t) => onChange('taskName', t)}
        />
      </View>
      {/* --- Project Name (Read Only) --- */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={projectName || 'Fetching Project...'}
          editable={false}
        />
      </View>
      {/* --- Worklist Name (Read Only) --- */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={worklistName || 'Fetching Worklist...'}
          editable={false}
        />
      </View>
      {/* --- Description --- */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 14 }]}>
        <TextInput
          style={[styles.input, { color: theme.text, height: 70 }]}
          placeholder={t("description")}
          placeholderTextColor="#bbb"
          value={values.taskDesc}
          onChangeText={(t) => onChange('taskDesc', t)}
          multiline
        />
      </View>
      {/* --- Dates --- */}
      <View style={styles.dateRow}>
        <DateBox
          theme={theme}
          label={t("start_date")}
          value={values.startDate}
          onChange={(date) => onChange('startDate', date)}
        />
        <DateBox
          theme={theme}
          label={t("end_date")}
          value={values.endDate}
          onChange={(date) => onChange('endDate', date)}
        />
      </View>
      {/* --- Assigned Users --- */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}
          onPress={() => setShowUserPicker(true)}
          activeOpacity={0.8}
        >
          <Text style={{
            color: values.assignTo?.length ? theme.text : theme.secondaryText,
            fontSize: 16,
            fontWeight: '400',
          }}>
            {values.assignTo?.length
              ? values.assignTo.map(uid =>
                users.find(u => u.userId === uid)?.name || 'Unknown'
              ).join(', ')
              : t("assign_to")}
          </Text>
        </TouchableOpacity>
      </View>
      <CustomPickerDrawer
        visible={showUserPicker}
        onClose={() => setShowUserPicker(false)}
        data={users}
        valueKey="userId"
        labelKey="name"
        imageKey="profilePhoto"
        selectedValue={values.assignTo}
        onSelect={handleUserToggle}
        multiSelect={true}
        theme={theme}
        placeholder="Search user..."
        showImage={true}
      />
      {/* --- Attachments --- */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={t("addAttachments")}
          placeholderTextColor={theme.secondaryText}
          editable={false}
        />
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
            <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '500', marginLeft: 4 }}>
              {t("previewAttachments")} ({attachments.length})
            </Text>
          </TouchableOpacity>
        )}
        <Feather name="paperclip" size={20} color="#888" style={styles.inputIcon} onPress={() => setShowAttachmentSheet(true)} />
        <MaterialCommunityIcons name={isRecording ? "microphone" : "microphone-outline"} size={20} color={isRecording ? "#E53935" : "#888"} style={styles.inputIcon} onPress={isRecording ? stopRecording : startRecording} />
        {isRecording && <Text style={{ color: "#E53935", marginLeft: 8 }}>{seconds}s</Text>}
      </View>
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
                  <View key={att.uri || idx} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', padding: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 10, backgroundColor: theme.card, marginRight: colIdx === 0 ? 12 : 0 }}>
                    <MaterialCommunityIcons name={att.type?.startsWith('image') ? 'image-outline' : 'file-document-outline'} size={24} color="#888" style={{ marginRight: 8 }} />
                    <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>{(att.name || 'File').slice(0, 15)}</Text>
                    <TouchableOpacity onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))} style={{ marginLeft: 8 }}>
                      <MaterialCommunityIcons name="close-circle" size={22} color="#E53935" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
      <AttachmentSheet visible={showAttachmentSheet} onClose={() => setShowAttachmentSheet(false)} onPick={async (type) => { await pickAttachment(type); setShowAttachmentSheet(false); }} />
      {/* =================================================================================== */}
      {/* 🔘 ADDITIONAL OPTIONS TOGGLE */}
      {/* =================================================================================== */}
      <TouchableOpacity 
        style={styles.additionalOptionsBtn} 
        onPress={toggleAdditionalOptions}
        activeOpacity={0.7}
      >
        <Text style={[styles.additionalOptionsText, { color: theme.primary }]}>
          {showAdditionalOptions ? "- Hide Additional Options" : "+ Show Additional Options"}
        </Text>
      </TouchableOpacity>
      {/* =================================================================================== */}
      {/* 🟡 EXPANDABLE SECTION (Dependencies, Mode, Flags, Approval) */}
      {/* =================================================================================== */}
      {showAdditionalOptions && (
        <View style={styles.additionalSection}>
          
          {/* 1. Dependencies - Show ONLY in Legacy Mode AND Not an Issue */}
          {taskMode === 'LEGACY' && !values.isIssue && (
            <>
              <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}
                  onPress={() => setShowDepPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={{
                    color: selectedDeps.length ? theme.text : theme.secondaryText,
                    fontWeight: '400',
                    fontSize: 16,
                  }}>
                    {selectedDeps.length
                      ? selectedDeps.map(t => t.name || t.taskName || `Task ${t[taskValueKey]}`).join(', ')
                      : t("select_dependencies")}
                  </Text>
                </TouchableOpacity>
                <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
              </View>
              <CustomPickerDrawer
                visible={showDepPicker}
                onClose={() => setShowDepPicker(false)}
                data={projectTasks}
                valueKey={taskValueKey}
                labelKey="name"
                selectedValue={selectedDepIds}
                onSelect={handleDepToggle}
                multiSelect={true}
                theme={theme}
                placeholder={t("search_task")}
              />
            </>
          )}

          {/* 2. Task Mode Selector - Show ONLY if Not an Issue */}
          {!values.isIssue && (
            <>
              <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
                <TouchableOpacity
                  style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}
                  onPress={() => setShowModePicker(true)}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 2 }}>Task Mode</Text>
                    <Text style={{ color: theme.text, fontWeight: '500', fontSize: 16 }}>
                      {TASK_MODES.find(m => m.id === taskMode)?.name}
                    </Text>
                  </View>
                </TouchableOpacity>
                <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
              </View>
              <CustomPickerDrawer
                visible={showModePicker}
                onClose={() => setShowModePicker(false)}
                data={TASK_MODES}
                valueKey="id"
                labelKey="name"
                selectedValue={taskMode}
                onSelect={(modeId) => {
                  setTaskMode(modeId);
                  if (modeId === 'LEGACY') {
                    onChange('category', null);
                    onChange('currentStage', null);
                  } else {
                    // Switching to WORKFLOW: Clear Issue/Critical/Deps
                    onChange('isIssue', false);
                    onChange('isCritical', false);
                    onChange('taskDeps', []);
                  }
                  setShowModePicker(false);
                }}
                multiSelect={false}
                theme={theme}
                placeholder="Select Task Mode"
              />
            </>
          )}

          {/* 3. Category Selector (Only if Workflow) */}
          {taskMode === 'WORKFLOW' && (
            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}
                onPress={() => setShowCategoryPicker(true)}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 2 }}>Category <Text style={{color: 'red'}}>*</Text></Text>
                  <Text style={{ color: values.category ? theme.text : theme.secondaryText, fontWeight: '400', fontSize: 16 }}>
                    {selectedCategoryName || "Select Category"}
                  </Text>
                </View>
              </TouchableOpacity>
              <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
            </View>
          )}
          <CustomPickerDrawer
            visible={showCategoryPicker}
            onClose={() => setShowCategoryPicker(false)}
            data={CATEGORY_OPTIONS}
            valueKey="id"
            labelKey="name"
            selectedValue={values.category}
            onSelect={(id) => {
              onChange('category', id);
              onChange('currentStage', null); // Reset stage when category changes
              setShowCategoryPicker(false);
            }}
            multiSelect={false}
            theme={theme}
            placeholder="Select Category"
          />
          {/* 4. Initial Stage Selector (Only if Category Selected) */}
          {taskMode === 'WORKFLOW' && values.category && (
            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}
                onPress={() => setShowStagePicker(true)}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 2 }}>Initial Stage (Optional)</Text>
                  <Text style={{ color: values.currentStage ? theme.text : theme.secondaryText, fontWeight: '400', fontSize: 16 }}>
                    {selectedStageName || "Select initial stage"}
                  </Text>
                </View>
              </TouchableOpacity>
              <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
            </View>
          )}
          <CustomPickerDrawer
            visible={showStagePicker}
            onClose={() => setShowStagePicker(false)}
            data={availableStages}
            valueKey="id"
            labelKey="name"
            selectedValue={values.currentStage}
            onSelect={(id) => {
              onChange('currentStage', id);
              setShowStagePicker(false);
            }}
            multiSelect={false}
            theme={theme}
            placeholder="Select Initial Stage"
          />
          
          {/* 5. Flags (Issue, Critical) - Show ONLY in Legacy Mode */}
          {taskMode === 'LEGACY' && (
            <>
              <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.toggleIconBox}><Feather name="alert-triangle" size={24} color="#FF6B35" /></View>
                <View style={{ flex: 1 }}><Text style={[styles.toggleLabel, { color: theme.text }]}>{t('markAsIssue')}</Text></View>
                <Switch value={values.isIssue || false} onValueChange={v => {
                  onChange('isIssue', v); 
                  if (v) onChange('isCritical', false); 
                }} trackColor={{ false: '#ddd', true: '#FF6B35' }} thumbColor="#fff" />
              </View>
              {/* Show Critical ONLY if Marked as Issue */}
              {values.isIssue && (
                <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
                  <View style={[styles.toggleIconBox, { backgroundColor: 'rgba(229, 57, 53, 0.1)' }]}><Feather name="zap" size={24} color="#E53935" /></View>
                  <View style={{ flex: 1 }}><Text style={[styles.toggleLabel, { color: theme.text }]}>{t('markAsCritical') || "Mark as Critical"}</Text></View>
                  <Switch value={values.isCritical || false} onValueChange={v => onChange('isCritical', v)} trackColor={{ false: '#ddd', true: '#E53935' }} thumbColor="#fff" />
                </View>
              )}
            </>
          )}

          {/* 6. Approval Flag - Always Visible */}
          <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
            <View style={[styles.toggleIconBox, { backgroundColor: 'rgba(54, 108, 217, 0.1)' }]}><Feather name="check-circle" size={24} color={theme.primary} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.toggleLabel, { color: theme.text }]}>{t('approvalRequired') || "Approval Required"}</Text></View>
            <Switch value={values.isApprovalNeeded || false} onValueChange={v => onChange('isApprovalNeeded', v)} trackColor={{ false: '#ddd', true: theme.primary }} thumbColor="#fff" />
          </View>
          {values.isApprovalNeeded && (
            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
              <TouchableOpacity style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }} onPress={() => setShowApproverPicker(true)} activeOpacity={0.8}>
                <Text style={{ color: selectedApprover ? theme.text : theme.secondaryText, fontWeight: '400', fontSize: 16 }}>
                  {selectedApprover ? `Approver: ${selectedApprover.name}` : "Select Approver"}
                </Text>
              </TouchableOpacity>
              <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
            </View>
          )}
          <CustomPickerDrawer visible={showApproverPicker} onClose={() => setShowApproverPicker(false)} data={users} valueKey="userId" labelKey="name" imageKey="profilePhoto" selectedValue={values.approvalRequiredBy} onSelect={(id) => { onChange('approvalRequiredBy', id); setShowApproverPicker(false); }} multiSelect={false} theme={theme} placeholder="Select Approver" showImage={true} />
        </View>
      )}
      {/* --- Submit Button --- */}
      <TouchableOpacity style={styles.drawerBtn} onPress={handleTaskCreate}>
        <LinearGradient colors={['#011F53', '#366CD9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.drawerBtnGradient}>
          <Text style={styles.drawerBtnText}>{t("add_task")}</Text>
        </LinearGradient>
      </TouchableOpacity>
      <FilePreviewModal visible={showPreviewModal} onClose={() => setShowPreviewModal(false)} attachments={attachments} onRemoveFile={(index) => { const newAttachments = attachments.filter((_, i) => i !== index); setAttachments(newAttachments); onChange('attachments', newAttachments); }} theme={theme} getFileType={getFileType} getFileIcon={getFileIcon} getFormattedSize={getFormattedSize} />
    </>
  );
}

const styles = StyleSheet.create({
  inputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginHorizontal: 22,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    fontWeight: '400',
    backgroundColor: 'transparent',
    paddingVertical: 12,
  },
  inputIcon: {
    marginLeft: 8,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 22,
    marginBottom: 14,
    gap: 10,
  },
  drawerBtn: {
    marginHorizontal: 22,
    marginTop: 20,
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
  },
  drawerBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  drawerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginHorizontal: 22,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
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
  }
});