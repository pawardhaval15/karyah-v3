import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function CustomNotificationPopup({
  visible,
  title,
  message,
  data,
  onEnlarge,
  onCancel,
  onNavigate,
  theme,
  autoHide = true,
  autoHideDelay = 5000,
  forceShow = false, // New prop to bypass settings check for testing
  disablePositioning = false, // New prop to disable internal positioning
}) {
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showNotifications, setShowNotifications] = useState(true);

  // Check notification settings from AsyncStorage
  useEffect(() => {
    const checkNotificationSettings = async () => {
      try {
        const setting = await AsyncStorage.getItem('customNotificationsEnabled');
        setShowNotifications(setting !== 'false'); // Default to true if not set
      } catch (error) {
        console.log('Error checking notification settings:', error);
        setShowNotifications(true);
      }
    };
    checkNotificationSettings();
  }, []);

  // Auto-hide logic
  useEffect(() => {
    if (visible && autoHide && !forceShow) {
      const timer = setTimeout(() => {
        onCancel();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [visible, autoHide, autoHideDelay, forceShow, onCancel]);

  // Animation effects
  useEffect(() => {
    console.log('🎭 CustomNotificationPopup animation effect:', { visible, showNotifications, title, message, forceShow });
    if (visible && (showNotifications || forceShow)) {
      console.log('▶️ Starting slide-in animation...');
      // Slide in from right
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: disablePositioning ? 0 : 20, // Full width: 0, normal: 20px from right
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('✅ Slide-in animation completed');
      });
    } else {
      console.log('◀️ Hiding notification...');
      hideNotification();
    }
  }, [visible, showNotifications, forceShow, disablePositioning]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onCancel) onCancel();
    });
  };

  const handleTap = () => {
    if (onNavigate && data) {
      onNavigate(data);
    }
    hideNotification();
  };

  // Swipe to dismiss functionality
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 100;
      },
      onPanResponderGrant: () => {
        slideAnim.setOffset(disablePositioning ? 0 : 20);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        slideAnim.flattenOffset();
        
        if (gestureState.dx > 100 || gestureState.vx > 0.5) {
          // Swipe right to dismiss
          hideNotification();
        } else {
          // Snap back to original position
          Animated.spring(slideAnim, {
            toValue: disablePositioning ? 0 : 20,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible || (!showNotifications && !forceShow)) {
    console.log('🚫 CustomNotificationPopup not showing:', { visible, showNotifications, forceShow });
    return null;
  }

  console.log('✅ CustomNotificationPopup rendering with:', { title, message, data });

  return (
    <View style={[
      disablePositioning ? styles.overlayNoPosition : styles.overlay
    ]} pointerEvents="box-none">
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.container,
          {
            backgroundColor: theme?.card || '#FFFFFF',
            borderColor: theme?.border || '#E1E5E9',
            transform: [{ translateX: slideAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
          {/* Notification Content */}
          <TouchableOpacity
            style={styles.content}
            onPress={handleTap}
            activeOpacity={0.8}
          >
            {/* Header with App Icon */}
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: theme?.primary || '#007AFF' }]}>
                <MaterialIcons name="notifications" size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.appName, { color: theme?.secondaryText || '#666666' }]}>
                Karyah
              </Text>
              <View style={styles.timestamp}>
                <Text style={[styles.timeText, { color: theme?.secondaryText || '#666666' }]}>
                  now
                </Text>
              </View>
            </View>

            {/* Notification Title - Compact */}
            <Text
              style={[styles.title, { color: theme?.text || '#000000' }]}
              numberOfLines={1}
            >
              {title}
            </Text>

            {/* Notification Description - Small */}
            {message && (
              <Text
                style={[styles.description, { color: theme?.secondaryText || '#666666' }]}
                numberOfLines={2}
              >
                {message}
              </Text>
            )}

            {/* Type indicator - smaller */}
            {data?.type && (
              <View style={styles.typeIndicator}>
                <View style={[styles.typeBadge, { backgroundColor: theme?.primary + '20' || '#007AFF20' }]}>
                  <Text style={[styles.typeText, { color: theme?.primary || '#007AFF' }]}>
                    {data.type.toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Action Buttons - Only Cancel */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={hideNotification}
              activeOpacity={0.7}
            >
              <Feather name="x" size={14} color={theme?.secondaryText || '#666666'} />
            </TouchableOpacity>
          </View>

          {/* Swipe indicator */}
          <View style={[styles.swipeIndicator, { backgroundColor: theme?.border || '#E1E5E9' }]} />
        </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 35,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  overlayNoPosition: {
    // No positioning when managed externally - full width
    flex: 1,
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
  },
  content: {
    padding: 12,
    paddingRight: 44, // Space for single cancel button
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconContainer: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  appName: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  timestamp: {
    marginLeft: 'auto',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '400',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  description: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 6,
    opacity: 0.8,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  typeIndicator: {
    marginTop: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  enlargeButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  cancelButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  swipeIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});

// Utility function to show notification settings
export const toggleCustomNotifications = async (enabled) => {
  try {
    await AsyncStorage.setItem('customNotificationsEnabled', enabled.toString());
    return true;
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return false;
  }
};

// Utility function to get notification settings
export const getCustomNotificationsEnabled = async () => {
  try {
    const setting = await AsyncStorage.getItem('customNotificationsEnabled');
    return setting !== 'false'; // Default to true if not set
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return true;
  }
};
