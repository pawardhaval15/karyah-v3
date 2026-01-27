import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect } from 'react';
import {
  Alert,
  Dimensions,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import Header from '../components/Login/Header';
import LoginPanel from '../components/Login/LoginPanel';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';
import { loginWithPin } from '../utils/auth';

export default function PinLoginScreen({ navigation }) {
  const theme = useTheme();
  const {
    mobile, otp, setLoginStep, isNewUser
  } = useAuthStore();

  // Safety: Force Step 1 (Mobile/Email entry) on mount
  useEffect(() => {
    setLoginStep(1);
  }, [setLoginStep]);

  const handleContinue = useCallback(async () => {
    const enteredPin = otp.join('');

    if (!mobile || enteredPin.length !== 4) {
      Alert.alert("Error", "Please enter mobile number/email and complete 4-digit PIN.");
      return;
    }

    try {
      const res = await loginWithPin(mobile, enteredPin);
      await AsyncStorage.setItem('token', res.token);

      // Navigate to Home if explicitly requested, or if user is registered
      if (res.redirectTo === 'dashboard' || res.user?.isRegistered || res.isRegistered || !isNewUser) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        navigation.navigate('RegistrationForm', {
          user: res.user || {},
          identifier: mobile,
        });
      }
    } catch (err) {
      Alert.alert("Login Failed", err.message || "Invalid PIN");
    }
  }, [mobile, otp, navigation, isNewUser]);

  return (
    <ImageBackground
      source={require('../assets/bg1.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.innerContainer}>
              <Header style={styles.headerStyle} />

              <View style={styles.spacer} />

              <View style={styles.bottomSection}>
                <View style={[styles.panelContainer, { backgroundColor: theme.background }]}>
                  <LoginPanel
                    title="Login with PIN"
                    step2Title="Verify PIN"
                    step2Subtitle="Enter your 4-digit secure PIN."
                    onContinue={handleContinue}
                    inputPlaceholder="Mobile Number / Email"
                    footerText="Forgot PIN?"
                    footerLinkText="Back to OTP login"
                    onFooterLinkPress={() => {
                      setLoginStep(1);
                      navigation.replace('Login');
                    }}
                  />
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  headerStyle: {
    marginTop: Dimensions.get('window').height * 0.15,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  panelContainer: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10,
    paddingBottom: 25,
  },
});
