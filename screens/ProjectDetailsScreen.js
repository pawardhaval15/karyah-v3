import { Feather, Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

// Components
import DependencyChartPopup from '../components/popups/DependencyChartPopup';
import MaterialRequestPopup from '../components/popups/MaterialRequestPopup';
import TaskList from '../components/Task/TaskList';

// Hooks
import { useUserConnections } from '../hooks/useConnections';
import {
  useDeleteProject,
  useLeaveProject,
  useProjectDetails,
  useTransferOwnership
} from '../hooks/useProjects';
import { useTasksByWorklist } from '../hooks/useTasks';
import { useUserDetails } from '../hooks/useUser';
import { useWorklists } from '../hooks/useWorklists';
import { useWorklistUIStore } from '../store/worklistUIStore';
import { useTheme } from '../theme/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

// --- Memoized UI Components ---

const CircularProgress = memo(({ percentage, size = 100, strokeWidth = 8, theme }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: size * 0.22, fontWeight: '700', color: theme.text }}>{percentage}%</Text>
        <Text style={{ fontSize: size * 0.1, color: theme.primary, marginTop: -2 }}>✓</Text>
      </View>
    </View>
  );
});

const DonutChart = memo(({ done = 0, todo = 100, theme, styles }) => {
  const size = 60;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const doneOffset = circumference - (done / 100) * circumference;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.secCard}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={doneOffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={{ flex: 1 }}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
          <Text style={styles.legendLabel}>Done</Text>
          <Text style={styles.legendValue}>{done}%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.secCard }]} />
          <Text style={styles.legendLabel}>To Do</Text>
          <Text style={styles.legendValue}>{todo}%</Text>
        </View>
      </View>
    </View>
  );
});

const ActivityChart = memo(({ theme }) => {
  return (
    <View style={{ height: 60, width: '100%' }}>
      <Svg width="100%" height="60" viewBox="0 0 100 40" preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={theme.primary} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={theme.primary} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path
          d="M0,35 Q10,30 20,32 T40,20 T60,25 T80,10 T100,5 V40 H0 Z"
          fill="url(#grad)"
        />
        <Path
          d="M0,35 Q10,30 20,32 T40,20 T60,25 T80,10 T100,5"
          fill="none"
          stroke={theme.primary}
          strokeWidth="2"
        />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <Text key={day} style={{ fontSize: 8, color: theme.secondaryText }}>{day}</Text>
        ))}
      </View>
    </View>
  );
});

const QuickActionItem = memo(({ icon, label, onPress, color, styles }) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.actionIconContainer, { backgroundColor: `${color}15` }]}>
      <Feather name={icon} size={20} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
));

