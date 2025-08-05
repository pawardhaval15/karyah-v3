import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { fetchUserDetails, updateUserDetails } from '../utils/auth';
import GradientButton from 'components/Login/GradientButton';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png';

export default function UserProfileScreen({ navigation, route }) {
  const theme = useTheme();
  const [gettingLocation, setGettingLocation] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [name, setName] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pin, setPin] = useState('');

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        setGettingLocation(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync(location.coords);
      if (geocode && geocode[0]) {
        const { name, street, city, region, postalCode, country } = geocode[0];
        const addressString = [name, street, city, region, postalCode, country].filter(Boolean).join(', ');
        setAddress(addressString);
      } else {
        Alert.alert('Error', 'Unable to fetch address from location.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to get current location.');
    } finally {
      setGettingLocation(false);
    }
  };
  // Editable fields
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUserDetails();
        setName(userData.name || ''); // <-- add this
        setUser(userData);
        setBio(userData.bio || '');
        setPhone(userData.phone || '');
        setEmail(userData.email || '');
        setDob(userData.dob || '');
        setGender(userData.gender || '');
        setAddress(userData.location || '');
        setsupportPin(userData.supportPin || '');
        setProfilePhoto(userData.profilePhoto || DEFAULT_AVATAR);
      } catch (err) {
        Alert.alert('Error', 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const updated = await updateUserDetails({
        name,
        bio,
        phone,
        email,
        dob,
        gender,
        location: address,
        profilePhoto: profilePhoto, // <-- add this
      });
      setUser(updated);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Fallbacks if user is not loaded
  const avatarUri = user?.profilePhoto || DEFAULT_AVATAR;
  const displayName = user?.name || name || 'User';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
          <Feather name="more-vertical" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      {menuVisible && (
        <View style={[styles.menu, { backgroundColor: theme.card }]}>
          {!isEditing && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setIsEditing(true);
              }}
            >
              <Feather name="edit" size={18} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.menuItemText, { color: theme.primary }]}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <View style={{ alignItems: 'center', marginTop: 18 }}>
        <View>
          <Image source={{ uri: profilePhoto || DEFAULT_AVATAR }} style={styles.avatar} />
          {isEditing && (
            <TouchableOpacity
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: theme.card,
                borderRadius: 20,
                padding: 6,
              }}
              onPress={handlePickImage}
            >
              <Feather name="edit-2" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
      </View>

      <View style={styles.section}>
        {isEditing ? (
          <>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              placeholder="Name"
              placeholderTextColor={theme.secondaryText}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[styles.bioInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              placeholder="Bio"
              placeholderTextColor={theme.secondaryText}
              value={bio}
              onChangeText={setBio}
              multiline
            />

            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
              placeholder="Email"
              placeholderTextColor={theme.secondaryText}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8, color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                placeholder="Phone Number"
                placeholderTextColor={theme.secondaryText}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                  placeholder="Date of Birth (YYYY-MM-DD)"
                  placeholderTextColor={theme.secondaryText}
                  value={dob}
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={dob ? new Date(dob) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      const yyyy = selectedDate.getFullYear();
                      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const dd = String(selectedDate.getDate()).padStart(2, '0');
                      setDob(`${yyyy}-${mm}-${dd}`);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}

              {/* <TextInput
                style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                placeholder="Gender"
                placeholderTextColor={theme.secondaryText}
                value={gender}
                onChangeText={setGender}
              /> */}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderColor: theme.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, backgroundColor: theme.card, minHeight: 54 }}>
              <TextInput
                style={[
                  {
                    flex: 1,
                    fontSize: 16,
                    paddingVertical: 10,
                    color: theme.text,
                  }
                ]}
                placeholder="Address"
                placeholderTextColor={theme.secondaryText}
                value={address}
                onChangeText={setAddress}
              />
              <TouchableOpacity
                onPress={handleUseCurrentLocation}
                style={{ marginLeft: 8 }}
                disabled={gettingLocation}
              >
                <Feather name="map-pin" size={22} color={theme.primary} />
              </TouchableOpacity>
            </View>

          </>
        ) : (
          <>
            <Text style={[styles.bioInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}>
              {bio || 'No bio'}
            </Text>

            <Text style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}>
              {email || 'No email'}
            </Text>
            <View style={styles.row}>

              <Text style={[styles.input, { flex: 1, marginRight: 8, color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}>
                {phone || 'No phone'}
              </Text>
              <Text style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}>
                {dob || 'No DOB'}
              </Text>
              {/* <Text style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}>
                {gender || 'No gender'}
              </Text> */}
            </View>
            <Text style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}>
              {address || 'No address'}
            </Text>
            <Text style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}>
              {supportPin ? `Support PIN: ${supportPin}` : 'No Support PIN'}
            </Text>
            {/* <TouchableOpacity style={styles.rowBetween} disabled>
              <Text style={[styles.changePinLabel, { color: theme.text }]}>Change PIN</Text>
              <Feather name="chevron-right" size={20} color={theme.secondaryText} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <TouchableOpacity style={styles.rowBetween} disabled>
              <Text style={[styles.changePinLabel, { color: theme.text }]}>Biometric</Text>
              <Feather name="chevron-right" size={20} color={theme.secondaryText} />
            </TouchableOpacity> */}
          </>
        )}
        {isEditing && (
          <View style={styles.saveBtn}>
            <GradientButton title="Save Profile" onPress={handleSave} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuItemText: {
    fontWeight: '400',
    fontSize: 15,
  },
  headerRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 70 : 25,
    marginBottom: 8,
  },
  menu: {
    position: 'absolute',
    top: 100,
    right: 24,
    borderRadius: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    zIndex: 100,
    minWidth: 170,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 2,
  },
  profileTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 12,
    backgroundColor: '#F8F9FB',
  },
  name: {
    fontWeight: '600',
    fontSize: 20,
    marginBottom: 18,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 18,
    marginTop: 8,
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    minHeight: 80,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#222',
    marginTop: 18,
    marginBottom: 10,
  },
  locationLabel: {
    fontWeight: '500',
    fontSize: 15,
    color: '#222',
    marginBottom: 10,
    marginLeft: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  categoryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 22,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 22,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBtnText: {
    fontWeight: '500',
    fontSize: 15,
  },
  categoryBtnTextActive: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 12,
  },
  changePinLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  saveBtn: {
    marginTop: 30,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});