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
import { checkEmailOrMobile, verifyOtp } from '../utils/auth';

export default function LoginScreen({ navigation }) {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const handleOtpChange = (value, index) => {
    if (/^\d?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < otpRefs.length - 1) {
        otpRefs[index + 1].current.focus();
      }
      if (!value && index > 0) {
        otpRefs[index - 1].current.focus();
      }
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleSendOtp = async () => {
    if (!mobile) {
      Alert.alert("Error", "Please enter mobile number or email.");
      return;
    }

    try {
      const res = await checkEmailOrMobile(mobile);
      Alert.alert("Success", res.message);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleContinue = async () => {
    const enteredOtp = otp.join('');
    if (!mobile || enteredOtp.length !== 4) {
      Alert.alert("Error", "Please enter mobile number and complete OTP.");
      return;
    }

    try {
      const res = await verifyOtp(mobile, enteredOtp);
      await AsyncStorage.setItem('token', res.token);
      console.log("OTP verified successfully:", res);
      if (res.redirectTo === 'Dashboard') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });

      } else if (res.redirectTo === 'registrationForm') {
        navigation.navigate('RegistrationForm', { user: res.user });
      }
    } catch (err) {
      Alert.alert("OTP Verification Failed", err.message);
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
                  width: '100%',
                  backgroundColor: '#fff',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  zIndex: 10,
                  elevation: 10,
                  paddingBottom: 25,
                }}>
                  <LoginPanel
                    title="Get Started !"
                    showMobileInput={true}
                    mobile={mobile}
                    setMobile={setMobile}
                    otp={otp}
                    otpRefs={otpRefs}
                    handleOtpChange={handleOtpChange}
                    handleOtpKeyPress={handleOtpKeyPress}
                    handleContinue={handleContinue}
                    onSendOtp={handleSendOtp}
                    navigation={navigation}
                    inputLabel="Enter OTP :"
                    inputPlaceholder="Mobile Number / Email"
                    footerText="Already a registered user?"
                    footerLinkText="Login with PIN."
                    
                    onFooterLinkPress={() => navigation.navigate('PinLogin')}
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
