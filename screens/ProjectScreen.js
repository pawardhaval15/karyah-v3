import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import ProjectPopup from '../components/popups/ProjectPopup';
import ProjectTagsManagementModal from '../components/popups/ProjectTagsManagementModal';
import ProjectCard from '../components/Project/ProjectCard'; // Memoized now
import ProjectInvitesSection from '../components/Project/ProjectInvitesSection';
import { useProjects, useUpdateProjectTags } from '../hooks/useProjects';
import { useUserDetails } from '../hooks/useUser';
import { useTheme } from '../theme/ThemeContext';

export default function ProjectScreen({ navigation }) {
  const theme = useTheme();
  const { t } = useTranslation();

  // Data Fetching
  const { data: projects = [], isLoading: loading, refetch, isRefetching } = useProjects();
  // console.log(projects);
  const { data: user } = useUserDetails();
  const updateTagsMutation = useUpdateProjectTags();

  // State
  const [search, setSearch] = useState('');
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'completed'
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [selectedProjectForTags, setSelectedProjectForTags] = useState(null);
  const [completedExpanded, setCompletedExpanded] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Local Filter State
  const [filters, setFilters] = useState({
    tags: [],
    locations: [],
  });

  const currentUserId = user?.id || user?.userId || user?._id;
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

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleTagsManagement = useCallback((project) => {
    setSelectedProjectForTags(project);
    setShowTagsModal(true);
  }, []);

  const handleSaveTags = async (projectId, newTags) => {
    try {
      await updateTagsMutation.mutateAsync({ projectId, tags: newTags });
    } catch (error) {
      console.error('Failed to save project tags:', error);
      Alert.alert("Error", "Failed to update project tags");
    }
  };

  // Filter Logic Helpers
  const toggleFilter = (type, value) => {
    setFilters(prev => {
      const current = prev[type];
      const exists = current.includes(value);
      return {
        ...prev,
        [type]: exists ? current.filter(item => item !== value) : [...current, value]
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({ tags: [], locations: [] });
    setSearch('');
  };

  const getActiveFiltersCount = () => {
    return filters.tags.length + filters.locations.length;
  };

  // Extract Options for Filters
  const filterOptions = useMemo(() => {
    const allTags = new Set();
    const allLocations = new Set();
    projects.forEach(p => {
      if (Array.isArray(p.tags)) p.tags.forEach(tag => allTags.add(tag));
      if (p.location) allLocations.add(p.location);
    });
    return {
      tags: Array.from(allTags),
      locations: Array.from(allLocations)
    };
  }, [projects]);

  // Memoized Search & Filter Logic
  const filteredProjects = useMemo(() => {
    let result = projects;

    // 1. Search
    if (search.trim()) {
      const lowercaseSearch = search.toLowerCase();
      result = result.filter(p => {
        const nameMatch = p?.projectName?.toLowerCase().includes(lowercaseSearch);
        const descMatch = p?.description?.toLowerCase().includes(lowercaseSearch);
        const tagsMatch = p?.tags?.some(tag => tag.toLowerCase().includes(lowercaseSearch));
        const locationMatch = p?.location?.toLowerCase().includes(lowercaseSearch);
        return nameMatch || descMatch || tagsMatch || locationMatch;
      });
    }

    // 2. Filter by Tags
    if (filters.tags.length > 0) {
      result = result.filter(p =>
        p.tags && p.tags.some(t => filters.tags.includes(t))
      );
    }

    // 3. Filter by Location
    if (filters.locations.length > 0) {
      result = result.filter(p =>
        filters.locations.includes(p.location)
      );
    }

    return result;
  }, [projects, search, filters]);

  // Categorize Projects (Pending vs Completed)
  const { pendingProjects, completedProjects } = useMemo(() => {
    const pending = [];
    const completed = [];
    filteredProjects.forEach(p => {
      if (p.progress >= 100) {
        completed.push(p);
      } else {
        pending.push(p);
      }
    });
    return { pendingProjects: pending, completedProjects: completed };
  }, [filteredProjects]);

  // Construct List Data based on Active Tab
  const listData = useMemo(() => {
    if (activeTab === 'pending') {
      return pendingProjects;
    }
    if (activeTab === 'completed') {
      return completedProjects;
    }
    // All: show pending, then completed section header, then completed if expanded
    const data = [...pendingProjects];

    // Add Completed Header
    if (completedProjects.length > 0) {
      data.push({ id: 'COMPLETED_HEADER', count: completedProjects.length });
      if (completedExpanded) {
        data.push(...completedProjects);
      }
    }
    return data;
  }, [activeTab, pendingProjects, completedProjects, completedExpanded]);

  const counts = useMemo(() => ({
    all: filteredProjects.length, // Show count of FILTERED projects
    pending: pendingProjects.length,
    completed: completedProjects.length,
  }), [filteredProjects.length, pendingProjects.length, completedProjects.length]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home', { refresh: true })} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={theme.text} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {t('projects')} {filteredProjects.length !== projects.length ? `(${filteredProjects.length}/${projects.length})` : `(${projects.length})`}
          </Text>
        </TouchableOpacity>

        <View style={styles.headerRightActions}>
          <View style={[styles.searchBarContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Feather name="search" size={18} color={theme.secondaryText} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={t('search_projects')}
              placeholderTextColor={theme.secondaryText}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialIcons name="close" size={16} color={theme.secondaryText} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: getActiveFiltersCount() > 0 ? theme.primary + '15' : theme.card,
                borderColor: getActiveFiltersCount() > 0 ? theme.primary : theme.border
              }
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Feather
              name="sliders"
              size={18}
              color={getActiveFiltersCount() > 0 ? theme.primary : theme.text}
            />
            {getActiveFiltersCount() > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <Text style={styles.badgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Panel */}
      {showFilters && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          layout={Layout.springify()}
          style={[styles.filtersPanel, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={styles.filterHeader}>
            <Text style={[styles.filterHeaderText, { color: theme.text }]}>{t('filters')}</Text>
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>{t('clear_all')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {/* Locations Filter */}
            {filterOptions.locations.length > 0 && (
              <View style={[styles.filterGroup, { marginTop: 16 }]}>
                <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>{t('locations')}</Text>
                <View style={styles.chipsRow}>
                  {filterOptions.locations.map(loc => (
                    <TouchableOpacity
                      key={loc}
                      onPress={() => toggleFilter('locations', loc)}
                      style={[
                        styles.chip,
                        filters.locations.includes(loc)
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { borderColor: theme.border }
                      ]}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: filters.locations.includes(loc) ? '#fff' : theme.text }
                      ]}>
                        {loc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Tags Filter */}
            {filterOptions.tags.length > 0 && (
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>{t('tags')}</Text>
                <View style={styles.chipsRow}>
                  {filterOptions.tags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleFilter('tags', tag)}
                      style={[
                        styles.chip,
                        filters.tags.includes(tag)
                          ? { backgroundColor: theme.primary, borderColor: theme.primary }
                          : { borderColor: theme.border }
                      ]}
                    >
                      <Text style={[
                        styles.chipText,
                        { color: filters.tags.includes(tag) ? '#fff' : theme.text }
                      ]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['all', 'pending', 'completed'].map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabPill,
              activeTab === tab
                ? { backgroundColor: '#E67E22', borderColor: '#E67E22' }
                : { backgroundColor: theme.card, borderColor: theme.border }
            ]}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? '#fff' : theme.text }
            ]}>
              {t(tab)} <Text style={{ fontSize: 13, fontWeight: '700' }}>{counts[tab]}</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Project Invites Section */}
      <ProjectInvitesSection
        theme={theme}
        onInviteResponse={(action) => {
          if (action === 'accept') refetch();
        }}
        style={{ marginBottom: 10 }}
      />

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id?.toString() || item.toString()}
          contentContainerStyle={{ paddingBottom: 80, paddingTop: 10 }}

          // Performance Optimizations
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}

          renderItem={({ item }) => {
            if (item.id === 'COMPLETED_HEADER') {
              return (
                <View style={{ marginBottom: 16 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setCompletedExpanded(!completedExpanded)}
                    style={[
                      styles.sectionHeader,
                      { marginBottom: 12, marginTop: 24 }
                    ]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: theme.card || '#f0f0f0',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12
                      }}>
                        <Feather
                          name={completedExpanded ? "chevron-down" : "chevron-right"}
                          size={18}
                          color={theme.text}
                        />
                      </View>
                      <Text style={[styles.sectionHeaderText, { color: theme.text }]}>
                        {t('completed')} ({item.count})
                      </Text>
                    </View>

                    <View style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: theme.card || '#f0f0f0',
                      borderRadius: 12,
                    }}>
                      <Text style={{
                        color: theme.secondaryText,
                        fontSize: 12,
                        fontWeight: '600'
                      }}>
                        {completedExpanded ? (t('hide') || 'Hide') : (t('show') || 'Show')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <View style={{ height: 1, backgroundColor: theme.border, marginHorizontal: 20 }} />
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
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 40, color: theme.secondaryText }}>
              {t('no_projects_found')}
            </Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setShowProjectPopup(true)}
      >
        <Feather name="plus" size={24} color="#fff" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerRightActions: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 200,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  filtersPanel: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterHeaderText: {
    fontSize: 16,
    fontWeight: '700',
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
});
