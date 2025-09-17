import { Feather, MaterialIcons } from '@expo/vector-icons';
import CoAdminListPopup from 'components/popups/CoAdminListPopup';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
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
  TouchableOpacity,TextInput,
  View,FlatList,
} from 'react-native';
import GradientButton from '../components/Login/GradientButton';
import DependencyChartPopup from '../components/popups/DependencyChartPopup';
import ProjectIssuePopup from '../components/popups/ProjectIssuePopup';
import DateBox from '../components/project details/DateBox';
import FieldBox from '../components/project details/FieldBox';
import IssueButton from '../components/project details/IssueButton';
import { useTheme } from '../theme/ThemeContext';
import { getUserIdFromToken } from '../utils/auth';
import { fetchUserConnections } from '../utils/issues';
import { deleteProjectById, getProjectById } from '../utils/project';
import {
    createWorklist,
    getWorklistsByProjectId,
    updateWorklist,
    deleteWorklist,
} from '../utils/worklist';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  // 1. Add new state
  const [showMoreDetails, setShowMoreDetails] = useState(false);
const [showWorklistSection, setShowWorklistSection] = useState(true);
const [worklists, setWorklists] = useState([]);
const [loadingWorklists, setLoadingWorklists] = useState(false);
const [refreshingWorklists, setRefreshingWorklists] = useState(false);
const [searchWorklist, setSearchWorklist] = useState('');
const [editModalVisible, setEditModalVisible] = useState(false);
const [selectedWorklist, setSelectedWorklist] = useState(null);
const [editedWorklistName, setEditedWorklistName] = useState('');

  useEffect(() => {
    const fetchUserId = async () => {
      const id = await getUserIdFromToken();
      setUserId(id);
    };
    fetchUserId();
  }, []);
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
            setWorklists(prev => prev.filter(w => w.id !== id));
          } catch (error) {
            console.error('Failed to delete worklist:', error.message);
            Alert.alert('Error', 'Failed to delete worklist.');
          }
        }
      }
    ]
  );
};

// Open edit modal
const openEditModal = (worklist) => {
  setSelectedWorklist(worklist);
  setEditedWorklistName(worklist.name);
  setEditModalVisible(true);
};

