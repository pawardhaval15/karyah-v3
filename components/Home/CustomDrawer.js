import { Feather, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { useEffect, useState } from 'react';
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
import Animated from 'react-native-reanimated';
import { useThemeContext } from '../../theme/ThemeContext'; // <-- import your theme context/provider
import { fetchUserDetails } from '../../utils/auth';
import { useTranslation } from 'react-i18next';
export default function CustomDrawer({ onClose, theme }) {
  const navigation = useNavigation();
  const route = useRoute();
  const { colorMode, setColorMode } = useThemeContext(); // <-- get color mode and setter
  const { i18n } = useTranslation();
  const isProfessionalDashboard = route.name === 'ProfessionalDashboard';
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };
  const { t } = useTranslation();
  // Helper to get icon color based on theme
  const iconColor = theme.text;
  const secondaryColor = theme.primary;
  const [userName, setUserName] = useState('');
  const helpUrl = 'https://wa.me/919619555596?text=Hi%20Team%20Karyah!';
  useEffect(() => {
    fetchUserDetails()
      .then((user) => {
        if (user && (user.name || user.userId || user.email)) {
          // Ensure value is always a string
          setUserName(String(user.name || user.userId || user.email));
        } else {
          setUserName('User'); // fallback
        }
      })
      .catch(() => setUserName('User'));
  }, []);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'mr', label: 'Marathi' },
    // { code: 'bh', label: 'Bhojpuri' },
    // add more languages you support
  ];

  // const handleLogout = async () => {
  //   try {
  //     await AsyncStorage.removeItem('token');
  //     navigation.reset({
  //       index: 0,
  //       routes: [{ name: 'PinLogin' }],
  //     });
  //   } catch (err) {
  //     console.error('Logout failed:', err);
  //   }
  // };

  const handleLogout = async () => {
    try {
      // Get device token from AsyncStorage
      const deviceTokenKey = `fcm_token_${Platform.OS}`;
      const deviceToken = await AsyncStorage.getItem(deviceTokenKey);

      // Get user auth token from AsyncStorage
      const userToken = await AsyncStorage.getItem('token');

      // Call backend to delete device token if both tokens exist
      if (deviceToken && userToken) {
        try {
          const response = await fetch('https://api.karyah.in/api/devices/deviceToken', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify({ deviceToken }),
          });

          if (!response.ok) {
            console.error('Failed to delete device token:', await response.text());
          } else {
            console.log('Device token deleted successfully');
            // Optionally remove stored device token
            await AsyncStorage.removeItem(deviceTokenKey);
          }
        } catch (error) {
          console.error('Error deleting device token:', error);
        }
      } else {
        console.log('No device token or user token found, skipping device token removal');
      }

      // Remove user token (auth)
      await AsyncStorage.removeItem('token');
      // CLEAR APP CACHE (FileSystem)
      try {
        console.log('Clearing cache...');
        await FileSystem.deleteAsync(FileSystem.cacheDirectory, { idempotent: true });
        console.log('Cache cleared successfully');
      } catch (cacheErr) {
        console.error('Error clearing cache:', cacheErr);
      }
      // Reset navigation to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'PinLogin' }],
      });
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <View style={[styles.drawer, { backgroundColor: theme.background, flex: 1 }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.userSection}>
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' },
            ]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {userName?.toString().trim() ? userName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.title, { color: theme.text }]}>
              {userName?.toString().trim() || 'User'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{t('welcome_to_karyah')}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: theme.card }]}>
          <Feather name="x" size={20} color={iconColor} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}>
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{t('main_menu')}</Text>
            <DrawerItem
              onPress={() => {
                navigation.navigate('ProjectScreen');
                onClose && onClose();
              }}
              icon={<Octicons name="project" size={20} color={theme.primary} />}
              label={t('projects')}
              theme={theme}
              showBorder={true}
            />
            <DrawerItem
              icon={<Feather name="alert-circle" size={20} color="#FF5252" />}
              label={t('issues')}
              onPress={() => {
                navigation.navigate('IssuesScreen');
                onClose && onClose();
              }}
              theme={theme}
              showBorder={true}
            />
            <DrawerItem
              icon={<Feather name="list" size={20} color="#4CAF50" />}
              label={t('tasks')}
              onPress={() => {
                navigation.navigate('MyTasksScreen');
                onClose && onClose();
              }}
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
              onPress={() => {
                navigation.navigate('ConnectionsScreen');
                onClose && onClose();
              }}
              theme={theme}
            />
          </View>

          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{t('dashboard')}</Text>
            {isProfessionalDashboard ? (
              <DrawerItem
                icon={<MaterialIcons name="dashboard" size={20} color="#009688" />}
                label={t('overview')}
                onPress={() => {
                  navigation.navigate('Home');
                  onClose && onClose();
                }}
                theme={theme}
              />
            ) : (
              <DrawerItem
                icon={<MaterialIcons name="analytics" size={20} color="#009688" />}
                label={t('analytics')}
                onPress={() => {
                  navigation.navigate('ProfessionalDashboard');
                  onClose && onClose();
                }}
                theme={theme}
              />
            )}
          </View>
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{t('language')}</Text>

            <DrawerItem
              icon={<MaterialIcons name="language" size={20} color={theme.primary} />}
              label={t('select_language')}
              onPress={() => {
                setShowLanguageModal(true);
                // do NOT call changeLanguage or use 'code' here since no language selected yet
                // do NOT close drawer here to let modal render
              }}

              theme={theme}
            />
          </View>
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{t('account')}</Text>
            <DrawerItem
              icon={<Feather name="user" size={20} color="#9C27B0" />}
              label={t('profile')}
              onPress={() => {
                navigation.navigate('UserProfileScreen');
                onClose && onClose();
              }}
              theme={theme}
              showBorder={true}
            />
            <DrawerItem
              icon={<Feather name="settings" size={20} color="#607D8B" />}
              label={t('settings')}
              onPress={() => {
                navigation.navigate('SettingsScreen');
                onClose && onClose();
              }}
              theme={theme}
              showBorder={true}
              rightComponent={
                <View style={styles.themeToggleSmall}>
                  <TouchableOpacity
                    onPress={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
                    style={[styles.themeBadge, { backgroundColor: theme.primary + '15' }]}>
                    <Feather
                      name={colorMode === 'dark' ? 'moon' : 'sun'}
                      size={12}
                      color={theme.primary}
                    />
                  </TouchableOpacity>
                </View>
              }
            />

            <DrawerItem
              icon={<MaterialIcons name="help-outline" size={20} color={theme.primary} />}
              label={t('help_support')}
              showBorder={true}
              onPress={() => {
                Linking.openURL(helpUrl).catch((err) => {
                  console.error('Failed to open URL:', err);
                });
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
                    onClose && onClose(); // close drawer too optionally
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
                  ]}>
                  <Text style={{ color: theme.text, fontWeight: i18n.language === code ? '700' : '400' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={[styles.closeBtn, { marginTop: 12 }]}>
                <Text style={{ color: theme.primary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>
      <View style={[styles.themeToggleContainerModern, { borderTopColor: theme.border }]}>
        <Text style={[styles.themeLabel, { color: theme.secondaryText }]}>Mode</Text>
        <ThemeToggle colorMode={colorMode} setColorMode={setColorMode} />
      </View>
    </View>
  );
}

function DrawerItem({
  icon,
  label,
  labelStyle,
  onPress,
  theme,
  rightComponent,
  showBorder = false,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.item,
        { backgroundColor: 'transparent' },
        showBorder && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text
        style={[
          styles.itemLabel,
          typeof labelStyle === 'object' ? labelStyle : {},
          { color: labelStyle && labelStyle.color ? labelStyle.color : theme.text },
        ]}>
        {String(label)}
      </Text>
      {rightComponent && <View style={styles.rightComponent}>{rightComponent}</View>}
    </TouchableOpacity>
  );
}

function ThemeToggle({ colorMode, setColorMode }) {
  return (
    <TouchableOpacity
      onPress={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
      activeOpacity={0.9}
      style={[styles.customSwitch, { backgroundColor: colorMode === 'dark' ? '#333' : '#ddd' }]}>
      <Feather
        name="sun"
        size={12}
        color={colorMode === 'dark' ? '#888' : '#FFA000'}
        style={styles.iconLeft}
      />
      <Feather
        name="moon"
        size={12}
        color={colorMode === 'dark' ? '#FFD600' : '#888'}
        style={styles.iconRight}
      />
      <Animated.View
        style={[
          styles.thumb,
          {
            left: colorMode === 'dark' ? 26 : 2,
            backgroundColor: colorMode === 'dark' ? '#FFD600' : '#FFA000',
          },
        ]}>
        <Feather
          name={colorMode === 'dark' ? 'moon' : 'sun'}
          size={10}
          color={colorMode === 'dark' ? '#000' : '#fff'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  languageModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor: 'rgba(0,0,0,0.35)',
    background: 'transparent',
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

  themeToggleContainerModern: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 4,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '500',
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
  logoutSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  iconContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  themeToggleSmall: {
    marginLeft: 4,
  },
  themeBadge: {
    width: 20,
    height: 20,
    borderRadius: 12,
    alignItems: 'center',
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
  drawerItemRow: {
    marginBottom: 2,
  },
  rightComponent: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerThick: {
    height: 2,
    backgroundColor: '#e3e8f0',
    opacity: 0.7,
    marginVertical: 10,
    borderRadius: 2,
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
  divider: {
    height: 1,
    backgroundColor: '#bbb',
    opacity: 0.4,
    marginLeft: 2,
    marginBottom: 0,
  },
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 0,
    gap: 10,
  },
  themeToggleLabel: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 8,
    flexGrow: 1,
  },
});
