import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import GradientButton from './GradientButton';
import OTPInput from './OTPInput';

export default function LoginPanel({
  title = "Get Started !",
  mobile,
  setMobile,
  otp,
  otpRefs,
  handleOtpChange,
  handleOtpKeyPress,
  handleContinue,
  navigation,
  inputLabel = "Enter OTP :",
  inputPlaceholder = "Mobile Number / Email",
  footerText = "Already a registered user?",
  footerLinkText = "Login with PIN.",
  onFooterLinkPress,
  onSendOtp,
  showMobileInput = true,
  forceStep = null,          // Step override (from parent)
  setStep: externalSetStep,  // Setter from parent
  showStepFlow = false       // Enables step logic if needed
}) {

  const [internalStep, setInternalStep] = useState(1);
  const step = forceStep ?? internalStep;

  // Timer state for resend OTP
  const [timer, setTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const timerRef = useRef();

  // Auto-select OTP on paste
  useEffect(() => {
    if (step === 2 && otpRefs && otpRefs[0]?.current) {
      otpRefs[0].current.setNativeProps({ autoFocus: true });
    }
  }, [step, otpRefs]);

  useEffect(() => {
    if (step === 2 && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(timer - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [timer, step]);

  const updateStep = (val) => {
    if (externalSetStep) {
      externalSetStep(val);
    } else {
      setInternalStep(val);
    }
    if (val === 2) setTimer(60); // Reset timer on step change
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!mobile) {
        Alert.alert("Validation", "Please enter your mobile number or email.");
        return;
      }
      if (onSendOtp) {
        setIsSendingOtp(true);
        try {
          await onSendOtp();
          updateStep(2);
        } catch (error) {
          Alert.alert("Error", error.message);
        }
        setIsSendingOtp(false);
      } else {
        updateStep(2);
      }
    } else {
      handleContinue();
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    try {
      if (onSendOtp) await onSendOtp();
      setTimer(60);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
    setIsResending(false);
  };

  return (
    <View style={styles.panel}>
      {step === 1 && showMobileInput && (
        <>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={styles.input}
            placeholder={inputPlaceholder}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="default"
            placeholderTextColor="#999"
          />
        </>
      )}

      {step === 2 && (
        <>
          {showStepFlow && (
            <Text style={styles.backText} onPress={() => updateStep(1)}>
              ← Back to Mobile Input
            </Text>
          )}
          <Text style={styles.title}>{inputLabel}</Text>
          <View style={styles.mobileEditRow}>
            <Text style={styles.mobileDisplay}>{mobile}</Text>
            <Text style={styles.editMobileBtn} onPress={() => updateStep(1)}>
              Edit
            </Text>
          </View>
          <Text style={styles.otpInfoText}>
            {inputLabel === 'Enter OTP :'
              ? 'Enter the 4-digit code sent to your mobile/email.'
              : 'Enter the 4-digit code.'}
          </Text>
          <OTPInput
            otp={otp}
            otpRefs={otpRefs}
            onChange={handleOtpChange}
            onKeyPress={handleOtpKeyPress}
            {...(inputLabel === 'Enter OTP :' ? { timer, isResending, handleResendOtp } : {})}
          />
        </>
      )}

      <GradientButton
        title={step === 1 ? (isSendingOtp ? 'Sending...' : 'Next') : 'Continue'}
        onPress={handleNext}
        disabled={step === 1 && isSendingOtp}
        {...(isSendingOtp && step === 1 ? { children: <ActivityIndicator color="#fff" style={{ marginLeft: 8 }} /> } : {})}
      />

      <Text style={styles.footer}>
        {footerText}{' '}
        <Text style={styles.link} onPress={onFooterLinkPress}>
          {footerLinkText}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    zIndex: 999,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 40,
    minHeight: 200,
    borderRadius: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#011F53',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    paddingVertical: 12,
    marginBottom: 0,
    color: '#000',
    marginBottom: 0,
  },
  otpInfoText: {
    color: '#666',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  otpTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
    gap: 10,
  },
  otpTimerText: {
    color: '#888',
    fontSize: 13,
    marginRight: 8,
  },
  resendBtn: {
    color: '#366CD9',
    fontWeight: '600',
    fontSize: 13,
    textDecorationLine: 'underline',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  footer: {
    textAlign: 'center',
    color: '#888',
    fontWeight: '500',
    fontFamily: 'plusJakartaSans',
    marginTop: 10,
  },
  link: {
    color: '#366CD9',
    textDecorationLine: 'underline',
  },
  backText: {
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 14,
    color: '#366CD9',
    textAlign: 'left',
  },
  mobileEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 8,
  },
  mobileDisplay: {
    fontSize: 15,
    color: '#011F53',
    fontWeight: '500',
    backgroundColor: '#F8F9FB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editMobileBtn: {
    color: '#366CD9',
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