// Save updated worklist
const handleUpdateWorklist = async () => {
  if (!editedWorklistName.trim()) {
    Alert.alert('Validation', 'Please enter a worklist name.');
    return;
  }
  try {
    const token = await AsyncStorage.getItem('token');
    const updated = await updateWorklist(selectedWorklist.id, editedWorklistName.trim(), token);
    setWorklists(prev =>
      prev.map(w => (w.id === updated.id ? updated : w))
    );
    setEditModalVisible(false);
    setSelectedWorklist(null);
    setEditedWorklistName('');
  } catch (error) {
    console.error('Failed to update worklist:', error.message);
    Alert.alert('Error', error.message || 'Failed to update worklist.');
  }
};
  useEffect(() => {
  const fetchWorklists = async () => {
    if (!projectDetails?.id) return;
    setLoadingWorklists(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const data = await getWorklistsByProjectId(projectDetails.id, token);
      setWorklists(data);
    } catch (error) {
      console.error('Failed to fetch worklists:', error.message);
    } finally {
      setLoadingWorklists(false);
      setRefreshingWorklists(false);
    }
  };

  if (showWorklistSection) { // Fetch only when opened
    fetchWorklists();
  }
}, [showWorklistSection, projectDetails?.id]);
const WorklistCard = ({ worklist }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginHorizontal: 20,
      marginBottom: 8
    }}
  >
    {/* Icon/name tap: open TaskList */}
    <TouchableOpacity
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
      onPress={() => navigation.navigate('TaskListScreen', { worklist, project: projectDetails })}
      activeOpacity={0.7}
    >
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: theme.avatarBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 20 }}>
          {worklist.name?.[0]?.toUpperCase() || '?'}
        </Text>
      </View>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }}>{worklist.name}</Text>
    </TouchableOpacity>
    {/* Edit */}
    <TouchableOpacity onPress={() => openEditModal(worklist)} style={{ padding: 8, marginRight: 12 }}>
      <MaterialIcons name="edit" size={22} color={theme.primary} />
    </TouchableOpacity>
    {/* Delete */}
    <TouchableOpacity onPress={() => handleDeleteWorklist(worklist.id)} style={{ padding: 8 }}>
      <MaterialIcons name="delete-outline" size={22} color={theme.primary} />
    </TouchableOpacity>
  </View>
);
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Use projectId if available, else fallback to project.id
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
        <Text style={{ color: theme.text }}>Project not found</Text>
      </View>
    );
  }
  const progressPercent = projectDetails.progress || 0;
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
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
            <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
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
          <View>
            <Text style={styles.projectName}>{projectDetails.projectName}</Text>
            <Text
              style={
                styles.dueDate
              }>{`Due Date : ${projectDetails.endDate?.split('T')[0] || '-'}`}</Text>
          </View>
        </LinearGradient>
        {/* Action Buttons Row */}
        <View style={{ flexDirection: 'row', marginHorizontal: isTablet ? 40 : 20, marginTop: isTablet ? 20 : 16, marginBottom: isTablet ? 20 : 16, gap: isTablet ? 12 : 8 }}>
          {/* Task Dependency Flow */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowDependencyChart(true)}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.card,
              borderRadius: 18,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: theme.border,
              minHeight: 48,
            }}>
            <MaterialIcons
              name="device-hub"
              size={isTablet ? 20 : 18}
              color={theme.primary}
              style={{ marginRight: isTablet ? 10 : 8 }}
            />
            <Text
              numberOfLines={1}
              ellipsizeMode='tail'
              style={{ color: theme.text, fontWeight: '400', fontSize: isTablet ? 15 : 13, flexWrap: 'nowrap' }}>
              Task Dep.
            </Text>
          </TouchableOpacity>

          {/* Discussion */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (projectDetails?.id) {
                navigation.navigate('ProjectDiscussionScreen', {
                  projectId: projectDetails.id,
                  projectName: projectDetails.projectName
                });
              }
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.card,
              borderRadius: 18,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: theme.border,
              minHeight: 48,
            }}>
            <Feather
              name="message-circle"
              size={isTablet ? 20 : 18}
              color={theme.primary}
              style={{ marginRight: isTablet ? 10 : 8 }}
            />
            <Text
              numberOfLines={1}
              ellipsizeMode='tail'
              style={{ color: theme.text, fontWeight: '400', fontSize: isTablet ? 15 : 13, flexWrap: 'nowrap' }}>
              Discussion
            </Text>
          </TouchableOpacity>

          {/* Project Settings - Only show for project owner */}
          {projectDetails?.userId === userId && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (projectDetails?.id) {
                  navigation.navigate('ProjectAccessScreen', {
                    projectId: projectDetails.id,
                    projectName: projectDetails.projectName
                  });
                }
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.card,
                borderRadius: 18,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: theme.border,
                minHeight: 48,
              }}>
              <Feather
                name="settings"
                size={isTablet ? 20 : 18}
                color={theme.primary}
                style={{ marginRight: isTablet ? 10 : 8 }}
              />
              <Text
                numberOfLines={1}
                ellipsizeMode='tail'
                style={{ color: theme.text, fontWeight: '400', fontSize: isTablet ? 15 : 13, flexWrap: 'nowrap' }}>
                Project Settings
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.progressSection}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>
            Progress <Text style={{ color: theme.success }}>{projectDetails.progress || 0}%</Text>
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
        {/* Toggle Button */}
        <TouchableOpacity
          onPress={() => setShowMoreDetails(prev => !prev)}
          style={{
            alignSelf: 'flex-start',
            marginHorizontal: isTablet ? 40 : 20,
            marginTop: 10,
            marginBottom: showMoreDetails ? 0 : 12,
          }}
        >
          <Text style={{ color: theme.primary, fontWeight: '500', fontSize: 14 }}>
            {showMoreDetails ? 'Close Details ▲' : 'More Details ▼'}
          </Text>
        </TouchableOpacity>

        {/* Collapsible Section */}
        {showMoreDetails && (
          <View>
            {/* Date Row */}
            <View style={styles.dateRow}>
              <DateBox
                label="START DATE"
                value={projectDetails.startDate?.split('T')[0] || '-'}
                theme={theme}
              />
              <DateBox
                label="END DATE"
                value={projectDetails.endDate?.split('T')[0] || '-'}
                theme={theme}
              />
            </View>

            {/* Project Category */}
            <FieldBox
              label="PROJECT CATEGORY"
              value={projectDetails.projectCategory}
              placeholder="Project Category"
              theme={theme}
            />

            {/* Location */}
            <FieldBox
              label="LOCATION"
              value={projectDetails.location}
              placeholder="Location"
              theme={theme}
            />

            {/* Co-Admins */}
            <View style={[styles.fieldBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 8 }]}>
                  CO-ADMINS
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowCoAdminPopup(true)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  {projectDetails.coAdmins?.slice(0, 12).map((admin, index) => (
                    <View
                      key={index}
                      style={{
                        marginLeft: index === 0 ? 0 : -16,
                        zIndex: projectDetails.coAdmins.length - index,
                      }}
                    >
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
                      }}
                    >
                      <Text style={{ color: theme.buttonText, fontWeight: '600' }}>
                        +{projectDetails.coAdmins.length - 12}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Description */}
            <TouchableOpacity
              onPress={() => setShowDescriptionModal(true)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.fieldBox,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    maxHeight: 140,
                    flexDirection: 'column',
                    alignItems: 'flex-start'
                  },
                ]}
              >
                <Text style={[styles.inputLabel, { color: theme.text, marginBottom: 6 }]}>DESCRIPTION</Text>
                <Text
                  numberOfLines={5}
                  ellipsizeMode="tail"
                  style={[styles.inputValue, { color: theme.text, width: '100%' }]}
                >
                  {projectDetails.description && projectDetails.description.trim() !== ''
                    ? projectDetails.description
                    : 'No description available'}
                </Text>
                <Text style={{ color: theme.primary, marginTop: 4 }}>Read More</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}


        <View style={styles.issueBtnRow}>
          <IssueButton
            icon="alert-circle"
            text="Raise an Issue"
            onPress={() => {
              setIssueForm((prev) => ({
                ...prev,
                projectId: projectDetails?.id || '',
              }));
              setShowProjectIssuePopup(true);
            }}
            theme={theme}
          />
          <IssueButton
            icon="alert-circle"
            text="View Issue List"
            onPress={() => {
              // console.log('Navigating with projectId:', projectDetails?.id);
              if (projectDetails?.id) {
                navigation.navigate('ProjectIssuesScreen', { projectId: projectDetails.id });
              } else {
                console.warn('No projectId found in projectDetails', projectDetails);
              }
            }}
            theme={theme}
          />
          {/* View Work List expandable tab */}
