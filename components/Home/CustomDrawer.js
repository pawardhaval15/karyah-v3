import { Feather, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInLeft,
  FadeInUp
} from 'react-native-reanimated';
import { useLogout, useUserDetails } from '../../hooks/useUser';
import { useDrawerUIStore } from '../../store/drawerUIStore';
import { themes, useThemeContext } from '../../theme/ThemeContext';


const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- Helper Components ---

const DrawerItem = memo(({
  icon,
  label,
  onPress,
  theme,
  showBorder = false,
  isDanger = false,
}) => (
  <TouchableOpacity
    style={[
      styles.item,
      showBorder && { borderBottomWidth: 1, borderBottomColor: theme.border },
    ]}
    onPress={onPress}
    activeOpacity={0.6}
  >
    <View style={styles.iconContainer}>{icon}</View>
    <Text
      style={[
        styles.itemLabel,
        { color: isDanger ? '#FF5252' : theme.text }
      ]}
    >
      {label}
    </Text>
    <Feather name="chevron-right" size={14} color={theme.secondaryText} style={{ opacity: 0.5 }} />
  </TouchableOpacity>
));

const ThemeChip = memo(({ themeKey, isSelected, onPress, themeColors, currentTheme }) => (
  <TouchableOpacity
    onPress={() => onPress(themeKey)}
    activeOpacity={0.8}
    style={[
      styles.themeChip,
      {
        backgroundColor: themeColors.background,
        borderColor: isSelected ? currentTheme.primary : currentTheme.border,
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
      {themeKey.charAt(0).toUpperCase() + themeKey.slice(1)}
    </Text>
  </TouchableOpacity>
));

// --- Language Popup Modal ---

const LanguagePopup = memo(({ visible, onClose, theme, languages, currentLang, onSelect }) => {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.centeredOverlay}>
        <Animated.View
          entering={FadeInUp.duration(300)}
          style={[
            styles.popupContent,
            { backgroundColor: theme.card, borderColor: theme.border }
          ]}
        >
          <Text style={[styles.popupTitle, { color: theme.text }]}>{t('select_language')}</Text>

          <View style={styles.popupList}>
            {languages.map(({ code, label }) => {
              const isSelected = currentLang === code;
              return (
                <TouchableOpacity
                  key={code}
                  onPress={() => onSelect(code)}
                  activeOpacity={0.7}
                  style={[
                    styles.popupItem,
                    {
                      backgroundColor: isSelected ? theme.primary + '10' : 'transparent',
                      borderColor: isSelected ? theme.primary : 'transparent',
                      borderWidth: 1
                    }
                  ]}
                >
                  <Text style={[
                    styles.popupLabel,
                    { color: theme.text, fontWeight: isSelected ? '700' : '400' }
                  ]}>
                    {label}
                  </Text>
                  {isSelected && <MaterialIcons name="check" size={20} color={theme.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={[styles.popupCancelBtn, { backgroundColor: theme.primary + '10' }]}
          >
            <Text style={{ color: theme.primary, fontWeight: '700' }}>{t('cancel')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
});

// --- Main Drawer ---

export default function CustomDrawer({ onClose, theme }) {
  const navigation = useNavigation();
  const route = useRoute();
  const { colorMode, setColorMode } = useThemeContext();
  const { t, i18n } = useTranslation();

  const { showLanguageModal, setShowLanguageModal } = useDrawerUIStore();
  const { data: user } = useUserDetails();
  const logoutMutation = useLogout(navigation);

  const isProfessionalDashboard = route.name === 'ProfessionalDashboard';
  const helpUrl = 'https://wa.me/919619555596?text=Hi%20Team%20Karyah!';

  const userName = useMemo(() => {
    return user?.name || user?.userId || user?.email || 'User';
  }, [user]);

  const languages = useMemo(() => [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'mr', label: 'Marathi' },
  ], []);

  const changeLanguage = useCallback((lng) => {
    i18n.changeLanguage(lng);
    setShowLanguageModal(false);
    onClose && onClose();
    // Smooth reset to home to apply language changes globally
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  }, [i18n, navigation, onClose, setShowLanguageModal]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('logout'),
      t('logout_confirm'), // You might need to add this key to translations
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('logout'),
          style: 'destructive',
          onPress: () => logoutMutation.mutate()
        },
      ]
    );
  }, [t, logoutMutation]);

  const handleNavigation = useCallback((screen) => {
    navigation.navigate(screen);
    onClose && onClose();
  }, [navigation, onClose]);

  return (
    <View style={[styles.drawer, { backgroundColor: theme.background }]}>
      {/* Header Section */}
      <Animated.View
        entering={FadeInLeft.delay(100).duration(400)}
        style={[styles.header, { borderBottomColor: theme.border }]}
      >
        <TouchableOpacity
          style={styles.userSection}
          onPress={() => handleNavigation('UserProfileScreen')}
        >
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' },
            ]}
          >
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
              {userName}
            </Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>{t('welcome_to_karyah')}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.card }]}>
          <Feather name="x" size={20} color={theme.text} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Navigation */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{t('main_menu')}</Text>
          <DrawerItem
            onPress={() => handleNavigation('ProjectScreen')}
            icon={<Octicons name="project" size={18} color={theme.primary} />}
            label={t('projects')}
            theme={theme}
            showBorder
          />
          <DrawerItem
            onPress={() => handleNavigation('IssuesScreen')}
            icon={<Feather name="alert-circle" size={18} color="#FF5252" />}
            label={t('issues')}
            theme={theme}
            showBorder
          />
          <DrawerItem
            onPress={() => handleNavigation('MyTasksScreen')}
            icon={<Feather name="list" size={18} color="#4CAF50" />}
            label={t('tasks')}
            theme={theme}
            showBorder
          />
          <DrawerItem
            onPress={() => handleNavigation('ConnectionsScreen')}
            icon={<MaterialCommunityIcons name="account-multiple-plus-outline" size={18} color="#FF9800" />}
            label={t('connections')}
            theme={theme}
          />
        </Animated.View>

        {/* Dashboard Section */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{t('dashboard')}</Text>
          <DrawerItem
            onPress={() => handleNavigation(isProfessionalDashboard ? 'Home' : 'ProfessionalDashboard')}
            icon={<MaterialIcons name={isProfessionalDashboard ? "dashboard" : "analytics"} size={18} color="#009688" />}
            label={isProfessionalDashboard ? t('overview') : t('Pro Dashboard')}
            theme={theme}
          />
        </Animated.View>

        {/* Support & Account */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{t('preferences')}</Text>
          <DrawerItem
            onPress={() => setShowLanguageModal(true)}
            icon={<MaterialIcons name="language" size={18} color={theme.primary} />}
            label={t('select_language')}
            theme={theme}
            showBorder
          />
          <DrawerItem
            onPress={() => {
              Linking.openURL(helpUrl).catch(console.error);
              onClose();
            }}
            icon={<MaterialIcons name="help-outline" size={18} color={theme.primary} />}
            label={t('help_support')}
            theme={theme}
            showBorder
          />
          <DrawerItem
            onPress={() => handleNavigation('SettingsScreen')}
            icon={<Feather name="settings" size={18} color="#607D8B" />}
            label={t('settings')}
            theme={theme}
            showBorder
          />
          <DrawerItem
            onPress={handleLogout}
            icon={<Feather name="log-out" size={18} color="#FF5252" />}
            label={t('logout')}
            theme={theme}
            isDanger
          />
        </Animated.View>
      </ScrollView>

      {/* Modern Theme Selector */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.themeLabel, { color: theme.secondaryText }]}>Theme Appearance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.themeRow}>
          {Object.keys(themes).map((key) => (
            <ThemeChip
              key={key}
              themeKey={key}
              isSelected={colorMode === key}
              onPress={setColorMode}
              themeColors={themes[key]}
              currentTheme={theme}
            />
          ))}
        </ScrollView>
      </View>

      {/* Refined Language Picker */}
      <LanguagePopup
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        theme={theme}
        languages={languages}
        currentLang={i18n.language}
        onSelect={changeLanguage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    marginLeft: 14,
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 12,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
    opacity: 0.6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  themeLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  themeRow: {
    flexDirection: 'row',
  },
  themeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 10,
    minWidth: 95,
  },
  themeColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  themeChipLabel: {
    fontSize: 13,
  },
  centeredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  popupContent: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  popupList: {
    gap: 8,
  },
  popupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  popupLabel: {
    fontSize: 16,
  },
  popupCancelBtn: {
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
});