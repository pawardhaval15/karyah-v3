import { Ionicons } from '@expo/vector-icons';
import ProjectPopup from 'components/popups/ProjectPopup';
import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import FabButton from './FabButton';
import FabPopup from './FabPopup';
import TaskDrawerForm from './TaskDrawerForm';

export default function ProjectFabDrawer({ onTaskSubmit, onProjectSubmit, theme }) {
  const [open, setOpen] = useState(false);
  const [drawerType, setDrawerType] = useState(null);

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

  const handleTaskSubmit = () => {
    onTaskSubmit && onTaskSubmit(taskForm);
    closeDrawer();
  };

  const handleProjectSubmit = () => {
    onProjectSubmit && onProjectSubmit(projectForm);
    closeDrawer();
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
        {drawerType === 'task' ? (
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.drawerSheet, { backgroundColor: theme.card }]}>
                  <View style={styles.drawerHeader}>
                    <Text style={[styles.drawerTitle, { color: theme.text }]}>
                      Add Task Details
                    </Text>
                    <TouchableOpacity
                      onPress={closeDrawer}
                      style={[styles.closeBtn, { backgroundColor: theme.secCard }]}>
                      <Ionicons name="close" size={20} color={theme.text} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 30 }}>
                    <TaskDrawerForm
                      values={taskForm}
                      onChange={handleTaskChange}
                      onSubmit={handleTaskSubmit}
                      theme={theme}
                    />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        ) : (
          <ProjectPopup
            visible={true}
            onClose={closeDrawer}
            values={projectForm}
            onChange={handleProjectChange}
            onSubmit={handleProjectSubmit}
            theme={theme}
          />
        )}
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