const ProjectHeader = memo(({
  projectDetails,
  theme,
  styles,
  onBack,
  onMenu,
  onMaterial,
  onChat,
  onDependency,
  setShowTeam,
  showTeam,
  setCreateModalVisible,
}) => {
  const [showProjectDetails, setShowProjectDetails] = useState(false);

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROJECT OVERVIEW</Text>
        <TouchableOpacity onPress={onMenu} activeOpacity={0.7}>
          <Feather name="more-vertical" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <Animated.View entering={FadeInUp.delay(200)} layout={Layout.springify().damping(15)} style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{projectDetails?.projectCategory?.toUpperCase() || 'GENERAL'}</Text>
            </View>
            <Text style={styles.heroProjectName} numberOfLines={2}>{projectDetails?.projectName}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.secondaryText} />
              <Text style={styles.metaText}>Due: {projectDetails?.endDate?.split('T')[0] || '-'}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowProjectDetails(!showProjectDetails)} style={styles.briefToggle} activeOpacity={0.7}>
              <Text style={styles.briefToggleText}>{showProjectDetails ? 'Hide Brief' : 'View Brief'}</Text>
              <Feather name={showProjectDetails ? 'chevron-up' : 'chevron-down'} size={14} color={theme.primary} />
            </TouchableOpacity>
          </View>
          <CircularProgress percentage={projectDetails?.progress || 0} size={100} strokeWidth={10} theme={theme} />
        </View>

        {showProjectDetails && (
          <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.heroExpansion}>
            <View style={styles.divider} />
            <Text style={styles.expansionTitle}>Project Description</Text>
            <Text style={styles.expansionText}>{projectDetails?.description || 'No description'}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Creator:</Text>
              <Text style={styles.infoValue}>{projectDetails?.creatorName || '-'}</Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>

      <View style={styles.analyticsGrid}>
        <View style={[styles.analyticsCard, { flex: 1.2 }]}>
          <Text style={styles.cardTitle}>TASK STATUS</Text>
          <DonutChart done={projectDetails?.progress || 0} todo={100 - (projectDetails?.progress || 0)} theme={theme} styles={styles} />
        </View>
        <View style={[styles.analyticsCard, { flex: 1 }]}>
          <Text style={styles.cardTitle}>ACTIVITY</Text>
          <ActivityChart theme={theme} />
        </View>
      </View>

      <View style={styles.actionMenu}>
        <QuickActionItem icon="message-circle" label="Chat" color="#4169E1" onPress={onChat} styles={styles} />
        <QuickActionItem icon="shopping-bag" label="Material" color={theme.primary} onPress={onMaterial} styles={styles} />
        <QuickActionItem icon="users" label="Team" color="#FF1493" onPress={() => setShowTeam(!showTeam)} styles={styles} />
        <QuickActionItem icon="share-2" label="Dependency" color="#32CD32" onPress={onDependency} styles={styles} />
      </View>

      {showTeam && (
        <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.teamExpansion}>
          <View style={styles.teamHeader}>
            <Text style={styles.expansionTitle}>Project Team</Text>
          </View>
          {projectDetails?.coAdmins?.length === 0 ? (
            <Text style={{ color: theme.secondaryText, fontSize: 12 }}>No co-admins yet.</Text>
          ) : (
            projectDetails?.coAdmins?.map((admin, idx) => (
              <View key={admin.id || idx} style={styles.memberRow}>
                <Image source={{ uri: admin.profilePhoto || `https://ui-avatars.com/api/?name=${admin.name}` }} style={styles.memberAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{admin.name}</Text>
                  <Text style={styles.memberRole}>Co-Admin</Text>
                </View>
              </View>
            ))
          )}
        </Animated.View>
      )}

      <View style={[styles.worklistHeader, { marginTop: 30 }]}>
        <Text style={styles.sectionTitle}>Project Worklists</Text>
        <TouchableOpacity style={styles.addNewButton} onPress={() => setCreateModalVisible(true)} activeOpacity={0.8}>
          <Text style={styles.addNewText}>+ Add New</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const WorklistItem = memo(({ item, index, navigation, projectDetails, progress, theme, styles, onDelete, t }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const percentage = progress.progress || 0;
  const remainingTasks = progress.totalTasks - progress.completedTasks;

  const { data: tasks = [], isLoading } = useTasksByWorklist(isExpanded ? item.id : null);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)}
      layout={Layout.springify().damping(18).stiffness(120)}
      style={styles.worklistWrapper}
    >
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        onLongPress={() => onDelete(item.id)}
        activeOpacity={0.9}
        style={[styles.worklistCard, isExpanded && styles.worklistCardExpanded]}>
        <View style={styles.worklistIcon}>
          <Text style={styles.worklistLetter}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.worklistName} numberOfLines={1}>{item.name?.toUpperCase()}</Text>
          <Text style={styles.worklistTasks}>{remainingTasks} {t('tasks_remaining')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <CircularProgress size={44} strokeWidth={4} percentage={percentage} theme={theme} />
          <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.secondaryText} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <Animated.View entering={FadeInUp.duration(300)} exiting={FadeOutUp.duration(200)} style={styles.expansionContent}>
          <View style={styles.expansionHeader}>
            <Text style={styles.expansionHeaderText}>Tasks in {item.name}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('TaskListScreen', { worklist: item, project: projectDetails })}
              style={styles.viewMoreBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.viewMoreText}>Manage All</Text>
              <Feather name="external-link" size={12} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={{ height: 100, justifyContent: 'center' }}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : (
            <TaskList
              tasks={tasks}
              theme={theme}
              isSelectionMode={false}
              selectedTasks={[]}
              onTaskPress={(task) => navigation.navigate('TaskDetails', { taskId: task.id || task._id })}
              onSubtaskNavigate={(subtaskId) => navigation.navigate('TaskDetails', { taskId: subtaskId })}
              activeTab="mytasks"
              scrollEnabled={false}
              nestedScrollEnabled={true}
              ListEmptyComponent={
                <View style={styles.emptyTasksContainer}>
                  <Text style={styles.emptyTasksText}>No tasks found in this worklist.</Text>
                </View>
              }
            />
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
});

