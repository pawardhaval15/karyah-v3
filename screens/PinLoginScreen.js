import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import Header from '../components/Login/Header';
import LoginPanel from '../components/Login/LoginPanel';
import { loginWithPin } from '../utils/auth';

export default function PinLoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [step, setStep] = useState(1); // 👈 new state

  const handlePinChange = (value, index) => {
    if (/^\d?$/.test(value)) {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);

      if (value && index < pinRefs.length - 1) {
        pinRefs[index + 1].current.focus();
      }
      if (!value && index > 0) {
        pinRefs[index - 1].current.focus();
      }
    }
  };

  const handlePinKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current.focus();
    }
  };

  const handleContinue = async () => {
    const enteredPin = pin.join('');

    if (!identifier || enteredPin.length !== 4) {
      Alert.alert("Error", "Please enter identifier and complete 4-digit PIN.");
      return;
    }

    try {
      const res = await loginWithPin(identifier, enteredPin);
      await AsyncStorage.setItem('token', res.token);

      if (res.redirectTo === 'dashboard') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });

      } else {
        navigation.navigate('RegistrationForm');
      }
    } catch (err) {
      Alert.alert("Login Failed", err.message);
    }
  };

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
                <SafeAreaView style={[styles.panelContainer, { backgroundColor: '#fff' }]}>
                  <LoginPanel
                    title="Login with PIN"
                    showMobileInput={true}
                    mobile={identifier}
                    setMobile={setIdentifier}
                    otp={pin}
                    otpRefs={pinRefs}
                    handleOtpChange={handlePinChange}
                    handleOtpKeyPress={handlePinKeyPress}
                    handleContinue={handleContinue}
                    navigation={navigation}
                    inputPlaceholder="Mobile Number / Email"
                    inputLabel="Enter PIN :"
                    footerText="Forgot PIN?"
                    footerLinkText="Go back to OTP login"
                    onFooterLinkPress={() => navigation.replace('Login')}
                    forceStep={step}
                    setStep={setStep}
                    showStepFlow={true}
                  />
                </SafeAreaView>
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
