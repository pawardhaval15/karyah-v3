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
  Alert,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Login/Header';
import LoginPanel from '../components/Login/LoginPanel';
import { checkEmailOrMobile, verifyOtp } from '../utils/auth';
import { useTheme } from '../theme/ThemeContext';
export default function LoginScreen({ navigation }) {
  const theme = useTheme();

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const [showTerms, setShowTerms] = useState(false);
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
                  <TouchableOpacity onPress={() => setShowTerms(true)} style={{ padding: 4, alignItems: 'center' }}>
                    <Text style={{ color: theme.primary, textDecorationLine: 'underline' }}>
                      Terms and Conditions!
                    </Text>
                  </TouchableOpacity>
                  {/* Terms & Conditions Modal */}
                  <Modal
                    visible={showTerms}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowTerms(false)}
                  >
                    <View style={styles.modalBackdrop}>
                      <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                        <ScrollView contentContainerStyle={styles.contentContainer}>
                          <Text style={[styles.heading, { color: theme.text }]}>Privacy Policy</Text>
                          <Text style={[styles.subHeading, { color: theme.text }]}>
                            Effective Date: January 2025
                          </Text>

                          <Text style={[styles.paragraph, { color: theme.text }]}>
                            Welcome to Karyah! This Privacy Policy explains how we collect, use, and protect your personal information when you use our application.
                          </Text>

                          <Text style={[styles.sectionTitle, { color: theme.text }]}>Information We Collect</Text>
                          <Text style={[styles.paragraph, { color: theme.text }]}>
                            - Personal information (name, email address, phone number)
                            {'\n'}- Task and project information you enter in the app
                            {'\n'}- Device information and usage statistics
                            {'\n'}- Location data (with your permission)
                          </Text>

                          <Text style={[styles.sectionTitle, { color: theme.text }]}>How We Use Your Information</Text>
                          <Text style={[styles.paragraph, { color: theme.text }]}>
                            - Provide, maintain, and improve our services
                            {'\n'}- Communicate with you about your account
                            {'\n'}- Develop new features based on user behavior
                            {'\n'}- Protect against fraudulent or unauthorized activity
                          </Text>

                          <Text style={[styles.sectionTitle, { color: theme.text }]}>Information Sharing</Text>
                          <Text style={[styles.paragraph, { color: theme.text }]}>
                            We do not sell your personal information. We may share information with:
                            {'\n'}- Service providers who help operate our app
                            {'\n'}- Law enforcement when required by law
                            {'\n'}- Business partners with your consent
                          </Text>

                          <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Security</Text>
                          <Text style={[styles.paragraph, { color: theme.text }]}>
                            We implement reasonable security measures to protect your information from unauthorized access or disclosure.
                          </Text>

                          <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Rights</Text>
                          <Text style={[styles.paragraph, { color: theme.text }]}>
                            - Access your personal information
                            {'\n'}- Correct inaccurate information
                            {'\n'}- Delete your account and data
                            {'\n'}- Opt out of marketing communications
                          </Text>

                          <Text style={[styles.sectionTitle, { color: theme.text }]}>Children's Privacy</Text>
                          <Text style={[styles.paragraph, { color: theme.text }]}>
                            Our services are not intended for children under the age of 13.
                          </Text>

                          <Text style={[styles.sectionTitle, { color: theme.text }]}>Changes to This Policy</Text>
                          <Text style={[styles.paragraph, { color: theme.text }]}>
                            We may update this Privacy Policy from time to time. We will notify you of any significant changes.
                          </Text>

                          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Us</Text>
                          <Text style={[styles.paragraph, { color: theme.text }]}>
                            If you have questions about this Privacy Policy, please contact us at: support@karyah.com
                          </Text>
                        </ScrollView>

                        <TouchableOpacity
                          style={[styles.closeButton, { backgroundColor: theme.primary }]}
                          onPress={() => setShowTerms(false)}
                        >
                          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Close</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Modal>
                </SafeAreaView>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </ImageBackground>
  );
} const styles = StyleSheet.create({
  // Backdrop for modal overlay
  safeArea: {
    flex: 1,
    backgroundColor: '#000000AA', // semi-transparent backdrop
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#00000088', // Use semi-transparent for backdrop
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 14,
    padding: 20,
    backgroundColor: '#fff', // Fallback if theme.card missing
  },

  // ScrollView content inside modal
  contentContainer: {
    paddingBottom: 24,
  },

  // Headings and text styles
  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  subHeading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
  },

  // Close / Agree button styles
  closeButton: {
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agreeButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
