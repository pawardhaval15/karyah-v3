import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import TagsInput from '../ui/TagsInput';

export default function ProjectTagsManagementModal({
  visible,
  onClose,
  project,
  onSave,
  theme,
}) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project && project.tags) {
      setTags(Array.isArray(project.tags) ? project.tags : []);
    } else {
      setTags([]);
    }
  }, [project]);

  const handleSave = async () => {
    if (!project) return;

    try {
      setLoading(true);
      const projectId = project.id || project.projectId || project._id;
      await onSave(projectId, tags);
      Alert.alert('Success', 'Project tags updated successfully!');
      onClose();
    } catch (error) {
      console.error('❌ Error saving project tags:', error);
      Alert.alert('Error', 'Failed to update project tags. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset tags to original state
    if (project && project.tags) {
      setTags(Array.isArray(project.tags) ? project.tags : []);
    } else {
      setTags([]);
    }
    onClose();
  };

  if (!project) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="local-offer" size={24} color={theme.primary} />
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Manage Project Tags
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.secondaryText} />
            </TouchableOpacity>
          </View>

          {/* Project Info */}
          <View style={[styles.projectInfo, { backgroundColor: theme.background + '80' }]}>
            <Text style={[styles.projectName, { color: theme.text }]}>
              {project.projectName || project.name || 'Unknown Project'}
            </Text>
            <Text style={[styles.projectDesc, { color: theme.secondaryText }]}>
              Add and manage tags for this project
            </Text>
          </View>

          {/* Tags Input */}
          <View style={styles.tagsSection}>
            <TagsInput
              tags={tags}
              onTagsChange={setTags}
              theme={theme}
              placeholder="Add project tags..."
              maxTags={15}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: theme.border }
              ]}
              onPress={handleCancel}
              disabled={loading}>
              <Text style={[styles.buttonText, { color: theme.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                { backgroundColor: theme.primary }
              ]}
              onPress={handleSave}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: '#fff' }]}>
                  Save Tags
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  projectInfo: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  projectDesc: {
    fontSize: 14,
    fontWeight: '400',
  },
  tagsSection: {
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    // backgroundColor will be set dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
