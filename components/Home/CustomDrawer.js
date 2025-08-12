import { Feather, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Dimensions, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useThemeContext } from '../../theme/ThemeContext'; // <-- import your theme context/provider
import { fetchUserDetails } from '../../utils/auth';

export default function CustomDrawer({ onClose, theme }) {
  const navigation = useNavigation();
  const route = useRoute();
  const { colorMode, setColorMode } = useThemeContext(); // <-- get color mode and setter

  const isProfessionalDashboard = route.name === 'ProfessionalDashboard';

  // Helper to get icon color based on theme
  const iconColor = theme.text;
  const secondaryColor = theme.primary;
  const [userName, setUserName] = useState('');
  const helpUrl = 'https://wa.me/919619555596?text=Hi%20Team%20Karyah!';
  useEffect(() => {
    fetchUserDetails()
      .then((user) => setUserName(user.name || user.userId || user.email || ''))
      .catch(() => setUserName(''));
  }, []);

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
          <View style={[styles.avatarCircle, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.title, { color: theme.text }]}> 
              {userName ? userName : 'User'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Welcome to Karyah</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.card }]}>
          <Feather name="x" size={20} color={iconColor} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>MAIN MENU</Text>
            <DrawerItem
              onPress={() => {
                navigation.navigate('ProjectScreen');
                onClose && onClose();
              }}
              icon={<Octicons name="project" size={20} color={theme.primary} />}
              label="Projects"
              theme={theme}
            />
            <DrawerItem
              icon={<Feather name="alert-circle" size={20} color="#FF5252" />}
              label="Issues"
              onPress={() => {
                navigation.navigate('IssuesScreen');
                onClose && onClose();
              }}
              theme={theme}
            />
            <DrawerItem
              icon={<Feather name="list" size={20} color="#4CAF50" />}
              label="Tasks"
              onPress={() => {
                navigation.navigate('MyTasksScreen');
                onClose && onClose();
              }}
              theme={theme}
            />
            <DrawerItem
              icon={
                <MaterialCommunityIcons
                  name="account-multiple-plus-outline"
                  size={20}
                  color="#FF9800"
                />
              }
              label="Connections"
              onPress={() => {
                navigation.navigate('ConnectionsScreen');
                onClose && onClose();
              }}
              theme={theme}
            />
          </View>

          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>DASHBOARD</Text>
            {isProfessionalDashboard ? (
              <DrawerItem
                icon={<MaterialIcons name="dashboard" size={20} color="#009688" />}
                label="Overview"
                onPress={() => {
                  navigation.navigate('Home');
                  onClose && onClose();
                }}
                theme={theme}
              />
            ) : (
              <DrawerItem
                icon={<MaterialIcons name="analytics" size={20} color="#009688" />}
                label="Analytics"
                onPress={() => {
                  navigation.navigate('ProfessionalDashboard');
                  onClose && onClose();
                }}
                theme={theme}
              />
            )}
          </View>

          <View style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>ACCOUNT</Text>
            <DrawerItem
              icon={<Feather name="user" size={20} color="#9C27B0" />}
              label="Profile"
              onPress={() => {
                navigation.navigate('UserProfileScreen');
                onClose && onClose();
              }}
              theme={theme}
            />
            <DrawerItem
              icon={<Feather name="settings" size={20} color="#607D8B" />}
              label="Settings"
              onPress={() => {
                navigation.navigate('SettingsScreen');
                onClose && onClose();
              }}
              theme={theme}
              rightComponent={
                <View style={styles.themeToggleSmall}>
                  <TouchableOpacity
                    onPress={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
                    style={[styles.themeBadge, { backgroundColor: theme.primary + '15' }]}>
                    <Feather 
                      name={colorMode === 'dark' ? 'moon' : 'sun'} 
                      size={14} 
                      color={theme.primary} 
                    />
                  </TouchableOpacity>
                </View>
              }
            />
            <DrawerItem
              icon={<MaterialIcons name="help-outline" size={20} color={theme.primary} />}
              label="Help & Support"
              onPress={() => {
                Linking.openURL(helpUrl).catch(err => {
                  console.error("Failed to open URL:", err);
                });
                onClose();
              }}
              theme={theme}
            />
          </View>

          <View style={[styles.logoutSection, { borderTopColor: theme.border }]}>
            <DrawerItem
              icon={<Feather name="log-out" size={20} color="#FF5722" />}
              label="Logout"
              onPress={() => {
                handleLogout();
                onClose && onClose();
              }}
              theme={theme}
            />
          </View>
        </ScrollView>
      </View>
      <View style={[styles.themeToggleContainerModern, { borderTopColor: theme.border }]}>
        <Text style={[styles.themeLabel, { color: theme.secondaryText }]}>Mode</Text>
        <ThemeToggle colorMode={colorMode} setColorMode={setColorMode} />
      </View>
    </View>
  );
}

function DrawerItem({ icon, label, labelStyle, onPress, theme, rightComponent }) {
  return (
    <TouchableOpacity style={[styles.item, { backgroundColor: 'transparent' }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
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
      style={[
        styles.customSwitch,
        { backgroundColor: colorMode === 'dark' ? '#333' : '#ddd' },
      ]}>
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
    marginLeft: 8,
  },
  themeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