<TouchableOpacity
  onPress={() => setShowWorklistSection(prev => !prev)}
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.border
  }}
>
  <Text style={{ color: theme.primary, fontWeight: '500' }}>
    {showWorklistSection ? 'Hide Work List ▲' : 'View Work List ▼'}
  </Text>
</TouchableOpacity>
<View style={{
  flexDirection: 'row',
  alignItems: 'center',
  marginHorizontal: 20,
  marginBottom: 8,
  borderWidth: 1,
  borderColor: theme.border,
  borderRadius: 8,
  paddingHorizontal: 10
}}>
  <MaterialIcons name="search" size={18} color={theme.text} />
  <TextInput
    style={{ flex: 1, padding: 6, color: theme.text }}
    placeholder="Search worklist..."
    placeholderTextColor={theme.secondaryText}
    value={searchWorklist}
    onChangeText={setSearchWorklist}
  />
</View>

{showWorklistSection && (
  <View style={{ marginTop: 8 }}>
    {loadingWorklists ? (
      <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
    ) : worklists.length === 0 ? (
      <Text style={{ color: theme.text, textAlign: 'center', marginVertical: 20 }}>
        No worklists found
      </Text>
    ) : (
      <FlatList
  data={worklists.filter(w =>
    w.name?.toLowerCase().includes(searchWorklist.toLowerCase())
  )}
  keyExtractor={item => item.id}
  renderItem={({ item }) => <WorklistCard worklist={item} />}
  style={{ marginTop: 4 }}
  contentContainerStyle={{ paddingBottom: 20 }}
/>

    )}
  </View>
)}

        </View>
        <Modal
  visible={editModalVisible}
  animationType="slide"
  transparent
  onRequestClose={() => setEditModalVisible(false)}
>
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00000088' }}>
    <View style={{ width: '85%', backgroundColor: theme.card, padding: 20, borderRadius: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12, color: theme.text }}>
        Edit Worklist
      </Text>

      <TextInput
        placeholder="Worklist Name"
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
          <Text style={{ color: theme.secondaryText, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleUpdateWorklist}>
          <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
      </ScrollView>
      {/* <View style={styles.fixedButtonContainer}>
        <GradientButton
          title="View All Worklists"
          onPress={() => navigation.navigate('WorklistScreen', { project: projectDetails })}
          theme={theme}
        />
      </View> */}
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
              <Text style={{ color: '#366CD9', fontWeight: '500', fontSize: 15 }}>Edit</Text>
            </TouchableOpacity>
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
              <Text style={{ color: '#E53935', fontWeight: '500', fontSize: 15 }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    fontSize: 16,
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
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: isTablet ? 40 : 20,
    marginBottom: isTablet ? 12 : 8,
    marginTop: isTablet ? 12 : 8,
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
  fixedButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 20,
    right: 20,
    zIndex: 10,
    elevation: 5,
    backgroundColor: 'transparent',
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
});
