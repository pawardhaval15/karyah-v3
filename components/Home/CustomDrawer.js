import { Feather, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { useThemeContext } from '../../theme/ThemeContext'; // <-- import your theme context/provider
import { fetchUserDetails } from '../../utils/auth';
import { Linking } from 'react-native';

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

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
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
      <View style={styles.header}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.title, { color: theme.text }]}>
          Hi {userName ? userName : 'there'} !
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Feather name="x" size={24} color={iconColor} />
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, minHeight: 400 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <DrawerItem
            onPress={() => {
              navigation.navigate('ProjectScreen');
              onClose && onClose();
            }}
            icon={<Octicons name="project" size={20} color="#366CD9" />}
            label="Project"
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
            label="Task"
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
          />
          {isProfessionalDashboard ? (
            <DrawerItem
              icon={<MaterialIcons name="dashboard" size={20} color="#009688" />}
              label="Overview Dashboard"
              onPress={() => {
                navigation.navigate('Home');
                onClose && onClose();
              }}
              theme={theme}
            />
          ) : (
            <DrawerItem
              icon={<MaterialIcons name="analytics" size={20} color="#009688" />}
              label="Analytics Dashboard"
              onPress={() => {
                navigation.navigate('ProfessionalDashboard');
                onClose && onClose();
              }}
              theme={theme}
            />
          )}
          <DrawerItem
            icon={<MaterialIcons name="help-outline" size={20} color={secondaryColor} />}
            label="Help"
            labelStyle={{ color: secondaryColor }}
            onPress={() => {
              Linking.openURL(helpUrl).catch(err => {
                console.error("Failed to open URL:", err);
              });
              onClose();  // close the drawer
            }}
            theme={theme}
          />
          <DrawerItem
            icon={<Feather name="log-out" size={20} color="#FF5722" />}
            label="Logout"
            onPress={() => {
              handleLogout();
              onClose && onClose();
            }}
            theme={theme}
          />
        </ScrollView>
      </View>

      <View style={styles.themeToggleContainer}>
        <TouchableOpacity
          onPress={() => setColorMode(colorMode === 'dark' ? 'light' : 'dark')}
          activeOpacity={0.9}
          style={[
            styles.customSwitch,
            { backgroundColor: colorMode === 'dark' ? '#333' : '#ddd' },
          ]}>
          <Feather
            name="sun"
            size={16}
            color={colorMode === 'dark' ? '#888' : '#FFA000'}
            style={styles.iconLeft}
          />
          <Feather
            name="moon"
            size={16}
            color={colorMode === 'dark' ? '#FFD600' : '#888'}
            style={styles.iconRight}
          />

          <Animated.View
            style={[
              styles.thumb,
              {
                left: colorMode === 'dark' ? 34 : 2,
                backgroundColor: colorMode === 'dark' ? '#FFD600' : '#FFA000',
              },
            ]}>
            <Feather
              name={colorMode === 'dark' ? 'moon' : 'sun'}
              size={12}
              color={colorMode === 'dark' ? '#000' : '#fff'}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DrawerItem({ icon, label, labelStyle, onPress, theme }) {
  return (
    <View>
      <TouchableOpacity style={styles.item} onPress={onPress}>
        {icon}
        <Text
          style={[
            styles.itemLabel,
            typeof labelStyle === 'object' ? labelStyle : {},
            { color: labelStyle && labelStyle.color ? labelStyle.color : theme.text },
          ]}>
          {String(label)}
        </Text>
      </TouchableOpacity>
      <View style={[styles.divider, { backgroundColor: theme.DrawerBorder }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  themeToggleContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 10,
  },
  customSwitch: {
    width: 60,
    height: 30,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    elevation: 3,
  },
  iconLeft: {
    position: 'absolute',
    left: 8,
    zIndex: 0,
  },
  iconRight: {
    position: 'absolute',
    right: 8,
    zIndex: 0,
  },

  drawer: {
    width: 300,
    backgroundColor: '#f7f8fa', // overridden by theme.background
    paddingTop: Platform.OS === 'ios' ? 70 : 25,
    paddingHorizontal: 24,
    zIndex: 1000,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 2, height: 0 },
    height: Dimensions.get('window').height,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 'auto',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222', // overridden by theme.text
    maxWidth: '80%',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemLabel: {
    fontSize: 18,
    color: '#222', // overridden by theme.text
    marginLeft: 15,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    backgroundColor: '#bbb', // overridden by theme.border
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
});
