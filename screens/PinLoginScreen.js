import React, { useState, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  View,
  SafeAreaView,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      style={{ flex: 1, justifyContent: 'flex-end', position: 'relative' }}
      resizeMode="cover"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <Header />
          <KeyboardAvoidingView
            style={{ flex: 1, width: '100%' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
          >
            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <ScrollView
                style={{ width: '100%', flexGrow: 0, zIndex: 999 }}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
                keyboardShouldPersistTaps="handled"
              >
                <SafeAreaView style={{
                  flex: 1,
                  width: '100%',
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  zIndex: 10,
                  elevation: 10,
                  paddingBottom: 25,
                }}>
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
                    inputLabel="Enter PIN :" // <-- Make sure this is set!
                    footerText="Forgot PIN?"
                    footerLinkText="Go back to OTP login"
                    onFooterLinkPress={() => navigation.replace('Login')}
                    forceStep={step}
                    setStep={setStep}
                    showStepFlow={true}
                  />
                </SafeAreaView>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </ImageBackground>
  );
}