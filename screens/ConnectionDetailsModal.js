import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { getUserConnections, removeConnection } from '../utils/connections';
import { useTranslation } from 'react-i18next';
export default function ConnectionDetailsModal({ connection, onClose, onRemove, theme }) {
  const [bio, setBio] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const { t } = useTranslation();
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const connections = await getUserConnections();
        const matched = connections.find((c) => c.connectionId === connection.connectionId);
        if (matched) {
          setBio(matched.bio || '');
          setDob(matched.dob || '');
          setPhone(matched.phone || '');
          setLocation(matched.location || '');
        }
      } catch (err) {
        console.error('Failed to fetch user connection details:', err.message);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [connection]);

  const handleRemove = async () => {
    setMenuVisible(false);
    
    // Show confirmation alert
    Alert.alert(
      'Remove Connection',
      `Are you sure you want to remove ${connection.name} from your connections?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const message = await removeConnection(connection.connectionId);
              console.log('Connection removed:', message);
              if (onRemove) onRemove(connection.connectionId);
              onClose();
            } catch (err) {
              console.error('Remove failed:', err.message);
              Alert.alert('Error', 'Failed to remove connection.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible transparent animationType="slide">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={modalStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[modalStyles.modalCard, { backgroundColor: theme.card }]}>
              <ScrollView>
                <View style={modalStyles.headerRow}>
                  <TouchableOpacity style={modalStyles.backBtn} onPress={onClose}>
                    <MaterialIcons name="arrow-back-ios" size={18} color={theme.text} />
                    <Text style={[modalStyles.backText, { color: theme.text }]}>{t('back')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
                    <Feather name="more-vertical" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {menuVisible && (
                  <View style={[modalStyles.menu, { backgroundColor: theme.secCard }]}>
                    <TouchableOpacity style={modalStyles.menuItem} onPress={handleRemove}>
                      <Feather
                        name="user-x"
                        size={18}
                        color={theme.dangerText}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[modalStyles.menuItemText, { color: theme.dangerText }]}>
                        {t('remove_connection')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {loadingDetails ? (
                  <ActivityIndicator
                    size="large"
                    color={theme.primary}
                    style={{ marginVertical: 40 }}
                  />
                ) : (
                  <>
                    <View style={modalStyles.profileSection}>
                      <Image source={{ uri: connection.profilePhoto }} style={modalStyles.avatar} />
                      <Text style={[modalStyles.name, { color: theme.text }]}>
                        {connection.name}
                      </Text>
                    </View>

                    <View style={[modalStyles.card, { backgroundColor: theme.card }]}>
                      <Text style={[modalStyles.sectionLabel, { color: theme.secondaryText }]}>
                        {t('bio')}
                      </Text>
                      <TextInput
                        style={[
                          modalStyles.bioInput,
                          {
                            color: theme.text,
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                          },
                        ]}
                        placeholder="Tell something about yourself..."
                        placeholderTextColor={theme.secondaryText}
                        value={bio}
                        onChangeText={setBio}
                        multiline
                      />

                      <View style={modalStyles.row}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[modalStyles.sectionLabel, { color: theme.secondaryText }]}>
                            {t('date_of_birth')}
                          </Text>
                          <TextInput
                            style={[
                              modalStyles.input,
                              {
                                color: theme.text,
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                              },
                            ]}
                            placeholder="DD/MM/YYYY"
                            placeholderTextColor={theme.secondaryText}
                            value={dob}
                            onChangeText={setDob}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[modalStyles.sectionLabel, { color: theme.secondaryText }]}>
                            {t('phone')}
                          </Text>
                          <TextInput
                            style={[
                              modalStyles.input,
                              {
                                color: theme.text,
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                              },
                            ]}
                            placeholder="Phone"
                            placeholderTextColor={theme.secondaryText}
                            value={phone}
                            onChangeText={setPhone}
                          />
                        </View>
                      </View>

                      <Text style={[modalStyles.sectionLabel, { color: theme.secondaryText }]}>
                        {t('location')}
                      </Text>
                      <View style={modalStyles.locationRow}>
                        <Feather
                          name="map-pin"
                          size={18}
                          color={theme.secondaryText}
                          style={{ marginRight: 6 }}
                        />
                        <TextInput
                          style={[
                            modalStyles.input,
                            {
                              flex: 1,
                              color: theme.text,
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                            },
                          ]}
                          placeholder="Location"
                          placeholderTextColor={theme.secondaryText}
                          value={location}
                          onChangeText={setLocation}
                        />
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '92%',
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 24,
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '400',
    marginLeft: 4,
  },
  menu: {
    position: 'absolute',
    top: 54,
    right: 24,

    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    zIndex: 100,
    minWidth: 170,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuItemText: {
    color: '#e53935',
    fontWeight: '400',
    fontSize: 15,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 8,
    padding: 14,
    borderRadius: 14,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#222',
    marginBottom: 6,
    marginTop: 14,
  },
  bioInput: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#e6eaf3',
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: '#F8F9FB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e6eaf3',
    fontWeight: '300',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
});
