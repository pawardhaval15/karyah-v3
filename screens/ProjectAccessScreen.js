import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fetchUserConnections } from '../utils/issues';
import { getProjectById } from '../utils/project';
import { bulkSetRestrictions, editRestriction, getRestrictionsByProject, removeRestriction, setRestriction } from '../utils/projectAccess';

export default function ProjectAccessScreen({ route, navigation }) {
  const { projectId, projectName } = route.params;
  const theme = useTheme();
  const [restrictions, setRestrictions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditRestriction, setShowEditRestriction] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedModule, setSelectedModule] = useState('discussion');
  const [editingRestriction, setEditingRestriction] = useState(null);
  const [restrictionSettings, setRestrictionSettings] = useState({
    canView: false,
    canReply: false,
    canEdit: false,
  });
  const [activeTab, setActiveTab] = useState('discussion');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all'); // all, owner, co-admin, connection
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listFilterRole, setListFilterRole] = useState('all');
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkRestrictionSettings, setBulkRestrictionSettings] = useState({
    canView: false,
    canReply: false,
    canEdit: false,
  });
  const [bulkSelectedModules, setBulkSelectedModules] = useState(['discussion']);

  const modules = [
    { key: 'discussion', label: 'Discussion', icon: 'message-circle' },
    { key: 'tasks', label: 'Tasks', icon: 'check-square' },
    { key: 'files', label: 'Files', icon: 'folder' },
    { key: 'reports', label: 'Reports', icon: 'bar-chart' },
  ];

  useEffect(() => {
    fetchRestrictions();
    fetchUsers();
  }, [projectId]);

  const fetchRestrictions = async () => {
    try {
      setLoading(true);
      const data = await getRestrictionsByProject(projectId);
      setRestrictions(data || []);
    } catch (error) {
      console.error('Failed to fetch restrictions:', error);
      Alert.alert('Error', 'Failed to load restriction data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');

      // Always try to get project details first to get owner and co-admins
      let projectUsers = [];

      try {
        console.log('Fetching project details...');
        const projectData = await getProjectById(projectId);
        console.log('Complete project data:', JSON.stringify(projectData, null, 2));

        // Add project owner - using creator fields from API response
        if (projectData?.userId && projectData?.creatorName) {
          console.log('Found project creator:', {
            id: projectData.userId,
            name: projectData.creatorName,
            email: projectData.creatorEmail,
          });
          const owner = {
            id: projectData.userId,
            name: projectData.creatorName,
            email: projectData.creatorEmail,
            designation: 'Owner',
            role: 'owner',
          };
          projectUsers.push(owner);
        }

        // Add co-admins - they should be in coAdmins array with user details
        if (projectData?.coAdmins && projectData.coAdmins.length > 0) {
          console.log('Found co-admins:', projectData.coAdmins);
          const coAdminUsers = projectData.coAdmins
            .filter((admin) => admin && (admin.id || admin.userId) && admin.name)
            .map((admin) => ({
              id: admin.id || admin.userId,
              name: admin.name,
              email: admin.email,
              profilePhoto: admin.profilePhoto,
              designation: 'Co-Admin',
              role: 'co-admin',
            }));
          projectUsers.push(...coAdminUsers);
        }

        console.log('Project users found:', projectUsers);
      } catch (error) {
        console.log('Failed to get project details:', error);
      }

      // Also try to get connections
      try {
        const connections = await fetchUserConnections();
        console.log('Raw connections:', connections);
        console.log('Connections length:', connections?.length);

        // Add connections with proper structure
        const validConnections = (connections || [])
          .filter((user) => user && user.id && user.name)
          .map((user) => ({
            ...user,
            id: user.id,
            name: user.name,
            email: user.email,
            designation: 'Connection',
            role: 'connection',
          }));

        console.log('Valid connections:', validConnections);
        projectUsers.push(...validConnections);
      } catch (error) {
        console.log('Failed to get connections:', error);
      }

      // Remove duplicates based on user ID
      const uniqueUsers = projectUsers.filter(
        (user, index, self) => index === self.findIndex((u) => u.id === user.id)
      );

      console.log('Final unique users:', uniqueUsers);
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const handleSetRestriction = async () => {
    if (!selectedUser || !selectedModule) {
      Alert.alert('Error', 'Please select a user and module');
      return;
    }

    try {
      const restrictionData = {
        userId: selectedUser.id,
        module: selectedModule,
        ...restrictionSettings,
      };

      await setRestriction(projectId, restrictionData);
      await fetchRestrictions();
      setShowAddUser(false);
      resetForm();
      Alert.alert('Success', 'Restriction applied successfully');
    } catch (error) {
      console.error('Failed to set restriction:', error);
      Alert.alert('Error', 'Failed to apply restriction');
    }
  };

  const handleBulkAssign = async () => {
    if (selectedUsers.length === 0 || bulkSelectedModules.length === 0) {
      Alert.alert('Error', 'Please select at least one user and one module');
      return;
    }

    try {
      const restrictionList = [];

      selectedUsers.forEach((user) => {
        bulkSelectedModules.forEach((module) => {
          restrictionList.push({
            userId: user.id,
            module: module,
            ...bulkRestrictionSettings,
          });
        });
      });

      await bulkSetRestrictions(projectId, restrictionList);
      await fetchRestrictions();
      setShowBulkAssign(false);
      resetBulkForm();
      Alert.alert(
        'Success',
        `Restrictions applied to ${selectedUsers.length} user(s) for ${bulkSelectedModules.length} module(s)`
      );
    } catch (error) {
      console.error('Failed to bulk assign restrictions:', error);
      Alert.alert('Error', 'Failed to assign restrictions');
    }
  };

  const handleEditRestriction = async () => {
    if (!editingRestriction) return;

    try {
      const updateData = {
        userId: editingRestriction.userId,
        module: editingRestriction.module,
        canView: restrictionSettings.canView,
        canReply: restrictionSettings.canReply,
        canEdit: restrictionSettings.canEdit,
      };
      // Use the utils function for API call
      await editRestriction(projectId, editingRestriction.userId, updateData);
      Alert.alert('Success', 'Restriction updated successfully');
      fetchRestrictions();
      resetEditForm();
    } catch (error) {
      console.error('Failed to update restriction:', error);
      Alert.alert('Error', 'Failed to update restriction. Please try again.');
    }
  };

  const handleRemoveRestriction = async (userId, module) => {
    Alert.alert('Remove Restriction', 'Are you sure you want to remove this restriction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeRestriction(projectId, { userId, module });
            await fetchRestrictions();
            Alert.alert('Success', 'Restriction removed successfully');
          } catch (error) {
            console.error('Failed to remove restriction:', error);
            Alert.alert('Error', 'Failed to remove restriction');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setSelectedModule(activeTab);
    setRestrictionSettings({
      canView: false,
      canReply: false,
      canEdit: false,
    });
    setSearchQuery('');
    setSelectedRole('all');
  };

  const resetEditForm = () => {
    setEditingRestriction(null);
    setRestrictionSettings({
      canView: false,
      canReply: false,
      canEdit: false,
    });
    setShowEditRestriction(false);
  };

  const handleEditClick = (restriction) => {
    // Attach user object for modal display
    const userObj = users.find((u) => u.id === restriction.userId);
    console.log('Edit restriction clicked:', restriction);
    setEditingRestriction({
      ...restriction,
      user: userObj || { name: 'Unknown User', email: '' }
    });
    setRestrictionSettings({
      canView: restriction.canView,
      canReply: restriction.canReply,
      canEdit: restriction.canEdit,
    });
    console.log('Set restrictionSettings:', {
      canView: restriction.canView,
      canReply: restriction.canReply,
      canEdit: restriction.canEdit,
    });
    setShowEditRestriction(true);
  };

  const resetBulkForm = () => {
    setSelectedUsers([]);
    setBulkSelectedModules(['discussion']);
    setBulkRestrictionSettings({
      canView: false,
      canReply: false,
      canEdit: false,
    });
    setSearchQuery('');
    setSelectedRole('all');
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const selectAllUsers = () => {
    const filteredUsers = getFilteredUsers();
    setSelectedUsers(filteredUsers);
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
  };

  const toggleSelectAll = () => {
    const filteredUsers = getFilteredUsers();
    const allSelected =
      filteredUsers.length > 0 &&
      filteredUsers.every((user) => selectedUsers.some((selected) => selected.id === user.id));

    if (allSelected) {
      // Remove all filtered users from selection
      setSelectedUsers((prev) =>
        prev.filter((selected) => !filteredUsers.some((filtered) => filtered.id === selected.id))
      );
    } else {
      // Add all filtered users to selection (avoid duplicates)
      setSelectedUsers((prev) => {
        const existingIds = prev.map((u) => u.id);
        const newUsers = filteredUsers.filter((user) => !existingIds.includes(user.id));
        return [...prev, ...newUsers];
      });
    }
  };

  const toggleModuleSelection = (moduleKey) => {
    setBulkSelectedModules((prev) => {
      const isSelected = prev.includes(moduleKey);
      if (isSelected) {
        return prev.filter((m) => m !== moduleKey);
      } else {
        return [...prev, moduleKey];
      }
    });
  };

  const getFilteredUsers = () => {
    let filteredUsers = users;

    // Filter by search query
    if (searchQuery.trim()) {
      filteredUsers = filteredUsers.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (selectedRole !== 'all') {
      filteredUsers = filteredUsers.filter((user) => {
        if (selectedRole === 'owner') return user.role === 'owner';
        if (selectedRole === 'co-admin') return user.role === 'co-admin';
        if (selectedRole === 'connection') return user.role === 'connection';
        return true;
      });
    }

    return filteredUsers;
  };

  const getFilteredRestrictions = () => {
    let filteredRestrictions = restrictions.filter((restriction) => restriction.module === activeTab);

    // Filter by search query
    if (listSearchQuery.trim()) {
      filteredRestrictions = filteredRestrictions.filter(
        (restriction) =>
          restriction.User?.name?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
          restriction.User?.email?.toLowerCase().includes(listSearchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (listFilterRole !== 'all') {
      filteredRestrictions = filteredRestrictions.filter((restriction) => {
        const user = users.find((u) => u.id === restriction.userId);
        if (listFilterRole === 'owner') return user?.role === 'owner';
        if (listFilterRole === 'co-admin') return user?.role === 'co-admin';
        if (listFilterRole === 'connection') return user?.role === 'connection';
        return true;
      });
    }

    return filteredRestrictions;
  };

  const groupedRestrictions = getFilteredRestrictions().reduce((groups, restriction) => {
    if (!restriction || !restriction.userId) return groups;

    const key = `${restriction.userId}-${restriction.User?.name || 'Unknown'}`;
    if (!groups[key]) {
      groups[key] = {
        user: restriction.User,
        modules: [],
      };
    }
    groups[key].modules.push(restriction);
    return groups;
  }, {});

  const renderRestrictionItem = ({ item }) => {
    const [userId, userName] = item[0].split('-');
    const restrictionData = item[1];

    // Find user role
    const user = users.find((u) => u.id === parseInt(userId));
    const userRole = user?.role || 'unknown';
    const roleColors = {
      owner: '#FF6B35',
      'co-admin': '#4ECDC4',
      connection: '#45B7D1',
      unknown: '#95A5A6',
    };

    return (
      <View style={[styles.accessItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {restrictionData.user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: theme.text }]}>
                {restrictionData.user?.name || 'Unknown User'}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: roleColors[userRole] }]}>
                <Text style={styles.roleBadgeText}>
                  {userRole === 'co-admin' ? 'Admin' : userRole?.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.userEmail, { color: theme.secondaryText }]}>
              {restrictionData.user?.email || ''}
            </Text>
          </View>
        </View>

        <View style={styles.modulesContainer}>
          {restrictionData.modules.map((moduleRestriction, index) => (
            <View key={index} style={styles.moduleItem}>
              <View style={styles.moduleInfo}>
                <Text style={[styles.moduleName, { color: theme.text }]}>
                  {modules.find((m) => m.key === moduleRestriction.module)?.label || moduleRestriction.module}
                </Text>

                <View style={styles.permissionsList}>
                  {moduleRestriction.canView && (
                    <View
                      style={[
                        styles.permissionBox,
                        { borderColor: theme.danger, backgroundColor: theme.card },
                      ]}>
                      <Text style={[styles.permission, { color: theme.danger }]}>Can't View</Text>
                    </View>
                  )}
                  {moduleRestriction.canReply && (
                    <View
                      style={[
                        styles.permissionBox,
                        { borderColor: theme.danger, backgroundColor: theme.card },
                      ]}>
                      <Text style={[styles.permission, { color: theme.danger }]}>Can't Reply</Text>
                    </View>
                  )}
                  {moduleRestriction.canEdit && (
                    <View
                      style={[
                        styles.permissionBox,
                        { borderColor: theme.danger, backgroundColor: theme.card },
                      ]}>
                      <Text style={[styles.permission, { color: theme.danger }]}>Can't Edit</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => handleEditClick(moduleRestriction)}
                  style={[styles.removeButton, { marginRight: 8 }]}>
                  <MaterialIcons name="edit" size={20} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRemoveRestriction(moduleRestriction.userId, moduleRestriction.module)}
                  style={styles.removeButton}>
                  <MaterialIcons name="delete-outline" size={20} color={theme.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Project Settings</Text>
          <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>{projectName}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => setShowBulkAssign(true)}
            style={[styles.bulkButton, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="group-add" size={18} color={theme.text} />
            <Text style={[styles.bulkButtonText, { color: theme.text }]}>Multi Restrict</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setSelectedModule(activeTab);
              setShowAddUser(true);
            }}
            style={[styles.addButton, { backgroundColor: theme.primary }]}>
            <MaterialIcons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Module Tabs */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContainer}>
          {modules.map((module) => (
            <TouchableOpacity
              key={module.key}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === module.key ? theme.primary : 'transparent',
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setActiveTab(module.key)}>
              <Feather
                name={module.icon}
                size={16}
                color={activeTab === module.key ? '#fff' : theme.text}
                style={styles.tabIcon}
              />
              <Text
                style={[styles.tabText, { color: activeTab === module.key ? '#fff' : theme.text }]}>
                {module.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search and Filter Bar */}
      <View
        style={[
          styles.searchFilterBar,
          { backgroundColor: theme.background, borderBottomColor: theme.border },
        ]}>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          <MaterialIcons name="search" size={20} color={theme.secondaryText} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search users..."
            placeholderTextColor={theme.secondaryText}
            value={listSearchQuery}
            onChangeText={setListSearchQuery}
          />
          {listSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setListSearchQuery('')}>
              <MaterialIcons name="clear" size={20} color={theme.secondaryText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Role Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}>
          {[
            { key: 'all', label: 'All', count: getFilteredRestrictions().length },
            {
              key: 'owner',
              label: 'Owner',
              count: getFilteredRestrictions().filter(
                (restriction) => users.find((u) => u.id === restriction.userId)?.role === 'owner'
              ).length,
            },
            {
              key: 'co-admin',
              label: 'Co-Admin',
              count: getFilteredRestrictions().filter(
                (restriction) => users.find((u) => u.id === restriction.userId)?.role === 'co-admin'
              ).length,
            },
            {
              key: 'connection',
              label: 'Connections',
              count: getFilteredRestrictions().filter(
                (restriction) => users.find((u) => u.id === restriction.userId)?.role === 'connection'
              ).length,
            },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: listFilterRole === filter.key ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setListFilterRole(filter.key)}>
              <Text
                style={[
                  styles.filterChipText,
                  { color: listFilterRole === filter.key ? '#fff' : theme.text },
                ]}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            Loading restriction data...
          </Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(groupedRestrictions)}
          renderItem={renderRestrictionItem}
          keyExtractor={(item) => item[0]}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather
                name={modules.find((m) => m.key === activeTab)?.icon || 'settings'}
                size={48}
                color={theme.secondaryText}
              />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {listSearchQuery || listFilterRole !== 'all'
                  ? 'No matching results found'
                  : `No ${modules.find((m) => m.key === activeTab)?.label} Restrictions Applied`}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                {listSearchQuery || listFilterRole !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : `Apply restrictions to control user access to ${modules.find((m) => m.key === activeTab)?.label.toLowerCase()}`}
              </Text>
              {(listSearchQuery || listFilterRole !== 'all') && (
                <TouchableOpacity
                  style={[styles.clearFiltersButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setListSearchQuery('');
                    setListFilterRole('all');
                  }}>
                  <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
              {activeTab === 'discussion' && !listSearchQuery && listFilterRole === 'all' && (
                <TouchableOpacity
                  style={[styles.quickAddButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setSelectedModule('discussion');
                    setShowAddUser(true);
                  }}>
                  <Text style={styles.quickAddButtonText}>Add Discussion Restrictions</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Add User Modal */}
      <Modal
        visible={showAddUser}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddUser(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add {modules.find((m) => m.key === selectedModule)?.label} Restrictions
              </Text>
              <TouchableOpacity onPress={() => setShowAddUser(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Current Module Display */}
            <View
              style={[
                styles.currentModuleContainer,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}>
              <Feather
                name={modules.find((m) => m.key === selectedModule)?.icon || 'settings'}
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.currentModuleText, { color: theme.text }]}>
                {modules.find((m) => m.key === selectedModule)?.label} Restrictions
              </Text>
            </View>

            {/* User Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Select User</Text>

              {users.length === 0 ? (
                <View
                  style={[
                    styles.noUsersContainer,
                    { backgroundColor: theme.background, borderColor: theme.border },
                  ]}>
                  <MaterialIcons name="people-outline" size={24} color={theme.secondaryText} />
                  <Text style={[styles.noUsersText, { color: theme.secondaryText }]}>
                    No users found. Make sure you have connections.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Search and Filter */}
                  <View style={styles.searchFilterContainer}>
                    <View
                      style={[
                        styles.searchContainer,
                        { backgroundColor: theme.background, borderColor: theme.border },
                      ]}>
                      <MaterialIcons name="search" size={20} color={theme.secondaryText} />
                      <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search users..."
                        placeholderTextColor={theme.secondaryText}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                          <MaterialIcons name="clear" size={20} color={theme.secondaryText} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Role Filter */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filterContainer}>
                      {[
                        { key: 'all', label: 'All' },
                        { key: 'owner', label: 'Owner' },
                        { key: 'co-admin', label: 'Co-Admin' },
                        { key: 'connection', label: 'Connections' },
                      ].map((filter) => (
                        <TouchableOpacity
                          key={filter.key}
                          style={[
                            styles.filterChip,
                            {
                              backgroundColor:
                                selectedRole === filter.key ? theme.primary : theme.background,
                              borderColor: theme.border,
                            },
                          ]}
                          onPress={() => setSelectedRole(filter.key)}>
                          <Text
                            style={[
                              styles.filterChipText,
                              { color: selectedRole === filter.key ? '#fff' : theme.text },
                            ]}>
                            {filter.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* User List */}
                  <FlatList
                    data={getFilteredUsers()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.userChip,
                          {
                            backgroundColor:
                              selectedUser?.id === item.id ? theme.primary : theme.background,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => setSelectedUser(item)}>
                        <View style={styles.userChipContent}>
                          <Text
                            style={[
                              styles.userChipText,
                              { color: selectedUser?.id === item.id ? '#fff' : theme.text },
                            ]}>
                            {item.name}
                          </Text>
                          {item.designation && (
                            <Text
                              style={[
                                styles.userChipDesignation,
                                {
                                  color:
                                    selectedUser?.id === item.id
                                      ? 'rgba(255,255,255,0.8)'
                                      : theme.secondaryText,
                                },
                              ]}>
                              {item.designation}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) =>
                      item.id ? item.id.toString() : Math.random().toString()
                    }
                    ListEmptyComponent={
                      <View
                        style={[
                          styles.noFilterResultsContainer,
                          { backgroundColor: theme.background, borderColor: theme.border },
                        ]}>
                        <MaterialIcons
                          name="filter-list-off"
                          size={24}
                          color={theme.secondaryText}
                        />
                        <Text style={[styles.noFilterResultsText, { color: theme.secondaryText }]}>
                          No users match your filters
                        </Text>
                      </View>
                    }
                  />
                </>
              )}
            </View>

            {/* Module Selection - Removed since we're using tabs */}

            {/* Restrictions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Restrictions for {modules.find((m) => m.key === selectedModule)?.label}
              </Text>
              {selectedModule === 'discussion' && (
                <Text style={[styles.sectionDescription, { color: theme.secondaryText }]}>
                  Configure what this user cannot do in project discussions
                </Text>
              )}
              {Object.entries(restrictionSettings).map(([key, value]) => (
                <View key={key} style={styles.permissionRow}>
                  <View style={styles.permissionInfo}>
                    <Text style={[styles.permissionLabel, { color: theme.text }]}>
                      {key === 'canView'
                        ? 'Block Viewing Messages'
                        : key === 'canReply'
                          ? 'Block Sending Messages'
                          : 'Block Managing Discussion'}
                    </Text>
                    {selectedModule === 'discussion' && (
                      <Text style={[styles.permissionDescription, { color: theme.secondaryText }]}>
                        {key === 'canView'
                          ? 'User cannot see discussion messages'
                          : key === 'canReply'
                            ? 'User cannot post messages and replies'
                            : 'User cannot pin messages and moderate discussion'}
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={value}
                    onValueChange={(newValue) =>
                      setRestrictionSettings((prev) => ({ ...prev, [key]: newValue }))
                    }
                    trackColor={{ false: theme.border, true: theme.danger }}
                    thumbColor={value ? '#fff' : theme.secondaryText}
                  />
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowAddUser(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSetRestriction}>
                <Text style={styles.saveButtonText}>Apply Restrictions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Restriction Modal */}
      <Modal
        visible={showEditRestriction}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditRestriction(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit {modules.find((m) => m.key === editingRestriction?.module)?.label} Restrictions
              </Text>
              <TouchableOpacity onPress={() => setShowEditRestriction(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {editingRestriction && (
              <>
                {/* User Info */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>User</Text>
                  <View style={[styles.userChip, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <View style={styles.userChipContent}>
                      <Text style={[styles.userChipText, { color: theme.text }]}>
                        {editingRestriction.user?.name || 'Unknown User'}
                      </Text>
                      <Text style={[styles.userChipDesignation, { color: theme.secondaryText }]}>
                        {editingRestriction.user?.email || ''}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Module Info */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Module</Text>
                  <View style={[styles.moduleChip, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                    <Text style={[styles.moduleChipText, { color: '#fff' }]}>
                      {modules.find((m) => m.key === editingRestriction.module)?.label}
                    </Text>
                  </View>
                </View>

                {/* Restriction Settings */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Restriction Settings</Text>
                  <Text style={[styles.sectionDescription, { color: theme.secondaryText }]}>
                    Select which actions to restrict for this user in the {modules.find((m) => m.key === editingRestriction.module)?.label.toLowerCase()} module
                  </Text>

                  <View style={styles.permissionRow}>
                    <View style={styles.permissionInfo}>
                      <Text style={[styles.permissionLabel, { color: theme.text }]}>Can't View</Text>
                      <Text style={[styles.permissionDescription, { color: theme.secondaryText }]}>
                        User cannot see content in this module
                      </Text>
                    </View>
                    <Switch
                      value={restrictionSettings.canView}
                      onValueChange={(value) => setRestrictionSettings(prev => ({ ...prev, canView: value }))}
                      trackColor={{ false: theme.border, true: theme.primary }}
                    />
                  </View>

                  <View style={styles.permissionRow}>
                    <View style={styles.permissionInfo}>
                      <Text style={[styles.permissionLabel, { color: theme.text }]}>Can't Reply</Text>
                      <Text style={[styles.permissionDescription, { color: theme.secondaryText }]}>
                        User cannot post new content or replies
                      </Text>
                    </View>
                    <Switch
                      value={restrictionSettings.canReply}
                      onValueChange={(value) => setRestrictionSettings(prev => ({ ...prev, canReply: value }))}
                      trackColor={{ false: theme.border, true: theme.primary }}
                    />
                  </View>

                  <View style={styles.permissionRow}>
                    <View style={styles.permissionInfo}>
                      <Text style={[styles.permissionLabel, { color: theme.text }]}>Can't Edit</Text>
                      <Text style={[styles.permissionDescription, { color: theme.secondaryText }]}>
                        User cannot modify or manage content
                      </Text>
                    </View>
                    <Switch
                      value={restrictionSettings.canEdit}
                      onValueChange={(value) => setRestrictionSettings(prev => ({ ...prev, canEdit: value }))}
                      trackColor={{ false: theme.border, true: theme.primary }}
                    />
                  </View>
                </View>
              </>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowEditRestriction(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleEditRestriction}>
                <Text style={styles.saveButtonText}>Update Restrictions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bulk Assign Modal */}
      <Modal
        visible={showBulkAssign}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBulkAssign(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Multi User Restriction Assignment
              </Text>
              <TouchableOpacity onPress={() => setShowBulkAssign(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Selected Users/Modules Summary */}
            <View
              style={[
                styles.selectionSummary,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}>
              <Text style={[styles.summaryText, { color: theme.text }]}>
                {selectedUsers.length} user(s) selected • {bulkSelectedModules.length} module(s)
                selected
              </Text>
              {selectedUsers.length > 0 && (
                <View style={styles.selectionBreakdown}>
                  <Text style={[styles.breakdownText, { color: theme.secondaryText }]}>
                    {selectedUsers.filter((u) => u.role === 'owner').length} Owner •{' '}
                    {selectedUsers.filter((u) => u.role === 'co-admin').length} Co-Admin •{' '}
                    {selectedUsers.filter((u) => u.role === 'connection').length} Connections
                  </Text>
                </View>
              )}
            </View>

            <ScrollView style={styles.bulkModalContent} showsVerticalScrollIndicator={false}>
              {/* User Selection */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Users</Text>
                  <View style={styles.selectAllContainer}>
                    <TouchableOpacity
                      style={[styles.selectAllButton, { backgroundColor: theme.primary }]}
                      onPress={toggleSelectAll}>
                      <MaterialIcons
                        name={
                          getFilteredUsers().length > 0 &&
                          getFilteredUsers().every((user) =>
                            selectedUsers.some((selected) => selected.id === user.id)
                          )
                            ? 'check-box'
                            : 'check-box-outline-blank'
                        }
                        size={16}
                        color="#fff"
                      />
                      <Text style={styles.selectAllText}>
                        {getFilteredUsers().length > 0 &&
                        getFilteredUsers().every((user) =>
                          selectedUsers.some((selected) => selected.id === user.id)
                        )
                          ? 'Deselect All'
                          : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                    {selectedUsers.length > 0 && (
                      <TouchableOpacity
                        style={[styles.clearSelectionButton, { borderColor: theme.border }]}
                        onPress={deselectAllUsers}>
                        <Text style={[styles.clearSelectionText, { color: theme.text }]}>
                          Clear ({selectedUsers.length})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {users.length === 0 ? (
                  <View
                    style={[
                      styles.noUsersContainer,
                      { backgroundColor: theme.background, borderColor: theme.border },
                    ]}>
                    <MaterialIcons name="people-outline" size={24} color={theme.secondaryText} />
                    <Text style={[styles.noUsersText, { color: theme.secondaryText }]}>
                      No users found. Make sure you have connections.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Search and Filter */}
                    <View style={styles.searchFilterContainer}>
                      <View
                        style={[
                          styles.searchContainer,
                          { backgroundColor: theme.background, borderColor: theme.border },
                        ]}>
                        <MaterialIcons name="search" size={20} color={theme.secondaryText} />
                        <TextInput
                          style={[styles.searchInput, { color: theme.text }]}
                          placeholder="Search users..."
                          placeholderTextColor={theme.secondaryText}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                          <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <MaterialIcons name="clear" size={20} color={theme.secondaryText} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Quick Selection Actions */}
                      <View style={styles.quickActionsContainer}>
                        <Text style={[styles.quickActionsLabel, { color: theme.secondaryText }]}>
                          Quick Select:
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <TouchableOpacity
                            style={[
                              styles.quickActionButton,
                              { backgroundColor: theme.card, borderColor: theme.border },
                            ]}
                            onPress={() => {
                              const owners = users.filter((u) => u.role === 'owner');
                              setSelectedUsers((prev) => {
                                const existingIds = prev.map((u) => u.id);
                                const newUsers = owners.filter(
                                  (user) => !existingIds.includes(user.id)
                                );
                                return [...prev, ...newUsers];
                              });
                            }}>
                            <Text style={[styles.quickActionText, { color: theme.text }]}>
                              + Owners ({users.filter((u) => u.role === 'owner').length})
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.quickActionButton,
                              { backgroundColor: theme.card, borderColor: theme.border },
                            ]}
                            onPress={() => {
                              const coAdmins = users.filter((u) => u.role === 'co-admin');
                              setSelectedUsers((prev) => {
                                const existingIds = prev.map((u) => u.id);
                                const newUsers = coAdmins.filter(
                                  (user) => !existingIds.includes(user.id)
                                );
                                return [...prev, ...newUsers];
                              });
                            }}>
                            <Text style={[styles.quickActionText, { color: theme.text }]}>
                              + Co-Admins ({users.filter((u) => u.role === 'co-admin').length})
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.quickActionButton,
                              { backgroundColor: theme.card, borderColor: theme.border },
                            ]}
                            onPress={() => {
                              const connections = users.filter((u) => u.role === 'connection');
                              setSelectedUsers((prev) => {
                                const existingIds = prev.map((u) => u.id);
                                const newUsers = connections.filter(
                                  (user) => !existingIds.includes(user.id)
                                );
                                return [...prev, ...newUsers];
                              });
                            }}>
                            <Text style={[styles.quickActionText, { color: theme.text }]}>
                              + Connections ({users.filter((u) => u.role === 'connection').length})
                            </Text>
                          </TouchableOpacity>
                        </ScrollView>
                      </View>

                      {/* Role Filter */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.filterContainer}>
                        {[
                          { key: 'all', label: 'All', count: users.length },
                          {
                            key: 'owner',
                            label: 'Owner',
                            count: users.filter((u) => u.role === 'owner').length,
                          },
                          {
                            key: 'co-admin',
                            label: 'Co-Admin',
                            count: users.filter((u) => u.role === 'co-admin').length,
                          },
                          {
                            key: 'connection',
                            label: 'Connections',
                            count: users.filter((u) => u.role === 'connection').length,
                          },
                        ].map((filter) => (
                          <TouchableOpacity
                            key={filter.key}
                            style={[
                              styles.filterChip,
                              {
                                backgroundColor:
                                  selectedRole === filter.key ? theme.primary : theme.background,
                                borderColor: theme.border,
                              },
                            ]}
                            onPress={() => setSelectedRole(filter.key)}>
                            <Text
                              style={[
                                styles.filterChipText,
                                { color: selectedRole === filter.key ? '#fff' : theme.text },
                              ]}>
                              {filter.label} ({filter.count})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    {/* User List */}
                    <View style={styles.userList}>
                      {getFilteredUsers().map((user) => {
                        const isSelected = selectedUsers.some((u) => u.id === user.id);
                        return (
                          <TouchableOpacity
                            key={user.id}
                            style={[
                              styles.userListItem,
                              {
                                backgroundColor: isSelected ? theme.primary : theme.background,
                                borderColor: isSelected ? theme.primary : theme.border,
                              },
                            ]}
                            onPress={() => toggleUserSelection(user)}>
                            <View style={styles.userListContent}>
                              <View style={styles.userListLeft}>
                                <View
                                  style={[
                                    styles.userListAvatar,
                                    { backgroundColor: isSelected ? '#fff' : theme.primary },
                                  ]}>
                                  <Text
                                    style={[
                                      styles.userListAvatarText,
                                      { color: isSelected ? theme.primary : '#fff' },
                                    ]}>
                                    {user.name?.charAt(0).toUpperCase() || 'U'}
                                  </Text>
                                </View>
                                <View style={styles.userListInfo}>
                                  <Text
                                    style={[
                                      styles.userListName,
                                      { color: isSelected ? '#fff' : theme.text },
                                    ]}
                                    numberOfLines={1}>
                                    {user.name}
                                  </Text>
                                  {user.designation && (
                                    <Text
                                      style={[
                                        styles.userListDesignation,
                                        {
                                          color: isSelected
                                            ? 'rgba(255,255,255,0.8)'
                                            : theme.secondaryText,
                                        },
                                      ]}>
                                      {user.designation}
                                    </Text>
                                  )}
                                  {user.email && (
                                    <Text
                                      style={[
                                        styles.userListEmail,
                                        {
                                          color: isSelected
                                            ? 'rgba(255,255,255,0.7)'
                                            : theme.secondaryText,
                                        },
                                      ]}
                                      numberOfLines={1}>
                                      {user.email}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View style={styles.userListRight}>
                                {isSelected && (
                                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {getFilteredUsers().length === 0 && (
                      <View
                        style={[
                          styles.noFilterResultsContainer,
                          { backgroundColor: theme.background, borderColor: theme.border },
                        ]}>
                        <MaterialIcons
                          name="filter-list-off"
                          size={24}
                          color={theme.secondaryText}
                        />
                        <Text style={[styles.noFilterResultsText, { color: theme.secondaryText }]}>
                          No users match your filters
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* Module Selection */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Modules</Text>
                <Text style={[styles.sectionDescription, { color: theme.secondaryText }]}>
                  Choose which modules users will have access to
                </Text>
                <View style={styles.moduleSelectionGrid}>
                  {modules.map((module) => {
                    const isSelected = bulkSelectedModules.includes(module.key);
                    return (
                      <TouchableOpacity
                        key={module.key}
                        style={[
                          styles.moduleSelectionItem,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.background,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => toggleModuleSelection(module.key)}>
                        <View style={styles.moduleSelectionContent}>
                          <Feather
                            name={module.icon}
                            size={20}
                            color={isSelected ? '#fff' : theme.text}
                          />
                          <Text
                            style={[
                              styles.moduleSelectionText,
                              { color: isSelected ? '#fff' : theme.text },
                            ]}>
                            {module.label}
                          </Text>
                          {isSelected && (
                            <MaterialIcons
                              name="check-circle"
                              size={16}
                              color="#fff"
                              style={styles.moduleCheckIcon}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bulk Restrictions */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Restrictions for Selected Modules
                </Text>
                <Text style={[styles.sectionDescription, { color: theme.secondaryText }]}>
                  These restrictions will be applied to all selected users for all selected modules
                </Text>
                {Object.entries(bulkRestrictionSettings).map(([key, value]) => (
                  <View key={key} style={styles.permissionRow}>
                    <View style={styles.permissionInfo}>
                      <Text style={[styles.permissionLabel, { color: theme.text }]}>
                        {key === 'canView'
                          ? 'Block View Access'
                          : key === 'canReply'
                            ? 'Block Reply/Participate'
                            : 'Block Edit/Manage'}
                      </Text>
                      <Text style={[styles.permissionDescription, { color: theme.secondaryText }]}>
                        {key === 'canView'
                          ? 'User cannot view content in selected modules'
                          : key === 'canReply'
                            ? 'User cannot contribute and reply in selected modules'
                            : 'User cannot edit and manage content in selected modules'}
                      </Text>
                    </View>
                    <Switch
                      value={value}
                      onValueChange={(newValue) =>
                        setBulkRestrictionSettings((prev) => ({ ...prev, [key]: newValue }))
                      }
                      trackColor={{ false: theme.border, true: theme.danger }}
                      thumbColor={value ? '#fff' : theme.secondaryText}
                    />
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowBulkAssign(false)}>
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      selectedUsers.length > 0 && bulkSelectedModules.length > 0
                        ? theme.primary
                        : theme.border,
                  },
                ]}
                onPress={handleBulkAssign}
                disabled={selectedUsers.length === 0 || bulkSelectedModules.length === 0}>
                <Text style={styles.saveButtonText}>
                  Apply Restrictions ({selectedUsers.length}×{bulkSelectedModules.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  bulkButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  tabScrollContainer: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickAddButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  quickAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearFiltersButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchFilterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  currentModuleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
  },
  currentModuleText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionDescription: {
    fontSize: 11,
    marginTop: 1,
    lineHeight: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  accessItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  modulesContainer: {
    marginLeft: 52,
  },
  moduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '500',
  },
  permissionsContainer: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  permissionsList: {
    flexDirection: 'row',
    paddingTop: 4,
  },
  permissionBox: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permission: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  selectAllText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  clearSelectionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearSelectionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  quickActionsContainer: {
    marginBottom: 8,
  },
  quickActionsLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 6,
  },
  quickActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
  },
  quickActionText: {
    fontSize: 10,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  searchFilterContainer: {
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 4,
  },
  filterContainer: {
    marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noFilterResultsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  noFilterResultsText: {
    fontSize: 14,
    marginLeft: 8,
    textAlign: 'center',
  },
  userChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 100,
  },
  userChipContent: {
    alignItems: 'center',
  },
  userChipText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  userChipDesignation: {
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
  noUsersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noUsersText: {
    fontSize: 14,
    marginLeft: 8,
    textAlign: 'center',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  moduleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  moduleChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionSummary: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectionBreakdown: {
    marginTop: 4,
  },
  breakdownText: {
    fontSize: 11,
    textAlign: 'center',
  },
  bulkModalContent: {
    maxHeight: 450,
    paddingHorizontal: 2,
  },
  userList: {
    marginTop: 6,
  },
  userListItem: {
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 8,
    padding: 12,
  },
  userListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userListAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userListAvatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  userListInfo: {
    flex: 1,
  },
  userListName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  userListDesignation: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 1,
  },
  userListEmail: {
    fontSize: 10,
    fontWeight: '400',
  },
  userListRight: {
    marginLeft: 12,
  },
  userGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  userGridItem: {
    width: '31%',
    marginBottom: 8,
    padding: 8,
    borderRadius: 10,
    borderWidth: 2,
    minHeight: 60,
  },
  userGridContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  userGridText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  userGridDesignation: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  selectionIcon: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  moduleGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  moduleGridIcon: {
    marginRight: 8,
  },
  moduleGridText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  moduleSelectionIcon: {
    marginLeft: 8,
  },
  moduleSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleSelectionItem: {
    width: '48%',
    borderRadius: 10,
    borderWidth: 2,
    marginBottom: 8,
    padding: 10,
    minHeight: 60,
  },
  moduleSelectionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  moduleSelectionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  moduleCheckIcon: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
});
