import messaging from '@react-native-firebase/messaging';
import { useEffect } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import SystemNotificationService from './SystemNotificationService';

const API_URL = 'https://api.karyah.in/';

async function requestUserPermission() {
  // Android specific permission
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'Karyah needs notification permission to alert you.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('🛑 Android notification permission denied.');
        return false;
      }
    } catch (err) {
      console.warn('🛑 Android permission request failed:', err);
      return false;
    }
  }

  // Firebase messaging permission (both iOS and Android)
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      if (Platform.OS === 'ios') {
        Alert.alert(
          'Notification Permission',
          'Push notifications are disabled. Please enable them in Settings to receive important updates.',
          [{ text: 'OK' }]
        );
      }
      console.warn('🛑 FCM permission denied.');
      return false;
    }

    return true;
  } catch (error) {
    console.error(' Error requesting FCM permission:', error);
    return false;
  }
}

export default function usePushNotifications() {
  useEffect(() => {
    // Initialize system notification service
    const notificationService = new SystemNotificationService();
    
    // Request permissions and register token
    const initializeNotifications = async () => {
      const hasPermission = await requestUserPermission();
      if (hasPermission) {
        await SystemNotificationService.registerToken();
      }
    };

    initializeNotifications();

    // Setup FCM listeners using the system notification service
    const cleanup = SystemNotificationService.setupFCMListeners();

    return cleanup;
  }, []);
}
