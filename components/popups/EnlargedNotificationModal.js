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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme?.background || '#FFFFFF' }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme?.border || '#E1E5E9' }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: theme?.primary || '#007AFF' }]}>
              <MaterialIcons name="notifications" size={20} color="#FFFFFF" />
            </View>
            <Text style={[styles.headerTitle, { color: theme?.text || '#000000' }]}>
              Notification Details
            </Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Feather name="x" size={24} color={theme?.text || '#000000'} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme?.secondaryText || '#666666' }]}>
              NOTIFICATION
            </Text>
            <View style={[styles.card, { backgroundColor: theme?.card || '#F8F9FA' }]}>
              <Text style={[styles.titleText, { color: theme?.text || '#000000' }]}>
                {title}
              </Text>
            </View>
          </View>

          {/* Message Section - Main Focus */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme?.secondaryText || '#666666' }]}>
              MESSAGE
            </Text>
            <View style={[styles.messageCard, { backgroundColor: theme?.card || '#F8F9FA' }]}>
              <Text style={[styles.messageText, { color: theme?.text || '#000000' }]}>
                {message}
              </Text>
            </View>
          </View>

          {/* Quick Details */}
          {data?.type && (
            <View style={styles.section}>
              <View style={styles.quickDetails}>
                <View style={[styles.detailBadge, { backgroundColor: theme?.primary + '20' || '#007AFF20' }]}>
                  <Text style={[styles.detailBadgeText, { color: theme?.primary || '#007AFF' }]}>
                    {data.type.toUpperCase()}
                  </Text>
                </View>
                {data?.priority && (
                  <View style={[styles.detailBadge, { backgroundColor: 
                    data.priority === 'high' ? '#FF453A20' :
                    data.priority === 'critical' ? '#FF453A30' : '#34C75920'
                  }]}>
                    <Text style={[styles.detailBadgeText, { color: 
                      data.priority === 'high' ? '#FF453A' :
                      data.priority === 'critical' ? '#FF453A' : '#34C759'
                    }]}>
                      {data.priority.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.footer, { borderTopColor: theme?.border || '#E1E5E9' }]}>
          {data && (
            <TouchableOpacity
              style={[styles.actionButton, styles.navigateButton, { backgroundColor: theme?.primary || '#007AFF' }]}
              onPress={handleNavigate}
              activeOpacity={0.8}
            >
              <Feather name="external-link" size={18} color="#FFFFFF" />
              <Text style={styles.navigateButtonText}>Open {data.type || 'Item'}</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.dismissButton, { backgroundColor: theme?.card || '#F8F9FA' }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Feather name="x" size={18} color={theme?.text || '#000000'} />
            <Text style={[styles.dismissButtonText, { color: theme?.text || '#000000' }]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60, // Account for status bar
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  messageCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    minHeight: 100,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  quickDetails: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
    marginRight: 12,
  },
  dataValue: {
    fontSize: 14,
    flex: 1,
    fontWeight: '400',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34, // Account for home indicator
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  navigateButton: {
    backgroundColor: '#007AFF',
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
