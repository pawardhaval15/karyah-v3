// screens/AuthLoadingScreen.js
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
const AuthLoadingScreen = ({ navigation }) => {
  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');

      if (token) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    })
  );
} else {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    })
  );
}
    };

    checkToken();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2196F3" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AuthLoadingScreen;

// import React, { useEffect } from 'react';
// import { View, ActivityIndicator, StyleSheet } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { CommonActions } from '@react-navigation/native';

// const AuthLoadingScreen = ({ navigation }) => {
//   useEffect(() => {
//     const checkFirstLaunchAndAuth = async () => {
//       try {
//         const hasAcceptedTerms = await AsyncStorage.getItem('hasAcceptedTerms');
//         if (!hasAcceptedTerms) {
//           // User hasn't accepted terms yet - navigate to Terms & Policy page
//           navigation.dispatch(
//             CommonActions.reset({
//               index: 0,
//               routes: [{ name: 'TermsAndPolicy' }],
//             })
//           );
//           return; // Stop further checks
//         }

//         // Check auth token only if terms accepted
//         const token = await AsyncStorage.getItem('token');

//         if (token) {
//           navigation.dispatch(
//             CommonActions.reset({
//               index: 0,
//               routes: [{ name: 'Home' }],
//             })
//           );
//         } else {
//           navigation.dispatch(
//             CommonActions.reset({
//               index: 0,
//               routes: [{ name: 'Login' }],
//             })
//           );
//         }
//       } catch (error) {
//         // In case of error, navigate to Login safely
//         navigation.dispatch(
//           CommonActions.reset({
//             index: 0,
//             routes: [{ name: 'Login' }],
//           })
//         );
//       }
//     };

//     checkFirstLaunchAndAuth();
//   }, [navigation]);

//   return (
//     <View style={styles.container}>
//       <ActivityIndicator size="large" color="#2196F3" />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
// });

// export default AuthLoadingScreen;
