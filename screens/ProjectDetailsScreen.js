import { Feather, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CoAdminListPopup from 'components/popups/CoAdminListPopup';
import CustomCircularProgress from 'components/task details/CustomCircularProgress';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import DependencyChartPopup from '../components/popups/DependencyChartPopup';
import MaterialRequestPopup from '../components/popups/MaterialRequestPopup';
import ProjectIssuePopup from '../components/popups/ProjectIssuePopup';
import DateBox from '../components/project details/DateBox';
import FieldBox from '../components/project details/FieldBox';
import { useTheme } from '../theme/ThemeContext';
import { getUserIdFromToken } from '../utils/auth';
import { fetchUserConnections } from '../utils/issues';

import { deleteProjectById, getProjectById, transferProjectOwnership, leaveProject } from '../utils/project';
import { createWorklist, deleteWorklist, getProjectWorklistsProgress, getWorklistsByProjectId, updateWorklist } from '../utils/worklist';
export default function ProjectDetailsScreen({ navigation, route }) {
  const [showCoAdminPopup, setShowCoAdminPopup] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userId, setUserId] = useState(null);
  const theme = useTheme();
  const { project, projectId } = route.params || {};
  const [users, setUsers] = useState([]);
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDependencyChart, setShowDependencyChart] = useState(false);
  const [showProjectIssuePopup, setShowProjectIssuePopup] = useState(false);
  const [issueForm, setIssueForm] = useState({
    title: '',
    description: '',
    projectId: '',
    assignTo: '',
    dueDate: '',
    isCritical: false,
  });
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showProjectNameModal, setShowProjectNameModal] = useState(false);
  const [showMaterialRequestPopup, setShowMaterialRequestPopup] = useState(false);
  const { t } = useTranslation();
  // New state variables
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [worklists, setWorklists] = useState([]);
  const [worklistsProgress, setWorklistsProgress] = useState([]);
  const [loadingWorklists, setLoadingWorklists] = useState(false);
  const [searchWorklist, setSearchWorklist] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedWorklist, setSelectedWorklist] = useState(null);
  const [editedWorklistName, setEditedWorklistName] = useState('');
  const [createWorklistModal, setCreateWorklistModal] = useState(false);
  const [newWorklistName, setNewWorklistName] = useState('');
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState(null);


  useEffect(() => {
    const fetchUserId = async () => {
      const id = await getUserIdFromToken();
      setUserId(id);
    };
    fetchUserId();
  }, []);
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Use projectId if available, else fallback to project.id
        const id = projectId || (project && project.id);
        if (!id) throw new Error('No projectId provided');
        const res = await getProjectById(id);
        // console.log('📨 Full project details:', JSON.stringify(res, null, 2));
        // console.log('📨 Pending invites array:', res.pendingInvites);
        setProjectDetails(res);
        // console.log('📨 Project details fetched:', res);
      } catch (err) {
        console.error('Failed to fetch project details:', err.message);
        setProjectDetails(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [projectId, project]);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const connections = await fetchUserConnections();
        setUsers(connections || []);
      } catch (err) {
        console.error('Failed to fetch connections:', err.message);
        setUsers([]);
      }
    };
    fetchConnections();
  }, []);

  // Fetch worklists
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
        console.error('Failed to fetch worklists:', error.message);
      } finally {
        setLoadingWorklists(false);
      }
    };

    if (projectDetails?.id) {
      fetchWorklists();
    }
  }, [projectDetails?.id]);
  const handleCreateWorklist = async () => {
    if (!newWorklistName.trim()) {
      Alert.alert('Validation', 'Please enter a worklist name.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const created = await createWorklist(projectDetails.id, newWorklistName.trim(), token);
      setWorklists(prev => [...prev, created]);
      // Optionally refresh progress data
      const progressData = await getProjectWorklistsProgress(projectDetails.id, token);
      setWorklistsProgress(progressData);

      setCreateWorklistModal(false);
      setNewWorklistName('');
    } catch (error) {
      console.error('Failed to create worklist:', error.message);
      Alert.alert('Error', error.message);
    }
  };

  // Get progress for a specific worklist
  const getWorklistProgress = (worklistId) => {
    return worklistsProgress.find(p => p.worklistId === worklistId);
  };

  // Worklist handlers
  const handleDeleteWorklist = (id) => {
    Alert.alert(
      'Delete Worklist',
      'Deleting this worklist will also delete all its associated tasks. Do you still want to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await deleteWorklist(id, token);
              setWorklists((prev) => prev.filter((w) => w.id !== id));
            } catch (error) {
              console.error('Failed to delete worklist:', error.message);
              Alert.alert('Error', 'Failed to delete worklist.');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (worklist) => {
    setSelectedWorklist(worklist);
    setEditedWorklistName(worklist.name);
    setEditModalVisible(true);
  };

  const handleUpdateWorklist = async () => {
    if (!editedWorklistName.trim()) {
      Alert.alert('Validation', 'Please enter a worklist name.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const updated = await updateWorklist(selectedWorklist.id, editedWorklistName.trim(), token);
      setWorklists((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      setEditModalVisible(false);
      setSelectedWorklist(null);
      setEditedWorklistName('');
    } catch (error) {
      console.error('Failed to update worklist:', error.message);
      Alert.alert('Error', error.message || 'Failed to update worklist.');
    }
  };

  // WorklistCard component - Compact Design
  const WorklistCard = ({ worklist }) => {
    const progress = getWorklistProgress(worklist.id);
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('TaskListScreen', { worklist, project: projectDetails })}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 16,
          marginHorizontal: 20,
          marginBottom: 10,
        }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: `${theme.primary}12`,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
          <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 16 }}>
            {worklist.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }} numberOfLines={1}>
            {worklist.name}
          </Text>
          <Text style={{ color: theme.secondaryText, fontSize: 12, marginTop: 2 }}>
            {progress?.totalTasks || 0} {t('tasks')}
          </Text>
        </View>
        {/* Circular Progress Component */}
        <View style={{ marginLeft: 10 }}>
          <CustomCircularProgress
            size={48}
            strokeWidth={4}
            percentage={progress?.progress || 0}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const handleIssueChange = (field, value) => {
    setIssueForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleIssueSubmit = () => {
    // Future: send issue to backend
    setShowProjectIssuePopup(false);
    setIssueForm({
      title: '',
      description: '',
      assignTo: '',
      dueDate: '',
      isCritical: false,
    });
    return null;
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.background,
        }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!projectDetails) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.background,
        }}>
        <Text style={{ color: theme.text }}>{t('project_not_found')}</Text>
      </View>
    );
  }
  const progressPercent = projectDetails.progress || 0;
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
        bounces={true}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: Platform.OS === 'ios' ? 60 : 20,
            paddingBottom: 16,
            // height: Platform.OS === 'ios' ? 92 : 52,
          }}>
          {/* Back Button */}
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}
            onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
            <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
          </TouchableOpacity>
          {/* More Options Button */}
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Feather name="more-vertical" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
        <LinearGradient
          colors={[theme.secondary, theme.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => setShowProjectNameModal(true)}>
                <Text style={styles.projectName} numberOfLines={2} ellipsizeMode="tail">
                  {projectDetails.projectName}
                </Text>
              </TouchableOpacity>
              <Text style={styles.dueDate}>
                {t('due_date')} : {projectDetails.endDate?.split('T')[0] || '-'}
              </Text>
              <Text style={styles.creator}>
                {t('project_creator')}: {projectDetails.creatorName || '-'}
              </Text>
            </View>
            {/* Compact Project Details Toggle Button */}
            <TouchableOpacity
              onPress={() => setShowProjectDetails((prev) => !prev)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
              }}>
              <MaterialIcons name="description" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                {t('details')}
              </Text>
              <MaterialIcons
                name={showProjectDetails ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={16}
                color="#fff"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        {/* Modern Pill-Style Tab Buttons */}
        <View style={[styles.tabButtonsContainer, { backgroundColor: theme.background }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabButtonsWrapper}>
            {/* Task Dependencies Tab */}
            <TouchableOpacity
              key="taskdep"
              activeOpacity={0.7}
              onPress={() => {
                setShowDependencyChart(true);
              }}
              style={[
                styles.tabButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}>
              <MaterialIcons name="device-hub" size={16} color={theme.primary} />
              <Text style={[styles.tabButtonText, { color: theme.text, fontWeight: '500' }]}>
                {t('task_dependency')}
              </Text>
            </TouchableOpacity>
            {/* Discussion Tab */}
            <TouchableOpacity
              key="discussion"
              activeOpacity={0.7}
              onPress={() => {
                if (projectDetails?.id) {
                  navigation.navigate('ProjectDiscussionScreen', {
                    projectId: projectDetails.id,
                    projectName: projectDetails.projectName,
                  });
                }
              }}
              style={[
                styles.tabButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}>
              <Feather name="message-circle" size={16} color={theme.primary} />
              <Text style={[styles.tabButtonText, { color: theme.text, fontWeight: '500' }]}>
                {t('discussion')}
              </Text>
            </TouchableOpacity>
            {/* Materials Tab */}
            <TouchableOpacity
              key="materials"
              activeOpacity={0.7}
              onPress={() => {
                setShowMaterialRequestPopup(true);
              }}
              style={[
                styles.tabButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}>
              <Feather name="package" size={16} color={theme.primary} />
              <Text style={[styles.tabButtonText, { color: theme.text, fontWeight: '500' }]}>
                {t('materials')}
              </Text>
            </TouchableOpacity>
            {/* Settings Tab - Only show for project owner */}
            {projectDetails?.userId === userId && (
              <TouchableOpacity
                key="settings"
                activeOpacity={0.7}
                onPress={() => {
                  if (projectDetails?.id) {
                    navigation.navigate('ProjectAccessScreen', {
                      projectId: projectDetails.id,
                      projectName: projectDetails.projectName,
                    });
                  }
                }}
                style={[
                  styles.tabButton,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                  },
                ]}>
                <Feather name="settings" size={16} color={theme.primary} />
                <Text style={[styles.tabButtonText, { color: theme.text, fontWeight: '500' }]}>
                  {t('settings')}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
        <View style={styles.progressSection}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>
            {t('progress')} <Text style={{ color: theme.success }}>{projectDetails.progress || 0}%</Text>
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: theme.primary }]} />
            <Text style={[styles.statusText, { color: theme.primary }]}>
              {projectDetails.status}
            </Text>
          </View>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressBar,
              { width: `${progressPercent}%`, backgroundColor: theme.primary },
            ]}
          />
        </View>
        {/* Collapsible Project Details */}
        {showProjectDetails && (
          <View>
            <View style={styles.dateRow}>
              <DateBox
                label={t('start_date')}
                value={projectDetails.startDate?.split('T')[0] || '-'}
                theme={theme}
              />
              <DateBox
                label={t('end_date')}
                value={projectDetails.endDate?.split('T')[0] || '-'}
                theme={theme}
              />
            </View>
            <FieldBox
              label={t('project_category')}
              value={projectDetails.projectCategory}
              placeholder={t('project_category')}
              theme={theme}
            />
            <FieldBox
              label={t('location')}
              value={projectDetails.location}
              placeholder={t('location')}
              theme={theme}
            />
            <View
              style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {/* Row with label and avatars spaced */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 8 }]}>
                  {t('co_admins')}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowCoAdminPopup(true)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {projectDetails.coAdmins?.slice(0, 12).map((admin, index) => (
                    <View
                      key={index}
                      style={{
                        marginLeft: index === 0 ? 0 : -16,
                        zIndex: projectDetails.coAdmins.length - index,
                      }}>
                      <Image
                        source={{
                          uri:
                            admin.profilePhoto ||
                            'https://ui-avatars.com/api/?name=' + encodeURIComponent(admin.name),
                        }}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          borderWidth: 2,
                          borderColor: theme.primary,
                          backgroundColor: theme.mode === 'dark' ? '#23272f' : '#F8F9FB',
                        }}
                      />
                    </View>
                  ))}
                  {projectDetails.coAdmins?.length > 12 && (
                    <View
                      style={{
                        marginLeft: -16,
                        zIndex: 0,
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: theme.buttonBg,
                        borderWidth: 2,
                        borderColor: theme.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Text style={{ color: theme.buttonText, fontWeight: '600' }}>
                        +{projectDetails.coAdmins.length - 12}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowDescriptionModal(true)} activeOpacity={0.7}>
              <View
                style={[
                  styles.fieldBox,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    maxHeight: 140,
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  },
                ]}>
                <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 6 }]}>
                  {t('description')}
                </Text>
                <Text
                  numberOfLines={5} // Limit lines in main screen for preview
                  ellipsizeMode="tail"
                  style={[styles.inputValue, { color: theme.text, width: '100%' }]}>
                  {projectDetails.description && projectDetails.description.trim() !== ''
                    ? projectDetails.description
                    : 'No description available'}
                </Text>
                <Text style={{ color: theme.primary, marginTop: 4 }}>{t('read_more')}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDescriptionModal(true)} activeOpacity={0.7}>
              <Modal
                visible={showDescriptionModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowDescriptionModal(false)}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    padding: 20,
                  }}>
                  <View
                    style={{
                      backgroundColor: theme.card,
                      borderRadius: 12,
                      padding: 20,
                      maxHeight: '80%',
                    }}>
                    <ScrollView>
                      <Text
                        style={[
                          styles.inputLabel,
                          { color: theme.text, marginBottom: 12, fontSize: 18 },
                        ]}>
                        {t('description')}
                      </Text>
                      <Text style={[styles.inputValue, { color: theme.text, fontSize: 16 }]}>
                        {projectDetails.description && projectDetails.description.trim() !== ''
                          ? projectDetails.description
                          : 'No description available'}
                      </Text>
                    </ScrollView>
                    <Pressable
                      onPress={() => setShowDescriptionModal(false)}
                      style={{
                        marginTop: 20,
                        alignSelf: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 30,
                        backgroundColor: theme.primary,
                        borderRadius: 25,
                      }}>
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{t('close')}</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            </TouchableOpacity>
          </View>
        )}
        {/* Pending Invites Section */}
        {projectDetails.pendingInvites &&
          Array.isArray(projectDetails.pendingInvites) &&
          projectDetails.pendingInvites.length > 0 && (
            <View style={{ marginHorizontal: 20, marginBottom: 12 }}>
              {/* Collapsible Header */}
              <TouchableOpacity
                onPress={() => setShowPendingInvites(!showPendingInvites)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: showPendingInvites ? 12 : 0
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons
                    name="person-add"
                    size={20}
                    color={theme.primary}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: theme.text
                  }}>
                    Pending Invites ({projectDetails.pendingInvites.length})
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    backgroundColor: '#FF3B30',
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    marginRight: 8
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                      PENDING
                    </Text>
                  </View>
                  <MaterialIcons
                    name={showPendingInvites ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={20}
                    color={theme.text}
                  />
                </View>
              </TouchableOpacity>
              {/* Collapsible Content */}
              {showPendingInvites && (
                <View>
                  {projectDetails.pendingInvites.map((invite, index) => {
                    // console.log('📨 Processing invite:', invite);
                    // Handle the actual data structure from your API
                    const userName = invite.recipientName || invite.name || 'Unknown User';
                    const userEmail = invite.recipientEmail || invite.email;
                    const profilePhoto = invite.profilePhoto || invite.avatar;
                    const createdAt = invite.createdAt || invite.sentAt || invite.invitedAt;
                    return (
                      <View key={invite.inviteId || invite.id || index} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        marginBottom: 8
                      }}>
                        {/* Avatar */}
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: theme.primary + '20',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 12
                        }}>
                          {profilePhoto ? (
                            <Image
                              source={{ uri: profilePhoto }}
                              style={{ width: 40, height: 40, borderRadius: 20 }}
                            />
                          ) : (
                            <Text style={{
                              color: theme.primary,
                              fontWeight: '600',
                              fontSize: 16
                            }}>
                              {userName?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                          )}
                        </View>
                        {/* User Info */}
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            color: theme.text,
                            fontSize: 16,
                            fontWeight: '500'
                          }}>
                            {userName || 'Unknown User'}
                          </Text>
                          {userName && userEmail && (
                            <Text style={{
                              color: theme.secondaryText,
                              fontSize: 12,
                              marginTop: 2
                            }}>
                              {userEmail}
                            </Text>
                          )}
                          <Text style={{
                            color: theme.secondaryText,
                            fontSize: 11,
                            marginTop: 2
                          }}>
                            Sent {createdAt ? new Date(createdAt).toLocaleDateString() : 'Recently'}
                          </Text>
                        </View>
                        {/* Status Badge and Actions */}
                        <View style={{ alignItems: 'flex-end' }}>
                          <View style={{
                            backgroundColor: invite.status === 'pending' ? '#FFF3CD' : '#D4EDDA',
                            borderRadius: 8,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            marginBottom: 8
                          }}>
                            <Text style={{
                              color: invite.status === 'pending' ? '#856404' : '#155724',
                              fontSize: 11,
                              fontWeight: '500'
                            }}>
                              {invite.status?.toUpperCase() || 'PENDING'}
                            </Text>
                          </View>
                          {/* {invite.status === 'pending' && (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              style={{
                                backgroundColor: theme.primary + '20',
                                borderRadius: 6,
                                paddingHorizontal: 8,
                                paddingVertical: 4
                              }}
                              onPress={() => {
                                // Handle resend invite
                                console.log('Resending invite to:', userName);
                              }}
                            >
                              <Text style={{
                                color: theme.primary,
                                fontSize: 10,
                                fontWeight: '500'
                              }}>
                                Resend
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{
                                backgroundColor: '#FF3B3020',
                                borderRadius: 6,
                                paddingHorizontal: 8,
                                paddingVertical: 4
                              }}
                              onPress={() => {
                                // Handle cancel invite
                                console.log('Canceling invite for:', userName);
                              }}
                            >
                              <Text style={{
                                color: '#FF3B30',
                                fontSize: 10,
                                fontWeight: '500'
                              }}>
                                Cancel
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )} */}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        {/* Compact Worklist Section */}
        <View style={{ marginTop: 0 }}>
          {/* Compact Worklist Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginHorizontal: 20,
              marginBottom: 8,
            }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{t('worklists')}</Text>
            <TouchableOpacity
              onPress={() => setCreateWorklistModal(true)}
              style={{
                backgroundColor: `${theme.primary}12`,
                paddingHorizontal: 10,
                paddingVertical: 4,
                position: 'absolute',
                right: 70,
                borderRadius: 6,
                flexDirection: 'row',      // Add this
                alignItems: 'center',
              }}>
              <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '500' }}>{t('create_worklist')}</Text>
              <Feather name="plus" size={11} color={theme.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('WorklistScreen', { project: projectDetails })}
              style={{
                backgroundColor: `${theme.primary}12`,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 6,
              }}>
              <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '500' }}>
                {t('view_all')}
              </Text>
            </TouchableOpacity>
          </View>
          {/* Compact Search Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 12,
              marginHorizontal: 20,
              marginBottom: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: theme.SearchBar, // <-- use theme for background
            }}>
            <MaterialIcons
              name="search"
              size={18}
              color={theme.secondaryText}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: '#363942',
                paddingVertical: 0,
              }}
              placeholder={t('search_worklist')}
              placeholderTextColor={theme.secondaryText}
              value={searchWorklist}
              onChangeText={setSearchWorklist}
            />
          </View>
          {/* Worklist List */}
          {loadingWorklists ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 16 }} />
          ) : worklists.length === 0 ? (
            <View
              style={{
                padding: 24,
                alignItems: 'center',
                backgroundColor: theme.card,
                marginHorizontal: 20,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: theme.border,
              }}>
              <MaterialIcons name="work-outline" size={36} color={theme.secondaryText} />
              <Text
                style={{
                  color: theme.text,
                  textAlign: 'center',
                  marginTop: 8,
                  fontSize: 14,
                  fontWeight: '500',
                }}>
                {t('no_worklists')}
              </Text>
              <Text
                style={{
                  color: theme.secondaryText,
                  textAlign: 'center',
                  marginTop: 2,
                  fontSize: 12,
                }}>
                {t('create_first_worklist')}
              </Text>
              {/* Create Worklist Button */}
              <TouchableOpacity
                onPress={() => setCreateWorklistModal(true)}
                style={{
                  marginTop: 14,
                  backgroundColor: theme.primary,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>{t('create_worklist')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: 400 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {worklists
                .filter((w) => w.name?.toLowerCase().includes(searchWorklist.toLowerCase()))
                .map((item) => (
                  <WorklistCard key={item.id} worklist={item} />
                ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
      {/* Compact Sticky Issue Buttons */}
      <View
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 30 : 16,
          left: 16,
          right: 16,
          flexDirection: 'row',
          gap: 8,
          zIndex: 10,
          elevation: 5,
        }}>

      </View>
      {/* Create Worklist Modal */}
      <Modal
        visible={createWorklistModal}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateWorklistModal(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#00000088',
          }}>
          <View style={{ width: '85%', backgroundColor: theme.card, padding: 20, borderRadius: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: theme.text }}>
              Create New Worklist
            </Text>
            <TextInput
              placeholder="Worklist Name"
              placeholderTextColor={theme.secondaryText}
              value={newWorklistName}
              onChangeText={setNewWorklistName}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                marginBottom: 16,
                color: theme.text,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setCreateWorklistModal(false)}>
                <Text style={{ color: theme.secondaryText, fontSize: 16 }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateWorklist}>
                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>{t('create')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Edit Worklist Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#00000088',
          }}>
          <View
            style={{ width: '85%', backgroundColor: theme.card, padding: 20, borderRadius: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: theme.text }}>
              {t('edit_worklist')}
            </Text>
            <TextInput
              placeholder={t('worklist_name')}
              placeholderTextColor={theme.secondaryText}
              value={editedWorklistName}
              onChangeText={setEditedWorklistName}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 10,
                padding: 12,
                fontSize: 16,
                marginBottom: 16,
                color: theme.text,
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={{ color: theme.secondaryText, fontSize: 16 }}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleUpdateWorklist}>
                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ProjectIssuePopup
        visible={showProjectIssuePopup}
        onClose={() => setShowProjectIssuePopup(false)}
        values={issueForm}
        onChange={handleIssueChange}
        onSubmit={handleIssueSubmit}
        theme={theme}
        projects={[{ id: projectDetails.id, projectName: projectDetails.projectName }]}
        users={users}
      />
      {showDependencyChart && (
        <DependencyChartPopup
          key={`chart-${projectDetails.id}-${Date.now()}`}
          visible={true}
          onClose={() => setShowDependencyChart(false)}
          projectId={projectDetails.id}
        />
      )}
      <CoAdminListPopup
        visible={showCoAdminPopup}
        onClose={() => setShowCoAdminPopup(false)}
        data={projectDetails.coAdmins}
        theme={theme}
        title={`Co-Admins (${projectDetails.coAdmins?.length || 0})`}
      />
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' }}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}>
          <View
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 80 : 35,
              right: 20,
              backgroundColor: '#fff',
              borderRadius: 10,
              paddingVertical: 8,
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 6,
              elevation: 6,
              minWidth: 140,
            }}>
            {/* Edit Option */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('UpdateProjectScreen', { projectId: projectDetails.id });
              }}>
              <Feather name="edit" size={18} color="#366CD9" style={{ marginRight: 8 }} />
              <Text style={{ color: '#366CD9', fontWeight: '500', fontSize: 15 }}>{t('edit')}</Text>
            </TouchableOpacity>
            {/* Delete Option */}

            {userId === projectDetails.userId && (
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                }}
                onPress={() => setShowTransferModal(true)}
              ><Feather name="repeat" size={18} color="#366CD9" style={{ marginRight: 8 }} />
                <Text style={{ color: '#366CD9', fontWeight: '500', fontSize: 15 }}>{t('hand_over_project')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert('Delete Project', 'Are you sure you want to delete this project?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteProjectById(projectDetails.id);
                        Alert.alert('Deleted', 'Project deleted successfully.', [
                          {
                            text: 'OK',
                            onPress: () => {
                              navigation.navigate('ProjectScreen', { refresh: true });
                            },
                          },
                        ]);
                      } catch (err) {
                        Alert.alert('Delete Failed', err.message || 'Could not delete project.');
                      }
                    },
                  },
                ]);
              }}>
              <Feather name="trash-2" size={18} color="#E53935" style={{ marginRight: 8 }} />
              <Text style={{ color: '#E53935', fontWeight: '500', fontSize: 15 }}>{t('delete')}</Text>
            </TouchableOpacity>
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
                          Alert.alert('Success', 'You have left the project.');
                          navigation.navigate('ProjectScreen', { refresh: true });
                        } catch (err) {
                          Alert.alert('Error', err.message || 'Failed to leave project.');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <Feather name="log-out" size={18} color="#E53935" style={{ marginRight: 8 }} />
              <Text style={{ color: '#E53935', fontWeight: '500', fontSize: 15 }}>Leave Project</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Ownership Transfer Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#fff', marginHorizontal: 30, borderRadius: 10, padding: 20 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>{t('select_new_manager')}:</Text>
            {projectDetails.coAdmins && projectDetails.coAdmins.length > 0 ? (
              projectDetails.coAdmins.map(coAdmin => (
                <TouchableOpacity
                  key={coAdmin.userId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 10,
                    backgroundColor: selectedNewOwner === coAdmin.userId ? theme.primary : '#eee',
                    marginVertical: 4,
                    borderRadius: 6,
                  }}
                  onPress={() => setSelectedNewOwner(coAdmin.userId)}
                >
                  <Text style={{
                    color: selectedNewOwner === coAdmin.userId ? '#fff' : '#000',
                    flex: 1,
                    fontSize: 16
                  }}>
                    {coAdmin.name}
                  </Text>
                  {coAdmin.profilePhoto ? (
                    <Image
                      source={{ uri: coAdmin.profilePhoto }}
                      style={{ width: 30, height: 30, borderRadius: 15 }}
                    />
                  ) : null}
                </TouchableOpacity>
              ))
            ) : (
              <Text>No co-admins available</Text>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowTransferModal(false)} style={{ padding: 10 }}>
                <Text style={{ color: theme.primary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!selectedNewOwner}
                onPress={async () => {
                  if (!selectedNewOwner) return;
                  try {
                    await transferProjectOwnership(projectDetails.id, selectedNewOwner);
                    Alert.alert('Success', 'Ownership transferred successfully');
                    setShowTransferModal(false);
                    // Optionally refresh project details here
                    // console.log('Ownership transferred to user ID:', selectedNewOwner);
                  } catch (error) {
                    Alert.alert('Error', error.message || 'Something went wrong');
                  }
                }}
                style={{
                  padding: 10,
                  backgroundColor: selectedNewOwner ? theme.primary : '#bbb',
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: '#fff' }}>Transfer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Project Name Modal */}
      <Modal
        visible={showProjectNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProjectNameModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowProjectNameModal(false)}>
          <View style={styles.coAdminPopupOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View
                style={[
                  styles.coAdminPopup,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                <Text style={[styles.coAdminPopupTitle, { color: theme.text }]}>{t('project_name')}</Text>
                <Text
                  style={[
                    {
                      color: theme.text,
                      fontSize: 16,
                      textAlign: 'center',
                      lineHeight: 22,
                      marginBottom: 12,
                    },
                  ]}>
                  {projectDetails?.projectName}
                </Text>
                <TouchableOpacity
                  style={styles.coAdminPopupCloseBtn}
                  onPress={() => setShowProjectNameModal(false)}>
                  <Text style={{ color: theme.primary, fontWeight: '500' }}>{t('close')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Material Request Popup */}
      <MaterialRequestPopup
        visible={showMaterialRequestPopup}
        onClose={() => setShowMaterialRequestPopup(false)}
        projectId={projectDetails?.id}
        theme={theme}
        users={users}
      />
    </View>
  );
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

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
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: isTablet ? 40 : 20,
    marginBottom: isTablet ? 12 : 8,
    marginTop: isTablet ? 6 : 0,
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontWeight: '400',
    fontSize: isTablet ? 18 : 16,
    color: '#222',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E42',
    marginRight: 6,
  },
  statusText: {
    color: '#F59E42',
    fontWeight: '400',
    fontSize: isTablet ? 16 : 14,
  },
  progressBarBg: {
    width: '90%',
    height: 6,
    backgroundColor: '#ECF0FF',
    borderRadius: 6,
    marginHorizontal: '5%',
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#366CD9',
    borderRadius: 6,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: isTablet ? 42 : 24,
    marginBottom: isTablet ? 16 : 12,
    gap: isTablet ? 12 : 8,
    marginTop: 0,
  },
  dateBox: {
    flex: 1,
    backgroundColor: '#F8F9FB',
    borderRadius: 10,
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 4,
  },
  dateLabel: {
    fontSize: 13,
    color: '#222',
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '400',
  },
  dateValue: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '500',
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  issueBtnRow: {
    marginTop: 0,
    marginBottom: 8,
    marginHorizontal: isTablet ? 20 : 0,
  },
  issueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 14,
  },
  issueBtnText: {
    color: '#222',
    fontWeight: '400',
    fontSize: 15,
    marginLeft: 10,
  },
  coAdminPopupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    zIndex: 100,
  },
  coAdminPopup: {
    width: 280,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    elevation: 8,
  },
  coAdminPopupTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  coAdminPopupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  coAdminPopupCloseBtn: {
    marginTop: 10,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 120, 246, 0.08)',
  },
  // Modern Tab Button Styles
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
  },
  tabButtonText: {
    fontSize: isTablet ? 13 : 12,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
