import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppState, Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ChangePinPopup from '../components/popups/ChangePinPopup';
import { getCustomNotificationsEnabled, toggleCustomNotifications } from '../components/popups/CustomNotificationPopup';
import { useTheme } from '../theme/ThemeContext';
import { changePin as changePinApi, getIsPublic, updateIsPublic } from '../utils/auth';
import { API_URL } from '../utils/config';
export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const [privateAccount, setPrivateAccount] = useState(true);
  const [hierarchyPrivacy, setHierarchyPrivacy] = useState(false);
  const [connectionPrivacy, setConnectionPrivacy] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [customNotificationsEnabled, setCustomNotificationsEnabled] = useState(true);
  const appState = useRef(AppState.currentState);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  // Change PIN modal state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const { t } = useTranslation();
  // Fetch user public/private status and biometric setting on mount
  useEffect(() => {
    (async () => {
      try {
        const isPublic = await getIsPublic();
        setPrivateAccount(!isPublic); // privateAccount = !isPublic
        const bio = await AsyncStorage.getItem('biometricEnabled');
        setBiometricEnabled(bio === 'true');
        const customNotifs = await getCustomNotificationsEnabled();
        setCustomNotificationsEnabled(customNotifs);
      } catch (err) {
        console.log('Error fetching user public/private status:', err.message);
      }
    })();
  }, []);

  // Removed biometric auth on app foreground to prevent double prompt

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.headerRow, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={18} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
          <Feather name="more-vertical" size={20} color={theme.text} />
        </TouchableOpacity> */}
      </View>

      {/* Dropdown Menu */}
      {menuVisible && (
        <View style={[styles.menu, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              // handle About
            }}
          >
            <Feather name="info" size={18} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.menuItemText, { color: theme.primary }]}>About</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Title */}
      <View style={[styles.titleRow]}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 10 }}>
        {/* Options */}
        {[
          {
            label: t("Private Account"),
            desc: t("Auto-accept connection requests.\nHide profile from non-connections."),
            value: privateAccount,
            icon: <Feather name="lock" size={20} color={theme.text} />,
            onChange: async (val) => {
              setPrivateAccount(val);
              // Log token and decoded token
              const token = await AsyncStorage.getItem('token');
              console.log('User token:', token);
              try {
                const decoded = token ? jwtDecode(token) : null;
                console.log('Decoded token:', decoded);
              } catch (err) {
                console.log('Error decoding token:', err.message);
              }
              try {
                await updateIsPublic(!val); // isPublic = !privateAccount
              } catch (err) {
                alert('Failed to update public status: ' + err.message);
              }
            },
            showToggle: true,
          },
          {
            label: t("Biometric"),
            desc: t("Unlock the app using fingerprint/face.\nAdds extra layer of security."),
            value: biometricEnabled,
            icon: <Feather name="shield" size={20} color={theme.text} />,
            onChange: async (val) => {
              if (val) {
                setBiometricLoading(true);
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                if (!hasHardware || !isEnrolled) {
                  alert('Biometric authentication is not available or not set up on this device.');
                  setBiometricLoading(false);
                  return;
                }
                const result = await LocalAuthentication.authenticateAsync({
                  promptMessage: 'Authenticate to enable biometrics',
                  fallbackLabel: 'Enter Passcode',
                });
                setBiometricLoading(false);
                if (result.success) {
                  setBiometricEnabled(true);
                  await AsyncStorage.setItem('biometricEnabled', 'true');
                } else {
                  alert('Biometric authentication failed or was cancelled.');
                }
              } else {
                setBiometricEnabled(false);
                await AsyncStorage.setItem('biometricEnabled', 'false');
              }
            },
            showToggle: true,
          },
          {
            label: t("Display Notifications"),
            desc: t("Show notification popups.\n Enhanced notification experience."),
            value: customNotificationsEnabled,
            icon: <Feather name="bell" size={20} color={theme.text} />,
            onChange: async (val) => {
              setCustomNotificationsEnabled(val);
              try {
                await toggleCustomNotifications(val);
              } catch (err) {
                alert('Failed to update notification settings: ' + err.message);
              }
            },
            showToggle: true,
          },
        ].map((item, idx) => (
          <View
            key={idx}
            style={[styles.optionRow, { borderBottomColor: theme.border }]}
          >
            {/* Icon at left */}
            {/* Icon in a box */}
            <View style={{
              width: 36,
              height: 36,
              backgroundColor: theme.card,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
              borderWidth: 1,
              borderColor: theme.border
            }}>
              {item.icon}
            </View>
            {/* Text in middle */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionText, { color: theme.text }]}>{item.label}</Text>
              {item.desc.split('\n').slice(0, 2).map((line, i) => (
                <Text key={i} style={[styles.optionDesc, { color: theme.secondaryText }]}>{line}</Text>
              ))}
            </View>
            {/* Toggle at right, or empty space if not needed */}
            {item.showToggle ? (
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={theme.card}
                disabled={item.label === 'Biometric' && biometricLoading}
              />
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>
        ))}

        {/* Change PIN Option */}
        <TouchableOpacity
          style={[styles.optionRow, { borderBottomColor: theme.border }]}
          onPress={() => {
            setPinModalVisible(true);
            setPinError('');
            setPinSuccess('');
          }}
        >
          {/* Icon in a box */}
          <View style={{
            width: 36,
            height: 36,
            backgroundColor: theme.card,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
            borderWidth: 1,
            borderColor: theme.border
          }}>
            <Feather name="key" size={20} color={theme.text} />
          </View>
          {/* Text in middle */}
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionText, { color: theme.text }]}>{t("Change PIN")}</Text>
            <Text style={[styles.optionDesc, { color: theme.secondaryText }]}>
              {t("Update your login PIN for extra security.")}
            </Text>
          </View>
          {/* Empty at right for alignment */}
          <View style={{ width: 40 }} />
        </TouchableOpacity>

        {/* Logout Option - styled like other options */}
        <TouchableOpacity
          style={[styles.optionRow, { borderBottomColor: theme.border }]}
          onPress={async () => {
            try {
              const userToken = await AsyncStorage.getItem('token');
              const fcmToken = await AsyncStorage.getItem(`fcm_token_${Platform.OS}`);

              // 🔁 Unregister FCM token from backend
              if (userToken && fcmToken) {
                await fetch(`${API_URL}api/devices/deviceToken`, {
                  method: 'DELETE', // or 'POST' depending on your API
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                  },
                  body: JSON.stringify({
                    deviceToken: fcmToken,
                    platform: Platform.OS === 'ios' ? 'iOS' : 'Android',
                    tokenType: 'FCM',
                  }),
                });
              }

              // Remove tokens from storage
              await AsyncStorage.removeItem(`fcm_token_${Platform.OS}`);
              await AsyncStorage.removeItem('token');

              // Navigate to login screen
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

            } catch (err) {
              console.error('Logout failed:', err);
              alert('Logout failed');
            }
          }}
        >
          {/* Icon in a box */}
          <View style={{
            width: 36,
            height: 36,
            backgroundColor: theme.card,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
            borderWidth: 1,
            borderColor: theme.border
          }}>
            <Feather name="log-out" size={20} color={theme.text} />
          </View>

          {/* Text in middle */}
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionText, { color: theme.text }]}>{t("Logout")}</Text>
            <Text style={[styles.optionDesc, { color: theme.secondaryText }]}>
              {t("Sign out of your account and return to login.")}
            </Text>
          </View>

          {/* Empty at right for alignment */}
          <View style={{ width: 40 }} />
        </TouchableOpacity>

      </ScrollView>
      <ChangePinPopup
        visible={pinModalVisible}
        onClose={() => {
          setPinModalVisible(false);
          setPinError('');
          setPinSuccess('');
        }}
        onSubmit={async (currentPin, newPin, resetFields) => {
          setPinError('');
          setPinSuccess('');
          setPinLoading(true);
          try {
            await changePinApi(currentPin, newPin);
            setPinSuccess('PIN changed successfully.');
            if (resetFields) resetFields();
          } catch (err) {
            setPinError(err.message || 'Failed to change PIN.');
          }
          setPinLoading(false);
        }}
        loading={pinLoading}
        error={pinError}
        success={pinSuccess}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,

  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 70 : 25,
    paddingHorizontal: 0,
    paddingBottom: 10,
  },
  titleRow: {
    paddingHorizontal: 0,
    paddingVertical: 8,
    marginTop: 0
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    marginLeft: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: '80%',
  },
  menu: {
    position: 'absolute',
    top: 70,
    right: 16,
    borderRadius: 10,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    zIndex: 100,
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});