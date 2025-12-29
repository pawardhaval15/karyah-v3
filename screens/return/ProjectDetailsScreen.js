import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoAdminListPopup from 'components/popups/CoAdminListPopup';
import CustomCircularProgress from 'components/task details/CustomCircularProgress';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// --- Components & Utils ---
import DependencyChartPopup from '../components/popups/DependencyChartPopup';
import MaterialRequestPopup from '../components/popups/MaterialRequestPopup';
import ProjectIssuePopup from '../components/popups/ProjectIssuePopup';
import { useTheme } from '../theme/ThemeContext';
import { getUserIdFromToken } from '../utils/auth';
import { fetchUserConnections } from '../utils/issues';
import {
  deleteProjectById,
  getProjectById,
  transferProjectOwnership,
  leaveProject
} from '../utils/project';
import {
  createWorklist,
  getProjectWorklistsProgress,
  getWorklistsByProjectId,
  updateWorklist
} from '../utils/worklist';

const { width: screenWidth } = Dimensions.get('window');

export default function ProjectDetailsScreen({ navigation, route }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { project, projectId } = route.params || {};

  // Refs for Swipe Logic
  const tabScrollViewRef = useRef(null);
  const TABS = ['Info', 'Team', 'Worklist'];
  const TAB_ICONS = {
    Info: 'info',
    Team: 'users',
    Worklist: 'check-square', // or 'list'
  };
  // --- State Management ---
  const [userId, setUserId] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState('Info');

  // Worklist State
  const [worklists, setWorklists] = useState([]);
  const [worklistsProgress, setWorklistsProgress] = useState([]);
  const [loadingWorklists, setLoadingWorklists] = useState(false);
  const [searchWorklist, setSearchWorklist] = useState('');

  // Modals & Popups State
  const [showCoAdminPopup, setShowCoAdminPopup] = useState(false);
  const [showDependencyChart, setShowDependencyChart] = useState(false);
  const [showProjectIssuePopup, setShowProjectIssuePopup] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false); // Top Right Menu
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showProjectNameModal, setShowProjectNameModal] = useState(false);
  const [showMaterialRequestPopup, setShowMaterialRequestPopup] = useState(false);
  const [createWorklistModal, setCreateWorklistModal] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Collapsibles
  const [showPendingInvites, setShowPendingInvites] = useState(true);

  // Form Data
  const [issueForm, setIssueForm] = useState({ title: '', description: '', projectId: '', assignTo: '', dueDate: '', isCritical: false });
  const [newWorklistName, setNewWorklistName] = useState('');
  const [editedWorklistName, setEditedWorklistName] = useState('');
  const [selectedWorklist, setSelectedWorklist] = useState(null);
  const [selectedNewOwner, setSelectedNewOwner] = useState(null);

  // --- 1. Fetch User ID ---
  useEffect(() => {
    const fetchUserId = async () => {
      const id = await getUserIdFromToken();
      setUserId(id);
    };
    fetchUserId();
  }, []);

  // --- 2. Fetch Project Details ---
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const id = projectId || (project && project.id);
        if (!id) throw new Error('No projectId provided');
        const res = await getProjectById(id);
        setProjectDetails(res);
      } catch (err) {
        console.error('Failed to fetch project details:', err.message);
        setProjectDetails(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [projectId, project]);

  // --- 3. Fetch Connections (for dropdowns) ---
  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const connections = await fetchUserConnections();
        setUsers(connections || []);
      } catch (err) {
        console.error(err);
        setUsers([]);
      }
    };
    fetchConnections();
  }, []);

  // --- 4. Fetch Worklists ---
  useEffect(() => {
    const fetchWorklists = async () => {
      if (!projectDetails?.id) return;
      setLoadingWorklists(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const [worklistData, progressData] = await Promise.all([
          getWorklistsByProjectId(projectDetails.id, token),
          getProjectWorklistsProgress(projectDetails.id, token)
        ]);
        setWorklists(worklistData);
        setWorklistsProgress(progressData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingWorklists(false);
      }
    };
    if (projectDetails?.id) fetchWorklists();
  }, [projectDetails?.id]);

  // --- LOGIC HANDLERS ---

  // Tab & Scroll Logic
  const handleTabPress = (tab) => {
    setActiveTab(tab);
    const index = TABS.indexOf(tab);
    if (tabScrollViewRef.current) {
      tabScrollViewRef.current.scrollTo({ x: index * screenWidth, animated: true });
    }
  };

  const handleScroll = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / screenWidth);
    const newTab = TABS[index];
    if (newTab && newTab !== activeTab) {
      setActiveTab(newTab);
    }
  };

  // Worklist Handlers
  const handleCreateWorklist = async () => {
    if (!newWorklistName.trim()) { Alert.alert('Validation', 'Enter a name.'); return; }
    try {
      const token = await AsyncStorage.getItem('token');
      const created = await createWorklist(projectDetails.id, newWorklistName.trim(), token);
      setWorklists(prev => [...prev, created]);
      setCreateWorklistModal(false);
      setNewWorklistName('');
    } catch (error) { Alert.alert('Error', error.message); }
  };

  const getWorklistProgress = (worklistId) => worklistsProgress.find(p => p.worklistId === worklistId);

  // Issues Handlers
  const handleIssueChange = (field, value) => setIssueForm(prev => ({ ...prev, [field]: value }));
  const handleIssueSubmit = () => { setShowProjectIssuePopup(false); setIssueForm({ title: '', description: '', assignTo: '', dueDate: '', isCritical: false }); };

  // --- PROJECT MANAGEMENT HANDLERS (New Additions) ---

  const handleDeleteProject = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProjectById(projectDetails.id);
              Alert.alert('Deleted', 'Project deleted successfully.', [
                { text: 'OK', onPress: () => navigation.navigate('ProjectScreen', { refresh: true }) },
              ]);
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete project.');
            }
          },
        },
      ]
    );
  };

  const handleLeaveProject = () => {
    setMenuVisible(false);
    Alert.alert(
      'Leave Project',
      'Are you sure you want to leave this project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveProject(projectDetails.id);
              Alert.alert('Success', 'You have left the project.', [
                { text: 'OK', onPress: () => navigation.navigate('ProjectScreen', { refresh: true }) },
              ]);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to leave project.');
            }
          },
        },
      ]
    );
  };

  const confirmTransferOwnership = async () => {
    if (!selectedNewOwner) return;
    try {
      await transferProjectOwnership(projectDetails.id, selectedNewOwner);
      Alert.alert('Success', 'Ownership transferred successfully');
      setShowTransferModal(false);
      navigation.navigate('ProjectScreen', { refresh: true });
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong');
    }
  };

  // --- Render Helpers ---
  const InfoCard = ({ icon, label, value, color }) => (
    <View style={[styles.infoCard, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>{value || '-'}</Text>
      </View>
    </View>
  );

  const WorklistCard = ({ worklist }) => {
    const progress = getWorklistProgress(worklist.id);
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TaskListScreen', { worklist, project: projectDetails })}
        activeOpacity={0.7}
        style={[styles.worklistCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.worklistIconContainer}>
          <View style={[styles.worklistIcon, { backgroundColor: theme.primary + '15' }]}>
            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 18 }}>
              {worklist.name?.[0]?.toUpperCase() || '#'}
            </Text>
          </View>
        </View>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.worklistTitle, { color: theme.text }]} numberOfLines={1}>{worklist.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Feather name="check-square" size={12} color={theme.secondaryText} />
            <Text style={{ color: theme.secondaryText, fontSize: 12, marginLeft: 4 }}>
              {progress?.totalTasks || 0} {t('tasks')}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <CustomCircularProgress size={44} strokeWidth={4} percentage={progress?.progress || 0} color={theme.primary} />
        </View>
        <Feather name="chevron-right" size={20} color={theme.secondaryText} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  if (!projectDetails) return <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}><Text style={{ color: theme.text }}>{t('project_not_found')}</Text></View>;

  const progressPercent = projectDetails.progress || 0;
  // Check if current user is the owner
  const isOwner = userId === projectDetails.userId;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} bounces={false}>

        {/* 1. Immersive Header */}
        <LinearGradient colors={[theme.primary, theme.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerContainer}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
              <MaterialIcons name="arrow-back-ios" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>{t('project_details')}</Text>
            {/* Top Right Menu Trigger */}
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.navButton}>
              <Feather name="more-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => setShowProjectNameModal(true)}>
              <Text style={styles.headerProjectName} numberOfLines={2}>{projectDetails.projectName}</Text>
            </TouchableOpacity>
            <View style={styles.headerBadgeRow}>
              <View style={styles.headerBadge}>
                <Feather name="calendar" size={12} color="#fff" />
                <Text style={styles.headerBadgeText}>{projectDetails.endDate?.split('T')[0]}</Text>
              </View>
              <View style={[styles.headerBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.headerBadgeText}>{projectDetails.status}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* 2. Floating Action Tabs (Circular) */}
        <View style={styles.floatingActionContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
            <TouchableOpacity onPress={() => setShowDependencyChart(true)} style={[styles.actionCircle, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
              <MaterialIcons name="device-hub" size={22} color={theme.primary} />
              <Text style={[styles.actionLabel, { color: theme.text }]}>Chart</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ProjectDiscussionScreen', { projectId: projectDetails.id, projectName: projectDetails.projectName })} style={[styles.actionCircle, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
              <Feather name="message-circle" size={22} color="#E91E63" />
              <Text style={[styles.actionLabel, { color: theme.text }]}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMaterialRequestPopup(true)} style={[styles.actionCircle, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
              <Feather name="package" size={22} color="#FF9800" />
              <Text style={[styles.actionLabel, { color: theme.text }]}>Material</Text>
            </TouchableOpacity>

            {/* Settings only for Owner */}
            {isOwner && (
              <TouchableOpacity onPress={() => navigation.navigate('ProjectAccessScreen', { projectId: projectDetails.id })} style={[styles.actionCircle, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                <Feather name="settings" size={22} color="#4CAF50" />
                <Text style={[styles.actionLabel, { color: theme.text }]}>Settings</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* 3. Secondary Tab Segment (Buttons) */}
        <View style={[styles.segmentContainer, { borderColor: theme.border }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => handleTabPress(tab)}
              style={[
                styles.segmentButton,
                activeTab === tab && { borderBottomColor: theme.primary },
                // Add row layout to align icon and text
                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }
              ]}
            >
              {/* Icon Component */}
              <Feather
                name={TAB_ICONS[tab]}
                size={16}
                color={activeTab === tab ? theme.primary : theme.secondaryText}
              />

              <Text
                style={[
                  styles.segmentText,
                  {
                    color: activeTab === tab ? theme.primary : theme.secondaryText,
                    fontWeight: activeTab === tab ? '700' : '500',
                  },
                ]}
              >
                {tab === 'Team' ? t('Team') : t(tab.toLowerCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. Swipable Content Area */}
        <ScrollView
          ref={tabScrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >

          {/* --- SLIDE 1: INFO TAB --- */}
          <View style={styles.tabSlide}>
            <View style={{ gap: 16 }}>
              <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{t('progress')}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: theme.primary }}>{progressPercent}%</Text>
                </View>
                <View style={{ height: 10, backgroundColor: theme.border, borderRadius: 5 }}>
                  <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: theme.primary, borderRadius: 5 }} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}><InfoCard icon="calendar" label={t('start_date')} value={projectDetails.startDate?.split('T')[0]} color="#4CAF50" /></View>
                <View style={{ flex: 1 }}><InfoCard icon="flag" label={t('end_date')} value={projectDetails.endDate?.split('T')[0]} color="#F44336" /></View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}><InfoCard icon="tag" label={t('category')} value={projectDetails.projectCategory} color="#2196F3" /></View>
                <View style={{ flex: 1 }}><InfoCard icon="map-pin" label={t('location')} value={projectDetails.location} color="#9C27B0" /></View>
              </View>

              <TouchableOpacity onPress={() => setShowDescriptionModal(true)} activeOpacity={0.9} style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 8 }]}>{t('description')}</Text>
                <Text numberOfLines={4} style={{ color: theme.secondaryText, lineHeight: 22 }}>
                  {projectDetails.description || 'No description provided for this project.'}
                </Text>
                <Text style={{ color: theme.primary, marginTop: 8, fontWeight: '600' }}>{t('read_more')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* --- SLIDE 2: TEAM TAB --- */}
          <View style={styles.tabSlide}>
            <View style={{ gap: 16 }}>
              <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow, flexDirection: 'row', alignItems: 'center' }]}>
                <View style={[styles.avatarLarge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.avatarText}>{projectDetails.creatorName?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontSize: 12, color: theme.secondaryText, textTransform: 'uppercase' }}>{t('project_creator')}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>{projectDetails.creatorName}</Text>
                </View>
              </View>

              <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{t('co_admins')}</Text>
                  <Text style={{ color: theme.secondaryText }}>{projectDetails.coAdmins?.length || 0}</Text>
                </View>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setShowCoAdminPopup(true)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {projectDetails.coAdmins?.slice(0, 6).map((admin, idx) => (
                    <Image key={idx} source={{ uri: admin.profilePhoto || 'https://ui-avatars.com/api/?name=' + admin.name }} style={styles.avatarMedium} />
                  ))}
                  {projectDetails.coAdmins?.length > 6 && (
                    <View style={[styles.avatarMedium, { backgroundColor: theme.border, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: theme.text, fontWeight: 'bold' }}>+{projectDetails.coAdmins.length - 6}</Text>
                    </View>
                  )}
                  {!projectDetails.coAdmins?.length && <Text style={{ color: theme.secondaryText, fontStyle: 'italic' }}>No Co-Admins assigned.</Text>}
                </TouchableOpacity>
              </View>

              {projectDetails.pendingInvites && projectDetails.pendingInvites.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setShowPendingInvites(!showPendingInvites)}
                    style={[styles.accordionHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.iconCircle, { backgroundColor: '#FF9800' + '20', width: 32, height: 32 }]}>
                        <MaterialIcons name="person-add" size={18} color="#FF9800" />
                      </View>
                      <Text style={[styles.accordionTitle, { color: theme.text }]}>Pending Invites</Text>
                      <View style={styles.badgePill}><Text style={styles.badgeText}>{projectDetails.pendingInvites.length}</Text></View>
                    </View>
                    <Feather name={showPendingInvites ? 'chevron-up' : 'chevron-down'} size={20} color={theme.text} />
                  </TouchableOpacity>

                  {showPendingInvites && (
                    <View style={styles.inviteList}>
                      {projectDetails.pendingInvites.map((invite, index) => (
                        <View key={index} style={[styles.inviteRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                          <Image source={{ uri: invite.profilePhoto || 'https://ui-avatars.com/api/?name=' + (invite.name || 'U') }} style={styles.avatarSmall} />
                          <View style={{ flex: 1, paddingHorizontal: 10 }}>
                            <Text style={{ color: theme.text, fontWeight: '500' }}>{invite.recipientName || invite.email}</Text>
                            <Text style={{ color: theme.secondaryText, fontSize: 11 }}>{invite.email}</Text>
                          </View>
                          <View style={[styles.statusTag, { backgroundColor: '#FFF3CD' }]}>
                            <Text style={{ color: '#856404', fontSize: 10, fontWeight: '700' }}>PENDING</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* --- SLIDE 3: WORKLIST TAB --- */}
          <View style={styles.tabSlide}>
            <View style={{ minHeight: 300 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>Your Worklists</Text>
                <TouchableOpacity onPress={() => setCreateWorklistModal(true)} style={[styles.createButton, { backgroundColor: theme.primary }]}>
                  <Feather name="plus" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '600', marginLeft: 4 }}>Create</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.searchContainer, { backgroundColor: theme.mode === 'dark' ? '#333' : '#f0f0f0' }]}>
                <Feather name="search" size={18} color={theme.secondaryText} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder={t('search_worklist')}
                  placeholderTextColor={theme.secondaryText}
                  value={searchWorklist}
                  onChangeText={setSearchWorklist}
                />
              </View>

              {loadingWorklists ? (
                <ActivityIndicator color={theme.primary} style={{ marginTop: 20 }} />
              ) : worklists.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="clipboard" size={40} color={theme.border} />
                  <Text style={{ color: theme.secondaryText, marginTop: 10 }}>No worklists found.</Text>
                  <TouchableOpacity onPress={() => setCreateWorklistModal(true)}>
                    <Text style={{ color: theme.primary, fontWeight: '600', marginTop: 4 }}>Create your first one</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                worklists.filter(w => w.name?.toLowerCase().includes(searchWorklist.toLowerCase())).map(item => (
                  <WorklistCard key={item.id} worklist={item} />
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* --- Modals & Popups --- */}

      {/* Create Worklist Modal */}
      <Modal visible={createWorklistModal} animationType="slide" transparent onRequestClose={() => setCreateWorklistModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>New Worklist</Text>
            <TextInput placeholder="Name" placeholderTextColor={theme.secondaryText} value={newWorklistName} onChangeText={setNewWorklistName} style={[styles.input, { borderColor: theme.border, color: theme.text }]} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setCreateWorklistModal(false)}><Text style={{ color: theme.secondaryText }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleCreateWorklist} style={{ backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}><Text style={{ color: '#fff', fontWeight: '600' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Popups */}
      <CoAdminListPopup visible={showCoAdminPopup} onClose={() => setShowCoAdminPopup(false)} data={projectDetails?.coAdmins} theme={theme} title="Co-Admins" />
      <ProjectIssuePopup visible={showProjectIssuePopup} onClose={() => setShowProjectIssuePopup(false)} values={issueForm} onChange={handleIssueChange} onSubmit={handleIssueSubmit} theme={theme} projects={[{ id: projectDetails?.id, projectName: projectDetails?.projectName }]} users={users} />
      {showDependencyChart && (<DependencyChartPopup key={`chart-${projectDetails.id}`} visible={true} onClose={() => setShowDependencyChart(false)} projectId={projectDetails.id} />)}
      <MaterialRequestPopup visible={showMaterialRequestPopup} onClose={() => setShowMaterialRequestPopup(false)} projectId={projectDetails?.id} theme={theme} users={users} />

      {/* Description Modal */}
      <Modal visible={showDescriptionModal} transparent animationType="fade" onRequestClose={() => setShowDescriptionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 10 }]}>{t('description')}</Text>
            <ScrollView showsVerticalScrollIndicator={true}>
              <Text style={{ color: theme.text, fontSize: 16, lineHeight: 24 }}>
                {projectDetails?.description || 'No description available.'}
              </Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setShowDescriptionModal(false)} style={{ alignSelf: 'center', marginTop: 20, padding: 10 }}>
              <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Project Name Modal */}
      <Modal visible={showProjectNameModal} transparent animationType="fade" onRequestClose={() => setShowProjectNameModal(false)}>
        <View style={styles.modalOverlay}><View style={[styles.modalContent, { backgroundColor: theme.card }]}><Text style={[styles.modalTitle, { color: theme.text }]}>{projectDetails?.projectName}</Text><TouchableOpacity onPress={() => setShowProjectNameModal(false)} style={{ alignSelf: 'center', marginTop: 10 }}><Text style={{ color: theme.primary }}>Close</Text></TouchableOpacity></View></View>
      </Modal>

      {/* TOP RIGHT MENU MODAL (Context Aware) */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuDropdown, { backgroundColor: theme.card }]}>

            {/* 1. Edit Option */}
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('UpdateProjectScreen', { projectId: projectDetails.id }); }}>
              <Feather name="edit" size={18} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>{t('edit')}</Text>
            </TouchableOpacity>

            {/* 2. Handover (Owner Only) */}
            {isOwner && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setShowTransferModal(true); }}>
                <Feather name="user-check" size={18} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>{t('hand_over_project')}</Text>
              </TouchableOpacity>
            )}

            {/* 3. Delete (Owner Only) OR Leave (Member Only) */}
            {isOwner ? (
              <TouchableOpacity style={styles.menuItem} onPress={handleDeleteProject}>
                <Feather name="trash-2" size={18} color="#f44336" />
                <Text style={[styles.menuText, { color: "#f44336" }]}>{t('delete')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={handleLeaveProject}>
                <Feather name="log-out" size={18} color="#f44336" />
                <Text style={[styles.menuText, { color: "#f44336" }]}>{t('leave_project')}</Text>
              </TouchableOpacity>
            )}

          </View>
        </TouchableOpacity>
      </Modal>

      {/* Transfer Ownership Modal */}
      <Modal visible={showTransferModal} transparent animationType="slide" onRequestClose={() => setShowTransferModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
              Transfer Ownership
            </Text>
            <Text style={{ color: theme.secondaryText, marginBottom: 15, fontSize: 14 }}>
              Select a Co-Admin to transfer this project to. You will lose owner privileges.
            </Text>

            {projectDetails?.coAdmins?.length > 0 ? (
              projectDetails.coAdmins.map(admin => (
                <TouchableOpacity
                  key={admin.userId}
                  onPress={() => setSelectedNewOwner(admin.userId)}
                  style={{
                    padding: 12,
                    backgroundColor: selectedNewOwner === admin.userId ? theme.primary + '20' : 'transparent',
                    marginBottom: 5,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: selectedNewOwner === admin.userId ? theme.primary : theme.border
                  }}
                >
                  <Text style={{ color: selectedNewOwner === admin.userId ? theme.primary : theme.text, fontWeight: '500' }}>
                    {admin.name}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: theme.secondaryText, fontStyle: 'italic', marginBottom: 10 }}>No Co-Admins available to transfer to.</Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Text style={{ color: theme.secondaryText }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!selectedNewOwner}
                onPress={confirmTransferOwnership}
                style={{ opacity: !selectedNewOwner ? 0.5 : 1 }}
              >
                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Confirm Transfer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { paddingTop: Platform.OS === 'ios' ? 60 : 30, paddingBottom: 60, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  navTitle: { color: '#fff', fontSize: 16, fontWeight: '500', opacity: 0.9 },
  headerContent: { marginTop: 24 },
  headerProjectName: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 12 },
  headerBadgeRow: { flexDirection: 'row', gap: 10 },
  headerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  headerBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  floatingActionContainer: { marginTop: -40, marginBottom: 20 },
  actionCircle: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 4, gap: 4 },
  actionLabel: { fontSize: 11, fontWeight: '500' },

  segmentContainer: { flexDirection: 'row', marginHorizontal: 20, borderBottomWidth: 1, paddingBottom: 0 },
  segmentButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  segmentText: { fontSize: 15 },

  tabSlide: { width: screenWidth, padding: 20 },

  card: { padding: 20, borderRadius: 16, marginBottom: 12, elevation: 2, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  infoCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, elevation: 1 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoLabel: { fontSize: 11, textTransform: 'uppercase', marginBottom: 2, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '600' },

  avatarLarge: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  avatarMedium: { width: 40, height: 40, borderRadius: 20 },

  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderWidth: 1, borderRadius: 12 },
  accordionTitle: { fontSize: 15, fontWeight: '600', marginLeft: 10, flex: 1 },
  badgePill: { backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  inviteList: { marginTop: 8 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

  createButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 46, borderRadius: 23, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  emptyState: { alignItems: 'center', padding: 30 },

  worklistCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, elevation: 1 },
  worklistIconContainer: { marginRight: 14 },
  worklistIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  worklistTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 24, width: '100%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 24, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
  menuDropdown: { position: 'absolute', top: 80, right: 20, borderRadius: 12, padding: 8, elevation: 10, minWidth: 160 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  menuText: { fontSize: 15, fontWeight: '500' }
});