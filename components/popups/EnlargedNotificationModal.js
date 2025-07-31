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

  const formatNotificationData = () => {
    if (!data) return [];

    const items = [];
    
    if (data.type) {
      items.push({ label: 'Type', value: data.type.toUpperCase() });
    }
    
    if (data.projectId) {
      items.push({ label: 'Project ID', value: data.projectId });
    }
    
    if (data.taskId) {
      items.push({ label: 'Task ID', value: data.taskId });
    }
    
    if (data.issueId) {
      items.push({ label: 'Issue ID', value: data.issueId });
    }
    
    if (data.priority) {
      items.push({ label: 'Priority', value: data.priority });
    }
    
    if (data.timestamp) {
      items.push({ label: 'Time', value: new Date(data.timestamp).toLocaleString() });
    }

    return items;
  };

  const notificationData = formatNotificationData();

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

        {/* Compact Header */}
        <View style={[styles.header, { borderBottomColor: theme?.border || '#E1E5E9' }]}>
          <View style={styles.headerContent}>
            <View style={[styles.iconContainer, { backgroundColor: theme?.primary || '#007AFF' }]}>
              <MaterialIcons name="notifications" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.headerTitle, { color: theme?.text || '#000000' }]}>
              Notification
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Feather name="x" size={20} color={theme?.secondaryText || '#666666'} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title Section - Compact */}
          <View style={styles.titleSection}>
            <Text style={[styles.titleText, { color: theme?.text || '#000000' }]}>
              {title}
            </Text>
          </View>

          {/* Message Section - Main Focus */}
          <View style={styles.messageSection}>
            <Text style={[styles.messageText, { color: theme?.text || '#000000' }]}>
              {message}
            </Text>
          </View>

          {/* Quick Details - Compact Badges */}
          {data?.type && (
            <View style={styles.badgeSection}>
              <View style={[styles.typeBadge, { backgroundColor: theme?.primary + '15' || '#007AFF15' }]}>
                <Text style={[styles.badgeText, { color: theme?.primary || '#007AFF' }]}>
                  {data.type.toUpperCase()}
                </Text>
              </View>
              {data?.priority && (
                <View style={[styles.priorityBadge, { backgroundColor: 
                  data.priority === 'high' ? '#FF453A15' :
                  data.priority === 'critical' ? '#FF453A20' : '#34C75915'
                }]}>
                  <Text style={[styles.badgeText, { color: 
                    data.priority === 'high' ? '#FF453A' :
                    data.priority === 'critical' ? '#FF453A' : '#34C759'
                  }]}>
                    {data.priority.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Action Buttons - Compact */}
        <View style={[styles.footer, { borderTopColor: theme?.border || '#E1E5E9' }]}>
          {data && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme?.primary || '#007AFF' }]}
              onPress={handleNavigate}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={16} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Open</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.secondaryButton, { backgroundColor: theme?.card || '#F8F9FA', borderColor: theme?.border || '#E1E5E9' }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: theme?.text || '#000000' }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dragHandle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  titleSection: {
    marginBottom: 16,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  messageSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  badgeSection: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
