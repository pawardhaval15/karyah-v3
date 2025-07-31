import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomNotificationPopup from '../components/popups/CustomNotificationPopup';
import EnlargedNotificationModal from '../components/popups/EnlargedNotificationModal';

export function NotificationQueueManager({ notifications, onRemoveNotification, onClearAll, onEnlarge, onNavigate, theme }) {
  const [enlargedNotification, setEnlargedNotification] = useState(null);
  const [showEnlarged, setShowEnlarged] = useState(false);

  const handleEnlarge = (notification) => {
    setEnlargedNotification(notification);
    setShowEnlarged(true);
  };

  const handleCloseEnlarged = () => {
    setShowEnlarged(false);
    setEnlargedNotification(null);
  };

  const getNotificationPosition = (index) => {
    return {
      top: 60 + (index * 80), // Stack notifications vertically
      zIndex: 9999 - index, // Ensure proper stacking order
    };
  };

  return (
    <>
      {/* Render notifications in queue */}
      {notifications.map((notification, index) => (
        <View
          key={notification.id}
          style={[
            styles.notificationWrapper,
            getNotificationPosition(index),
          ]}
        >
          <CustomNotificationPopup
            visible={true}
            title={notification.title}
            message={notification.message}
            data={notification.data}
            onEnlarge={() => handleEnlarge(notification)}
            onCancel={() => onRemoveNotification(notification.id)}
            onNavigate={(data) => {
              onNavigate(data);
              onRemoveNotification(notification.id);
            }}
            theme={theme}
            autoHide={index === 0} // Only auto-hide the first notification
            autoHideDelay={5000}
            forceShow={true}
          />
        </View>
      ))}

      {/* Clear All Button - Show when more than 1 notification */}
      {notifications.length > 1 && (
        <View style={[styles.clearAllWrapper, { top: 60 + (notifications.length * 80) + 10 }]}>
          <TouchableOpacity
            style={[styles.clearAllButton, { backgroundColor: theme?.card || '#FFFFFF' }]}
            onPress={onClearAll}
            activeOpacity={0.8}
          >
            <Feather name="x-circle" size={16} color={theme?.secondaryText || '#666666'} />
            <Text style={[styles.clearAllText, { color: theme?.secondaryText || '#666666' }]}>
              Clear All ({notifications.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Enlarged Notification Modal */}
      <EnlargedNotificationModal
        visible={showEnlarged}
        notification={enlargedNotification}
        onClose={handleCloseEnlarged}
        onNavigate={(data) => {
          onNavigate(data);
          handleCloseEnlarged();
        }}
        theme={theme}
      />
    </>
  );
}

const styles = StyleSheet.create({
  notificationWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  clearAllWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9998,
    elevation: 9998,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    gap: 6,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
