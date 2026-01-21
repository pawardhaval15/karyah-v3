import { memo, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import GradientButton from './GradientButton';
import OTPInput from './OTPInput';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const LoginPanel = memo(({
  title = "Get Started !",
  onContinue,
  onFooterLinkPress,
  onSendOtp,
  footerText = "Already a registered user?",
  footerLinkText = "Login with PIN.",
  inputPlaceholder = "Mobile Number / Email",
}) => {
  const theme = useTheme();
  const {
    mobile, setMobile,
    otp, setOtpDigit,
    loginStep, setLoginStep
  } = useAuthStore();

  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const timerRef = useRef();

  const otpRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (loginStep === 2 && otpRefs[0]?.current) {
      otpRefs[0].current.focus();
    }
  }, [loginStep]);

  useEffect(() => {
    if (loginStep === 2 && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer, loginStep]);

  const handleNext = async () => {
    if (loginStep === 1) {
      if (!mobile) {
        Alert.alert("Validation", "Please enter your mobile number or email.");
        return;
      }
      setIsSendingOtp(true);
      try {
        if (onSendOtp) {
          await onSendOtp();
        }
        setLoginStep(2);
        setTimer(60);
      } catch (error) {
        Alert.alert("Error", error.message);
      } finally {
        setIsSendingOtp(false);
      }
    } else {
      onContinue();
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    try {
      if (onSendOtp) {
        await onSendOtp();
      }
      setTimer(60);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setIsResending(true);
      // Simulate resend delay
      setTimeout(() => setIsResending(false), 1000);
    }
  };

  const handleOtpChange = (value, index) => {
    if (/^\d?$/.test(value)) {
      setOtpDigit(value, index);
      if (value && index < 3) {
        otpRefs[index + 1].current.focus();
      }
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  return (
    <View style={[styles.panel, { backgroundColor: theme.background }]}>
      {loginStep === 1 ? (
        <>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <View style={[styles.inputContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder={inputPlaceholder}
              value={mobile}
              onChangeText={setMobile}
              keyboardType="default"
              placeholderTextColor={theme.secondaryText}
            />
          </View>
        </>
      ) : (
        <>
          <Text style={[styles.backText, { color: theme.primary }]} onPress={() => setLoginStep(1)}>
            ← Back
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>Verify OTP</Text>
          <View style={styles.mobileEditRow}>
            <Text style={[styles.mobileDisplay, { color: theme.text, backgroundColor: theme.card }]}>{mobile}</Text>
            <Text style={[styles.editMobileBtn, { color: theme.primary }]} onPress={() => setLoginStep(1)}>
              Edit
            </Text>
          </View>
          <Text style={[styles.infoText, { color: theme.secondaryText }]}>
            Enter the 4-digit code sent to your mobile/email.
          </Text>
          <OTPInput
            otp={otp}
            otpRefs={otpRefs}
            onChange={handleOtpChange}
            onKeyPress={handleOtpKeyPress}
            timer={timer}
            isResending={isResending}
            handleResendOtp={handleResendOtp}
            theme={theme}
          />
        </>
      )}

      <View style={styles.buttonWrapper}>
        <GradientButton
          title={loginStep === 1 ? (isSendingOtp ? 'Sending...' : 'Next') : 'Continue'}
          onPress={handleNext}
          disabled={isSendingOtp}
        />
      </View>

      <Text style={[styles.footer, { color: theme.secondaryText }]}>
        {footerText}{' '}
        <Text style={[styles.link, { color: theme.primary }]} onPress={onFooterLinkPress}>
          {footerLinkText}
        </Text>
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    padding: isTablet ? 40 : 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  title: {
    fontSize: isTablet ? 28 : 22,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  inputContainer: {
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 56,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },
  link: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  backText: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  mobileEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 12,
  },
  mobileDisplay: {
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  editMobileBtn: {
    fontWeight: '700',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  buttonWrapper: {
    marginTop: 10,
  }
});

export default LoginPanel;
