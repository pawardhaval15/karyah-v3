import { Feather, MaterialIcons } from '@expo/vector-icons';
import ProjectFabDrawer from 'components/Project/ProjectFabDrawer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Alert,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet, Text, TouchableOpacity,
  View
} from 'react-native';
import ProjectPopup from '../components/popups/ProjectPopup';
import ProjectTagsManagementModal from '../components/popups/ProjectTagsManagementModal';
import ProjectBanner from '../components/Project/ProjectBanner';
import ProjectCard from '../components/Project/ProjectCard';
import ProjectInvitesSection from '../components/Project/ProjectInvitesSection';
import ProjectSearchBar from '../components/Project/ProjectSearchBar';
import { useProjects, useUpdateProjectTags } from '../hooks/useProjects';
import { useUserDetails } from '../hooks/useUser';
import { useTheme } from '../theme/ThemeContext';
export default function ProjectScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();

  // Data Fetching
  const { data: projects = [], isLoading: loading, refetch, isRefetching } = useProjects();
  const { data: user } = useUserDetails();
  const updateTagsMutation = useUpdateProjectTags();

  // State
  const [search, setSearch] = useState('');
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'working', 'delayed', 'completed'
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [selectedProjectForTags, setSelectedProjectForTags] = useState(null);
  const [filters, setFilters] = useState({
    tags: [],
  });

  const currentUserId = user?.id || user?.userId || user?._id;

  // Screen layout
  const { width: screenWidth } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;

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
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refetch();
    });
    return unsubscribe;
  }, [navigation, refetch]);
  const handleTagsManagement = (project) => {
    console.log('🔍 Debug Tags Management:', {
      currentUserId,
      projectUserId: project.userId,
      projectCreatedBy: project.createdBy,
      projectCreatorId: project.creatorId,
      projectCreator: project.creator,
      projectCoAdmins: project.coAdmins,
    });

    // Remove creator check so anyone can manage tags
    // Remove this block:
    // const isCreator = ...
    // if (!isCreator) { Alert ... return; }

    // Directly set project and show modal
    setSelectedProjectForTags(project);
    setShowTagsModal(true);
  };


  const handleSaveTags = async (projectId, newTags) => {
    try {
      await updateTagsMutation.mutateAsync({ projectId, tags: newTags });
      console.log('Project tags saved successfully');
    } catch (error) {
      console.error('Failed to save project tags:', error);
      Alert.alert("Error", "Failed to update project tags");
      throw error;
    }
  };

  const toggleFilter = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter((item) => item !== value)
        : [...prev[filterType], value],
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      tags: [],
    });
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).reduce((count, filterArray) => count + filterArray.length, 0);
  };

  // Get unique tags for filter options
  const getTagOptions = () => {
    const tagOptions = [
      ...new Set(
        projects
          .flatMap((project) => project.tags || [])
          .filter(Boolean)
      ),
    ];
    return tagOptions;
  };

  // Memoized Search & Filter Logic
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Search filter
    if (search.trim()) {
      const lowercaseSearch = search.toLowerCase();
      result = result.filter(p => {
        const nameMatch = p?.projectName?.toLowerCase().includes(lowercaseSearch);
        const descMatch = p?.description?.toLowerCase().includes(lowercaseSearch);
        const tagsMatch = p?.tags?.some(tag => tag.toLowerCase().includes(lowercaseSearch));
        const locationMatch = p?.location?.toLowerCase().includes(lowercaseSearch);
        const categoryMatch = p?.projectCategory?.toLowerCase().includes(lowercaseSearch);
        return nameMatch || descMatch || tagsMatch || locationMatch || categoryMatch;
      });
    }

    // Tags filter
    if (filters.tags.length > 0) {
      result = result.filter(project =>
        project.tags && Array.isArray(project.tags) &&
        filters.tags.some(filterTag => project.tags.includes(filterTag))
      );
    }

    return result;
  }, [projects, search, filters.tags]);

  // Memoized Categorized Data
  const categories = useMemo(() => {
    const working = [];
    const completed = [];
    const delayed = [];
    const now = new Date();

    filteredProjects.forEach(p => {
      const end = p.endDate ? new Date(p.endDate) : null;
      if (p.progress >= 100) {
        completed.push(p);
      } else if (end && end < now) {
        delayed.push(p);
      } else {
        working.push(p);
      }
    });

    return { working, completed, delayed };
  }, [filteredProjects]);

  const tabData = useMemo(() => {
    const { working, delayed, completed } = categories;
    if (activeTab === 'all') return [...working, ...delayed, ...completed];
    if (activeTab === 'working') return working;
    if (activeTab === 'delayed') return delayed;
    if (activeTab === 'completed') return completed;
    return [];
  }, [activeTab, categories]);

  const counts = useMemo(() => ({
    all: categories.working.length + categories.delayed.length + categories.completed.length,
    working: categories.working.length,
    delayed: categories.delayed.length,
    completed: categories.completed.length,
  }), [categories]);
  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: 40 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home', { refresh: true })}>
        <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
      </TouchableOpacity>
      <ProjectBanner onAdd={() => setShowProjectPopup(true)} theme={theme} />
      <ProjectSearchBar value={search} onChange={setSearch} theme={theme} />
      {/* Project Invites Section */}
      <ProjectInvitesSection
        theme={theme}
        onInviteResponse={(action) => {
          // Refresh projects list when invite is accepted
          if (action === 'accept') {
            refetch();
          }
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16, marginTop: 12, marginBottom: 12, gap: 2, flexWrap: 'wrap', rowGap: 10, maxWidth: "95%" }}>
        {[
          {
            key: 'all',
            label: t('all'),
            count: counts.all,
            icon: <Feather name="grid" size={13} color={activeTab === 'all' ? "#fff" : theme.primary} style={{ marginRight: 4 }} />
          },
          {
            key: 'working',
            label: t('working'),
            count: counts.working,
            icon: <Feather name="play-circle" size={13} color={activeTab === 'working' ? "#fff" : "#039855"} style={{ marginRight: 4 }} />
          },
          {
            key: 'delayed',
            label: t('delayed'),
            count: counts.delayed,
            icon: <Feather name="clock" size={13} color={activeTab === 'delayed' ? "#fff" : "#E67514"} style={{ marginRight: 4 }} />
          },
          {
            key: 'completed',
            label: t('completed'),
            count: counts.completed,
            icon: <Feather name="check-circle" size={13} color={activeTab === 'completed' ? "#fff" : "#366CD9"} style={{ marginRight: 4 }} />
          },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={{
              backgroundColor: activeTab === tab.key ? theme.primary : 'transparent',
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 6,
              marginRight: 2,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
            onPress={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <Text style={{
              fontSize: 13,
              fontWeight: '500',
              color: activeTab === tab.key ? '#fff' : theme.secondaryText,
            }}>
              {tab.label}
              <Text style={{ fontSize: 14, fontWeight: '400', color: activeTab === tab.key ? '#fff' : theme.secondaryText }}>
                {' '}{tab.count}
              </Text>
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={theme.text} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={tabData}
          keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
          contentContainerStyle={{ paddingBottom: 24 }}
          numColumns={isTablet ? 2 : 1}
          columnWrapperStyle={isTablet ? styles.row : null}
          renderItem={({ item, index }) => {
            let delayedDays = 0;
            const now = new Date();
            if (item.endDate && new Date(item.endDate) < now && (item.progress < 100)) {
              const end = new Date(item.endDate);
              const diffTime = now - end;
              delayedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            return (
              <View style={isTablet ? styles.cardContainer : null}>
                <ProjectCard
                  key={item.id || index}
                  project={item}
                  theme={theme}
                  delayedDays={delayedDays}
                  endDate={item.endDate}
                  isTablet={isTablet}
                  onTagsManagement={handleTagsManagement}
                  currentUserId={currentUserId}
                />
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={{ marginLeft: 18, marginTop: 20, color: theme.secondaryText }}>
              {t('no_projects_found')}
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              colors={[theme.primary]} // Android
              tintColor={theme.primary} // iOS
            />
          }
        />
      )}
      {/* <ProjectFabDrawer
        onTaskSubmit={(task) => console.log('New Task:', task)}
        onProjectSubmit={(project) => console.log('New Project:', project)}
        theme={theme}
      /> */}
      <ProjectPopup
        visible={showProjectPopup}
        onClose={() => setShowProjectPopup(false)}
        values={projectForm}
        onChange={handleProjectChange}
        onSubmit={handleProjectSubmit}
        theme={theme}
      />
      {/* Project Tags Management Modal */}
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
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    marginTop: Platform.OS === 'ios' ? 70 : 25,
    marginLeft: 16,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 18,
    fontWeight: '400',
    marginLeft: 0,
  },
  row: {
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  cardContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
});
