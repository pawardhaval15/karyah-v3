// // pushNotification.js
// import PushNotification from 'react-native-push-notification';
// import PushNotificationIOS from '@react-native-community/push-notification-ios';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { Platform } from 'react-native';

// const API_URL = 'https://api.karyah.in/';

// export function configurePushNotifications() {
//   if (Platform.OS !== 'ios') return;

//   PushNotification.configure({
//     onRegister: async function (token) {
//       console.log('📱 Raw APNs token received:', token.token);

//       const userToken = await AsyncStorage.getItem('token');
//       if (!userToken) {
//         console.warn('⚠️ No user token, skipping APNs token upload.');
//         return;
//       }

//       try {
//         const res = await fetch(`${API_URL}api/devices/deviceToken`, {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${userToken}`,
//           },
//           body: JSON.stringify({
//             deviceToken: token.token, // raw APNs token
//             platform: 'iOS',
//           }),
//         });

//         const data = await res.json();
//         console.log('✅ Raw APNs token registered:', data);
//       } catch (err) {
//         console.error('❌ Error sending APNs token:', err);
//       }
//     },

//     onNotification: function (notification) {
//       console.log('🔔 Notification received:', notification);
//       notification.finish(PushNotificationIOS.FetchResult.NoData);
//     },

//     permissions: {
//       alert: true,
//       badge: true,
//       sound: true,
//     },

//     requestPermissions: true,
//   });
// }
