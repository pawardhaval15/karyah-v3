import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TaskForm from '../Task/TaskForm';
import FilePreviewModal from './FilePreviewModal';
import useAttachmentPicker from './useAttachmentPicker';
import { useTranslation } from 'react-i18next';
export default function TaskPopup({
  visible,
  onClose,
  values,
  onChange,
  onSubmit,
  theme,
  projectId,
  projectName,
  worklistId,
  worklistName,
  projectTasks,
  users,
}) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const { t } = useTranslation();
  // Get attachment utilities for preview modal
  const { getFileType, getFileIcon, getFormattedSize } = useAttachmentPicker();

  // Handle preview trigger from TaskForm
  const handleChange = (key, value) => {
    if (key === 'showPreview' && value === true) {
      setShowPreviewModal(true);
    } else if (key === 'attachments') {
      setAttachments(value || []);
      onChange(key, value);
    } else {
      onChange(key, value);
    }
  };

  // Initialize attachments from values
  useEffect(() => {
    if (values.attachments && Array.isArray(values.attachments)) {
      setAttachments(values.attachments);
    }
  }, [values.attachments]);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.popup, { backgroundColor: theme.card }]}>
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>{t('create_new_task')}</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TaskForm
                values={values}
                onChange={handleChange}
                onSubmit={() => {
                  onSubmit();
                  onClose();
                }}
                theme={theme}
                projectId={projectId}
                projectName={projectName}
                worklistId={worklistId}
                worklistName={worklistName}
                projectTasks={projectTasks}
                users={users}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* File Preview Modal */}
      <FilePreviewModal
        visible={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        attachments={attachments}
        onRemoveFile={(index) => {
          const updatedAttachments = attachments.filter((_, i) => i !== index);
          setAttachments(updatedAttachments);
          onChange('attachments', updatedAttachments);
        }}
        theme={theme}
        getFileType={getFileType}
        getFileIcon={getFileIcon}
        getFormattedSize={getFormattedSize}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: '92%',
    borderRadius: 22,
    paddingVertical: 18,
    maxHeight: '90%',
    elevation: 8,
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
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  previewBtnText: {
    marginLeft: 4,
    fontSize: 14,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 12,
  },
});
