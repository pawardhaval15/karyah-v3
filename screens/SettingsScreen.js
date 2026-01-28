import { Feather, MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import ChangePinPopup from '../components/popups/ChangePinPopup';
import { useChangePin, usePublicStatus, useUpdatePublicStatus } from '../hooks/useSettings';
import { useLogout } from '../hooks/useUser';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/ThemeContext';

const SettingItem = memo(({ item, theme, t }) => {
  return (
    <View style={[styles.optionRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {item.icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionText, { color: theme.text }]}>{item.label}</Text>
        {item.desc.split('\n').map((line, i) => (
          <Text key={i} style={[styles.optionDesc, { color: theme.secondaryText }]}>
            {line}
          </Text>
        ))}
      </View>
      {item.showToggle ? (
        <Switch
          value={item.value}
          onValueChange={item.onChange}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor={theme.card}
          disabled={item.disabled}
        />
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );
});

const SettingButton = memo(({ item, theme, t, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.optionRow, { borderBottomColor: theme.border }]}
      onPress={onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {item.icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionText, { color: theme.text }]}>{item.label}</Text>
        <Text style={[styles.optionDesc, { color: theme.secondaryText }]}>
          {item.desc}
        </Text>
      </View>
      <View style={{ width: 40, alignItems: 'center' }}>
        <Feather name="chevron-right" size={18} color={theme.secondaryText} />
      </View>
    </TouchableOpacity>
  );
});

export default function SettingsScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const logoutMutation = useLogout(navigation);

  // Store State
  const {
    biometricEnabled,
    customNotificationsEnabled,
    setBiometricEnabled,
    setCustomNotificationsEnabled,
  } = useSettingsStore();

  // Server State
  const { data: isPublic, isLoading: loadingStatus } = usePublicStatus();
  const updatePublicStatus = useUpdatePublicStatus();
  const changePinMutation = useChangePin();

  // UI State
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  const togglePrivateAccount = useCallback(async (val) => {
    try {
      await updatePublicStatus.mutateAsync(!val);
    } catch (err) {
      Alert.alert(t('error'), t('failed_to_update_status') + ': ' + err.message);
    }
  }, [updatePublicStatus, t]);

  const handleBiometricToggle = useCallback(async (val) => {
    if (val) {
      setBiometricLoading(true);
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(t('error'), t('biometric_not_available'));
        setBiometricLoading(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('authenticate_to_enable_biometrics'),
        fallbackLabel: t('enter_passcode'),
      });
      setBiometricLoading(false);
      if (result.success) {
        setBiometricEnabled(true);
      } else {
        Alert.alert(t('error'), t('biometric_failed'));
      }
    } else {
      setBiometricEnabled(false);
    }
  }, [setBiometricEnabled, t]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('logout'),
      t('confirm_logout'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('logout'), style: 'destructive', onPress: () => logoutMutation.mutate() }
      ]
    );
  }, [logoutMutation, t]);

  const settingsData = useMemo(() => [
    {
      type: 'toggle',
      label: t("Private Account"),
      desc: t("Auto-accept connection requests.\nHide profile from non-connections."),
      value: !isPublic,
      icon: <Feather name="lock" size={20} color={theme.text} />,
      onChange: togglePrivateAccount,
      showToggle: true,
      disabled: loadingStatus || updatePublicStatus.isPending,
    },
    {
      type: 'toggle',
      label: t("Biometric"),
      desc: t("Unlock the app using fingerprint/face.\nAdds extra layer of security."),
      value: biometricEnabled,
      icon: <Feather name="shield" size={20} color={theme.text} />,
      onChange: handleBiometricToggle,
      showToggle: true,
      disabled: biometricLoading,
    },
    {
      type: 'toggle',
      label: t("Display Notifications"),
      desc: t("Show notification popups.\nEnhanced notification experience."),
      value: customNotificationsEnabled,
      icon: <Feather name="bell" size={20} color={theme.text} />,
      onChange: (val) => setCustomNotificationsEnabled(val),
      showToggle: true,
    },
    {
      type: 'button',
      label: t("Change PIN"),
      desc: t("Update your login PIN for extra security."),
      icon: <Feather name="key" size={20} color={theme.text} />,
      onPress: () => {
        setPinModalVisible(true);
        setPinError('');
        setPinSuccess('');
      },
    },
    {
      type: 'button',
      label: t("Logout"),
      desc: t("Sign out of your account and return to login."),
      icon: <Feather name="log-out" size={20} color={theme.text} />,
      onPress: handleLogout,
    },
  ], [
    t, isPublic, theme.text, loadingStatus, updatePublicStatus.isPending,
    biometricEnabled, biometricLoading, customNotificationsEnabled,
    togglePrivateAccount, handleBiometricToggle, handleLogout, setCustomNotificationsEnabled
  ]);

  const renderItem = ({ item }) => {
    if (item.type === 'toggle') {
      return <SettingItem item={item} theme={theme} t={t} />;
    }
    return <SettingButton item={item} theme={theme} t={t} onPress={item.onPress} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.headerRow, { backgroundColor: theme.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={18} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
          <Feather name="more-vertical" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu with Animation */}
      {menuVisible && (
        <Animated.View
          entering={FadeInDown}
          exiting={FadeOutUp}
          style={[styles.menu, { backgroundColor: theme.card }]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              // handle About or specific action
            }}
          >
            <Feather name="info" size={18} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.menuItemText, { color: theme.primary }]}>{t('About')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>{t('settings')}</Text>
      </View>

      <FlatList
        data={settingsData}
        renderItem={renderItem}
        keyExtractor={(item) => item.label}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={loadingStatus && (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginTop: 20 }} />
        )}
      />

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
          try {
            await changePinMutation.mutateAsync({ currentPin, newPin });
            setPinSuccess(t('pin_changed_success'));
            if (resetFields) resetFields();
          } catch (err) {
            setPinError(err.message || t('failed_to_change_pin'));
          }
        }}
        loading={changePinMutation.isPending}
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
    paddingBottom: 10,
  },
  titleRow: {
    paddingVertical: 8,
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
  listContent: {
    paddingVertical: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: '85%',
  },
  menu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 60,
    right: 24,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    zIndex: 100,
    elevation: 6,
    minWidth: 120,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
});