import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import DateBox from 'components/task details/DateBox';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Alert, 
  Image, 
  StyleSheet, 
  Switch, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
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

export default function AddSubTask({
  values,
  onChange,
  onSubmit,
  theme,
  projectId,
  worklistId,
  worklistName,
  users = [],
  projectTasks = [],
  worklists = [],
  parentTaskId,
}) {
  const [projectName, setProjectName] = useState('');
  
  // UI State
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pickers State
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showDepPicker, setShowDepPicker] = useState(false);
  const [showWorklistPicker, setShowWorklistPicker] = useState(false);
  const [showApproverPicker, setShowApproverPicker] = useState(false);

  // New Workflow UI States
  const [taskMode, setTaskMode] = useState('LEGACY');
  const [showModePicker, setShowModePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);

  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const { t } = useTranslation();
  const { attachments, pickAttachment, setAttachments, getFileType, getFileIcon, getFormattedSize } = useAttachmentPicker();
  const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
    onRecordingFinished: (audioFile) => {
      setAttachments((prev) => [...prev, audioFile]);
      Alert.alert('Audio recorded and attached!');
    },
  });

  const taskValueKey = projectTasks.length && projectTasks[0]?.id !== undefined ? 'id' : 'taskId';

  // Dependencies Logic
  const selectedDepIds = Array.isArray(values.taskDeps) ? values.taskDeps.map(String) : [];
  const availableTasksForDependencies = projectTasks.filter((task) => {
    const taskId = String(task[taskValueKey]);
    const parentId = String(parentTaskId || values.parentTaskId || values.parentId || '');
    return taskId !== parentId;
  });
  const selectedDeps = selectedDepIds
    .map((id) => availableTasksForDependencies.find((t) => String(t[taskValueKey]) === id))
    .filter(Boolean);

  const selectedApprover = users.find(u => u.userId === values.approvalRequiredBy);

  // Get Category/Stage Names
  const selectedCategoryName = values.category ? WORKFLOW_DATA[values.category]?.name : null;
  const availableStages = values.category ? WORKFLOW_DATA[values.category]?.stages : [];
  const selectedStageName = values.currentStage ? availableStages.find(s => s.id === values.currentStage)?.name : null;

  useEffect(() => {
    if (projectId) onChange('taskProject', projectId);
    if (worklistId) onChange('taskWorklist', worklistId);
    if (parentTaskId) onChange('parentId', parentTaskId);

    const fetchProject = async () => {
      try {
        const res = await getProjectById(projectId);
        const name = res.name || res.projectName || 'Project';
        setProjectName(name);
      } catch (err) {
        console.error('Failed to fetch project:', err.message);
        setProjectName('Project Not Found');
      }
    };

    fetchProject();
  }, [projectId, worklistId, parentTaskId]);

  const toggleAdditionalOptions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdditionalOptions(!showAdditionalOptions);
  };

  const isValidDate = (date) => {
    return date && !isNaN(new Date(date).getTime());
  };

  const handleTaskCreate = async () => {
    try {
      setLoading(true);
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
        ? values.assignTo.map((id) => Number(id)).filter(Boolean)
        : [];

      const dependentTaskIds = Array.isArray(values.taskDeps)
        ? values.taskDeps.map((id) => String(id))
        : [];

      const parentId =
        values.parentTaskId || values.parentId || parentTaskId
          ? values.parentTaskId || values.parentId || parentTaskId
          : undefined;

      const images = attachments.map((att) => ({
        uri: att.uri,
        name: att.name || att.uri?.split('/').pop(),
        type: att.mimeType || att.type || 'application/octet-stream',
      }));

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
        status: isWorkflow ? undefined : 'Pending',
        progress: 0,
        images,
        parentId,
        
        // New Fields
        category: isWorkflow ? values.category : null,
        currentStage: isWorkflow ? values.currentStage : null,
        isIssue: values.isIssue || false,
        isCritical: values.isCritical || false,
        isApprovalNeeded: values.isApprovalNeeded || false,
        approvalRequiredBy: values.isApprovalNeeded ? values.approvalRequiredBy : null,
      };

      // Validation
      if (!values.taskName) {
        Alert.alert('Validation Error', 'Task Name is required');
        setLoading(false);
        return;
      }
      if (isWorkflow && !values.category) {
        Alert.alert('Validation Error', 'Please select a Category for Workflow Task');
        setLoading(false);
        return;
      }
      if (taskData.isApprovalNeeded && !taskData.approvalRequiredBy) {
        Alert.alert('Validation Error', 'Please select an approver since approval is required.');
        setLoading(false);
        return;
      }

      await createTask(taskData);
      Alert.alert('Success', 'Task created successfully!');
      onSubmit();
    } catch (error) {
      console.error('Create task failed:', error.message);
      Alert.alert('Error', error.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (userId) => {
    const current = values.assignTo || [];
    const updated = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    onChange('assignTo', updated);
  };

  const handleDepToggle = (taskId) => {
    const current = Array.isArray(values.taskDeps) ? [...values.taskDeps] : [];
    const id = String(taskId);
    const parentId = String(parentTaskId || values.parentTaskId || values.parentId || '');

    if (id === parentId) {
      Alert.alert('Invalid Selection', 'A subtask cannot depend on its parent task.');
      return;
    }

    const updated = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    onChange('taskDeps', updated);
  };

  return (
    <>
      {/* =================================================================================== */}
      {/* 🟢 CORE FIELDS (Always Visible) */}
      {/* =================================================================================== */}

      {/* Parent Task - Read Only */}
      <View
        style={[
          styles.inputBox,
          { backgroundColor: theme.secCard, borderColor: theme.border, opacity: 0.7 },
        ]}>
        <Text style={[styles.input, { color: theme.secondaryText, fontStyle: 'italic' }]}>
          Parent Task:{' '}
          {(() => {
            const task = projectTasks.find(
              (t) => String(t.id || t.taskId) === String(values.parentId || parentTaskId)
            );
            return task?.name || task?.taskName || 'Parent Task';
          })()}
        </Text>
        <Feather name="lock" size={16} color={theme.secondaryText} style={{ marginLeft: 8 }} />
      </View>

      {/* Task Name */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={t("task_name")}
          placeholderTextColor="#bbb"
          value={values.taskName}
          onChangeText={(t) => onChange('taskName', t)}
        />
      </View>

      {/* Project Name */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={projectName || 'Fetching Project...'}
          editable={false}
        />
      </View>

      {/* Worklist Selector */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}
          onPress={() => setShowWorklistPicker(true)}
          activeOpacity={0.8}>
          <Text
            style={{
              color: values.taskWorklist ? theme.text : theme.secondaryText,
              fontWeight: '400',
              fontSize: 16,
            }}>
            {values.taskWorklist
              ? worklists.find((w) => String(w.id) === String(values.taskWorklist))?.name ||
              t("select_worklist")
              : t("select_worklist")}
          </Text>
        </TouchableOpacity>
        <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
      </View>
      <CustomPickerDrawer
        visible={showWorklistPicker}
        onClose={() => setShowWorklistPicker(false)}
        data={worklists}
        valueKey="id"
        labelKey="name"
        selectedValue={values.taskWorklist}
        onSelect={(v) => onChange('taskWorklist', String(v))}
        theme={theme}
        placeholder={t("search_worklist")}
        showImage={false}
      />

      {/* Date Pickers */}
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

      {/* Assigned Users Multi-select */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}
          onPress={() => setShowUserPicker(true)}
          activeOpacity={0.8}>
          <Text
            style={{
              color: values.assignTo?.length ? theme.text : theme.secondaryText,
              fontWeight: '400',
              fontSize: 16,
            }}>
            {values.assignTo?.length
              ? values.assignTo
                .map((uid) => users.find((u) => u.userId === uid)?.name || 'Unknown')
                .join(', ')
              : t('assign_to')}
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
        placeholder={t("search_user")}
        showImage={true}
      />

      {/* Attachment & Audio Recorder Input */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={t("addAttachments")}
          placeholderTextColor={theme.secondaryText}
          editable={false}
        />

        {/* Preview Button */}
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

        <Feather name="paperclip" size={20} color="#888" style={styles.inputIcon} onPress={() => setShowAttachmentSheet(true)} />
        <MaterialCommunityIcons name={isRecording ? 'microphone' : 'microphone-outline'} size={20} color={isRecording ? '#E53935' : '#888'} style={styles.inputIcon} onPress={isRecording ? stopRecording : startRecording} />
        {isRecording && <Text style={{ color: '#E53935', marginLeft: 8 }}>{seconds}s</Text>}
      </View>

      {/* Attachment Preview Grid */}
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

      {/* Description */}
      <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text, height: 70 }]}
          placeholder={t("description")}
          placeholderTextColor="#bbb"
          value={values.taskDesc}
          onChangeText={(t) => onChange('taskDesc', t)}
          multiline
        />
      </View>

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
      {/* 🟡 EXPANDABLE SECTION */}
      {/* =================================================================================== */}
      
      {showAdditionalOptions && (
        <View style={styles.additionalSection}>
          
          {/* Dependencies Multi-select */}
          <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}
              onPress={() => availableTasksForDependencies.length > 0 && setShowDepPicker(true)}
              activeOpacity={availableTasksForDependencies.length > 0 ? 0.8 : 1}
              disabled={availableTasksForDependencies.length === 0}>
              <Text style={{
                color: selectedDeps.length ? theme.text : theme.secondaryText,
                fontWeight: '400',
                fontSize: 16,
              }}>
                {selectedDeps.length
                  ? selectedDeps.map((t) => t.name || t.taskName || `Task ${t[taskValueKey]}`).join(', ')
                  : availableTasksForDependencies.length > 0
                    ? t('select_dependencies')
                    : t('no_tasks_available_for_dependencies')}
              </Text>
            </TouchableOpacity>
            <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
          </View>
          <CustomPickerDrawer
            visible={showDepPicker}
            onClose={() => setShowDepPicker(false)}
            data={availableTasksForDependencies}
            valueKey={taskValueKey}
            labelKey="name"
            selectedValue={selectedDepIds}
            onSelect={handleDepToggle}
            multiSelect={true}
            theme={theme}
            placeholder={t("search_task")}
            showImage={false}
          />

          {/* 1. Task Mode Selector */}
          <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
            <TouchableOpacity style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }} onPress={() => setShowModePicker(true)}>
              <View>
                <Text style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 2 }}>Task Mode</Text>
                <Text style={{ color: theme.text, fontWeight: '500', fontSize: 16 }}>{TASK_MODES.find(m => m.id === taskMode)?.name}</Text>
              </View>
            </TouchableOpacity>
            <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
          </View>
          <CustomPickerDrawer visible={showModePicker} onClose={() => setShowModePicker(false)} data={TASK_MODES} valueKey="id" labelKey="name" selectedValue={taskMode} onSelect={(modeId) => { setTaskMode(modeId); if (modeId === 'LEGACY') { onChange('category', null); onChange('currentStage', null); } setShowModePicker(false); }} multiSelect={false} theme={theme} placeholder="Select Task Mode" />

          {/* 2. Category Selector */}
          {taskMode === 'WORKFLOW' && (
            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }} onPress={() => setShowCategoryPicker(true)}>
                <View>
                  <Text style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 2 }}>Category <Text style={{color: 'red'}}>*</Text></Text>
                  <Text style={{ color: values.category ? theme.text : theme.secondaryText, fontWeight: '400', fontSize: 16 }}>{selectedCategoryName || "Select Category"}</Text>
                </View>
              </TouchableOpacity>
              <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
            </View>
          )}
          <CustomPickerDrawer visible={showCategoryPicker} onClose={() => setShowCategoryPicker(false)} data={CATEGORY_OPTIONS} valueKey="id" labelKey="name" selectedValue={values.category} onSelect={(id) => { onChange('category', id); onChange('currentStage', null); setShowCategoryPicker(false); }} multiSelect={false} theme={theme} placeholder="Select Category" />

          {/* 3. Stage Selector */}
          {taskMode === 'WORKFLOW' && values.category && (
            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }} onPress={() => setShowStagePicker(true)}>
                <View>
                  <Text style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 2 }}>Initial Stage (Optional)</Text>
                  <Text style={{ color: values.currentStage ? theme.text : theme.secondaryText, fontWeight: '400', fontSize: 16 }}>{selectedStageName || "Select initial stage"}</Text>
                </View>
              </TouchableOpacity>
              <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
            </View>
          )}
          <CustomPickerDrawer visible={showStagePicker} onClose={() => setShowStagePicker(false)} data={availableStages} valueKey="id" labelKey="name" selectedValue={values.currentStage} onSelect={(id) => { onChange('currentStage', id); setShowStagePicker(false); }} multiSelect={false} theme={theme} placeholder="Select Initial Stage" />

          {/* Flags: Issue */}
          <View style={[styles.toggleRow, { backgroundColor: values.isIssue ? theme.criticalBg : theme.normalBg, borderColor: values.isIssue ? theme.criticalBorder : theme.normalBorder }]}>
            <View style={[styles.toggleIconBox, { backgroundColor: values.isIssue ? theme.criticalIconBg : theme.normalIconBg }]}>
              <MaterialIcons name="priority-high" size={16} color={values.isIssue ? theme.criticalText : theme.normalText} />
            </View>
            <View style={{ flex: 1 }}><Text style={[styles.toggleLabel, { color: values.isIssue ? theme.criticalText : theme.normalText }]}>Issue</Text></View>
            <Switch value={values.isIssue || false} onValueChange={v => { onChange('isIssue', v); if (!v && values.isCritical) onChange('isCritical', false); }} trackColor={{ false: '#ddd', true: values.isIssue ? theme.criticalText : theme.primary }} thumbColor="#fff" />
          </View>

          {/* Flags: Critical */}
          {values.isIssue && (
            <View style={[styles.toggleRow, { backgroundColor: values.isCritical ? theme.criticalBg : theme.normalIssueBg, borderColor: values.isCritical ? theme.criticalBorder : theme.normalIssueBorder, marginTop: 6 }]}>
              <View style={[styles.toggleIconBox, { backgroundColor: values.isCritical ? theme.criticalIconBg : theme.normalIssueIconBg }]}>
                <MaterialIcons name="warning" size={16} color={values.isCritical ? theme.criticalText : theme.normalIssueText} />
              </View>
              <View style={{ flex: 1 }}><Text style={[styles.toggleLabel, { color: values.isCritical ? theme.criticalText : theme.normalIssueText }]}>Critical</Text></View>
              <Switch value={values.isCritical || false} onValueChange={v => onChange('isCritical', v)} trackColor={{ false: '#ddd', true: theme.criticalText }} thumbColor="#fff" />
            </View>
          )}

          {/* Flags: Approval */}
          <View style={[styles.toggleRow, { backgroundColor: '#F8FAFC', borderColor: '#E5E7EB', marginTop: 10 }]}>
            <View style={[styles.toggleIconBox, { backgroundColor: 'rgba(54, 108, 217, 0.1)' }]}>
              <Feather name="check-circle" size={16} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}><Text style={[styles.toggleLabel, { color: theme.text }]}>{t('approvalRequired') || "Approval Required"}</Text></View>
            <Switch value={values.isApprovalNeeded || false} onValueChange={v => onChange('isApprovalNeeded', v)} trackColor={{ false: '#ddd', true: theme.primary }} thumbColor="#fff" />
          </View>

          {/* Approval User Picker */}
          {values.isApprovalNeeded && (
            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
              <TouchableOpacity style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }} onPress={() => setShowApproverPicker(true)}>
                <Text style={{ color: selectedApprover ? theme.text : theme.secondaryText, fontWeight: '400', fontSize: 16 }}>{selectedApprover ? `Approver: ${selectedApprover.name}` : "Select Approver"}</Text>
              </TouchableOpacity>
              <Feather name="chevron-down" size={20} color="#bbb" style={styles.inputIcon} />
            </View>
          )}
          <CustomPickerDrawer visible={showApproverPicker} onClose={() => setShowApproverPicker(false)} data={users} valueKey="userId" labelKey="name" imageKey="profilePhoto" selectedValue={values.approvalRequiredBy} onSelect={(id) => { onChange('approvalRequiredBy', id); setShowApproverPicker(false); }} multiSelect={false} theme={theme} placeholder="Select Approver" showImage={true} />

        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity style={styles.drawerBtn} onPress={handleTaskCreate} disabled={loading}>
        <LinearGradient
          colors={['#011F53', '#366CD9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.drawerBtnGradient}>
          <Text style={styles.drawerBtnText}>{loading ? "Creating..." : t("add_task")}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* File Preview Modal */}
      <FilePreviewModal
        visible={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        attachments={attachments}
        onRemoveFile={(index) => {
          setAttachments(prev => prev.filter((_, i) => i !== index));
        }}
        getFileType={getFileType}
        getFileIcon={getFileIcon}
        getFormattedSize={getFormattedSize}
        theme={theme}
      />
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
    paddingVertical: 0, // Removed padding for centered text input
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
    paddingVertical: 12, // Consistent padding
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