import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddWorklistPopup from 'components/popups/AddWorklistPopup';
import ProjectPopup from 'components/popups/ProjectPopup';
import DateBox from 'components/task details/DateBox';
import FieldBox from 'components/task details/FieldBox';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Image,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { getProjectById } from '../../utils/project';
import { createTask } from '../../utils/task';
import { createWorklist, getWorklistsByProjectId } from '../../utils/worklist';
import AttachmentSheet from '../popups/AttachmentSheet';
import CustomPickerDrawer from '../popups/CustomPickerDrawer';
import FilePreviewModal from '../popups/FilePreviewModal';
import useAttachmentPicker from '../popups/useAttachmentPicker';
import useAudioRecorder from '../popups/useAudioRecorder';

export default function AddTaskForm({
    values,
    onChange,
    onSubmit,
    theme,
    projects = [],
    users = [],
    projectTasks = [],
}) {
    const [projectName, setProjectName] = useState('');
    const [worklists, setWorklists] = useState([]);
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [showWorklistPicker, setShowWorklistPicker] = useState(false);
    const [showUserPicker, setShowUserPicker] = useState(false);
    const [showDepPicker, setShowDepPicker] = useState(false);
    const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showAddProjectPopup, setShowAddProjectPopup] = useState(false);
    const [showAddWorklistPopup, setShowAddWorklistPopup] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    // Local state for new project popup
    const [addProjectValues, setAddProjectValues] = useState({ projectName: '', projectDesc: '', projectCategory: '', startDate: '', endDate: '' });
    const handleAddProjectChange = (key, value) => {
        setAddProjectValues(prev => ({ ...prev, [key]: value }));
    };
    const { t } = useTranslation();
    const { attachments, pickAttachment, setAttachments, getFileType, getFileIcon, getFormattedSize } = useAttachmentPicker();
    const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
        onRecordingFinished: (audioFile) => {
            setAttachments(prev => [...prev, audioFile]);
            Alert.alert('Audio recorded and attached!');
        }
    });
    const taskValueKey = projectTasks.length && projectTasks[0]?.id !== undefined ? 'id' : 'taskId';

    // Add New Project/Worklist options
    const projectsWithAddNew = [
        { id: '__add_new__', projectName: '+ Add New Project' },
        ...projects,
    ];
    const worklistsWithAddNew = [
        { id: '__add_new__', name: '+ Add New Worklist' },
        ...worklists,
    ];

    const selectedDepIds = Array.isArray(values.taskDeps)
        ? values.taskDeps.map(String)
        : [];

    const selectedDeps = selectedDepIds
        .map(id => projectTasks.find(t => String(t[taskValueKey]) === id))
        .filter(Boolean);

    useEffect(() => {
        if (!values.projectId) {
            setWorklists([]);
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
                console.error('Error fetching project/worklists:', err.message);
                setProjectName('Project Not Found');
                setWorklists([]);
            }
        };

        fetchProjectAndWorklists();
        onChange('taskWorklist', '');
    }, [values.projectId]);

    const isValidDate = (date) => date && !isNaN(new Date(date).getTime());

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

            const taskData = {
                name: values.taskName,
                description: values.taskDesc,
                assignedUserIds,
                dependentTaskIds,
                startDate,
                endDate,
                worklistId: values.taskWorklist,
                projectId: values.projectId,
                status: 'Pending',
                progress: 0,
                images,
                isIssue: values.isIssue || false,
                isCritical: values.isCritical || false,
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
            ? current.filter(id => id !== userId)
            : [...current, userId];
        onChange('assignTo', updated);
    };

    const handleDepToggle = (taskId) => {
        const current = Array.isArray(values.taskDeps) ? [...values.taskDeps] : [];
        const id = String(taskId);

        const updated = current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id];

        onChange('taskDeps', updated);
    };

    return (
        <>
            {/* Task Name */}
            <FieldBox
                value={values.taskName}
                placeholder={t("task_name")}
                theme={theme}
                editable={true}
                onChangeText={t => onChange('taskName', t)}
            />

            {/* Project Picker with Add New */}
            <FieldBox
                value={
                    values.projectId && values.projectId !== '__add_new__'
                        ? (() => {
                            const proj = projectsWithAddNew.find(p => String(p.id) === String(values.projectId));
                            return proj && proj.projectName ? proj.projectName : t("selectProject");
                        })()
                        : t("selectProject")
                }
                placeholder={t("selectProject")}
                theme={theme}
                editable={false}
                onPress={() => setShowProjectPicker(true)}
                rightComponent={
                    <Feather name="chevron-down" size={20} color="#bbb" style={{ marginLeft: 8 }} />
                }
            />
            <CustomPickerDrawer
                visible={showProjectPicker}
                onClose={() => setShowProjectPicker(false)}
                data={projectsWithAddNew}
                valueKey="id"
                labelKey="projectName"
                selectedValue={values.projectId}
                onSelect={v => {
                    if (v === '__add_new__') {
                        setShowProjectPicker(false);
                        setTimeout(() => setShowAddProjectPopup(true), 300);
                    } else {
                        onChange('projectId', String(v));
                    }
                }}
                theme={theme}
                placeholder={t("search_project")}
                showImage={false}
            />

            {/* Worklist Picker with Add New */}
            <FieldBox
                value={
                    values.taskWorklist
                        ? worklists.find(w => String(w.id) === String(values.taskWorklist))?.name || 'Select Worklist'
                        : ''
                }
                placeholder={t("select_worklist")}
                theme={theme}
                editable={false}
                onPress={() => setShowWorklistPicker(true)}
                rightComponent={
                    <Feather name="chevron-down" size={20} color="#bbb" style={{ marginLeft: 8 }} />
                }
            />
            <CustomPickerDrawer
                visible={showWorklistPicker}
                onClose={() => setShowWorklistPicker(false)}
                data={worklistsWithAddNew}
                valueKey="id"
                labelKey="name"
                selectedValue={values.taskWorklist}
                onSelect={v => {
                    if (v === '__add_new__') {
                        setShowWorklistPicker(false);
                        setTimeout(() => setShowAddWorklistPopup(true), 300);
                    } else {
                        onChange('taskWorklist', String(v));
                    }
                }}
                theme={theme}
                placeholder={t("search_worklist")}
                showImage={false}
            />

            {/* Dependencies Multi-select */}
            <FieldBox
                value={
                    selectedDeps.length
                        ? selectedDeps.map(t => t.name || t.taskName || `Task ${t[taskValueKey]}`).join(', ')
                        : ''
                }
                placeholder={t("select_dependencies")}
                theme={theme}
                editable={false}
                onPress={() => setShowDepPicker(true)}
                rightComponent={
                    <Feather name="chevron-down" size={20} color="#bbb" style={{ marginLeft: 8 }} />
                }
            />
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
                showImage={false}
            />

            {/* Dates */}
            <View style={styles.dateRow}>
                <DateBox
                    theme={theme}
                    label={t("start_date")}
                    value={values.startDate}
                    onChange={date => onChange('startDate', date)}
                />
                <DateBox
                    theme={theme}
                    label={t("end_date")}
                    value={values.endDate}
                    onChange={date => onChange('endDate', date)}
                />
            </View>

            {/* Assigned Users Multi-select */}
            <FieldBox
                value={
                    values.assignTo?.length
                        ? values.assignTo.map(uid =>
                            users.find(u => u.userId === uid)?.name || 'Unknown'
                        ).join(', ')
                        : ''
                }
                placeholder={t("assign_to")}
                theme={theme}
                editable={false}
                onPress={() => setShowUserPicker(true)}
                rightComponent={
                    <Feather name="search" size={18} color="#bbb" style={{ marginLeft: 8 }} />
                }
            />
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
            <FieldBox
                value=""
                placeholder={t("addAttachments")}
                theme={theme}
                editable={false}
                rightComponent={
                    <>
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

                        <Feather
                            name="paperclip"
                            size={20}
                            color="#888"
                            style={{ marginLeft: 8 }}
                            onPress={() => setShowAttachmentSheet(true)}
                        />
                        <MaterialCommunityIcons
                            name={isRecording ? "microphone" : "microphone-outline"}
                            size={20}
                            color={isRecording ? "#E53935" : "#888"}
                            style={{ marginLeft: 8 }}
                            onPress={isRecording ? stopRecording : startRecording}
                        />
                        {isRecording && (
                            <Text style={{ color: "#E53935", marginLeft: 8 }}>{seconds}s</Text>
                        )}
                    </>
                }
            />

            {/* Attachment Preview Grid */}
            {attachments.length > 0 && (
                <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
                    {Array.from({ length: Math.ceil(attachments.length / 2) }).map((_, rowIdx) => (
                        <View
                            key={rowIdx}
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
                        >
                            {[0, 1].map(colIdx => {
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
                                        }}
                                    >
                                        {/* Image Preview */}
                                        {att.type?.startsWith('image') && (
                                            <TouchableOpacity onPress={() => {/* optional modal */ }}>
                                                <Image
                                                    source={{ uri: att.uri }}
                                                    style={{ width: 25, height: 25, borderRadius: 6, marginRight: 8 }}
                                                />
                                            </TouchableOpacity>
                                        )}

                                        {/* Audio Playback */}
                                        {att.type?.startsWith('audio') && (
                                            <TouchableOpacity
                                                onPress={async () => {
                                                    const { Sound } = await import('expo-av');
                                                    const { sound } = await Sound.createAsync({ uri: att.uri });
                                                    await sound.playAsync();
                                                }}
                                                style={{ marginRight: 8 }}
                                            >
                                                <MaterialCommunityIcons name="play-circle-outline" size={28} color="#1D4ED8" />
                                            </TouchableOpacity>
                                        )}

                                        {/* Fallback File Icon */}
                                        {!att.type?.startsWith('image') && !att.type?.startsWith('audio') && (
                                            <MaterialCommunityIcons name="file-document-outline" size={28} color="#888" style={{ marginRight: 8 }} />
                                        )}

                                        {/* File Name */}
                                        <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>
                                            {(att.name || att.uri?.split('/').pop() || 'Attachment').length > 20
                                                ? (att.name || att.uri?.split('/').pop()).slice(0, 15) + '...'
                                                : (att.name || att.uri?.split('/').pop())}
                                        </Text>

                                        {/* Delete Button */}
                                        <TouchableOpacity
                                            onPress={() => {
                                                setAttachments(prev => prev.filter((_, i) => i !== idx));
                                            }}
                                            style={{ marginLeft: 8 }}
                                        >
                                            <MaterialCommunityIcons name="close-circle" size={22} color="#E53935" />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>
            )}

            {/* Attachment Picker Bottom Sheet */}
            <AttachmentSheet
                visible={showAttachmentSheet}
                onClose={() => setShowAttachmentSheet(false)}
                onPick={async (type) => {
                    await pickAttachment(type);
                    setShowAttachmentSheet(false);
                }}
            />


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
                        size={16} 
                        color={values.isIssue ? theme.criticalText : theme.normalText} 
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.toggleLabel, { 
                        color: values.isIssue ? theme.criticalText : theme.normalText 
                    }]}>
                        Issue
                    </Text>
                </View>
                <Switch
                    value={values.isIssue || false}
                    onValueChange={v => {
                        onChange('isIssue', v);
                        // Reset critical flag when converting from issue to normal task
                        if (!v && values.isCritical) {
                            onChange('isCritical', false);
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
                    marginTop: 6
                }]}>
                    <View style={[styles.toggleIconBox, {
                        backgroundColor: values.isCritical ? theme.criticalIconBg : theme.normalIssueIconBg
                    }]}>
                        <MaterialIcons 
                            name="warning" 
                            size={16} 
                            color={values.isCritical ? theme.criticalText : theme.normalIssueText} 
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.toggleLabel, { 
                            color: values.isCritical ? theme.criticalText : theme.normalIssueText 
                        }]}>
                            Critical
                        </Text>
                    </View>
                    <Switch
                        value={values.isCritical || false}
                        onValueChange={v => onChange('isCritical', v)}
                        trackColor={{ 
                            false: '#ddd', 
                            true: theme.criticalText
                        }}
                        thumbColor="#fff"
                    />
                </View>
            )}

            <FieldBox
                value={values.taskDesc}
                placeholder={t("description")}
                theme={theme}
                editable={true}
                multiline={true}
                onChangeText={t => onChange('taskDesc', t)}
            />

            {/* Submit Button */}
            <TouchableOpacity style={styles.drawerBtn} onPress={handleTaskCreate}>
                <LinearGradient
                    colors={['#011F53', '#366CD9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.drawerBtnGradient}
                >
                    <Text style={styles.drawerBtnText}>{t("add_task")}</Text>
                </LinearGradient>
            </TouchableOpacity>
            {/* Add Worklist Popup */}
            {showAddWorklistPopup && (
                <AddWorklistPopup
                    visible={showAddWorklistPopup}
                    onClose={() => setShowAddWorklistPopup(false)}
                    projects={projects}
                    theme={theme}
                    onSubmit={async (projectId, name) => {
                        try {
                            const token = await AsyncStorage.getItem('token');
                            // Create the new worklist
                            const newWorklist = await createWorklist(projectId, name, token);
                            // Refresh worklists for the selected project
                            const updatedWorklists = await getWorklistsByProjectId(projectId, token);
                            setWorklists(Array.isArray(updatedWorklists) ? updatedWorklists : []);
                            // Set the new worklist as selected in the form if it has an id
                            if (newWorklist && newWorklist.id) {
                                onChange('taskWorklist', String(newWorklist.id));
                            }
                            setShowAddWorklistPopup(false);
                        } catch (e) {
                            Alert.alert('Error', e.message || 'Failed to add worklist');
                        }
                    }}
                />
            )}
            {/* Add Project Popup */}
            {showAddProjectPopup && (
                <ProjectPopup
                    visible={showAddProjectPopup}
                    onClose={() => setShowAddProjectPopup(false)}
                    values={addProjectValues}
                    onChange={handleAddProjectChange}
                    onSubmit={() => {
                        setShowAddProjectPopup(false);
                        setAddProjectValues({ projectName: '', projectDesc: '', projectCategory: '', startDate: '', endDate: '' });
                    }}
                    theme={theme}
                />
            )}

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
        borderRadius: 14,
        marginHorizontal: 22,
        marginBottom: 14,
        paddingHorizontal: 16,
        paddingVertical: 0,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 54,
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
    dateBox: {
        flex: 1,
        backgroundColor: '#F7F8FA',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginRight: 0,
        gap: 8,
    },
    dateLabel: {
        fontSize: 13,
        color: '#888',
        marginLeft: 4,
    },
    dateValue: {
        fontSize: 15,
        color: '#222',
        fontWeight: '500',
        marginLeft: 6,
    },
    drawerBtn: {
        marginHorizontal: 22,
        marginTop: 10,
        marginBottom: 0,
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
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
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