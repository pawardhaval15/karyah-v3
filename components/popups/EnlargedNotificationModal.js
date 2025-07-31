import { Feather, MaterialIcons } from '@expo/vector-icons';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function EnlargedNotificationModal({
  visible,
  notification,
  onClose,
  onNavigate,
  theme,
}) {
  if (!notification) return null;

  const { title, message, data } = notification;

  const handleNavigate = () => {
    if (onNavigate && data) {
      onNavigate(data);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme?.background || '#FFFFFF' }]}>
        {/* Drag Handle */}
        <View style={styles.dragHandle}>
          <View style={[styles.handleBar, { backgroundColor: theme?.border || '#E1E5E9' }]} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Notification Container - Same style as popup */}
          <View style={[styles.notificationContainer, { 
            backgroundColor: theme?.card || '#FFFFFF', 
            borderColor: theme?.border || '#E1E5E9' 
          }]}>
            {/* Header with App Icon - Same as popup */}
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: theme?.primary || '#007AFF' }]}>
                <MaterialIcons name="notifications" size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.appName, { color: theme?.secondaryText || '#666666' }]}>
                Karyah
              </Text>
              <View style={styles.timestamp}>
                <Text style={[styles.timeText, { color: theme?.secondaryText || '#666666' }]}>
                  {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                </Text>
              </View>
            </View>

            {/* Notification Title - Same as popup */}
            <Text style={[styles.notificationTitle, { color: theme?.text || '#000000' }]}>
              {title}
            </Text>

            {/* Type indicator - Same as popup */}
            {data?.type && (
              <View style={styles.typeIndicator}>
                <View style={[styles.typeBadge, { backgroundColor: theme?.primary + '20' || '#007AFF20' }]}>
                  <Text style={[styles.typeText, { color: theme?.primary || '#007AFF' }]}>
                    {data.type.toUpperCase()}
                  </Text>
                </View>
                {data?.priority && (
                  <View style={[styles.priorityBadge, { backgroundColor: 
                    data.priority === 'high' ? '#FF453A20' :
                    data.priority === 'critical' ? '#FF453A30' : '#34C75920'
                  }]}>
                    <Text style={[styles.typeText, { color: 
                      data.priority === 'high' ? '#FF453A' :
                      data.priority === 'critical' ? '#FF453A' : '#34C759'
                    }]}>
                      {data.priority.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Swipe indicator - Same as popup */}
            <View style={[styles.swipeIndicator, { backgroundColor: theme?.border || '#E1E5E9' }]} />
          </View>

          {/* Message Section - Expanded */}
          <View style={styles.messageSection}>
            <Text style={[styles.sectionLabel, { color: theme?.secondaryText || '#666666' }]}>
              MESSAGE
            </Text>
            <View style={[styles.messageCard, { backgroundColor: theme?.card || '#FFFFFF', borderColor: theme?.border || '#E1E5E9' }]}>
              <Text style={[styles.messageText, { color: theme?.text || '#000000' }]}>
                {message}
              </Text>
            </View>
          </View>

          {/* Additional Details if any */}
          {(data?.projectId || data?.taskId || data?.issueId) && (
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionLabel, { color: theme?.secondaryText || '#666666' }]}>
                DETAILS
              </Text>
              <View style={[styles.detailsCard, { backgroundColor: theme?.card || '#FFFFFF', borderColor: theme?.border || '#E1E5E9' }]}>
                {data?.projectId && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme?.secondaryText || '#666666' }]}>Project ID:</Text>
                    <Text style={[styles.detailValue, { color: theme?.text || '#000000' }]}>{data.projectId}</Text>
                  </View>
                )}
                {data?.taskId && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme?.secondaryText || '#666666' }]}>Task ID:</Text>
                    <Text style={[styles.detailValue, { color: theme?.text || '#000000' }]}>{data.taskId}</Text>
                  </View>
                )}
                {data?.issueId && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme?.secondaryText || '#666666' }]}>Issue ID:</Text>
                    <Text style={[styles.detailValue, { color: theme?.text || '#000000' }]}>{data.issueId}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons - Enhanced */}
        <View style={styles.actionSection}>
          {data && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme?.primary || '#007AFF' }]}
              onPress={handleNavigate}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={16} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                Open {data.type === 'task' ? 'Task' : data.type === 'project' ? 'Project' : data.type === 'issue' ? 'Issue' : 'Item'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme?.card || '#F8F9FA', borderColor: theme?.border || '#E1E5E9' }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Feather name="x" size={16} color={theme?.secondaryText || '#666666'} />
            <Text style={[styles.secondaryButtonText, { color: theme?.secondaryText || '#666666' }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E1E5E9',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notificationContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  appName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666666',
    flex: 1,
  },
  timestamp: {
    marginLeft: 'auto',
  },
  timeText: {
    fontSize: 11,
    color: '#666666',
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
    lineHeight: 18,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#007AFF20',
    marginRight: 6,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#007AFF',
  },
  swipeIndicator: {
    height: 2,
    backgroundColor: '#E1E5E9',
    borderRadius: 1,
    marginTop: 8,
  },
  messageSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
  },
  detailsSection: {
    marginBottom: 20,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1E5E9',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  actionSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E1E5E9',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
});
