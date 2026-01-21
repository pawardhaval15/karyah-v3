import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import GradientButton from 'components/Login/GradientButton';
import * as Location from 'expo-location';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRegister } from '../hooks/useAuth';
import { useTheme } from '../theme/ThemeContext';
import { createProject } from '../utils/project';
import { createWorklist } from '../utils/worklist';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

const FormField = memo(({ label, value, onChangeText, theme, placeholder, keyboardType = 'default', isMultiline = false, onPress, editable = true, icon, rightIcon }) => (
  <Animated.View entering={FadeInDown.duration(400)} style={styles.fieldWrapper}>
    <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>{label}</Text>
    <TouchableOpacity activeOpacity={1} onPress={onPress}>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            minHeight: isMultiline ? 100 : 56,
          },
        ]}
      >
        {icon && <View style={styles.leftIcon}>{icon}</View>}
        <TextInput
          style={[
            styles.input,
            { color: theme.text, height: isMultiline ? 100 : 56 },
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.secondaryText}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={isMultiline}
          editable={editable && !onPress}
          pointerEvents={onPress ? 'none' : 'auto'}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
    </TouchableOpacity>
  </Animated.View>
));

export default function RegistrationForm({ route, navigation }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = route?.params?.user || {};
  const identifier = route?.params?.identifier || '';

  const registerMutation = useRegister();
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || identifier || '',
    location: user.location || '',
    dob: user.dob || '',
    pin: user.pin || '',
    bio: user.bio || '',
    profilePhoto: user.profilePhoto || '',
    userType: user.userType || '',
    isPublic: user.isPublic || false,
  });

  // Sync identifier if it changes
  useEffect(() => {
    if (identifier && !form.phone) {
      setForm(prev => ({ ...prev, phone: identifier }));
    }
  }, [identifier]);

  const handleChange = useCallback((key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleUseCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error'), t('location_permission_denied') || 'Location permission is required.');
        setGettingLocation(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync(location.coords);
      if (geocode && geocode[0]) {
        const { name, street, city, region, postalCode, country } = geocode[0];
        const addressString = [name, street, city, region, postalCode, country].filter(Boolean).join(', ');
        handleChange('location', addressString);
      } else {
        Alert.alert(t('error'), t('unable_to_fetch_address') || 'Unable to fetch address from location.');
      }
    } catch (err) {
      Alert.alert(t('error'), t('failed_to_get_location') || 'Failed to get current location.');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('error'), t('name_required') || 'Full Name is required.');
      return;
    }
    if (!form.phone.trim()) {
      Alert.alert(t('error'), t('phone_required') || 'Phone Number is required.');
      return;
    }
    if (!form.pin.trim()) {
      Alert.alert(t('error'), t('pin_required') || 'Secure PIN is required.');
      return;
    }

    try {
      const data = await registerMutation.mutateAsync({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        location: form.location.trim(),
        bio: form.bio.trim(),
        pin: form.pin.trim(),
      });

      await AsyncStorage.setItem('token', data.token);

      // Auto-create default project and worklist
      try {
        const defaultProject = await createProject({
          projectName: 'Default Project',
          description: 'Auto-created project for new user',
        });
        if (defaultProject?.id) {
          await createWorklist(defaultProject.id, 'Default Worklist', data.token);
        }
      } catch (setupErr) {
        console.warn('Initial setup failed:', setupErr);
      }

      Alert.alert(t('success'), t('registration_success') || 'Profile updated successfully!');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      Alert.alert(t('error'), error.message || t('internal_server_error'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Platform.OS === 'ios' ? 60 : 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>{t('complete_registration') || 'Complete Your Registration'}</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
            {t('registration_subtitle') || 'Tell us a bit more about yourself to get started.'}
          </Text>
        </Animated.View>


        <View style={styles.formContainer}>
          <FormField
            label={`${t('full_name')} *`}
            placeholder={t('enter_your_full_name')}
            value={form.name}
            onChangeText={t => handleChange('name', t)}
            theme={theme}
            icon={<Feather name="user" size={18} color={theme.primary} />}
          />

          <FormField
            label={`${t('phone_number')} *`}
            placeholder={t('enter_phone_number')}
            value={form.phone}
            onChangeText={t => handleChange('phone', t)}
            theme={theme}
            keyboardType="phone-pad"
            icon={<Feather name="phone" size={18} color={theme.primary} />}
          />

          <FormField
            label={`${t('set_pin') || 'Secure PIN'} *`}
            placeholder="4-6 Digit Numeric PIN"
            value={form.pin}
            onChangeText={t => handleChange('pin', t)}
            theme={theme}
            keyboardType="numeric"
            icon={<Feather name="lock" size={18} color={theme.primary} />}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsExpanded(!isExpanded)}
            style={styles.sectionDivider}
          >
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <View style={styles.sectionHeaderInner}>
              <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
                {t('additional_information') || 'Additional Information'}
              </Text>
              <Feather
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={theme.secondaryText}
                style={styles.expandIcon}
              />
            </View>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </TouchableOpacity>

          {isExpanded && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <FormField
                label={t('email_address')}
                placeholder={t('enter_your_email_address')}
                value={form.email}
                onChangeText={t => handleChange('email', t)}
                theme={theme}
                keyboardType="email-address"
                icon={<Feather name="mail" size={18} color={theme.primary} />}
              />

              <FormField
                label={t('location')}
                placeholder={t('enter_your_address')}
                value={form.location}
                onChangeText={t => handleChange('location', t)}
                theme={theme}
                icon={<Feather name="map-pin" size={18} color={theme.primary} />}
                rightIcon={
                  <TouchableOpacity onPress={handleUseCurrentLocation} disabled={gettingLocation}>
                    {gettingLocation ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons name="location-sharp" size={22} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                }
              />

              <FormField
                label={t('date_of_birth')}
                placeholder="YYYY-MM-DD"
                value={form.dob}
                theme={theme}
                icon={<Feather name="calendar" size={18} color={theme.primary} />}
                onPress={() => setShowDatePicker(true)}
                editable={false}
              />

              {showDatePicker && (
                <DateTimePicker
                  value={form.dob ? new Date(form.dob) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      const yyyy = selectedDate.getFullYear();
                      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const dd = String(selectedDate.getDate()).padStart(2, '0');
                      handleChange('dob', `${yyyy}-${mm}-${dd}`);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}

              <FormField
                label={t('bio')}
                placeholder={t('tell_us_about_yourself')}
                value={form.bio}
                onChangeText={t => handleChange('bio', t)}
                theme={theme}
                isMultiline
                icon={<Feather name="info" size={18} color={theme.primary} />}
              />

              <FormField
                label={t('user_type') || 'User Category'}
                placeholder="Professional / Client / etc."
                value={form.userType}
                onChangeText={t => handleChange('userType', t)}
                theme={theme}
                icon={<MaterialIcons name="category" size={18} color={theme.primary} />}
              />
            </Animated.View>
          )}

          <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.submitSection}>
            <GradientButton
              title={registerMutation.isPending ? t('loading') : t('submit') || 'Create Account'}
              onPress={handleSubmit}
            />
          </Animated.View>
        </View>
      </ScrollView>
      {registerMutation.isPending && (
        <View style={styles.overlay}>
          <View style={[styles.loadingCard, { backgroundColor: theme.card }]}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text, marginTop: 12 }]}>{t('processing') || 'Processing...'}</Text>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: isTablet ? '15%' : 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: isTablet ? 32 : 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
  formContainer: {
    gap: 4,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  leftIcon: {
    marginRight: 12,
    opacity: 0.8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  rightIcon: {
    marginLeft: 8,
  },
  submitSection: {
    marginTop: 24,
    marginBottom: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    width: 180,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
    gap: 12,
  },
  sectionHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandIcon: {
    marginTop: 1,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
