import { memo } from 'react';
import { Dimensions, StyleSheet, Text, TextInput, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const OTPInput = memo(({
  otp,
  otpRefs,
  onChange,
  onKeyPress,
  timer,
  isResending,
  handleResendOtp,
  theme
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.otpContainer}>
        {otp.map((digit, idx) => (
          <TextInput
            ref={otpRefs[idx]}
            key={idx}
            style={[
              styles.otpInput,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                color: theme.text
              }
            ]}
            maxLength={1}
            keyboardType="numeric"
            value={digit}
            onChangeText={(value) => {
              if (value && value.length === otp.length) {
                value.split('').forEach((v, i) => onChange(v, i));
                otpRefs[otp.length - 1]?.current?.focus();
              } else {
                onChange(value, idx);
              }
            }}
            onKeyPress={(e) => onKeyPress(e, idx)}
            placeholderTextColor={theme.secondaryText}
          />
        ))}
      </View>

      {typeof timer === 'number' && handleResendOtp && (
        <View style={styles.otpTimerRow}>
          <Text style={[styles.otpTimerText, { color: theme.secondaryText }]}>
            {timer > 0
              ? `Resend OTP in 0:${timer < 10 ? `0${timer}` : timer}`
              : 'Didn\'t receive the code?'}
          </Text>
          <Text
            style={[
              styles.resendBtn,
              {
                color: theme.primary,
                opacity: timer > 0 || isResending ? 0.5 : 1
              }
            ]}
            onPress={handleResendOtp}
            disabled={timer > 0 || isResending}
          >
            {isResending ? 'Sending...' : 'Resend OTP'}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: isTablet ? 16 : 10,
  },
  otpInput: {
    borderWidth: 1.5,
    borderRadius: 16,
    width: isTablet ? 64 : 54,
    height: isTablet ? 64 : 54,
    textAlign: 'center',
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
  },
  otpTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  otpTimerText: {
    fontSize: 14,
    marginRight: 8,
  },
  resendBtn: {
    fontWeight: '700',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default OTPInput;