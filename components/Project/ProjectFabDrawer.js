import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import FabButton from './FabButton';
import FabPopup from './FabPopup';
import ProjectDrawerForm from './ProjectDrawerForm';
import TaskDrawerForm from './TaskDrawerForm';
export default function ProjectFabDrawer({ onTaskSubmit, onProjectSubmit, theme }) {
  const [open, setOpen] = useState(false);
  const [drawerType, setDrawerType] = useState(null);
  const { t } = useTranslation();
  // Task form state
  const [taskForm, setTaskForm] = useState({
    taskName: '',
    projectId: '',
    taskWorklist: '',
    taskDeps: [],
    startDate: '', // <-- must be startDate
    endDate: '', // <-- must be endDate
    assignTo: [], // <-- must be assignTo
    taskDesc: '',
  });

  // Project form state
  const [projectForm, setProjectForm] = useState({
    projectName: '',
    projectDesc: '',
  });

  const closeDrawer = () => {
    setOpen(false);
    setDrawerType(null);
  };

  const handleTaskChange = (field, value) => {
    setTaskForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleProjectChange = (field, value) => {
    setProjectForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTaskSubmit = async () => {
    try {
      if (onTaskSubmit) {
        await onTaskSubmit(taskForm);
      }
      // Reset task form after successful submission
      setTaskForm({
        taskName: '',
        projectId: '',
        taskWorklist: '',
        taskDeps: [],
        startDate: '',
        endDate: '',
        assignTo: [],
        taskDesc: '',
      });
      closeDrawer();
    } catch (error) {
      console.error('Error in task submission callback:', error);
      closeDrawer(); // Still close even if callback fails
    }
  };

  const handleProjectSubmit = async () => {
    try {
      if (onProjectSubmit) {
        await onProjectSubmit(projectForm);
      }
      // Reset project form after successful submission
      setProjectForm({
        projectName: '',
        projectDesc: '',
      });
      closeDrawer();
    } catch (error) {
      console.error('Error in project submission callback:', error);
      closeDrawer(); // Still close even if callback fails
    }
  };

  return (
    <>
      <View style={styles.fabContainer}>
        {open && !drawerType && (
          <FabPopup
            onTask={() => setDrawerType('task')}
            onProject={() => setDrawerType('project')}
            theme={theme}
          />
        )}
        <FabButton onPress={() => setOpen(!open)} theme={theme} />
      </View>
      <Modal visible={!!drawerType} animationType="slide" transparent onRequestClose={closeDrawer}>
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
              <View style={[styles.drawerSheet, { backgroundColor: theme.card }]}>
                <Pressable onPress={() => Keyboard.dismiss()}>
                  <View style={styles.drawerHeader}>
                    <Text style={[styles.drawerTitle, { color: theme.text }]}>
                      {drawerType === 'task' ? t('add_task_details') : t('create_new_project')}
                    </Text>
                    <TouchableOpacity
                      onPress={closeDrawer}
                      style={[styles.closeBtn, { backgroundColor: theme.secCard }]}>
                      <Ionicons name="close" size={20} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                </Pressable>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 30 }}>
                  <Pressable onPress={() => Keyboard.dismiss()}>
                    {drawerType === 'task' ? (
                      <TaskDrawerForm
                        values={taskForm}
                        onChange={handleTaskChange}
                        onSubmit={handleTaskSubmit}
                        theme={theme}
                      />
                    ) : drawerType === 'project' ? (
                      <ProjectDrawerForm
                        values={projectForm}
                        onChange={handleProjectChange}
                        onSubmit={handleProjectSubmit}
                        hideSimpleForm={true}
                      />
                    ) : null}
                  </Pressable>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    zIndex: 10,
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.10)',
    justifyContent: 'flex-end',
  },
  drawerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 28,
    paddingBottom: 0,
    minHeight: 380,
    maxHeight: '90%',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  drawerTitle: {
    fontSize: 19,
    fontWeight: '500',
    color: '#222',
  },
  closeBtn: {
    backgroundColor: '#F4F6FB',
    borderRadius: 20,
    padding: 4,
  },
});
