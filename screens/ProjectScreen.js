import { Feather } from '@expo/vector-icons'; // Add this import if not already present
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet, Text, TouchableOpacity,
  View
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

import ProjectFabDrawer from 'components/Project/ProjectFabDrawer';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import ProjectPopup from '../components/popups/ProjectPopup';
import ProjectTagsManagementModal from '../components/popups/ProjectTagsManagementModal';
import ProjectBanner from '../components/Project/ProjectBanner';
import ProjectCard from '../components/Project/ProjectCard';
import ProjectSearchBar from '../components/Project/ProjectSearchBar';
import { getProjectsByUserId, updateProjectTags } from '../utils/project';
export default function ProjectScreen({ navigation }) {
  const theme = useTheme();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showProjectPopup, setShowProjectPopup] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'working', 'delayed', 'completed'
  const [refreshing, setRefreshing] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [selectedProjectForTags, setSelectedProjectForTags] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tags: [], // Add tags filter
  });
  const { t } = useTranslation();
  // Get screen dimensions for responsive layout
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
    tags: [], // Add tags field
  });

  const handleProjectChange = (field, value) => {
    setProjectForm(prev => ({ ...prev, [field]: value }));
  };

  const handleProjectSubmit = () => {
    setShowProjectPopup(false);
    setProjectForm({
      projectName: '',
      projectDesc: '',
      startDate: '',
      endDate: '',
      projectCategory: '',
      location: '',
      coAdmins: '',
      tags: [], // Reset tags
    });
  };

  const fetchProjects = async () => {
    try {
      const result = await getProjectsByUserId();
      console.log('✅ Raw Projects fetched:', result);
      
      // Ensure each project has a tags field (empty array if not present)
      const projectsWithTags = (result || []).map(project => ({
        ...project,
        tags: project.tags || [] // Default to empty array if tags is missing
      }));
      
      console.log('✅ Projects with tags initialized:', projectsWithTags);
      setProjects(projectsWithTags);
    } catch (err) {
      console.error('❌ Error fetching projects:', err.message);
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      // Get user from AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      let user = null;
      let userIdFromStorage = null;
      
      if (userData) {
        user = JSON.parse(userData);
        userIdFromStorage = user.id || user.userId || user._id;
      }
      
      // Also decode JWT token to get user ID
      const token = await AsyncStorage.getItem('token');
      let userIdFromToken = null;
      let decodedToken = null;
      
      if (token) {
        try {
          decodedToken = jwtDecode(token);
          userIdFromToken = decodedToken.userId || decodedToken.id || decodedToken.sub;
        } catch (tokenError) {
          console.error('❌ Error decoding token:', tokenError);
        }
      }
      
      console.log('🔍 Complete User Debug:', {
        fromStorage: {
          fullUser: user,
          extractedUserId: userIdFromStorage,
        },
        fromToken: {
          decodedToken,
          extractedUserId: userIdFromToken,
        },
        comparison: {
          storageId: userIdFromStorage,
          tokenId: userIdFromToken,
          match: String(userIdFromStorage) === String(userIdFromToken)
        }
      });
      
      // Use token ID if available, otherwise fall back to storage ID
      const finalUserId = userIdFromToken || userIdFromStorage;
      setCurrentUserId(finalUserId);
      
    } catch (error) {
      console.error('❌ Error getting current user:', error);
    }
  };

  useEffect(() => {
    getCurrentUser();
    fetchProjects();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProjects();
    });
    return unsubscribe;
  }, [navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    
    // Store current tags before refresh to preserve them
    const currentTags = {};
    projects.forEach(project => {
      if (project.tags && project.tags.length > 0) {
        currentTags[project.id] = project.tags;
      }
    });
    
    await fetchProjects();
    
    // Restore tags after refresh since API doesn't return them
    if (Object.keys(currentTags).length > 0) {
      setProjects(prevProjects => 
        prevProjects.map(project => ({
          ...project,
          tags: currentTags[project.id] || project.tags || []
        }))
      );
    }
    
    setRefreshing(false);
  };

  const handleTagsManagement = (project) => {
    console.log('🔍 Debug Tags Management:', {
      currentUserId,
      projectUserId: project.userId,
      projectCreatedBy: project.createdBy,
      projectCreatorId: project.creatorId,
      projectCreator: project.creator
    });
    
    // Check if current user is the creator of the project
    // Based on API response, the creator is identified by userId field
    // Handle both string and number comparisons
    const isCreator = currentUserId && (
      String(project.userId) === String(currentUserId) || 
      String(project.createdBy) === String(currentUserId) || 
      String(project.creatorId) === String(currentUserId) ||
      String(project.creator) === String(currentUserId)
    );
    
    console.log('🔍 Is Creator:', isCreator);
    
    if (!isCreator) {
      Alert.alert(
        "Permission Denied", 
        "Only the project creator can manage tags.",
        [{ text: "OK" }]
      );
      return;
    }
    
    setSelectedProjectForTags(project);
    setShowTagsModal(true);
  };

  const handleSaveTags = async (projectId, newTags) => {
    try {
      console.log('🏷️ Saving project tags:', { projectId, newTags });
      
      const updatedProject = await updateProjectTags(projectId, newTags);
      console.log('🔄 API returned updated project:', updatedProject);
      
      // Update the local projects state
      setProjects(prevProjects => {
        const newProjects = prevProjects.map(project => {
          const isMatch = project.id === projectId || project.projectId === projectId;
          if (isMatch) {
            console.log('🔄 Updating project in state:', {
              projectId: project.id,
              oldTags: project.tags,
              newTags: newTags
            });
            return { ...project, tags: newTags };
          }
          return project;
        });
        console.log('🔄 Updated projects state:', newProjects.map(p => ({ id: p.id, name: p.projectName, tags: p.tags })));
        return newProjects;
      });
      
      console.log('✅ Project tags saved successfully');
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Failed to save project tags:', error);
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

  // Categorize projects
  const now = new Date();
  let filtered = projects.filter(p =>
    p?.projectName?.toLowerCase().includes(search.toLowerCase())
  );

  // Apply tags filter
  if (filters.tags.length > 0) {
    filtered = filtered.filter(project => 
      project.tags && Array.isArray(project.tags) && 
      filters.tags.some(filterTag => project.tags.includes(filterTag))
    );
  }

  const working = [];
  const completed = [];
  const delayed = [];
  filtered.forEach(p => {
    const end = p.endDate ? new Date(p.endDate) : null;
    if (p.progress >= 100) {
      completed.push(p);
    } else if (end && end < now) {
      delayed.push(p);
    } else {
      working.push(p);
    }
  });

  let tabData = [];
  if (activeTab === 'all') {
    tabData = [...working, ...delayed, ...completed];
  } else if (activeTab === 'working') {
    tabData = working;
  } else if (activeTab === 'delayed') {
    tabData = delayed;
  } else if (activeTab === 'completed') {
    tabData = completed;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: 70 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back-ios" size={16} color={theme.text} />
        <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
      </TouchableOpacity>
      <ProjectBanner onAdd={() => setShowProjectPopup(true)} theme={theme} />
      <ProjectSearchBar value={search} onChange={setSearch} theme={theme} />

      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16, marginBottom: 12, gap: 2, flexWrap: 'wrap', rowGap: 10, maxWidth: "95%" }}>
        {[
          {
            key: 'all',
            label: t('all'),
            count: working.length + delayed.length + completed.length,
            icon: <Feather name="grid" size={13} color={activeTab === 'all' ? "#fff" : theme.primary} style={{ marginRight: 4 }} />
          },
          {
            key: 'working',
            label: t('working'),
            count: working.length,
            icon: <Feather name="play-circle" size={13} color={activeTab === 'working' ? "#fff" : "#039855"} style={{ marginRight: 4 }} />
          },
          {
            key: 'delayed',
            label: t('delayed'),
            count: delayed.length,
            icon: <Feather name="clock" size={13} color={activeTab === 'delayed' ? "#fff" : "#E67514"} style={{ marginRight: 4 }} />
          },
          {
            key: 'completed',
            label: t('completed'),
            count: completed.length,
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
            
            // Debug project tags
            console.log('🔍 Rendering project:', {
              id: item.id,
              name: item.projectName,
              tags: item.tags,
              tagsType: typeof item.tags,
              tagsIsArray: Array.isArray(item.tags)
            });
            
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
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary]} // Android
              tintColor={theme.primary} // iOS
            />
          }
        />
      )}
      <ProjectFabDrawer
        onTaskSubmit={(task) => console.log('🛠️ New Task:', task)}
        onProjectSubmit={(project) => console.log('📁 New Project:', project)}
        theme={theme}
      />
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
