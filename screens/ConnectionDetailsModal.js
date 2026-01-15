import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated';
import { useRemoveConnection } from '../hooks/useConnections';

export default function ConnectionDetailsModal({ connection, onClose, theme }) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH >= 768;
  const { t } = useTranslation();

  // State for editable fields
  const [bio, setBio] = useState(connection.bio || '');
  const [dob, setDob] = useState(connection.dob || '');
  const [phone, setPhone] = useState(connection.phone || '');
  const [location, setLocation] = useState(connection.location || '');
  const [menuVisible, setMenuVisible] = useState(false);

  // Mutation for removing connection
  const removeMutation = useRemoveConnection();

  const handleRemove = async () => {
    setMenuVisible(false);

    Alert.alert(
      t('remove_connection'),
      `${t('are_you_sure_remove')} ${connection.name}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMutation.mutateAsync(connection.connectionId);
              onClose();
            } catch (err) {
              console.error('Remove failed:', err.message);
              Alert.alert(t('error'), t('failed_to_remove_connection'));
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible transparent animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.overlay}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              entering={SlideInUp.springify().damping(20).stiffness(90)}
              exiting={SlideOutDown.duration(200)}
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.card,
                  width: isTablet ? '60%' : '92%',
                  height: isTablet ? '80%' : 'auto',
                  maxHeight: '90%',
                }
              ]}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                  <TouchableOpacity style={styles.backBtn} onPress={onClose}>
                    <MaterialIcons name="arrow-back-ios" size={18} color={theme.text} />
                    <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
                    <Feather name="more-vertical" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {menuVisible && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[styles.menu, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
                  >
                    <TouchableOpacity style={styles.menuItem} onPress={handleRemove}>
                      <Feather
                        name="user-x"
                        size={18}
                        color={theme.danger}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={[styles.menuItemText, { color: theme.danger }]}>
                        {t('remove_connection')}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                <View style={styles.profileSection}>
                  <Image
                    source={{ uri: connection.profilePhoto || 'https://via.placeholder.com/90' }}
                    style={styles.avatar}
                  />
                  <Text style={[styles.name, { color: theme.text }]}>
                    {connection.name}
                  </Text>
                  <Text style={{ color: theme.secondaryText, marginTop: 4 }}>
                    {connection.email || ''}
                  </Text>
                </View>

                <View style={styles.contentContainer}>
                  <View style={styles.fieldSection}>
                    <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
                      {t('bio')}
                    </Text>
                    <TextInput
                      style={[
                        styles.bioInput,
                        {
                          color: theme.text,
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                        },
                      ]}
                      placeholder={t('bio_placeholder')}
                      placeholderTextColor={theme.secondaryText}
                      value={bio}
                      onChangeText={setBio}
                      multiline
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
                        {t('date_of_birth')}
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            color: theme.text,
                            backgroundColor: theme.background,
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
                      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
                        {t('phone')}
                      </Text>
                      <TextInput
                        style={[
                          styles.input,
                          {
                            color: theme.text,
                            backgroundColor: theme.background,
                            borderColor: theme.border,
                          },
                        ]}
                        placeholder={t('phone')}
                        placeholderTextColor={theme.secondaryText}
                        value={phone}
                        onChangeText={setPhone}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldSection}>
                    <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>
                      {t('location')}
                    </Text>
                    <View style={styles.locationInputWrapper}>
                      <Feather
                        name="map-pin"
                        size={18}
                        color={theme.secondaryText}
                        style={styles.locationIcon}
                      />
                      <TextInput
                        style={[
                          styles.input,
                          {
                            flex: 1,
                            color: theme.text,
                            backgroundColor: theme.background,
                            borderColor: theme.border,
                            paddingLeft: 40,
                          },
                        ]}
                        placeholder={t('location')}
                        placeholderTextColor={theme.secondaryText}
                        value={location}
                        onChangeText={setLocation}
                      />
                    </View>
                  </View>
                </View>
                <View style={{ height: 40 }} />
              </ScrollView>

              {removeMutation.isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  menu: {
    position: 'absolute',
    top: 60,
    right: 20,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    zIndex: 100,
    minWidth: 180,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontWeight: '500',
    fontSize: 15,
  },
  profileSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  fieldSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  bioInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  locationInputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  }
});
