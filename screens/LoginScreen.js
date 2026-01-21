import AsyncStorage from '@react-native-async-storage/async-storage';
import { memo, useCallback } from 'react';
import {
  Alert,
  Dimensions,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Header from '../components/Login/Header';
import LoginPanel from '../components/Login/LoginPanel';
import { useCheckIdentifier, useVerifyOtp } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const {
    mobile, otp, showTerms, setShowTerms,
    setIsNewUser, resetAuthStore, setLoginStep
  } = useAuthStore();

  const checkIdentifierMutation = useCheckIdentifier();
  const verifyOtpMutation = useVerifyOtp();

  const handleSendOtp = useCallback(async () => {
    try {
      const res = await checkIdentifierMutation.mutateAsync(mobile);
      setIsNewUser(!res.isRegistered);
      Alert.alert("Success", res.message || "OTP sent successfully!");
    } catch (err) {
      throw err;
    }
  }, [mobile, checkIdentifierMutation, setIsNewUser]);

  const handleContinue = useCallback(async () => {
    const enteredOtp = otp.join('');
    if (!mobile || enteredOtp.length !== 4) {
      Alert.alert("Error", "Please enter mobile number and complete OTP.");
      return;
    }

    try {
      const res = await verifyOtpMutation.mutateAsync({ identifier: mobile, otp: enteredOtp });
      await AsyncStorage.setItem('token', res.token);

      if (!res.user?.isRegistered || res.redirectTo === 'registrationForm') {
        navigation.navigate('RegistrationForm', {
          user: res.user || {},
          identifier: mobile,
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    } catch (err) {
      Alert.alert("Verification Failed", err.message || "Invalid OTP");
    }
  }, [mobile, otp, verifyOtpMutation, navigation]);

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

              <Animated.View
                entering={FadeInUp.duration(600)}
                style={[
                  styles.panelContainer,
                  { backgroundColor: theme.background }
                ]}
              >
                <LoginPanel
                  onContinue={handleContinue}
                  onSendOtp={handleSendOtp}
                  onFooterLinkPress={() => navigation.navigate('PinLogin')}
                />

                <TouchableOpacity
                  onPress={() => setShowTerms(true)}
                  style={styles.termsTrigger}
                >
                  <Text style={[styles.termsText, { color: theme.primary }]}>
                    Terms and Conditions
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms & Conditions Modal */}
      <Modal
        visible={showTerms}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTerms(false)}
      >
        <View style={styles.modalBackdrop}>
          <Animated.View
            entering={FadeInDown.duration(500)}
            style={[styles.modalContainer, { backgroundColor: theme.card }]}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Privacy Policy</Text>
              <Text style={[styles.modalSubtitle, { color: theme.secondaryText }]}>
                Effective Date: January 2025
              </Text>

              <PolicySection theme={theme} title="Information We Collect" content="- Personal information (name, email, phone)\n- Task and project data\n- Device stats & location" />
              <PolicySection theme={theme} title="How We Use Your Info" content="- Provide and improve Karyah services\n- Account security and updates\n- Fraud prevention" />
              <PolicySection theme={theme} title="Data Security" content="We implement industry-standard encryption to protect your data across all Karyah services." />

              <Text style={[styles.contactText, { color: theme.secondaryText }]}>
                Questions? Contact us at support@karyah.com
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowTerms(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const PolicySection = memo(({ theme, title, content }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
    <Text style={[styles.sectionContent, { color: theme.secondaryText }]}>{content.replace(/\\n/g, '\n')}</Text>
  </View>
));

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
    marginTop: SCREEN_HEIGHT * 0.15,
  },
  spacer: {
    flex: 1,
    minHeight: 40,
  },
  panelContainer: {
    width: '100%',
    maxWidth: isTablet ? 600 : '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  termsTrigger: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  termsText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: isTablet ? '60%' : '90%',
    maxHeight: '80%',
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
  },
  modalScroll: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  contactText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 20,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default memo(LoginScreen);
