// Background message handler for Firebase FCM
// This file should be registered as the background handler
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('FCM Background Message received:', remoteMessage);
  
  // You can perform background processing here
  // For example, update local storage, sync data, etc.
  
  try {
    // Store notification data for later processing if needed
    const notifications = await AsyncStorage.getItem('background_notifications');
    const parsedNotifications = notifications ? JSON.parse(notifications) : [];
    
    parsedNotifications.push({
      ...remoteMessage,
      receivedAt: Date.now(),
    });
    
    // Keep only last 50 notifications
    if (parsedNotifications.length > 50) {
      parsedNotifications.splice(0, parsedNotifications.length - 50);
    }
    
    await AsyncStorage.setItem('background_notifications', JSON.stringify(parsedNotifications));
    
    console.log(' Background notification processed and stored');
  } catch (error) {
    console.error(' Error processing background notification:', error);
  }
});
