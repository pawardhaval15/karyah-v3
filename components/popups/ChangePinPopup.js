import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { forgotPin, resetPin } from '../../utils/auth';
import GradientButton from '../Login/GradientButton';
import FieldBox from '../task details/FieldBox';
import { useTranslation } from 'react-i18next';
export default function ChangePinPopup({
    visible,
    onClose,
    onSubmit,
    loading,
    error,
    success,
    theme,
}) {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [forgotMode, setForgotMode] = useState(false);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [resetPinVal, setResetPinVal] = useState('');
    const [confirmResetPin, setConfirmResetPin] = useState('');
    const [forgotStep, setForgotStep] = useState(1);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState('');
    const { t } = useTranslation();
    const [changingMsg, setChangingMsg] = useState('');
    const handleSubmit = () => {
        if (!currentPin || !newPin || !confirmNewPin) return;

        // Check if new PIN and confirm PIN match
        if (newPin !== confirmNewPin) {
            alert('New PIN and Confirm PIN do not match. Please try again.');
            return;
        }

        // Check PIN length (optional validation)
        if (newPin.length < 4) {
            alert('PIN must be at least 4 digits long.');
            return;
        }

        setChangingMsg('Changing...');
        onSubmit(currentPin, newPin, (err) => {
            setCurrentPin('');
            setNewPin('');
            setConfirmNewPin('');
            setChangingMsg('');
            if (err) {
                setTimeout(() => {
                    onClose();
                    alert(err);
                }, 200);
            }
        });
    };

    const handleForgotPin = async () => {
        setForgotError('');
        setForgotSuccess('');
        setForgotLoading(true);
        try {
            await forgotPin(email);
            setForgotSuccess('OTP sent to your email.');
            setForgotStep(2);
        } catch (err) {
            setForgotError(err.message || 'Failed to send OTP.');
        }
        setForgotLoading(false);
    };

    const handleResetPin = async () => {
        if (!resetPinVal || !confirmResetPin) return;

        if (resetPinVal !== confirmResetPin) {
            setForgotError('New PIN and Confirm PIN do not match.');
            return;
        }

        if (resetPinVal.length < 4) {
            setForgotError('PIN must be at least 4 digits long.');
            return;
        }

        setForgotError('');
        setForgotSuccess('');
        setForgotLoading(true);
        try {
            await resetPin(email, otp, resetPinVal);
            setTimeout(() => {
                setForgotMode(false);
                setForgotStep(1);
                setEmail('');
                setOtp('');
                setResetPinVal('');
                setConfirmResetPin('');
                onClose();
                alert('PIN reset successfully!');
            }, 500);
        } catch (err) {
            setForgotError(err.message || 'Failed to reset PIN.');
        }
        setForgotLoading(false);
    };

    useEffect(() => {
        if (success) {
            setTimeout(() => {
                onClose();
                alert('PIN changed successfully!');
            }, 300);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            setTimeout(() => {
                onClose();
                alert(error);
            }, 300);
        }
    }, [error]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.popup, { backgroundColor: theme.card }]}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContainer}
                        showsVerticalScrollIndicator={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: theme.text }]}>
                                {forgotMode ? (forgotStep === 1 ? t('forgot_pin') : t('reset_pin')) : t('change_pin')}
                            </Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Feather name="x" size={22} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        {!forgotMode ? (
                            <>
                                <FieldBox
                                    label={t("current_pin")}
                                    value={currentPin}
                                    onChangeText={setCurrentPin}
                                    placeholder={t("enter_current_pin")}
                                    editable
                                    theme={theme}
                                    inputStyle={{ letterSpacing: 0 }}
                                    containerStyle={{ marginHorizontal: 0, marginBottom: 10 }}
                                    rightComponent={null}
                                    multiline={false}
                                    secureTextEntry={true}
                                    keyboardType="numeric"
                                    maxLength={6}
                                />
                                <FieldBox
                                    label={t("new_pin")}
                                    value={newPin}
                                    onChangeText={setNewPin}
                                    placeholder={t("enter_new_pin")}
                                    editable
                                    theme={theme}
                                    inputStyle={{ letterSpacing: 0 }}
                                    containerStyle={{ marginHorizontal: 0, marginBottom: 10 }}
                                    rightComponent={null}
                                    multiline={false}
                                    secureTextEntry={true}
                                    keyboardType="numeric"
                                    maxLength={6}
                                />
                                <FieldBox
                                    label={t("confirm_new_pin")}
                                    value={confirmNewPin}
                                    onChangeText={setConfirmNewPin}
                                    placeholder={t("re_enter_new_pin")}
                                    editable
                                    theme={theme}
                                    inputStyle={{ letterSpacing: 0 }}
                                    containerStyle={{ marginHorizontal: 0, marginBottom: 10 }}
                                    rightComponent={null}
                                    multiline={false}
                                    secureTextEntry={true}
                                    keyboardType="numeric"
                                    maxLength={6}
                                />
                                {/* PIN Mismatch Warning */}
                                {newPin && confirmNewPin && newPin !== confirmNewPin && (
                                    <Text style={[styles.errorText, { color: theme.error || '#E53935', marginBottom: 10 }]}>
                                        {t('pins_do_not_match')}
                                    </Text>
                                )}
                                <GradientButton
                                    title={loading ? (changingMsg || '') : t('change_pin')}
                                    onPress={handleSubmit}
                                    disabled={loading || !currentPin || !newPin || !confirmNewPin || (newPin !== confirmNewPin)}
                                    style={{ marginTop: 10 }}
                                >
                                    {loading ? (
                                        changingMsg ? <Text style={{ color: '#fff' }}>{changingMsg}</Text> : <ActivityIndicator size="small" color="#fff" />
                                    ) : null}
                                </GradientButton>
                                <TouchableOpacity style={{ alignSelf: 'center', marginTop: 4 }} onPress={() => setForgotMode(true)}>
                                    <Text style={{ color: theme.primary, fontWeight: '500' }}>{t('forgot_pin')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={{ alignSelf: 'center', marginTop: 10 }} onPress={onClose}>
                                    <Text style={{ color: theme.secondaryText, fontWeight: '500' }}>{t('cancel')}</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {forgotStep === 1 && (
                                    <>
                                        <FieldBox
                                            value={email}
                                            onChangeText={setEmail}
                                            placeholder={t("enter_your_email")}
                                            editable
                                            theme={theme}
                                            inputStyle={{ letterSpacing: 0 }}
                                            containerStyle={{ marginHorizontal: 0, marginBottom: 10 }}
                                            rightComponent={null}
                                            multiline={false}
                                        />
                                        <GradientButton
                                            title={forgotLoading ? t("sending") : t("send_otp")}
                                            onPress={handleForgotPin}
                                            disabled={forgotLoading || !email}
                                            style={{ marginTop: 10 }}
                                        >
                                            {forgotLoading && <ActivityIndicator size="small" color="#fff" />}
                                        </GradientButton>
                                    </>
                                )}
                                {forgotStep === 2 && (
                                    <>
                                        <FieldBox
                                            label={t("otp")}
                                            value={otp}
                                            onChangeText={setOtp}
                                            placeholder={t("enter_otp_from_email")}
                                            editable
                                            theme={theme}
                                            inputStyle={{ letterSpacing: 0 }}
                                            containerStyle={{ marginHorizontal: 0, marginBottom: 10 }}
                                            rightComponent={null}
                                            multiline={false}
                                        />
                                        <FieldBox
                                            label={t("new_pin")}
                                            value={resetPinVal}
                                            onChangeText={setResetPinVal}
                                            placeholder={t("enter_new_pin")}
                                            editable
                                            theme={theme}
                                            inputStyle={{ letterSpacing: 0 }}
                                            containerStyle={{ marginHorizontal: 0, marginBottom: 10 }}
                                            rightComponent={null}
                                            multiline={false}
                                            secureTextEntry={true}
                                            keyboardType="numeric"
                                            maxLength={6}
                                        />
                                        <FieldBox
                                            label={t("confirm_new_pin")}
                                            value={confirmResetPin}
                                            onChangeText={setConfirmResetPin}
                                            placeholder={t("re_enter_new_pin")}
                                            editable
                                            theme={theme}
                                            inputStyle={{ letterSpacing: 0 }}
                                            containerStyle={{ marginHorizontal: 0, marginBottom: 10 }}
                                            rightComponent={null}
                                            multiline={false}
                                            secureTextEntry={true}
                                            keyboardType="numeric"
                                            maxLength={6}
                                        />
                                        {/* PIN Mismatch Warning for Reset */}
                                        {resetPinVal && confirmResetPin && resetPinVal !== confirmResetPin && (
                                            <Text style={[styles.errorText, { color: theme.error || '#E53935', marginBottom: 10 }]}>
                                                {t("pins_do_not_match")}
                                            </Text>
                                        )}
                                        {/* Error/Success Messages */}
                                        {forgotError ? (
                                            <Text style={[styles.errorText, { color: theme.error || '#E53935', marginBottom: 10 }]}>
                                                {forgotError}
                                            </Text>
                                        ) : null}
                                        {forgotSuccess ? (
                                            <Text style={[styles.successText, { color: theme.success || '#2e7d32', marginBottom: 10 }]}>
                                                {forgotSuccess}
                                            </Text>
                                        ) : null}
                                        <GradientButton
                                            title={forgotLoading ? '' : 'Reset PIN'}
                                            onPress={handleResetPin}
                                            disabled={forgotLoading || !otp || !resetPinVal || !confirmResetPin || (resetPinVal !== confirmResetPin)}
                                            style={{ marginTop: 10 }}
                                        >
                                            {forgotLoading && <ActivityIndicator size="small" color="#fff" />}
                                        </GradientButton>
                                    </>
                                )}
                                <TouchableOpacity style={{ alignSelf: 'center', marginTop: 4 }} onPress={() => {
                                    setForgotMode(false);
                                    setForgotStep(1);
                                    setEmail('');
                                    setOtp('');
                                    setResetPinVal('');
                                    setConfirmResetPin('');
                                    setForgotError('');
                                    setForgotSuccess('');
                                }}>
                                    <Text style={{ color: theme.secondaryText, fontWeight: '500' }}>{t("back_to_change_pin")}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </ScrollView>
                </View>

            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    popup: {
        width: '92%',
        backgroundColor: '#fff',
        borderRadius: 22,
        paddingVertical: 18,
        paddingHorizontal: 16,
        maxHeight: '92%',
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#222',

    },
    closeBtn: {
        padding: 4,
        marginLeft: 12,
    },
    errorText: {
        color: 'red',
        marginBottom: 4,
        textAlign: 'center',
    },
    successText: {
        color: 'green',
        marginBottom: 4,
        textAlign: 'center',
    },
});
