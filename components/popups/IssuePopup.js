import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import GradientButton from 'components/Login/GradientButton';
import { useState } from 'react';
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
    View
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { createIssue } from '../../utils/issues'; // adjust path as needed
import AttachmentSheet from './AttachmentSheet';
import CustomPickerDrawer from './CustomPickerDrawer';
import FilePreviewModal from './FilePreviewModal';
import ProjectPopup from './ProjectPopup';
import useAttachmentPicker from './useAttachmentPicker';
import useAudioRecorder from './useAudioRecorder';

export default function IssuePopup({
  visible,
  onClose,
  values,
  onChange,
  onSubmit,
  onSelectDate,
  projects = [],
  users = [],
  onIssueCreated,

}) {
  const theme = useTheme();

  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const { attachments, pickAttachment, clearAttachments, setAttachments, getFileType, getFileIcon, getFormattedSize } = useAttachmentPicker();
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(false); // <-- Add loading state
  const [showAddProjectPopup, setShowAddProjectPopup] = useState(false);

  const handleSubmit = async () => {
    if (!values.projectId) {
      alert('Please select a project.');
      return;
    }
    setLoading(true); // <-- Start loading

    try {
      // Prepare files for upload
      const unresolvedImages = attachments.map(att => ({
        uri: att.uri,
        name: att.name || att.uri?.split('/').pop() || 'attachment',
        type: att.mimeType || att.type || 'application/octet-stream',
      }));

      // If assignTo is null (self assign), do not send the field or send undefined
      const payload = {
        projectId: values.projectId,
        issueTitle: values.title,
        description: values.description,
        isCritical: values.isCritical,
        issueStatus: 'unresolved',
        dueDate: values.dueDate,
        unresolvedImages,
      };
      if (values.assignTo !== null && values.assignTo !== undefined && values.assignTo !== '') {
        payload.assignTo = values.assignTo;
      }
      const newIssue = await createIssue(payload);
      alert('Issue created successfully!');
      if (onIssueCreated && newIssue) {
        onIssueCreated(newIssue);
      }
      onClose();
    } catch (error) {
      alert(error.message || 'Failed to create issue');
    } finally {
      setLoading(false); // <-- Stop loading
    }
  };

  const { isRecording, startRecording, stopRecording, seconds } = useAudioRecorder({
    onRecordingFinished: (audioFile) => {
      setAttachments(prev => [...prev, audioFile]);
      Alert.alert('Audio recorded and attached!');
    }
  });


  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Format date as needed, e.g. YYYY-MM-DD
      const isoDate = selectedDate.toISOString().split('T')[0];
      onChange('dueDate', isoDate);
    }
  };

  const projectsWithAddNew = [
    { id: '__add_new__', projectName: '+ Add New Project' },
    ...projects,
  ];

  // Add Self Assign option to users list for assignTo picker
  const usersWithSelfAssign = [
    { userId: '__self__', name: 'Self Assign' },
    ...users,
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.popup, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Raise An Issue</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Title */}
            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Issue Title"
                placeholderTextColor={theme.secondaryText}
                value={values.title}
                onChangeText={t => onChange('title', t)}
              />
            </View>

            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}
                onPress={() => setShowProjectPicker(true)}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: values.projectId ? theme.text : theme.secondaryText,
                  fontWeight: '400',
                  fontSize: 16
                }}>
                  {values.projectId && values.projectId !== '__add_new__'
                    ? (() => {
                      const proj = projectsWithAddNew.find(p => String(p.id) === String(values.projectId));
                      return proj && proj.projectName ? proj.projectName : 'Select Project';
                    })()
                    : 'Select Project'}
                </Text>
              </TouchableOpacity>
            </View>
            <CustomPickerDrawer
              visible={showProjectPicker}
              onClose={() => setShowProjectPicker(false)}
              data={projectsWithAddNew}
              valueKey="id"
              labelKey="projectName" // <-- Make sure this is set!
              selectedValue={values.projectId}
              onSelect={v => {
                if (v === '__add_new__') {
                  setShowProjectPicker(false);
                  setShowAddProjectPopup(true);
                } else {
                  onChange('projectId', String(v));
                  setShowProjectPicker(false);
                }
              }}
              theme={theme}
              placeholder="Search project..."
              showImage={false}
              onAddProject={() => {
                setShowProjectPicker(false);
                setShowAddProjectPopup(true);
              }}
            />
            <ProjectPopup
              visible={showAddProjectPopup}
              onClose={() => setShowAddProjectPopup(false)}
              values={{ projectName: '', projectDesc: '' }}
              onChange={() => { }}
              onSubmit={() => { }}
              theme={theme}
            />

            {/* Description */}
            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.text, height: 70 }]}
                placeholder="Description"
                placeholderTextColor={theme.secondaryText}
                value={values.description}
                onChangeText={t => onChange('description', t)}
                multiline
              />
            </View>

            {/* Attachments */}
            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Add Attachments"
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
                    Preview ({attachments.length})
                  </Text>
                </TouchableOpacity>
              )}
              
              <Feather name="paperclip" size={20} color="#888" style={styles.inputIcon} onPress={() => setShowAttachmentSheet(true)} />
              <MaterialCommunityIcons
                name={isRecording ? "microphone" : "microphone-outline"}
                size={20}
                color={isRecording ? "#E53935" : "#888"}
                style={styles.inputIcon}
                onPress={isRecording ? stopRecording : startRecording}
              />
              {isRecording && (
                <Text style={{ color: "#E53935", marginLeft: 8 }}>{seconds}s</Text>
              )}
            </View>
            {attachments.length > 0 && (
              <View style={{ marginHorizontal: 16, marginBottom: 10 }}>
                {Array.from({ length: Math.ceil(attachments.length / 2) }).map((_, rowIdx) => (
                  <View key={rowIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, }}>
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
                            marginRight: colIdx === 0 ? 12 : 0
                          }}
                        >
                          {/* Preview for images */}
                          {att.type && att.type.startsWith('image') ? (
                            <TouchableOpacity onPress={() => { /* Optionally open image in modal */ }}>
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
                              style={{ marginRight: 8 }}
                            >
                              <MaterialCommunityIcons name="play-circle-outline" size={28} color="#1D4ED8" />
                            </TouchableOpacity>
                          ) : null}

                          {/* File/document icon for other types */}
                          {!att.type?.startsWith('image') && !att.type?.startsWith('audio') ? (
                            <MaterialCommunityIcons name="file-document-outline" size={28} color="#888" style={{ marginRight: 8 }} />
                          ) : null}

                          {/* File name */}
                          <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>
                            {(att.name || att.uri?.split('/').pop() || 'Attachment').length > 20
                              ? (att.name || att.uri?.split('/').pop()).slice(0, 15) + '...'
                              : (att.name || att.uri?.split('/').pop())}
                          </Text>

                          {/* Remove button */}
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
            <AttachmentSheet
              visible={showAttachmentSheet}
              onClose={() => setShowAttachmentSheet(false)}
              onPick={async (type) => {
                await pickAttachment(type);
                setShowAttachmentSheet(false);
              }}
            />

            {/* Assign To Picker Field */}
            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={{ flex: 1, justifyContent: 'center', paddingVertical: 12 }}
                onPress={() => setShowUserPicker(true)}
                activeOpacity={0.8}
              >
                <Text style={{
                  color: values.assignTo !== undefined && values.assignTo !== null ? theme.text : theme.secondaryText,
                  fontSize: 16,
                  fontWeight: '400'
                }}>
                  {values.assignTo === null
                    ? 'Self Assign'
                    : values.assignTo
                      ? (users.find(u => u.userId === values.assignTo)?.name || 'Assign To')
                      : 'Assign To'}
                </Text>
              </TouchableOpacity>
            </View>
            <CustomPickerDrawer
              visible={showUserPicker}
              onClose={() => setShowUserPicker(false)}
              data={usersWithSelfAssign}
              valueKey="userId"
              labelKey="name"
              imageKey="profilePhoto"
              selectedValue={values.assignTo === null ? '__self__' : values.assignTo}
              onSelect={v => {
                if (v === '__self__') {
                  onChange('assignTo', null);
                } else {
                  onChange('assignTo', v);
                }
              }}
              theme={theme}
              placeholder="Search user..."
              showImage={true}
            />

            <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.rowInput, { color: theme.text }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.input, { color: values.dueDate ? theme.text : theme.secondaryText }]}>
                  {values.dueDate || 'Due Date'}
                </Text>
                <Feather name="calendar" size={20} color={theme.secondaryText} />
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              Platform.OS === 'ios' ? (
                <Modal
                  transparent
                  animationType="fade"
                  visible={showDatePicker}
                  onRequestClose={() => setShowDatePicker(false)}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                    }}
                    activeOpacity={1}
                    onPressOut={() => setShowDatePicker(false)}
                  >
                    <View
                      style={{
                        backgroundColor: theme.card,
                        borderRadius: 18,
                        padding: 18,
                        width: "100%",
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <DateTimePicker
                        value={values.dueDate ? new Date(values.dueDate) : new Date()}
                        mode="date"
                        display="inline"
                        minimumDate={new Date()}
                        onChange={handleDateChange}
                        style={{ backgroundColor: theme.card }}
                        textColor={theme.text}
                        themeVariant={theme.dark ? 'dark' : 'light'}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>
              ) : (
                <DateTimePicker
                  value={values.dueDate ? new Date(values.dueDate) : new Date()}
                  mode="date"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={handleDateChange}
                  style={{ backgroundColor: theme.card }}
                  textColor={theme.text}
                  themeVariant={theme.dark ? 'dark' : 'light'}
                />
              )
            )}

            {/* Critical Switch */}
            <View style={styles.criticalRow}>
              <View style={styles.criticalIconBox}>
                <Ionicons name="alert-circle" size={26} color="#FF2700" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.criticalLabel}>Critical Issue?</Text>
                <Text style={styles.criticalDesc}>
                  Turn on the toggle only if the Issue needs immediate attention.
                </Text>
              </View>
              <Switch
                value={values.isCritical}
                onValueChange={v => onChange('isCritical', v)}
                trackColor={{ false: '#ddd', true: '#FF2700' }}
                thumbColor="#fff"
              />
            </View>

            <View style={{ marginHorizontal: 16, marginTop: 0 }}>
              <GradientButton
                title={loading ? "" : "Yes, Raise"}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading && (
                  <ActivityIndicator size="small" color="#fff" />
                )}
              </GradientButton>
            </View>

            <TouchableOpacity style={{ alignSelf: 'center', marginTop: 0 }} onPress={onClose}>
              <Text style={{ color: theme.secondaryText, fontWeight: '500' }}>No, Cancel?</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: '92%',
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 18,
    maxHeight: '92%',
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 12,
  },
  inputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
    backgroundColor: 'transparent',
    paddingVertical: 12,
  },
  inputIcon: {
    marginLeft: 8,
  },
  rowInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  criticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 18,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FF7D66',
    padding: 10,
    gap: 10,
  },
  criticalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEC8BE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  criticalLabel: {
    color: '#FF2700',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 2,
  },
  criticalDesc: {
    color: '#444',
    fontSize: 12,
    fontWeight: '400',
  },
  raiseBtn: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    paddingVertical: 16,
  },
  raiseBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 24,
    paddingTop: 8,
    paddingHorizontal: 12,
    minHeight: 180,
  },
});