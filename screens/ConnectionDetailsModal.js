import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
} from 'react-native-reanimated';
import { useRemoveConnection } from '../hooks/useConnections';

/**
 * ConnectionDetailsModal - Detailed profile view and relationship management.
 * Features keyboard awareness, platform-specific transitions, and robust action menus.
 */
const ConnectionDetailsModal = ({ connection, onClose, theme }) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH >= 768;
  const { t } = useTranslation();

  // UI States
  const [menuVisible, setMenuVisible] = useState(false);

  // Business Logic
  const removeMutation = useRemoveConnection();

  const handleRemove = useCallback(async () => {
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
              Alert.alert(t('error'), t('failed_to_remove_connection'));
            }
          },
        },
      ]
    );
  }, [connection, removeMutation, onClose, t]);

  const renderField = (label, value, icon) => (
    <View style={styles.fieldSection}>
      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{label}</Text>
      <View style={[styles.fieldContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
        {icon && <Feather name={icon} size={16} color={theme.secondaryText} style={{ marginRight: 12 }} />}
        <Text style={[styles.fieldText, { color: theme.text }]}>
          {value || t('not_specified')}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={!!connection}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%', alignItems: 'center' }}
        >
          <TouchableOpacity activeOpacity={1}>
            <Animated.View
              entering={SlideInUp.springify().damping(15)}
              exiting={FadeOut}
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.card,
                  width: isTablet ? '60%' : '92%',
                  maxHeight: '85%',
                }
              ]}
            >
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={styles.header}>
                  <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                    <MaterialIcons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setMenuVisible(!menuVisible)}
                    style={styles.moreBtn}
                  >
                    <Feather name="more-horizontal" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                {menuVisible && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[styles.dropdownMenu, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={handleRemove}
                    >
                      <Feather name="user-x" size={18} color={theme.danger} style={{ marginRight: 12 }} />
                      <Text style={[styles.menuItemText, { color: theme.danger }]}>
                        {t('remove_connection')}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}

                <View style={styles.profileHeader}>
                  <View style={[styles.avatarWrapper, { borderColor: theme.primary }]}>
                    <Image
                      source={{ uri: connection.profilePhoto || 'https://via.placeholder.com/120' }}
                      style={styles.avatar}
                    />
                  </View>
                  <Text style={[styles.name, { color: theme.text }]}>
                    {connection.name}
                  </Text>
                  <Text style={[styles.email, { color: theme.secondaryText }]}>
                    {connection.email || 'No email provided'}
                  </Text>
                </View>

                <View style={styles.content}>
                  {renderField(t('phone'), connection.phone, 'phone')}
                  {renderField(t('location'), connection.location, 'map-pin')}
                  {renderField(t('bio'), connection.bio, 'info')}
                  {renderField(t('date_of_birth'), connection.dob, 'calendar')}
                </View>

                <View style={{ height: 32 }} />
              </ScrollView>

              {removeMutation.isPending && (
                <View style={[styles.loadingOverlay, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 64,
    right: 24,
    borderRadius: 16,
    padding: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1.5,
    zIndex: 100,
    minWidth: 180,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  menuItemText: {
    fontWeight: '700',
    fontSize: 14,
  },
  profileHeader: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 40,
    borderWidth: 3,
    padding: 4,
    marginBottom: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  email: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 24,
  },
  fieldSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  fieldText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  }
});

export default ConnectionDetailsModal;
