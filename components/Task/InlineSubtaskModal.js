import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { getTaskDetailsById } from '../../utils/task';
import TaskCard from './TaskCard'; // Adjust path if needed

export default function InlineSubtaskModal({ task, onClose, theme }) {
  const navigation = useNavigation();
  const [taskDetails, setTaskDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const taskId = task?.taskId || task?.id;

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const details = await getTaskDetailsById(taskId);
        setTaskDetails(details);
      } catch (e) {
        console.error('Failed to load task details:', e.message);
      } finally {
        setLoading(false);
      }
    };

    if (taskId) fetchTask();
  }, [taskId]);

  const subtasks = Array.isArray(taskDetails?.subTasks) ? taskDetails.subTasks : [];

  const handleSubtaskPress = (subtaskId) => {
    navigation.navigate('TaskDetails', { taskId: subtaskId });
  };

  return (
    <View style={[styles.inlineModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.inlineModalHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.inlineModalTitle, { color: theme.text }]}>Subtasks</Text>
        {/* <TouchableOpacity
          style={[styles.createSubtaskBtn, { backgroundColor: theme.primary + '22' }]}
          onPress={() => {
            // Add your create new subtask logic here later
          }}
        >
          <Feather name="plus" size={16} color={theme.primary} />
          <Text style={[styles.createSubtaskBtnText, { color: theme.buttonText }]}>
            Create New SubTask
          </Text>
        </TouchableOpacity> */}
      </View>

      <View style={{ paddingHorizontal: 0, paddingTop: 16 }}>
        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : subtasks.length === 0 ? (
          <View style={{ width: '100%', alignItems: 'center', marginVertical: 8 }}>
            <Text style={{ color: theme.secondaryText, textAlign: 'center' }}>
              No subtasks available
            </Text>
          </View>
        ) : (
          subtasks.map((sub, idx) => (
            <TaskCard
              key={sub.taskId || sub.id || idx}
              task={{
                ...sub,
                name: sub.taskName || sub.name || sub.title || `Subtask ${idx + 1}`,
              }}
              onSubtaskPress={() => handleSubtaskPress(sub.taskId || sub.id)}
              theme={theme}
            />
          ))
        )}
      </View>

      <View style={[styles.footerActions, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.footerButton, { backgroundColor: theme.primary + '22' }]}
          onPress={() => navigation.navigate('TaskDetails', { taskId })}
        >
          <Text style={[styles.footerButtonText, { color: theme.buttonText }]}>
            See Task Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.footerClose}>
          <Text style={[styles.footerCloseText, { color: theme.primary }]}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}





const styles = StyleSheet.create({
  inlineModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e6eaf3',
    paddingBottom: 8,
    overflow: 'hidden',
  },
  inlineModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomColor: '#e6eaf3',
    borderBottomWidth: 1,
  },
  createSubtaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF1FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  createSubtaskBtnText: {
    color: '#2563EB',
    fontWeight: '400',
    fontSize: 14,
    marginLeft: 4,
  },
  inlineModalTitle: {
    fontWeight: '500',
    fontSize: 16,
    color: '#222',
  },
  subtaskItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    backgroundColor: '#F8F9FB',
  },
  subtaskText: {
    fontSize: 16,
    fontWeight: '400',
  },
  noSubtasksText: {
    color: '#888',
    alignSelf: 'center',
    marginVertical: 14,
    fontStyle: 'italic',
    fontSize: 14,
  },
  footerActions: {
    borderTopWidth: 1,
    borderTopColor: '#e6eaf3',
    marginTop: 12,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  footerButton: {
    backgroundColor: '#EAF1FF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  footerButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '500',
  },
  footerClose: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerCloseText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '500',
  },
});
