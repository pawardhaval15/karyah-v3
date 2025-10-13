import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fetchCommunityDetail } from '../utils/community';
import { useTranslation } from 'react-i18next';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function CommunityDetailsScreen({ navigation, route }) {
  const { communityId } = route.params || {};
  const theme = useTheme();
  const { t } = useTranslation();
  const [communityDetails, setCommunityDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        if (!communityId) throw new Error('No communityId provided');
        const res = await fetchCommunityDetail(communityId);
        setCommunityDetails(res);
      } catch (err) {
        setCommunityDetails(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [communityId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!communityDetails) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <Text style={{ color: theme.text }}>Community not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
          <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
        </TouchableOpacity>
        {/* Header */}
        <LinearGradient colors={[theme.secondary, theme.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName}>{communityDetails.name || '-'}</Text>
            <Text style={styles.dueDate}>Created Date : {communityDetails.createdAt?.split('T')[0] || '-'}</Text>
            <Text style={styles.creator}>Created By: {communityDetails.createdBy || '-'}</Text>
          </View>
          <TouchableOpacity
            style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 8 }}
            onPress={() =>
              navigation.navigate('UpdateCommunityScreen', {
                communityId: communityDetails.communityId || communityId,
              })
            }
          >
            <MaterialIcons name="edit" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        {/* Tabs */}
        <View style={[styles.tabButtonsContainer, { backgroundColor: theme.background }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabButtonsWrapper}>
            <TouchableOpacity activeOpacity={0.7} style={[styles.tabButton, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <MaterialIcons name="device-hub" size={16} color={theme.primary} />
              <Text style={[styles.tabButtonText, { color: theme.text }]}>{t('task_dependency')}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={[styles.tabButton, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Feather name="message-circle" size={16} color={theme.primary} />
              <Text style={[styles.tabButtonText, { color: theme.text }]}>{t('discussion')}</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} style={[styles.tabButton, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Feather name="package" size={16} color={theme.primary} />
              <Text style={[styles.tabButtonText, { color: theme.text }]}>{t('materials')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        {/* Visibility */}
        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', paddingVertical: 8 }]}>
          <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 2 }]}>VISIBILITY</Text>
          <Text style={[styles.inputValue, { color: theme.text, fontWeight: '500', fontSize: 16 }]}>{communityDetails.visibility || '-'}</Text>
        </View>
        {/* Members grid */}
        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', paddingVertical: 10 }]}>
          <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 8 }]}>MEMBERS</Text>
          <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {communityDetails.communityMembers && communityDetails.communityMembers.length > 0 ? (
              communityDetails.communityMembers.slice(0, 9).map((member, idx) => (
                <View key={idx} style={styles.memberItem}>
                  {member.user.profilePhoto ? (
                    <Image source={{ uri: member.user.profilePhoto }} style={styles.memberAvatar} />
                  ) : (
                    <View style={styles.memberInitialsCircle}>
                      <Text style={styles.memberInitials}>{getInitials(member.user.name)}</Text>
                    </View>
                  )}
                  <Text numberOfLines={1} style={styles.memberName}>{member.user.name}</Text>
                  <Text numberOfLines={1} style={styles.memberRole}>{member.role}</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: theme.secondaryText }}>No members found</Text>
            )}
          </View>
        </View>
        {/* Description preview/modal */}
        <TouchableOpacity onPress={() => setShowDescriptionModal(true)} activeOpacity={0.7}>
          <View style={[
            styles.fieldBox,
            { backgroundColor: theme.card, borderColor: theme.border, maxHeight: 140, flexDirection: 'column', alignItems: 'flex-start' }
          ]}>
            <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 6 }]}>{t('description')}</Text>
            <Text numberOfLines={5} ellipsizeMode="tail" style={[styles.inputValue, { color: theme.text, width: '100%' }]}>
              {communityDetails.description && communityDetails.description.trim() !== '' ? communityDetails.description : 'No description available'}
            </Text>
            <Text style={{ color: theme.primary, marginTop: 4 }}>{t('read_more')}</Text>
          </View>
        </TouchableOpacity>
        {/* Projects Vertical List */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Projects</Text>
        {communityDetails.communityProjects && communityDetails.communityProjects.length > 0 ? (
          <View>
            {communityDetails.communityProjects.map((proj, idx) => (
              <View key={proj.id || idx} style={styles.worklistCard}>
                <View style={styles.worklistIcon}>
                  <Text style={{ color: '#366CD9', fontWeight: '700', fontSize: 18 }}>
                    {proj.projectName?.[0]?.toUpperCase() || 'P'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.worklistName}>{proj.projectName || '-'}</Text>
                  <Text style={styles.worklistTasks}>{(proj.tasksCount || 0) + ' Tasks'}</Text>
                </View>
                <View style={styles.worklistProgressContainer}>
                  <Text style={styles.worklistProgressText}>{proj.progress || 0}%</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: theme.secondaryText, textAlign: 'center', marginHorizontal: 20 }}>
            No projects available
          </Text>
        )}
        {/* Description full modal */}
        <Modal
          visible={showDescriptionModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDescriptionModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: theme.card, borderRadius: 12, padding: 20, maxHeight: '80%' }}>
              <ScrollView>
                <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 12, fontSize: 18 }]}>
                  {t('description')}
                </Text>
                <Text style={[styles.inputValue, { color: theme.text, fontSize: 16 }]}>
                  {communityDetails.description && communityDetails.description.trim() !== ''
                    ? communityDetails.description
                    : 'No description available'}
                </Text>
              </ScrollView>
              <TouchableOpacity
                onPress={() => setShowDescriptionModal(false)}
                style={{ marginTop: 20, alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 30, backgroundColor: theme.primary, borderRadius: 25 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    marginTop: Platform.OS === 'ios' ? 70 : 25,
    marginLeft: 16,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    fontSize: 18,
    color: '#222',
    fontWeight: '400',
    marginLeft: 0,
  },
  headerCard: {
    marginHorizontal: isTablet ? 40 : 20,
    borderRadius: isTablet ? 20 : 16,
    padding: isTablet ? 24 : 20,
    marginTop: 0,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: isTablet ? 130 : 110,
  },
  projectName: {
    color: '#fff',
    fontSize: isTablet ? 24 : 20,
    fontWeight: '600',
    marginBottom: isTablet ? 8 : 6,
  },
  dueDate: {
    color: '#fff',
    fontSize: isTablet ? 15 : 13,
    opacity: 0.85,
    fontWeight: '400',
  },
  creator: {
    color: '#fff',
    fontSize: isTablet ? 15 : 13,
    opacity: 0.85,
    fontWeight: '400',
  },
  tabButtonsContainer: {
    marginHorizontal: 0,
    marginTop: isTablet ? 20 : 16,
    marginBottom: isTablet ? 20 : 16,
  },
  tabButtonsWrapper: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: isTablet ? 40 : 20,
    backgroundColor: 'transparent',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    marginRight: 12,
  },
  tabButtonText: {
    fontSize: isTablet ? 13 : 12,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: isTablet ? 14 : 10,
    borderWidth: 1,
    marginHorizontal: isTablet ? 40 : 20,
    marginBottom: isTablet ? 16 : 12,
    paddingHorizontal: isTablet ? 18 : 14,
    minHeight: isTablet ? 64 : 54,
    paddingVertical: isTablet ? 12 : 8,
  },
  inputLabel: {
    fontSize: isTablet ? 12 : 10,
    fontWeight: '400',
    color: '#222',
    marginBottom: isTablet ? 8 : 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: isTablet ? 16 : 14,
    textAlign: 'left',
  },
  inputValue: {
    color: '#444',
    fontSize: isTablet ? 16 : 14,
    fontWeight: '400',
  },
  memberItem: {
    width: (screenWidth - (isTablet ? 80 : 40)) / 3 - 6,
    alignItems: 'center',
    marginBottom: 18,
    marginRight: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#366CD9',
    backgroundColor: '#F8F9FB',
  },
  memberInitialsCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#366CD9',
  },
  memberInitials: {
    color: '#366CD9',
    fontWeight: '700',
    fontSize: 18,
  },
  memberName: {
    fontSize: 12,
    color: '#222',
    textAlign: 'center',
    width: '100%',
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginHorizontal: isTablet ? 40 : 20,
    marginTop: 0,
    marginBottom: 10,
  },
  worklistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginHorizontal: isTablet ? 40 : 20,
    marginBottom: 12,
    minHeight: 58,
  },
  worklistIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  worklistName: {
    fontWeight: '600',
    fontSize: 17,
    color: '#222',
    marginBottom: 3,
  },
  worklistTasks: {
    fontSize: 13,
    color: '#888',
    marginBottom: 0,
  },
  worklistProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
    minHeight: 42,
  },
  worklistProgressText: {
    fontSize: 14,
    color: '#366CD9',
    fontWeight: '600',
    textAlign: 'center',
  },
});
