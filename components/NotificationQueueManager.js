import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomNotificationPopup from '../components/popups/CustomNotificationPopup';
import EnlargedNotificationModal from '../components/popups/EnlargedNotificationModal';

const { width: screenWidth } = Dimensions.get('window');

export function NotificationQueueManager({ notifications, onRemoveNotification, onClearAll, onNavigate, theme }) {
  const [enlargedNotification, setEnlargedNotification] = useState(null);
  const [showEnlarged, setShowEnlarged] = useState(false);

  // Auto-remove notifications after 8 seconds based on their arrival time
  useEffect(() => {
    const timers = [];
    
    notifications.forEach((notification) => {
      if (notification.timestamp) {
        const arrivalTime = new Date(notification.timestamp).getTime();
        const currentTime = Date.now();
        const elapsed = currentTime - arrivalTime;
        const remaining = Math.max(8000 - elapsed, 0); // 3 seconds total

        if (remaining > 0) {
          const timer = setTimeout(() => {
            onRemoveNotification(notification.id);
          }, remaining);
          
          timers.push(timer);
        } else {
          // Already expired, remove immediately
          setTimeout(() => onRemoveNotification(notification.id), 100);
        }
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, onRemoveNotification]);

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
      top: Platform.OS === 'ios' ? 10 + (index * 65) : 10 + (index * 65), // Stack notifications vertically
      left: 0,
      right: 0,
      zIndex: 9999 - index,
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
            autoHide={false} // Disable auto-hide, managed by queue
            forceShow={true}
            disablePositioning={true}
          />
        </View>
      ))}

      {/* Clear All Button - Show when more than 1 notification */}
      {notifications.length > 1 && (
        <View style={[
          styles.clearAllWrapper, 
          { 
            top: Platform.OS === 'ios' ? 60 + (notifications.length * 65) + 10 : 35 + (notifications.length * 65) + 10 
          }
        ]}>
          <TouchableOpacity
            style={[styles.clearAllButton, { backgroundColor: theme?.card || '#FFFFFF' }]}
            onPress={onClearAll}
            activeOpacity={0.8}
          >
            <Feather name="x-circle" size={12} color={theme?.secondaryText || '#666666'} />
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    gap: 4,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
