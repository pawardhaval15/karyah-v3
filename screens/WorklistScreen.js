import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import CustomCircularProgress from '../components/task details/CustomCircularProgress';
import { useWorklists } from '../hooks/useWorklists';
import { useWorklistUIStore } from '../store/worklistUIStore';
import { useTheme } from '../theme/ThemeContext';

// --- Memoized Components ---

const WorklistCard = memo(({ worklist, navigation, theme, project, progress, t }) => {
  const handleCardPress = useCallback(() => {
    navigation.navigate('TaskListScreen', { worklist, project });
  }, [navigation, worklist, project]);

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <TouchableOpacity
        style={[styles.worklistCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        activeOpacity={0.7}
        onPress={handleCardPress}>
        <View style={[styles.worklistIcon, { backgroundColor: theme.avatarBg }]}>
          <Text style={[styles.worklistIconText, { color: theme.primary }]}>
            {worklist.name[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.worklistName, { color: theme.text }]}>{worklist.name}</Text>
          <Text style={{ color: theme.secondaryText, fontSize: 12, marginTop: 2 }}>
            {progress?.totalTasks || 0} {t('tasks')}
          </Text>
        </View>
        <View style={{ marginLeft: 10 }}>
          <CustomCircularProgress
            size={48}
            strokeWidth={4}
            percentage={progress?.progress || 0}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const WorklistBanner = memo(({ projectName, onAdd, onProjectNamePress, theme, t }) => {
  const gradientColors = theme.projectGradient || [theme.secondary, theme.primary];

  return (
    <Animated.View entering={FadeInRight.duration(500)}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={onProjectNamePress} activeOpacity={0.8}>
            <Text numberOfLines={2} ellipsizeMode="tail" style={styles.bannerTitle}>
              {projectName}
            </Text>
          </TouchableOpacity>
          <Text style={styles.bannerDesc}>{t('worklist_desc')}</Text>
        </View>
        <TouchableOpacity style={styles.bannerAction} onPress={onAdd}>
          <Text style={styles.bannerActionText}>{t('worklist')}</Text>
          <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
});

// --- Main Screen ---

export default function WorklistScreen({ navigation, route }) {
  const theme = useTheme();
  const { t } = useTranslation();

  const project = route.params?.project;
  const projectId = project?.id;
  const projectName = project?.projectName || 'Project Name';

  // --- Zustand Store ---
  const {
    search,
    setSearch,
    isCreateModalVisible,
    setCreateModalVisible,
    isEditModalVisible,
    setEditModalVisible,
    isProjectNameModalVisible,
    setProjectNameModalVisible,
    selectedWorklist,
    setSelectedWorklist,
    newWorklistName,
    setNewWorklistName,
    editedWorklistName,
    setEditedWorklistName,
    resetCreateForm,
    resetEditForm,
  } = useWorklistUIStore();

  // --- React Query Hook ---
  const {
    worklists,
    worklistsProgress,
    isLoading,
    isRefreshing,
    refetch,
    createWorklist: createWorklistMutation,
    updateWorklist: updateWorklistMutation,
    deleteWorklist: deleteWorklistMutation,
    isCreating,
    isUpdating,
  } = useWorklists(projectId);

  // --- Handlers ---

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleCreateWorklist = useCallback(async () => {
    if (!newWorklistName.trim()) {
      Alert.alert('Validation', 'Please enter a worklist name.');
      return;
    }

    try {
      await createWorklistMutation({ name: newWorklistName.trim() });
      resetCreateForm();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create worklist');
    }
  }, [newWorklistName, createWorklistMutation, resetCreateForm]);

  const handleUpdateWorklist = useCallback(async () => {
    if (!editedWorklistName.trim()) {
      Alert.alert('Validation', 'Please enter a worklist name.');
      return;
    }

    try {
      await updateWorklistMutation({ id: selectedWorklist.id, name: editedWorklistName.trim() });
      resetEditForm();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update worklist');
    }
  }, [editedWorklistName, selectedWorklist, updateWorklistMutation, resetEditForm]);

  const handleDeleteWorklist = useCallback((id) => {
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
              await deleteWorklistMutation(id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete worklist.');
            }
          },
        },
      ]
    );
  }, [deleteWorklistMutation]);

  const openEditModal = useCallback((worklist) => {
    setSelectedWorklist(worklist);
    setEditedWorklistName(worklist.name);
    setEditModalVisible(true);
  }, [setSelectedWorklist, setEditedWorklistName, setEditModalVisible]);

  // --- Memoized Values ---

  const filteredWorklists = useMemo(() => {
    if (!worklists) return [];
    return worklists
      .filter((w) => w.name?.toLowerCase().includes(search.toLowerCase()))
      .sort((b, a) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [worklists, search]);

  const getWorklistProgress = useCallback((worklistId) => {
    return worklistsProgress.find((p) => p.worklistId === worklistId);
  }, [worklistsProgress]);

  // --- Render ---

  if (isLoading && !isRefreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Loading worklists...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
      </TouchableOpacity>

      <WorklistBanner
        projectName={projectName}
        onAdd={() => setCreateModalVisible(true)}
        onProjectNamePress={() => setProjectNameModalVisible(true)}
        theme={theme}
        t={t}
      />

      {/* Create Worklist Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={resetCreateForm}>
        <TouchableWithoutFeedback onPress={resetCreateForm}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{t('create_new_worklist')}</Text>
                <TextInput
                  placeholder={t('worklist_name')}
                  placeholderTextColor={theme.secondaryText}
                  value={newWorklistName}
                  onChangeText={setNewWorklistName}
                  style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={resetCreateForm}>
                    <Text style={{ color: theme.secondaryText, fontSize: 16 }}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCreateWorklist} disabled={isCreating}>
                    {isCreating ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>{t('create')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Worklist Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={resetEditForm}>
        <TouchableWithoutFeedback onPress={resetEditForm}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{t('edit_worklist')}</Text>
                <TextInput
                  placeholder={t('worklist_name')}
                  placeholderTextColor={theme.secondaryText}
                  value={editedWorklistName}
                  onChangeText={setEditedWorklistName}
                  style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
                  autoFocus
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={resetEditForm}>
                    <Text style={{ color: theme.secondaryText, fontSize: 16 }}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleUpdateWorklist} disabled={isUpdating}>
                    {isUpdating ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>{t('save_changes')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Search bar */}
      <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
        <MaterialIcons name="search" size={22} color={theme.text} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder={t('search_worklist')}
          placeholderTextColor={theme.secondaryText}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Worklist list */}
      <FlatList
        data={filteredWorklists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <WorklistCard
            worklist={item}
            navigation={navigation}
            theme={theme}
            project={project}
            onDelete={handleDeleteWorklist}
            onEdit={openEditModal}
            progress={getWorklistProgress(item.id)}
            t={t}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={() => (
          !isLoading && (
            <View style={styles.emptyContainer}>
              <Text style={{ color: theme.secondaryText }}>{t('no_worklists_found')}</Text>
            </View>
          )
        )}
      />

      {/* Project Name Modal */}
      <Modal
        visible={isProjectNameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectNameModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setProjectNameModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.projectNameModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.projectNameTitle, { color: theme.text }]}>{t('project_name')}</Text>
                <Text style={[styles.projectNameText, { color: theme.text }]}>{projectName}</Text>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: theme.buttonBg }]}
                  onPress={() => setProjectNameModalVisible(false)}>
                  <Text style={{ color: theme.primary, fontWeight: '500' }}>{t('close')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBtn: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    marginLeft: 16,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    fontSize: 18,
    fontWeight: '400',
  },
  banner: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    minHeight: 110,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  bannerDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '400',
    maxWidth: '80%',
  },
  bannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerActionText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  searchIcon: {
    marginRight: 8,
  },
  worklistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  worklistIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  worklistIconText: {
    fontWeight: '600',
    fontSize: 20,
  },
  worklistName: {
    fontWeight: '500',
    fontSize: 16,
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    padding: 24,
    borderRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 20,
    alignItems: 'center',
  },
  projectNameModal: {
    width: 300,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
  },
  projectNameTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  projectNameText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
});
