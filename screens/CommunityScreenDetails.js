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
  Alert,
} from 'react-native';
import FieldBox from '../components/task details/FieldBox';
import CustomPickerDrawer from '../components/popups/CustomPickerDrawer';
import { useTheme } from '../theme/ThemeContext';
import { assignProjectsToCommunity, getProjectsByUserId, fetchCommunityDetail, deleteCommunityById } from '../utils/community';
import { useTranslation } from 'react-i18next';
import CoAdminListPopup from 'components/popups/CoAdminListPopup';
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [showMembersPopup, setShowMembersPopup] = useState(false);

  // Project picker states
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]); // array of selected project IDs
  const [projectsWithAddNew, setProjectsWithAddNew] = useState([]);

  // Fetch all assignable projects and make sure each has projectName
  useEffect(() => {
    const fetchProjects = async () => {
      const projects = await getProjectsByUserId();
      const safeProjects = projects.map(p => ({
        ...p,
        projectName: p.projectName || p.name || '-'
      }));
      setProjectsWithAddNew([
        ...safeProjects,
        { id: '__add_new__', projectName: t('addNewProject') }
      ]);
    };
    fetchProjects();
  }, []);

  // Get community details
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

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line
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
        {/* Back + Menu */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: Platform.OS === 'ios' ? 60 : 20,
            paddingBottom: 16
          }}
        >
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Feather name="more-vertical" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
        {/* Menu Modal */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View
              style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? 75 : 35,
                right: 20,
                backgroundColor: theme.card,
                borderRadius: 10,
                paddingVertical: 8,
                shadowColor: '#000',
                shadowOpacity: 0.10,
                shadowOffset: { width: 0, height: 1 },
                shadowRadius: 6,
                elevation: 6,
                minWidth: 150,
              }}
            >
              {/* Edit Option */}
              {/* <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
                onPress={() => {
                  setMenuVisible(false);
                  navigation.navigate('UpdateCommunityScreen', { communityId: communityDetails.communityId });
                }}>
                <Feather name="edit" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.primary, fontWeight: '500', fontSize: 15 }}>{t('edit')}</Text>
              </TouchableOpacity> */}
              {/* Delete Option */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
                onPress={() => {
                  setMenuVisible(false);
                  Alert.alert(
                    t('delete_community'), t('delete_community_confirm'), [
                    { text: t('cancel'), style: 'cancel' },
                    {
                      text: t('delete'),
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteCommunityById(communityDetails.communityId);
                          Alert.alert(t('deleted'), t('community_deleted_successfully'), [
                            {
                              text: 'OK',
                              onPress: () => {
                                navigation.navigate('CommunityScreen', { refresh: true });
                              }
                            }
                          ]);
                        } catch (err) {
                          Alert.alert(t('delete_failed'), err.message || t('could_not_delete_community'));
                        }
                      }
                    }
                  ]
                  );
                }}
              >
                <Feather name="trash-2" size={18} color="#E53935" style={{ marginRight: 8 }} />
                <Text style={{ color: '#E53935', fontWeight: '500', fontSize: 15 }}>{t('delete')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        {/* Header */}
        <LinearGradient colors={[theme.secondary, theme.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName}>{communityDetails.name || '-'}</Text>
            <Text style={styles.dueDate}>Created Date : {communityDetails.createdAt?.split('T')[0] || '-'}</Text>
            <Text style={styles.creator}>Created By: {communityDetails.createdBy || '-'}</Text>
          </View>
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
          <Text style={[styles.inputValue, { color: theme.text, fontWeight: '500', fontSize: 16 }]}>
            {communityDetails.visibility
              ? communityDetails.visibility.charAt(0).toUpperCase() + communityDetails.visibility.slice(1)
              : '-'}
          </Text>
        </View>
        {/* Members grid */}
        <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 8 }]}>{t('members')}</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowMembersPopup(true)}
            style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
            {communityDetails.communityMembers?.slice(0, 5).map((member, index) => (
              <View key={index} style={{
                marginLeft: index === 0 ? 0 : -8,
                zIndex: 10 - index,
              }}>
                <Image
                  source={{
                    uri: member.user.profilePhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(member.user.name),
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: theme.primary,
                    backgroundColor: theme.mode === 'dark' ? '#23272f' : '#F8F9FB',
                  }}
                />
              </View>
            ))}
            {communityDetails.communityMembers?.length > 5 && (
              <View style={{
                marginLeft: -8,
                zIndex: 0,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.buttonBg,
                borderWidth: 2,
                borderColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ color: theme.buttonText, fontWeight: '600', fontSize: 14 }}>
                  +{communityDetails.communityMembers.length - 5}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: isTablet ? 40 : 20, marginBottom: 10 }}>
          {/* Left: Projects label with dropdown-style button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.card,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.border,
              paddingHorizontal: 14,
              paddingVertical: 6,
              minWidth: 140,
            }}
            onPress={() => {/* show the "View Projects" or open a dropdown if you want */ }}
            activeOpacity={0.8}
          >
            <Feather name="chevron-down" size={18} color={theme.secondaryText} style={{ marginRight: 8 }} />
            <Text style={{ color: theme.text, fontWeight: '500', fontSize: 15 }}>
              {t('projects')} ({communityDetails?.communityProjects?.length ?? 0})
            </Text>
          </TouchableOpacity>

          {/* Right: Project select modal trigger (styled as blue button) */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#366CD9',
              borderRadius: 8,
              paddingHorizontal: 18,
              paddingVertical: 8,
            }}
            onPress={() => setShowProjectPicker(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>
              {t('assign_project')}
            </Text>
          </TouchableOpacity>
        </View>
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
                  <Text style={styles.worklistName}>{proj.projectName || proj.name || '-'}</Text>
                  {/* <Text style={styles.worklistTasks}>{(proj.tasksCount || 0) + ' Tasks'}</Text> */}
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
        {/* Assign project box and picker */}
        <Modal
          visible={showProjectPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowProjectPicker(false)}
        >
          <View style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.15)'
          }}>
            <View style={{
              backgroundColor: theme.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              minHeight: 340,
              maxHeight: '65%'
            }}>
              <Text style={{
                color: theme.text,
                fontWeight: 'bold',
                fontSize: 16,
                marginBottom: 12,
              }}>
                {t('select_projects')}
              </Text>
              <ScrollView style={{ marginBottom: 14 }}>
                {projectsWithAddNew.map((proj, idx) => (
                  <TouchableOpacity
                    key={proj.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 10,
                      borderBottomWidth: idx < projectsWithAddNew.length - 1 ? 0.5 : 0,
                      borderColor: theme.border,
                    }}
                    onPress={() => {
                      setSelectedProjectIds(prev =>
                        prev.includes(proj.id)
                          ? prev.filter(id => id !== proj.id)
                          : [...prev, proj.id]
                      );
                    }}
                  >
                    <View style={{
                      width: 22, height: 22, borderRadius: 5, borderWidth: 2,
                      borderColor: theme.primary,
                      backgroundColor: selectedProjectIds.includes(proj.id) ? theme.primary : '#fff',
                      marginRight: 12,
                      alignItems: 'center', justifyContent: 'center'
                    }}>
                      {selectedProjectIds.includes(proj.id) && (
                        <Feather name="check" size={14} color="#fff" />
                      )}
                    </View>
                    <Text style={{
                      color: theme.text,
                      fontWeight: selectedProjectIds.includes(proj.id) ? 'bold' : '400'
                    }}>
                      {proj.projectName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                disabled={selectedProjectIds.length === 0}
                style={{
                  marginTop: 8,
                  backgroundColor: theme.primary,
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 40,
                  alignSelf: 'center',
                  opacity: selectedProjectIds.length === 0 ? 0.45 : 1
                }}
                onPress={async () => {
                  try {
                    await assignProjectsToCommunity(communityDetails.communityId, selectedProjectIds);
                    setShowProjectPicker(false);
                    setSelectedProjectIds([]);
                    fetchDetails(); // Refresh assigned projects
                    Alert.alert(t('success'), t('projectAssigned'));
                  } catch (err) {
                    Alert.alert(t('error'), err.message || t('failedAssignProject'));
                  }
                }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{t('assign')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ marginTop: 9, alignSelf: 'center' }}
                onPress={() => setShowProjectPicker(false)}
              >
                <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{t('done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <CoAdminListPopup
          visible={showMembersPopup}
          onClose={() => setShowMembersPopup(false)}
          data={communityDetails.communityMembers.map(mem => ({
            name: mem.user.name,
            profilePhoto: mem.user.profilePhoto
          }))}
          theme={theme}
          title={`Members (${communityDetails.communityMembers?.length || 0})`}
        />
        {/* Description Modal */}
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
