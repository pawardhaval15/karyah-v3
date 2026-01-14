import { Poppins_400Regular, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider, useThemeContext } from './theme/ThemeContext';
import { CustomNotificationProvider } from './utils/CustomNotificationManager';
import { initI18n } from './utils/i18n';
import usePushNotifications from './utils/usePushNotifications';

// Import background message handler
import './configure/backgroundMessageHandler';

const queryClient = new QueryClient();

function AppContent() {
  const { colorMode, theme } = useThemeContext();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_700Bold,
  });

  // Sync AppState with React Query focus for automatic background refetching
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    });
    return () => subscription.remove();
  }, []);
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [biometricPassed, setBiometricPassed] = useState(false);
  const [i18nInitialized, setI18nInitialized] = useState(false);
  usePushNotifications();
  // Initialize i18n on mount
  useEffect(() => {
    async function initialize() {
      await initI18n();
      setI18nInitialized(true);
    }
    initialize();
  }, []);
  useEffect(() => {
    (async () => {
      const bio = await AsyncStorage.getItem('biometricEnabled');
      if (bio === 'true') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          alert('Biometric not available or not enrolled.');
          setBiometricChecked(true);
          setBiometricPassed(true);
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to access the app',
          fallbackLabel: 'Enter Passcode',
        });
        setBiometricChecked(true);
        setBiometricPassed(result.success);
        if (!result.success) alert('Biometric auth failed.');
      } else {
        setBiometricChecked(true);
        setBiometricPassed(true);
      }
    })();
  }, []);

  if (!fontsLoaded || !biometricChecked || !biometricPassed) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        animated
        barStyle={colorMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={Platform.OS === 'android' ? theme.card : undefined}
        translucent={false}
      />
      <CustomNotificationProvider theme={theme}>
        <AppNavigator />
      </CustomNotificationProvider>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
          <Toast />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
