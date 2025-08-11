import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { registerUser } from '../utils/auth';
import { createProject } from '../utils/project';
import { createWorklist } from '../utils/worklist';

export default function RegistrationForm({ route, navigation }) {
  const user = route?.params?.user || {};
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    location: user.location || '',
    dob: user.dob || '',
    pin: user.pin || '',
    bio: user.bio || '',
    profilePhoto: user.profilePhoto || '',
    userType: user.userType || '',
    isPublic: user.isPublic || false,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!form.name || !form.phone) {
      Alert.alert('Required', 'Name and phone are required.');
      return;
    }
    try {
      const data = await registerUser({
        name: form.name,
        phone: form.phone,
        email: form.email,
        location: form.location,
        bio: form.bio,
        pin: form.pin,
      });
      await AsyncStorage.setItem('token', data.token);
      // Auto-create default project and worklist
      const token = data.token;
      const defaultProject = await createProject({
        projectName: 'Default Project',
        description: 'Auto-created project for new user',
        // Add other required fields if needed
      });
      await createWorklist(defaultProject.id, 'Default Worklist', token);
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Error', error.message || 'Internal Server Error');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#F8F9FB' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ padding: 24, marginTop: Platform.OS === 'ios' ? 70 : 25, }}>
        <Text style={styles.title}>Complete Your Registration</Text>
        {/* Profile Photo */}
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <Image
            source={form.profilePhoto ? { uri: form.profilePhoto } : require('../assets/icon.png')}
            style={styles.avatar}
          />
        </View>
        {/* Name */}
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={form.name}
          onChangeText={t => handleChange('name', t)}
        />
        {/* Email */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={form.email}
          onChangeText={t => handleChange('email', t)}
          keyboardType="email-address"
        />
        {/* Phone */}
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={form.phone}
          onChangeText={t => handleChange('phone', t)}
          keyboardType="phone-pad"
        />
        {/* Location with GPS icon */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ccc' }}>
          <TextInput
            style={[styles.input, { flex: 1, borderWidth: 0, marginBottom: 0, backgroundColor: 'transparent' }]}
            placeholder="Location"
            value={form.location}
            onChangeText={t => handleChange('location', t)}
          />
          <TouchableOpacity
            style={{ paddingHorizontal: 10 }}
            onPress={async () => {
              try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                  Alert.alert('Permission denied', 'Location permission is required.');
                  return;
                }
                let loc = await Location.getCurrentPositionAsync({});
                if (loc && loc.coords) {
                  // Reverse geocode to get address
                  let addresses = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                  });
                  if (addresses && addresses.length > 0) {
                    const addr = addresses[0];
                    // Compose a readable address
                    const addressString = [
                      addr.name,
                      addr.street,
                      addr.city,
                      addr.region,
                      addr.postalCode,
                      addr.country
                    ].filter(Boolean).join(', ');
                    handleChange('location', addressString);
                  } else {
                    handleChange('location', `${loc.coords.latitude}, ${loc.coords.longitude}`);
                  }
                }
              } catch (e) {
                Alert.alert('Error', 'Could not get location.');
              }
            }}
          >
            <Ionicons name="location-sharp" size={24} color="#366CD9" />
          </TouchableOpacity>
        </View>
        {/* DOB with Date Picker */}
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <TextInput
            style={styles.input}
            placeholder="Date of Birth (YYYY-MM-DD)"
            value={form.dob}
            editable={false}
            pointerEvents="none"
          />
        </TouchableOpacity>
        {/* Date Picker Modal */}
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
        {/* PIN */}
        <TextInput
          style={styles.input}
          placeholder="Set PIN"
          value={form.pin}
          onChangeText={t => handleChange('pin', t)}
          keyboardType="numeric"
        />
        {/* Bio */}
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Short Bio"
          value={form.bio}
          onChangeText={t => handleChange('bio', t)}
          multiline
        />
        {/* User Type */}
        <TextInput
          style={styles.input}
          placeholder="User Type (e.g. Professional, Client)"
          value={form.userType}
          onChangeText={t => handleChange('userType', t)}
        />
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#011F53',
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 14,
    color: '#222',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: '#366CD9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
});
