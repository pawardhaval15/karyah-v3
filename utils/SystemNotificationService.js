// 📁 SystemNotificationService.js - Native system notifications
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { Platform, ToastAndroid } from 'react-native';
import Toast from 'react-native-toast-message';
import { getCustomNotificationsEnabled } from '../components/popups/CustomNotificationPopup';
import { navigationRef } from '../navigation/navigationRef';
import CustomNotificationManager from './CustomNotificationManager';

// Try to import PushNotification, fallback if not available
let PushNotification;
try {
  PushNotification = require('react-native-push-notification').default;
} catch (error) {
  console.warn('📱 react-native-push-notification not available, using fallback');
  PushNotification = null;
}

const API_URL = 'https://api.karyah.in/';

class SystemNotificationService {
  constructor() {
    this.configure();
  }

  configure() {
    // Only configure if PushNotification is available
    if (!PushNotification) {
      console.warn('📱 PushNotification not available, using fallback notifications');
      return;
    }

    // Configure push notifications
    PushNotification.configure({
      // Called when notification is tapped
      onNotification: function(notification) {
        console.log('📱 System notification tapped:', notification);
        
        if (notification.userInteraction) {
          // User tapped the notification
          if (notification.data) {
            SystemNotificationService.handleNotificationNavigation(notification.data);
          }
        }
      },

      // Called when FCM token is refreshed
      onRegister: function(token) {
        console.log('📲 System notification token:', token);
      },

      // iOS permissions
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Create notification channels for Android
    if (Platform.OS === 'android' && PushNotification) {
      PushNotification.createChannel(
        {
          channelId: 'karyah-default',
          channelName: 'Karyah Notifications',
          channelDescription: 'Default notifications for Karyah app',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`📱 Android channel created: ${created}`)
      );

      PushNotification.createChannel(
        {
          channelId: 'karyah-critical',
          channelName: 'Karyah Critical',
          channelDescription: 'Critical notifications for Karyah app',
          playSound: true,
          soundName: 'default',
          importance: 5,
          vibrate: true,
        },
        (created) => console.log(`📱 Android critical channel created: ${created}`)
      );
    }
  }

  // Show local notification in foreground
  static async showForegroundNotification(remoteMessage) {
    const title = remoteMessage.notification?.title || 'Karyah';
    const body = remoteMessage.notification?.body || 'You have a new notification';
    const data = remoteMessage.data || {};

    // Check if custom notifications are enabled
    const customNotificationsEnabled = await getCustomNotificationsEnabled();

    if (customNotificationsEnabled) {
      // Show custom notification popup
      CustomNotificationManager.showNotification({
        title: title,
        message: body,
        data: data,
      });
      return;
    }

    // Fallback to system notifications
    if (Platform.OS === 'android') {
      // Android: Try PushNotification first, fallback to ToastAndroid
      if (PushNotification) {
        PushNotification.localNotification({
          title: title,
          message: body,
          playSound: true,
          soundName: 'default',
          channelId: data.priority === 'high' ? 'karyah-critical' : 'karyah-default',
          largeIcon: 'ic_launcher',
          smallIcon: 'ic_notification',
          userInfo: data,
          importance: 'high',
          priority: 'high',
        });
      } else {
        // Fallback to ToastAndroid
        ToastAndroid.showWithGravityAndOffset(
          `${title}: ${body}`,
          ToastAndroid.LONG,
          ToastAndroid.TOP,
          25,
          50
        );
      }
    } else {
      // iOS: Use Toast with better styling
      Toast.show({
        type: 'info',
        text1: title,
        text2: body,
        position: 'top',
        visibilityTime: 5000,
        autoHide: true,
        topOffset: 50,
        onPress: () => {
          SystemNotificationService.handleNotificationNavigation(data);
          Toast.hide();
        },
      });
    }
  }

  // Handle notification navigation
  static handleNotificationNavigation(data) {
    if (!data || !data.type) {
      console.log('📬 System notification received without navigation data');
      return;
    }

    console.log('🔄 System notification navigation:', data);

    if (!navigationRef.isReady()) {
      console.warn('🔄 Navigation not ready, waiting...');
      setTimeout(() => {
        SystemNotificationService.handleNotificationNavigation(data);
      }, 1000);
      return;
    }

    switch (data.type) {
      case 'project':
        if (data.projectId) {
          navigationRef.navigate('ProjectDetailsScreen', {
            projectId: data.projectId,
          });
        }
        break;
      case 'task':
        if (data.taskId) {
          navigationRef.navigate('TaskDetails', {
            taskId: data.taskId,
          });
        }
        break;
      case 'issue':
        if (data.issueId) {
          navigationRef.navigate('IssueDetails', {
            issueId: data.issueId,
          });
        }
        break;
      default:
        console.warn('📬 Unknown notification type:', data.type);
    }
  }

  // Setup FCM listeners
  static setupFCMListeners() {
    // Foreground notifications
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('📥 FCM foreground message:', remoteMessage);
      SystemNotificationService.showForegroundNotification(remoteMessage);
    });

    // Background app opened
    const unsubscribeBackgroundOpen = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('🔄 FCM background app opened:', remoteMessage);
      if (remoteMessage?.data) {
        setTimeout(() => {
          SystemNotificationService.handleNotificationNavigation(remoteMessage.data);
        }, Platform.OS === 'ios' ? 1000 : 500);
      }
    });

    // App opened from quit state
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('📲 FCM app opened from quit state:', remoteMessage);
          if (remoteMessage?.data) {
            setTimeout(() => {
              SystemNotificationService.handleNotificationNavigation(remoteMessage.data);
            }, Platform.OS === 'ios' ? 2000 : 1000);
          }
        }
      });

    // Token refresh
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async token => {
      console.log('🔄 FCM token refreshed:', token);
      await SystemNotificationService.registerToken(token);
    });

    return () => {
      unsubscribeForeground();
      unsubscribeBackgroundOpen();
      unsubscribeTokenRefresh();
    };
  }

  // Register FCM token with backend
  static async registerToken(token = null) {
    try {
      if (!token) {
        token = await messaging().getToken();
      }

      if (!token) {
        console.warn('⚠️ No FCM token available');
        return;
      }

      const userToken = await AsyncStorage.getItem('token');
      if (!userToken) {
        console.warn('⚠️ No user auth token found');
        return;
      }

      const platformName = Platform.OS === 'ios' ? 'iOS' : 'Android';
      
      const response = await fetch(`${API_URL}api/devices/deviceToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          deviceToken: token,
          platform: platformName,
          tokenType: 'FCM',
        }),
      });

      const data = await response.json();
      console.log(`✅ ${platformName} FCM token registered:`, data);
      
      // Store locally
      await AsyncStorage.setItem(`fcm_token_${Platform.OS}`, token);
      
    } catch (error) {
      console.error('❌ Error registering FCM token:', error);
    }
  }
}

export default SystemNotificationService;
