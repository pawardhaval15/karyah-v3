// 📁 SystemNotificationService.js - Native system notifications
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { Platform, ToastAndroid } from 'react-native';
import Toast from 'react-native-toast-message';
import { getCustomNotificationsEnabled } from '../components/popups/CustomNotificationPopup';
import { navigationRef } from '../navigation/navigationRef';
import CustomNotificationManager from './CustomNotificationManager';

const API_URL = 'https://api.karyah.in/';

class SystemNotificationService {
  constructor() {
    // No push notification library configuration needed
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
      // Android: Use ToastAndroid for local feedback in foreground
      ToastAndroid.showWithGravityAndOffset(
        `${title}: ${body}`,
        ToastAndroid.LONG,
        ToastAndroid.TOP,
        25,
        50
      );
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
      case 'task_message':
      case 'task_mention':
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
