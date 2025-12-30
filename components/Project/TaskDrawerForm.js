import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import DateBox from 'components/task details/DateBox';
import FieldBox from 'components/task details/FieldBox';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { getUserConnections } from '../../utils/connections';
import { getProjectById, getProjectsByUserId } from '../../utils/project';
import { createTask, getTasksByProjectId } from '../../utils/task';
import { createWorklist, getWorklistsByProjectId } from '../../utils/worklist';
import AddWorklistPopup from '../popups/AddWorklistPopup';
import AttachmentSheet from '../popups/AttachmentSheet';
import CustomPickerDrawer from '../popups/CustomPickerDrawer';
import FilePreviewModal from '../popups/FilePreviewModal';
import ProjectPopup from '../popups/ProjectPopup';
import useAttachmentPicker from '../popups/useAttachmentPicker';
import useAudioRecorder from '../popups/useAudioRecorder';

// --- ENABLE LAYOUT ANIMATION ---
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- CONSTANTS ---
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

export default function TaskDrawerForm({
  values,
  onChange,
  onSubmit,
  theme,
  projects: propProjects = [],
}) {
  const { t } = useTranslation();
  const navigation = useNavigation();

  // --- STATE ---
  const [projectTasks, setProjectTasks] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [worklists, setWorklists] = useState([]);
  const [projects, setProjects] = useState(propProjects);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- UI TOGGLES ---
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);

  // --- PICKERS VISIBILITY ---
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showWorklistPicker, setShowWorklistPicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showDepPicker, setShowDepPicker] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // New Workflow Pickers
  const [showModePicker, setShowModePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showStagePicker, setShowStagePicker] = useState(false);
  const [showApproverPicker, setShowApproverPicker] = useState(false);

  // --- POPUPS ---
  const [showAddProjectPopup, setShowAddProjectPopup] = useState(false);
  const [showAddWorklistPopup, setShowAddWorklistPopup] = useState(false);
  const [addProjectValues, setAddProjectValues] = useState({
    projectName: '',
    projectDesc: '',
    projectCategory: '',
    startDate: '',
    endDate: '',
  });

  // --- WORKFLOW LOCAL STATE ---
  const [taskMode, setTaskMode] = useState('LEGACY');

  // --- HOOKS ---
  const { attachments, pickAttachment, setAttachments, getFileType, getFileIcon, getFormattedSize } = useAttachmentPicker();
  const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
    onRecordingFinished: (audioFile) => {
      setAttachments((prev) => [...prev, audioFile]);
      Alert.alert('Audio recorded and attached!');
    },
  });

  const prevProjectIdRef = useRef(values.projectId);

  // --- DERIVED VALUES ---
  const projectsWithAddNew = [{ id: '__add_new__', projectName: '+ Add New Project' }, ...projects];
  const worklistsWithAddNew = [{ id: '__add_new__', name: '+ Add New Worklist' }, ...worklists];
  const usersWithAddNew = [{ userId: '__add_new__', name: '+ Add New Connection' }, ...users];

  // Derived Workflow Values
  const selectedCategoryName = values.category ? WORKFLOW_DATA[values.category]?.name : null;
  const availableStages = values.category ? WORKFLOW_DATA[values.category]?.stages : [];
  const selectedStageName = values.currentStage ? availableStages.find(s => s.id === values.currentStage)?.name : null;
  const selectedApprover = users.find(u => u.userId === values.approvalRequiredBy);

  // Dependency Helpers
  const taskValueKey = projectTasks.length && projectTasks[0]?.id !== undefined ? 'id' : 'taskId';
  const selectedDepIds = Array.isArray(values.taskDeps) ? values.taskDeps.map(String) : [];
  const selectedDeps = selectedDepIds
    .map((id) => projectTasks.find((t) => String(t[taskValueKey]) === id))
    .filter(Boolean);

  // --- DATA LOADING EFFECTS ---

  useEffect(() => {
    (async () => {
      try {
        const connections = await getUserConnections();
        setUsers(Array.isArray(connections) ? connections : []);
      } catch (e) {
        setUsers([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!values.projectId || values.projectId === '__add_new__') {
      setProjectTasks([]);
      return;
    }
    const fetchProjectTasks = async () => {
      try {
        const tasks = await getTasksByProjectId(values.projectId);
        setProjectTasks(Array.isArray(tasks) ? tasks : []);
      } catch (error) {
        setProjectTasks([]);
      }
    };
    fetchProjectTasks();
  }, [values.projectId]);

  useEffect(() => {
    if (!propProjects || propProjects.length === 0) {
      (async () => {
        try {
          const fetched = await getProjectsByUserId();
          setProjects(Array.isArray(fetched) ? fetched : []);
        } catch (e) {
          setProjects([]);
        }
      })();
    } else {
      setProjects(propProjects);
    }
  }, []);

  useEffect(() => {
    if (prevProjectIdRef.current === values.projectId) return;

    if (!values.projectId) {
      setWorklists([]);
      prevProjectIdRef.current = values.projectId;
      return;
    }

    const fetchProjectAndWorklists = async () => {
      try {
        const res = await getProjectById(values.projectId);
        const name = res.name || res.projectName || 'Project';
        setProjectName(name);
        const token = await AsyncStorage.getItem('token');
        const worklistsRes = await getWorklistsByProjectId(values.projectId, token);
        setWorklists(worklistsRes || []);
      } catch (err) {
        setProjectName('Project Not Found');
        setWorklists([]);
      }
    };

    fetchProjectAndWorklists();
    prevProjectIdRef.current = values.projectId;
  }, [values.projectId]);

  // --- HANDLERS ---

  const handleAddProjectChange = (key, value) => {
    setAddProjectValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleAdditionalOptions = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowAdditionalOptions(!showAdditionalOptions);
  };

  const isValidDate = (date) => date && !isNaN(new Date(date).getTime());

  const handleTaskCreate = async () => {
    // Validation
    if (!values.taskName) {
      Alert.alert('Validation Error', t('task_name_required'));
      return;
    }
    const isWorkflow = taskMode === 'WORKFLOW';
    if (isWorkflow && !values.category) {
      Alert.alert('Validation Error', 'Please select a Category for Workflow Task');
      return;
    }
    if (values.isApprovalNeeded && !values.approvalRequiredBy) {
      Alert.alert('Validation Error', 'Please select an approver.');
      return;
    }

    try {
      setLoading(true);
      const startDate = isValidDate(values.startDate)
        ? new Date(values.startDate).toISOString().slice(0, 19).replace('T', ' ')
        : null;

      const endDate = isValidDate(values.endDate)
        ? new Date(values.endDate).toISOString().slice(0, 19).replace('T', ' ')
        : null;

      const assignedUserIds = Array.isArray(values.assignTo)
        ? values.assignTo.map((id) => Number(id)).filter(Boolean)
        : [];
      const dependentTaskIds = Array.isArray(values.taskDeps)
        ? values.taskDeps.map((id) => String(id))
        : [];
      const parentId = values.parentId ? Number(values.parentId) : undefined;

      const images = attachments.map((att) => ({
        uri: att.uri,
        name: att.name || att.uri?.split('/').pop(),
        type: att.mimeType || att.type || 'application/octet-stream',
      }));

      const taskData = {
        name: values.taskName,
        description: values.taskDesc,
        assignedUserIds,
        dependentTaskIds,
        startDate,
        endDate,
        worklistId: values.taskWorklist,
        projectId: values.projectId,

        // Workflow Logic
        status: isWorkflow ? undefined : 'Pending', // Let backend handle workflow status
        category: isWorkflow ? values.category : null,
        currentStage: isWorkflow ? values.currentStage : null,

        progress: 0,
        images,

        // Flags
        isIssue: values.isIssue || false,
        isCritical: values.isCritical || false,
        isApprovalNeeded: values.isApprovalNeeded || false,
        approvalRequiredBy: values.isApprovalNeeded ? values.approvalRequiredBy : null,

        ...(parentId && { parentId }),
      };

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
    const updated = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    onChange('taskDeps', updated);
  };

  return (
    <>
      {/* --- CORE FIELDS (Always Visible) --- */}
      {/* Task Name */}
      <FieldBox
        value={values.taskName}
        placeholder={t("task_name")}
        theme={theme}
        editable={true}
        onChangeText={(t) => onChange('taskName', t)}
      />
      {/* Project Picker */}
      <FieldBox
        value={
          values.projectId && values.projectId !== '__add_new__'
            ? (() => {
              const proj = projectsWithAddNew.find(
                (p) => String(p.id) === String(values.projectId)
              );
              return proj && proj.projectName ? proj.projectName : t('selectProject');
            })()
            : t('selectProject')
        }
        placeholder={t('selectProject')}
        theme={theme}
        editable={false}
        onPress={() => setShowProjectPicker(true)}
        rightComponent={<Feather name="chevron-down" size={20} color="#bbb" style={{ marginLeft: 8 }} />}
      />
      <CustomPickerDrawer
        visible={showProjectPicker}
        onClose={() => setShowProjectPicker(false)}
        data={projectsWithAddNew}
        valueKey="id"
        labelKey="projectName"
        selectedValue={values.projectId}
        onSelect={(v) => {
          if (v === '__add_new__') {
            setShowProjectPicker(false);
            setShowAddProjectPopup(true);
          } else {
            onChange('projectId', String(v));
            setShowProjectPicker(false);
          }
        }}
        theme={theme}
        placeholder={t("search_project")}
        showImage={false}
      />
      {/* Worklist Picker */}
      <FieldBox
        value={
          values.taskWorklist
            ? (() => {
              const wl = worklists.find((w) => String(w.id) === String(values.taskWorklist));
              return wl && wl.name ? wl.name : t('select_Worklist');
            })()
            : ''
        }
        placeholder={t('select_worklist')}
        theme={theme}
        editable={false}
        onPress={() => setShowWorklistPicker(true)}
        rightComponent={<Feather name="chevron-down" size={20} color="#bbb" style={{ marginLeft: 8 }} />}
      />
      <CustomPickerDrawer
        visible={showWorklistPicker}
        onClose={() => setShowWorklistPicker(false)}
        data={worklistsWithAddNew}
        valueKey="id"
        labelKey="name"
        selectedValue={values.taskWorklist}
        onSelect={(v) => {
          if (v === '__add_new__') {
            setShowWorklistPicker(false);
            setShowAddWorklistPopup(true);
          } else {
            onChange('taskWorklist', String(v));
            setShowWorklistPicker(false);
          }
        }}
        theme={theme}
        placeholder={t("search_worklist")}
        showImage={false}
      />
      {/* Description */}
      <FieldBox
        value={values.taskDesc}
        placeholder={t("description")}
        theme={theme}
        editable={true}
        multiline={true}
        onChangeText={(t) => onChange('taskDesc', t)}
      />
      {/* Dates */}
      <View style={styles.dateRow}>
        <DateBox theme={theme} label={t("start_date")} value={values.startDate} onChange={(date) => onChange('startDate', date)} />
        <DateBox theme={theme} label={t("end_date")} value={values.endDate} onChange={(date) => onChange('endDate', date)} />
      </View>
      {/* Assigned Users */}
      <FieldBox
        value={values.assignTo?.length ? values.assignTo.map((uid) => users.find((u) => u.userId === uid)?.name || 'Unknown').join(', ') : ''}
        placeholder={t("assign_to")}
        theme={theme}
        editable={false}
        onPress={() => setShowUserPicker(true)}
        rightComponent={<Feather name="search" size={18} color="#bbb" style={{ marginLeft: 8 }} />}
      />
      <CustomPickerDrawer
        visible={showUserPicker}
        onClose={() => setShowUserPicker(false)}
        data={usersWithAddNew}
        valueKey="userId"
        labelKey="name"
        imageKey="profilePhoto"
        selectedValue={values.assignTo}
        onSelect={(v) => {
          if (v === '__add_new__') {
            setShowUserPicker(false);
            setTimeout(() => { navigation.navigate('AddConnectionScreen'); }, 300);
          } else {
            handleUserToggle(v);
          }
        }}
        multiSelect={true}
        theme={theme}
        placeholder={t("search_user")}
        showImage={true}
      />
      {/* Attachments */}
      <FieldBox
        value=""
        placeholder={t("addAttachments")}
        theme={theme}
        editable={false}
        rightComponent={
          <>
            {attachments.length > 0 && (
              <TouchableOpacity onPress={() => setShowPreviewModal(true)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 }}>
                <Feather name="eye" size={16} color={theme.primary} />
                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '500', marginLeft: 4 }}>{t('previewAttachments')} ({attachments.length})</Text>
              </TouchableOpacity>
            )}
            <Feather name="paperclip" size={20} color="#888" style={{ marginLeft: 8 }} onPress={() => setShowAttachmentSheet(true)} />
            <MaterialCommunityIcons name={isRecording ? 'microphone' : 'microphone-outline'} size={20} color={isRecording ? '#E53935' : '#888'} style={{ marginLeft: 8 }} onPress={isRecording ? stopRecording : startRecording} />
            {isRecording && <Text style={{ color: '#E53935', marginLeft: 8 }}>{seconds}s</Text>}
          </>
        }
      />
      {/* Attachment Preview Grid (Simplified) */}
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
                    <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>{(att.name || 'File').slice(0, 15)}...</Text>
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
      {/* =================================================================================== */}
      {/* 🔘 ADDITIONAL OPTIONS TOGGLE */}
      {/* =================================================================================== */}
      <TouchableOpacity style={styles.additionalOptionsBtn} onPress={toggleAdditionalOptions} activeOpacity={0.7}>
        <Text style={[styles.additionalOptionsText, { color: theme.primary }]}>
          {showAdditionalOptions ? "- Hide Additional Options" : "+ Show Additional Options"}
        </Text>
      </TouchableOpacity>
      {/* =================================================================================== */}
      {/* 🟡 EXPANDABLE SECTION */}
      {/* =================================================================================== */}
      {showAdditionalOptions && (
        <View style={styles.additionalSection}>



          {/* 1. Task Mode Picker - Show ONLY if Not an Issue */}
          {!values.isIssue && (
            <>
              <FieldBox
                value={TASK_MODES.find(m => m.id === taskMode)?.name || taskMode}
                placeholder="Task Mode"
                theme={theme}
                editable={false}
                onPress={() => setShowModePicker(true)}
                rightComponent={<Feather name="chevron-down" size={20} color="#bbb" style={{ marginLeft: 8 }} />}
              />
              <CustomPickerDrawer
                visible={showModePicker}
                onClose={() => setShowModePicker(false)}
                data={TASK_MODES}
                valueKey="id"
                labelKey="name"
                selectedValue={[taskMode]}
                onSelect={(id) => {
                  setTaskMode(id);
                  if (id === 'LEGACY') {
                    onChange('category', null);
                    onChange('currentStage', null);
                  } else {
                    // If switching to WORKFLOW, clear Issue/Critical flags and deps to ensure UI consistency and clean data
                    onChange('isIssue', false);
                    onChange('isCritical', false);
                    onChange('taskDeps', []);
                  }
                  setShowModePicker(false);
                }}
                multiSelect={false}
                theme={theme}
                placeholder="Select Mode"
              />
            </>
          )}
          {/* 2. Dependencies - Show ONLY in Legacy Mode AND Not an Issue */}
          {taskMode === 'LEGACY' && !values.isIssue && (
            <>
              <FieldBox
                value={selectedDeps.length ? selectedDeps.map((t) => t.name || t.taskName || `Task ${t[taskValueKey]}`).join(', ') : ''}
                placeholder={t("select_dependencies")}
                theme={theme}
                editable={false}
                onPress={() => setShowDepPicker(true)}
                rightComponent={<Feather name="chevron-down" size={20} color="#bbb" style={{ marginLeft: 8 }} />}
              />
              <CustomPickerDrawer visible={showDepPicker} onClose={() => setShowDepPicker(false)} data={projectTasks} valueKey={taskValueKey} labelKey="name" selectedValue={selectedDepIds} onSelect={handleDepToggle} multiSelect={true} theme={theme} placeholder={t("search_task")} showImage={false} />
            </>
          )}
          {/* 3. Category Picker (Workflow Only) */}
          {taskMode === 'WORKFLOW' && (
            <>
              <FieldBox
                value={selectedCategoryName || ''}
                placeholder="Category *"
                theme={theme}
                editable={false}
                onPress={() => setShowCategoryPicker(true)}
                rightComponent={<Feather name="chevron-down" size={20} color="#bbb" style={{ marginLeft: 8 }} />}
              />
              <CustomPickerDrawer visible={showCategoryPicker} onClose={() => setShowCategoryPicker(false)} data={CATEGORY_OPTIONS} valueKey="id" labelKey="name" selectedValue={[values.category]} onSelect={(id) => { onChange('category', id); onChange('currentStage', null); setShowCategoryPicker(false); }} multiSelect={false} theme={theme} placeholder="Select Category" />
            </>
          )}
          {/* 4. Stage Picker (Workflow Only) */}
          {taskMode === 'WORKFLOW' && values.category && (
            <>
              <FieldBox
                value={selectedStageName || ''}
                placeholder="Initial Stage (Optional)"
                theme={theme}
                editable={false}
                onPress={() => setShowStagePicker(true)}
                rightComponent={<Feather name="chevron-down" size={20} color="#bbb" style={{ marginLeft: 8 }} />}
              />
              <CustomPickerDrawer visible={showStagePicker} onClose={() => setShowStagePicker(false)} data={availableStages} valueKey="id" labelKey="name" selectedValue={[values.currentStage]} onSelect={(id) => { onChange('currentStage', id); setShowStagePicker(false); }} multiSelect={false} theme={theme} placeholder="Select Stage" />
            </>
          )}
          {/* 5. Issue/Critical Flags - Show ONLY in Legacy Mode */}
          {taskMode === 'LEGACY' && (
            <>
              <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.toggleIconBox}><Feather name="alert-triangle" size={20} color="#FF6B35" /></View>
                <View style={{ flex: 1 }}><Text style={[styles.toggleLabel, { color: theme.text }]}>{t('markAsIssue')}</Text></View>
                <Switch value={values.isIssue || false} onValueChange={v => { onChange('isIssue', v); if (!v && values.isCritical) onChange('isCritical', false); }} trackColor={{ false: '#ddd', true: '#FF6B35' }} thumbColor="#fff" />
              </View>
              {values.isIssue && (
                <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={[styles.toggleIconBox, { backgroundColor: 'rgba(229, 57, 53, 0.1)' }]}><Feather name="zap" size={20} color="#E53935" /></View>
                  <View style={{ flex: 1 }}><Text style={[styles.toggleLabel, { color: theme.text }]}>{t('markAsCritical')}</Text></View>
                  <Switch value={values.isCritical || false} onValueChange={v => onChange('isCritical', v)} trackColor={{ false: '#ddd', true: '#E53935' }} thumbColor="#fff" />
                </View>
              )}
            </>
          )}
          {/* 6. Approval Flags */}
          <View style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.toggleIconBox, { backgroundColor: 'rgba(54, 108, 217, 0.1)' }]}><Feather name="check-circle" size={20} color={theme.primary} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.toggleLabel, { color: theme.text }]}>{t('approvalRequired')}</Text></View>
            <Switch value={values.isApprovalNeeded || false} onValueChange={v => onChange('isApprovalNeeded', v)} trackColor={{ false: '#ddd', true: theme.primary }} thumbColor="#fff" />
          </View>
          {/* 7. Approver Picker */}
          {values.isApprovalNeeded && (
            <>
              <FieldBox
                value={selectedApprover ? `Approver: ${selectedApprover.name}` : ''}
                placeholder="Select Approver *"
                theme={theme}
                editable={false}
                onPress={() => setShowApproverPicker(true)}
                rightComponent={<Feather name="chevron-down" size={20} color="#bbb" style={{ marginLeft: 8 }} />}
              />
              <CustomPickerDrawer visible={showApproverPicker} onClose={() => setShowApproverPicker(false)} data={users} valueKey="userId" labelKey="name" imageKey="profilePhoto" selectedValue={[values.approvalRequiredBy]} onSelect={(id) => { onChange('approvalRequiredBy', id); setShowApproverPicker(false); }} multiSelect={false} theme={theme} placeholder="Select Approver" showImage={true} />
            </>
          )}
        </View>
      )}
      {/* --- Submit Button --- */}
      <TouchableOpacity style={styles.drawerBtn} onPress={handleTaskCreate} disabled={loading}>
        <LinearGradient colors={['#011F53', '#366CD9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.drawerBtnGradient}>
          <Text style={styles.drawerBtnText}>{loading ? 'Creating...' : t('add_task')}</Text>
        </LinearGradient>
      </TouchableOpacity>
      {/* --- EXTRA MODALS --- */}
      <AttachmentSheet visible={showAttachmentSheet} onClose={() => setShowAttachmentSheet(false)} onPick={async (type) => { await pickAttachment(type); setShowAttachmentSheet(false); }} />
      <FilePreviewModal visible={showPreviewModal} onClose={() => setShowPreviewModal(false)} attachments={attachments} onRemoveFile={(index) => { setAttachments(prev => prev.filter((_, i) => i !== index)); }} theme={theme} getFileType={getFileType} getFileIcon={getFileIcon} getFormattedSize={getFormattedSize} />
      <AddWorklistPopup visible={showAddWorklistPopup} onClose={() => setShowAddWorklistPopup(false)} projects={projects} theme={theme} onSubmit={async (projectId, name) => { try { const token = await AsyncStorage.getItem('token'); const newWorklist = await createWorklist(projectId, name, token); const updatedWorklists = await getWorklistsByProjectId(projectId, token); setWorklists(updatedWorklists || []); if (newWorklist?.id) onChange('taskWorklist', String(newWorklist.id)); setShowAddWorklistPopup(false); } catch (e) { Alert.alert('Error', e.message); } }} />
      <ProjectPopup visible={showAddProjectPopup} onClose={() => setShowAddProjectPopup(false)} values={addProjectValues} onChange={handleAddProjectChange} onSubmit={() => { setShowAddProjectPopup(false); setAddProjectValues({ projectName: '', projectDesc: '', projectCategory: '', startDate: '', endDate: '' }); }} theme={theme} />
    </>
  );
}
const styles = StyleSheet.create({
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 22,
    marginBottom: 14,
    gap: 10,
  },
  drawerBtn: {
    marginHorizontal: 22,
    marginTop: 10,
    marginBottom: 20, // Added padding at bottom
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

  // Toggle Styles
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
    marginTop: 5,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  toggleIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});