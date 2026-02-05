import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

// Components
import ProjectCard from '../components/Project/ProjectCard';
import ProjectFilterPanel from '../components/Project/ProjectFilterPanel';
import ProjectInvitesSection from '../components/Project/ProjectInvitesSection';
import ProjectScreenHeader from '../components/Project/ProjectScreenHeader';
import ProjectTabs from '../components/Project/ProjectTabs';
import ProjectPopup from '../components/popups/ProjectPopup';
import ProjectTagsManagementModal from '../components/popups/ProjectTagsManagementModal';

// Hooks
import { useProjectFilters } from '../hooks/useProjectFilters';
import { useProjects, useUpdateProjectTags } from '../hooks/useProjects';
import { useUserDetails } from '../hooks/useUser';
import { useTheme } from '../theme/ThemeContext';

/**
 * ProjectScreen - Enterprise-grade project management overview.
 * Features modular architecture, centralized filtering logic, and optimized list performance.
 */
export default function ProjectScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();

  // --- Data Layer ---
  const { data: projects = [], isLoading, refetch, isRefetching } = useProjects();
  const { data: user } = useUserDetails();
  const updateTagsMutation = useUpdateProjectTags();

  // --- State Management ---
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'completed'
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProjectForTags, setSelectedProjectForTags] = useState(null);
  const [completedExpanded, setCompletedExpanded] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [projectForm, setProjectForm] = useState({
    projectName: '',
    projectDesc: '',
    startDate: '',
    endDate: '',
    projectCategory: '',
    location: '',
    coAdmins: '',
    tags: [],
  });

  // --- Business Logic Hook ---
  const {
    search,
    setSearch,
    filters,
    filterOptions,
    filteredProjects,
    categorizedProjects,
    toggleFilter,
    clearAllFilters,
    activeFiltersCount
  } = useProjectFilters(projects);

  const currentUserId = user?.id || user?.userId || user?._id;

  // --- Handlers ---
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleProjectChange = useCallback((field, value) => {
    setProjectForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleProjectSubmit = useCallback(() => {
    setShowProjectPopup(false);
    setProjectForm({
      projectName: '',
      projectDesc: '',
      startDate: '',
      endDate: '',
      projectCategory: '',
      location: '',
      coAdmins: '',
      tags: [],
    });
    refetch();
  }, [refetch]);

  const handleTagsManagement = useCallback((project) => {
    setSelectedProjectForTags(project);
    setShowTagsModal(true);
  }, []);

  const handleSaveTags = useCallback(async (projectId, newTags) => {
    try {
      await updateTagsMutation.mutateAsync({ projectId, tags: newTags });
    } catch (error) {
      Alert.alert("Error", "Failed to update project tags");
    }
  }, [updateTagsMutation]);

  // --- Memoized List Data ---
  const listData = useMemo(() => {
    const { pending, completed } = categorizedProjects;

    if (activeTab === 'pending') return pending;
    if (activeTab === 'completed') return completed;

    const data = [...pending];
    if (completed.length > 0) {
      data.push({ id: 'COMPLETED_HEADER', count: completed.length });
      if (completedExpanded) {
        data.push(...completed);
      }
    }
    return data;
  }, [activeTab, categorizedProjects, completedExpanded]);

  const counts = useMemo(() => ({
    all: filteredProjects.length,
    pending: categorizedProjects.pending.length,
    completed: categorizedProjects.completed.length,
  }), [filteredProjects.length, categorizedProjects]);

  // --- Render Helpers ---
  const renderItem = useCallback(({ item }) => {
    if (item.id === 'COMPLETED_HEADER') {
      return (
        <View style={styles.sectionHeaderContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCompletedExpanded(!completedExpanded)}
            style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.chevronBadge, { backgroundColor: theme.background }]}>
                <Feather
                  name={completedExpanded ? "chevron-down" : "chevron-right"}
                  size={18}
                  color={theme.text}
                />
              </View>
              <Text style={[styles.sectionHeaderText, { color: theme.text }]}>
                {t('completed')} <Text style={{ color: theme.secondaryText }}>({item.count})</Text>
              </Text>
            </View>
            <View style={[styles.toggleBadge, { backgroundColor: theme.background }]}>
              <Text style={[styles.toggleBadgeText, { color: theme.secondaryText }]}>
                {completedExpanded ? t('hide') : t('show')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Animated.View entering={FadeIn} layout={Layout.springify()}>
        <ProjectCard
          project={item}
          theme={theme}
          onTagsManagement={handleTagsManagement}
          currentUserId={currentUserId}
        />
      </Animated.View>
    );
  }, [theme, t, completedExpanded, handleTagsManagement, currentUserId]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ProjectScreenHeader
        theme={theme}
        t={t}
        search={search}
        setSearch={setSearch}
        onBack={() => navigation.navigate('Home', { refresh: true })}
        onToggleFilters={() => setShowFilters(!showFilters)}
        activeFiltersCount={activeFiltersCount}
        totalVisible={filteredProjects.length}
        totalActual={projects.length}
      />

      {showFilters && (
        <ProjectFilterPanel
          theme={theme}
          t={t}
          filterOptions={filterOptions}
          filters={filters}
          toggleFilter={toggleFilter}
          clearAllFilters={clearAllFilters}
        />
      )}

      <ProjectTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={counts}
        theme={theme}
        t={t}
      />

      <ProjectInvitesSection
        theme={theme}
        onInviteResponse={(action) => {
          if (action === 'accept') refetch();
        }}
      />

      {isLoading && !isRefreshing ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id?.toString() || item.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={10}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="folder" size={48} color={theme.secondaryText} />
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                {t('no_projects_found')}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setShowProjectPopup(true)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <ProjectPopup
        visible={showProjectPopup}
        onClose={() => setShowProjectPopup(false)}
        values={projectForm}
        onChange={handleProjectChange}
        onSubmit={handleProjectSubmit}
        theme={theme}
      />

      <ProjectTagsManagementModal
        visible={showTagsModal}
        onClose={() => {
          setShowTagsModal(false);
          setSelectedProjectForTags(null);
        }}
        project={selectedProjectForTags}
        onSave={handleSaveTags}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 100 },
  sectionHeaderContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chevronBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  toggleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  toggleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  }
});