// --- Main Screen ---

export default function ProjectDetailsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { project, projectId } = route.params || {};
  const finalProjectId = projectId || project?.id;

  // --- Zustand UI State ---
  const {
    isCreateModalVisible,
    setCreateModalVisible,
    newWorklistName,
    setNewWorklistName,
    resetCreateForm,
  } = useWorklistUIStore();

  const { data: user } = useUserDetails();
  const userId = user?.id || user?._id;
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDependencyChart, setShowDependencyChart] = useState(false);
  const [showMaterialRequestPopup, setShowMaterialRequestPopup] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTeam, setShowTeam] = useState(false);

  // --- API Hooks (Server State) ---
  const {
    data: projectDetails,
    isLoading: isProjectLoading,
    refetch: refetchProject,
    isFetching: isProjectRefetching
  } = useProjectDetails(finalProjectId);

  const {
    worklists,
    worklistsProgress,
    isLoading: isWorklistsLoading,
    refetch: refetchWorklists,
    createWorklist,
    deleteWorklist,
    isRefreshing: isWorklistsRefreshing
  } = useWorklists(finalProjectId);

  const { data: users = [] } = useUserConnections();

  const leaveMutation = useLeaveProject();
  const transferMutation = useTransferOwnership();
  const deleteProjectMutation = useDeleteProject();

  // --- Handlers ---

  const onRefresh = useCallback(() => {
    refetchProject();
    refetchWorklists();
  }, [refetchProject, refetchWorklists]);

  const handleCreateWorklist = useCallback(async () => {
    if (!newWorklistName.trim()) return Alert.alert('Validation', 'Enter name');
    try {
      await createWorklist({ name: newWorklistName.trim() });
      resetCreateForm();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create worklist');
    }
  }, [newWorklistName, createWorklist, resetCreateForm]);

  const handleDeleteWorklist = useCallback((id) => {
    Alert.alert('Delete', 'Are you sure you want to delete this worklist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWorklist(id) },
    ]);
  }, [deleteWorklist]);

  const handleLeaveProject = useCallback(() => {
    Alert.alert(t('leave_project'), t('leave_project_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('leave'),
        style: 'destructive',
        onPress: () => leaveMutation.mutate(finalProjectId, {
          onSuccess: () => navigation.navigate('Home'),
          onError: (err) => Alert.alert('Error', err.message)
        })
      },
    ]);
  }, [t, leaveMutation, finalProjectId, navigation]);

  const handleTransferOwnership = useCallback((id, name) => {
    Alert.alert(
      'Confirm Handover',
      `Are you sure you want to transfer ownership to ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => transferMutation.mutate({ projectId: finalProjectId, newOwnerId: id }, {
            onSuccess: () => {
              setShowTransferModal(false);
              Alert.alert('Success', 'Ownership transferred.');
            },
            onError: (err) => Alert.alert('Error', err.message)
          })
        }
      ]
    );
  }, [transferMutation, finalProjectId]);

  const getWorklistProgress = useCallback((id) => {
    return worklistsProgress.find(p => p.worklistId === id) || { progress: 0, totalTasks: 0, completedTasks: 0 };
  }, [worklistsProgress]);

  // --- Renders ---

  const listHeader = useMemo(() => (
    <ProjectHeader
      projectDetails={projectDetails}
      theme={theme}
      styles={styles}
      onBack={() => navigation.goBack()}
      onMenu={() => setMenuVisible(true)}
      onMaterial={() => setShowMaterialRequestPopup(true)}
      onChat={() => navigation.navigate('ProjectDiscussionScreen', { projectId: finalProjectId, projectName: projectDetails?.projectName })}
      onDependency={() => setShowDependencyChart(true)}
      setShowTeam={setShowTeam}
      showTeam={showTeam}
      setCreateModalVisible={setCreateModalVisible}
    />
  ), [projectDetails, theme, styles, navigation, finalProjectId, showTeam, setCreateModalVisible]);

  const renderItem = useCallback(({ item, index }) => (
    <WorklistItem
      item={item}
      index={index}
      navigation={navigation}
      projectDetails={projectDetails}
      progress={getWorklistProgress(item.id)}
      theme={theme}
      styles={styles}
      onDelete={handleDeleteWorklist}
      t={t}
    />
  ), [navigation, projectDetails, getWorklistProgress, theme, styles, handleDeleteWorklist, t]);

  if (isProjectLoading || isWorklistsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!projectDetails) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: theme.text }}>{t('project_not_found')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={worklists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isProjectRefetching || isWorklistsRefreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="folder-open-outline" size={48} color={theme.secondaryText} />
            <Text style={{ marginTop: 12, color: theme.secondaryText }}>No worklists created yet.</Text>
          </View>
        }
      />

      {/* Modals */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuPopup}>
            {projectDetails?.userId === userId ? (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('UpdateProjectScreen', { projectId: finalProjectId }); }}>
                  <Feather name="edit" size={18} color={theme.text} />
                  <Text style={styles.menuText}>Edit Project</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setShowTransferModal(true); }}>
                  <Feather name="repeat" size={18} color={theme.text} />
                  <Text style={styles.menuText}>Handover</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => {
                  setMenuVisible(false);
                  Alert.alert('Delete', 'Are you sure?', [
                    { text: 'Cancel' },
                    {
                      text: 'Delete',
                      onPress: () => deleteProjectMutation.mutate(finalProjectId, {
                        onSuccess: () => navigation.goBack()
                      })
                    }
                  ]);
                }}>
                  <Feather name="trash-2" size={18} color="#FF3B30" />
                  <Text style={[styles.menuText, { color: '#FF3B30' }]}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); handleLeaveProject(); }}>
                <Feather name="log-out" size={18} color="#FF3B30" />
                <Text style={[styles.menuText, { color: '#FF3B30' }]}>Leave Project</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showTransferModal} transparent animationType="slide" onRequestClose={() => setShowTransferModal(false)}>
        <View style={styles.bottomModalOverlay}>
          <View style={styles.bottomModalContent}>
            <Text style={styles.modalTitle}>Handover Project</Text>
            <FlatList
              data={projectDetails?.coAdmins || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.memberListItem} onPress={() => handleTransferOwnership(item.id, item.name)}>
                  <Image source={{ uri: item.profilePhoto || `https://ui-avatars.com/api/?name=${item.name}` }} style={styles.memberAvatar} />
                  <Text style={styles.memberName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme.secondaryText }}>No co-admins available.</Text>}
            />
            <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={() => setShowTransferModal(false)}>
              <Text style={{ color: theme.primary, fontWeight: '700' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isCreateModalVisible} transparent animationType="slide" onRequestClose={resetCreateForm}>
        <View style={styles.bottomModalOverlay}>
          <View style={styles.bottomModalContent}>
            <Text style={styles.modalTitle}>New Worklist</Text>
            <TextInput
              placeholder="e.g. Civil Works"
              placeholderTextColor={theme.secondaryText}
              style={styles.modalInput}
              value={newWorklistName}
              onChangeText={setNewWorklistName}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={{ flex: 1, padding: 16 }} onPress={resetCreateForm}>
                <Text style={{ textAlign: 'center', color: theme.secondaryText }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 2 }]} onPress={handleCreateWorklist}>
                <Text style={styles.primaryBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDependencyChart && <DependencyChartPopup visible={true} onClose={() => setShowDependencyChart(false)} projectId={finalProjectId} />}
      <MaterialRequestPopup visible={showMaterialRequestPopup} onClose={() => setShowMaterialRequestPopup(false)} projectId={finalProjectId} theme={theme} users={users} />
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 45 : 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: theme.text, letterSpacing: 1.2 },
  heroCard: {
    backgroundColor: theme.card,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    elevation: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryBadge: {
    backgroundColor: `${theme.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: { color: theme.primary, fontSize: 10, fontWeight: '700' },
  heroProjectName: { fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { fontSize: 13, color: theme.secondaryText },
  briefToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: `${theme.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  briefToggleText: { fontSize: 11, fontWeight: '700', color: theme.primary },
  heroExpansion: { marginTop: 12 },
  divider: { height: 1, backgroundColor: theme.border, marginBottom: 16, opacity: 0.5 },
  expansionTitle: { fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 8 },
  expansionText: { fontSize: 13, color: theme.secondaryText, lineHeight: 20, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.border },
  infoLabel: { fontSize: 12, color: theme.secondaryText, fontWeight: '600' },
  infoValue: { fontSize: 12, color: theme.text, fontWeight: '700' },
  analyticsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 16, marginTop: 12 },
  analyticsCard: { backgroundColor: theme.card, borderRadius: 20, padding: 16, elevation: 2 },
  cardTitle: { fontSize: 8, fontWeight: '800', color: theme.secondaryText, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  legendLabel: { fontSize: 10, color: theme.secondaryText, flex: 1 },
  legendValue: { fontSize: 10, fontWeight: '700', color: theme.text },
  actionMenu: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 16 },
  actionItem: { alignItems: 'center', gap: 8 },
  actionIconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 10, fontWeight: '700', color: theme.secondaryText },
  teamExpansion: { marginHorizontal: 20, marginTop: 16, backgroundColor: theme.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.border },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.border },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: theme.avatarBg },
  memberName: { fontSize: 14, fontWeight: '700', color: theme.text },
  memberRole: { fontSize: 11, color: theme.secondaryText },
  worklistHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.text },
  addNewButton: { backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addNewText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  worklistWrapper: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  worklistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    padding: 16,
    borderRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  worklistCardExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: theme.border,
    elevation: 0,
  },
  worklistIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.secCard, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  worklistLetter: { fontSize: 18, fontWeight: '800', color: theme.primary },
  worklistName: { fontSize: 15, fontWeight: '800', color: theme.text },
  worklistTasks: { fontSize: 12, color: theme.secondaryText, fontWeight: '600', marginTop: 2 },
  expansionContent: {
    backgroundColor: theme.card,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 0,
    paddingBottom: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.border,
  },
  expansionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 8,
  },
  expansionHeaderText: { fontSize: 13, fontWeight: '700', color: theme.secondaryText },
  viewMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewMoreText: { fontSize: 12, fontWeight: '700', color: theme.primary },
  emptyTasksContainer: { padding: 20, alignItems: 'center' },
  emptyTasksText: { fontSize: 12, color: theme.secondaryText, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  menuPopup: { position: 'absolute', top: 60, right: 20, backgroundColor: theme.card, borderRadius: 16, paddingVertical: 8, minWidth: 160, elevation: 10 },
  menuItem: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontWeight: '600', color: theme.text },
  bottomModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomModalContent: { backgroundColor: theme.card, padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, color: theme.text },
  modalInput: { backgroundColor: theme.secCard, padding: 16, borderRadius: 16, fontSize: 16, marginBottom: 24, color: theme.text },
  primaryBtn: { backgroundColor: theme.primary, padding: 16, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontWeight: '800' },
  memberListItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.secCard, borderRadius: 16, marginBottom: 12 },
});
