import { Feather, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import { useUserDetails } from '../../hooks/useUser';
import { themes, useThemeContext } from '../../theme/ThemeContext';
import { API_URL } from '../../utils/config';

const DrawerItem = memo(({
  icon,
  label,
  labelStyle,
  onPress,
  theme,
  rightComponent,
  showBorder = false,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.item,
        { backgroundColor: 'transparent' },
        showBorder && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <Text
        style={[
          styles.itemLabel,
          typeof labelStyle === 'object' ? labelStyle : {},
          { color: labelStyle && labelStyle.color ? labelStyle.color : theme.text },
        ]}
      >
        {String(label)}
      </Text>
      {rightComponent && <View style={styles.rightComponent}>{rightComponent}</View>}
    </TouchableOpacity>
  );
});

function ThemeSelector({ colorMode, setColorMode, theme }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.themeScrollContent}
    >
      {Object.keys(themes).map((key) => {
        const isSelected = colorMode === key;
        const themeColors = themes[key];
        return (
          <TouchableOpacity
            key={key}
            onPress={() => setColorMode(key)}
            activeOpacity={0.8}
            style={[
              styles.themeChip,
              {
                backgroundColor: themeColors.background,
                borderColor: isSelected ? theme.primary : theme.border,
              }
            ]}
          >
            <View style={[styles.themeColorDot, { backgroundColor: themeColors.primary }]} />
            <Text
              style={[
                styles.themeChipLabel,
                {
                  color: themeColors.text,
                  fontWeight: isSelected ? '700' : '400'
                }
              ]}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function CustomDrawer({ onClose, theme }) {
  const navigation = useNavigation();
  const route = useRoute();
  const { colorMode, setColorMode } = useThemeContext();
  const { t, i18n } = useTranslation();

  const isProfessionalDashboard = route.name === 'ProfessionalDashboard';
  const helpUrl = 'https://wa.me/919619555596?text=Hi%20Team%20Karyah!';
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  // Use hook for user details
  const { data: user } = useUserDetails();

  const userName = useMemo(() => {
    if (user && (user.name || user.userId || user.email)) {
      return String(user.name || user.userId || user.email);
    }
    return 'User';
  }, [user]);

  const changeLanguage = useCallback((lng) => {
    i18n.changeLanguage(lng);
  }, [i18n]);

  const handleLogout = useCallback(async () => {
    try {
      const deviceTokenKey = `fcm_token_${Platform.OS}`;
      const deviceToken = await AsyncStorage.getItem(deviceTokenKey);
      const userToken = await AsyncStorage.getItem('token');

      if (deviceToken && userToken) {
        try {
          // We invoke fetch directly here as this is a cleanup operation
          fetch(`${API_URL}api/devices/deviceToken`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify({ deviceToken }),
          }).catch(console.error);
          await AsyncStorage.removeItem(deviceTokenKey);
        } catch (error) {
          console.error('Error deleting device token:', error);
        }
      }

      await AsyncStorage.removeItem('token');
      try {
        await FileSystem.deleteAsync(FileSystem.cacheDirectory, { idempotent: true });
      } catch (cacheErr) {
        console.error('Error clearing cache:', cacheErr);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: 'PinLogin' }],
      });
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, [navigation]);

  const handleNavigation = useCallback((screen) => {
    navigation.navigate(screen);
    onClose && onClose();
  }, [navigation, onClose]);

  const languages = useMemo(() => [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'mr', label: 'Marathi' },
  ], []);

  return (
    <View style={[styles.drawer, { backgroundColor: theme.background, flex: 1 }]}>
      <Animated.View
        entering={FadeInLeft.duration(300)}
        style={[styles.header, { borderBottomColor: theme.border }]}
      >
        <View style={styles.userSection}>
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' },
            ]}
          >
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {userName?.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.title, { color: theme.text }]}
            >
              {userName}
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{t('welcome_to_karyah')}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: theme.card }]}
        >
          <Feather name="x" size={20} color={theme.text} />
        </TouchableOpacity>
      </Animated.View>

      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{t('main_menu')}</Text>
            <DrawerItem
              onPress={() => handleNavigation('ProjectScreen')}
              icon={<Octicons name="project" size={20} color={theme.primary} />}
              label={t('projects')}
              theme={theme}
              showBorder={true}
            />
            <DrawerItem
              icon={<Feather name="alert-circle" size={20} color="#FF5252" />}
              label={t('issues')}
              onPress={() => handleNavigation('IssuesScreen')}
              theme={theme}
              showBorder={true}
            />
            <DrawerItem
              icon={<Feather name="list" size={20} color="#4CAF50" />}
              label={t('tasks')}
              onPress={() => handleNavigation('MyTasksScreen')}
              theme={theme}
              showBorder={true}
            />
            <DrawerItem
              icon={
                <MaterialCommunityIcons
                  name="account-multiple-plus-outline"
                  size={20}
                  color="#FF9800"
                />
              }
              label={t('connections')}
              onPress={() => handleNavigation('ConnectionsScreen')}
              theme={theme}
            />
          </View>

          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{t('dashboard')}</Text>
            {isProfessionalDashboard ? (
              <DrawerItem
                icon={<MaterialIcons name="dashboard" size={20} color="#009688" />}
                label={t('overview')}
                onPress={() => handleNavigation('Home')}
                theme={theme}
              />
            ) : (
              <DrawerItem
                icon={<MaterialIcons name="analytics" size={20} color="#009688" />}
                label={t('Pro Dashboard')}
                onPress={() => handleNavigation('ProfessionalDashboard')}
                theme={theme}
              />
            )}
          </View>

          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{t('account')}</Text>

            <DrawerItem
              icon={<Feather name="user" size={20} color="#9C27B0" />}
              label={t('profile')}
              onPress={() => handleNavigation('UserProfileScreen')}
              theme={theme}
              showBorder={true}
            />
            <DrawerItem
              icon={<Feather name="settings" size={20} color="#607D8B" />}
              label={t('settings')}
              onPress={() => handleNavigation('SettingsScreen')}
              theme={theme}
              showBorder={true}
            />
            <DrawerItem
              icon={<MaterialIcons name="language" size={20} color={theme.primary} />}
              label={t('select_language')}
              onPress={() => setShowLanguageModal(true)}
              theme={theme}
              showBorder={true}
            />
            <DrawerItem
              icon={<MaterialIcons name="help-outline" size={20} color={theme.primary} />}
              label={t('help_support')}
              showBorder={true}
              onPress={() => {
                Linking.openURL(helpUrl).catch(console.error);
                onClose();
              }}
              theme={theme}
            />
            <DrawerItem
              icon={<Feather name="log-out" size={20} color="#FF5722" />}
              label={t('logout')}
              onPress={() => {
                handleLogout();
                onClose && onClose();
              }}
              theme={theme}
            />
          </View>
        </ScrollView>

        {/* Language Modal */}
        {showLanguageModal && (
          <View style={styles.languageModalOverlay}>
            <View style={[styles.languageModal, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>
                Select Language
              </Text>
              {languages.map(({ code, label }) => (
                <TouchableOpacity
                  key={code}
                  onPress={() => {
                    changeLanguage(code);
                    setShowLanguageModal(false);
                    onClose && onClose();
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Home' }],
                    });
                  }}
                  style={[
                    styles.languageOption,
                    {
                      backgroundColor:
                        i18n.language === code ? theme.primary + '20' : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: i18n.language === code ? '700' : '400' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={[styles.closeBtn, { marginTop: 12, borderWidth: 1, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' }]}
              >
                <Text style={{ color: theme.primary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.themeSectionModern, { borderTopColor: theme.border }]}>
        <Text style={[styles.themeLabel, { color: theme.secondaryText, marginBottom: 8 }]}>Appearance</Text>
        <ThemeSelector colorMode={colorMode} setColorMode={setColorMode} theme={theme} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  languageModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  languageModal: {
    width: '80%',
    borderRadius: 12,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  languageOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  themeSectionModern: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    marginTop: 4,
  },
  themeScrollContent: {
    paddingRight: 20,
    gap: 8,
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
    minWidth: 90,
    justifyContent: 'center',
  },
  themeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  themeChipLabel: {
    fontSize: 13,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  menuSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.8,
    marginTop: 1,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  rightComponent: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  customSwitch: {
    width: 50,
    height: 26,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    elevation: 3,
  },
  iconLeft: {
    position: 'absolute',
    left: 6,
    zIndex: 0,
  },
  iconRight: {
    position: 'absolute',
    right: 6,
    zIndex: 0,
  },
  drawer: {
    width: Platform.OS === 'ios' ? 280 : 280,
    backgroundColor: '#f7f8fa',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    zIndex: 1000,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    height: Dimensions.get('window').height,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 'auto',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  itemLabel: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
    letterSpacing: 0.2,
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 8,
    flexGrow: 1,
  },
});