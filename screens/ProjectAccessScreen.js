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
  View
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fetchUserConnections } from '../utils/issues';
import { getProjectById } from '../utils/project';
import { getAccessByProject, removeAccess, setAccess } from '../utils/projectAccess';

export default function ProjectAccessScreen({ route, navigation }) {
  const { projectId, projectName } = route.params;
  const theme = useTheme();
  const [accesses, setAccesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedModule, setSelectedModule] = useState('discussion');
  const [permissions, setPermissions] = useState({
    canView: true,
    canReply: false,
    canEdit: false,
  });
  const [activeTab, setActiveTab] = useState('discussion');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all'); // all, owner, co-admin, connection
  const [listSearchQuery, setListSearchQuery] = useState('');
  const [listFilterRole, setListFilterRole] = useState('all');

  const modules = [
    { key: 'discussion', label: 'Discussion', icon: 'message-circle' },
    { key: 'tasks', label: 'Tasks', icon: 'check-square' },
    { key: 'files', label: 'Files', icon: 'folder' },
    { key: 'reports', label: 'Reports', icon: 'bar-chart' },
  ];

  useEffect(() => {
    fetchAccesses();
    fetchUsers();
  }, [projectId]);

  const fetchAccesses = async () => {
    try {
      setLoading(true);
      const data = await getAccessByProject(projectId);
      setAccesses(data || []);
    } catch (error) {
      console.error('Failed to fetch accesses:', error);
      Alert.alert('Error', 'Failed to load access data');
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
            email: projectData.creatorEmail
          });
          const owner = {
            id: projectData.userId,
            name: projectData.creatorName,
            email: projectData.creatorEmail,
            designation: 'Owner',
            role: 'owner'
          };
          projectUsers.push(owner);
        }
        
        // Add co-admins - they should be in coAdmins array with user details
        if (projectData?.coAdmins && projectData.coAdmins.length > 0) {
          console.log('Found co-admins:', projectData.coAdmins);
          const coAdminUsers = projectData.coAdmins
            .filter(admin => admin && (admin.id || admin.userId) && admin.name)
            .map(admin => ({
              id: admin.id || admin.userId,
              name: admin.name,
              email: admin.email,
              profilePhoto: admin.profilePhoto,
              designation: 'Co-Admin',
              role: 'co-admin'
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
          .filter(user => user && user.id && user.name)
          .map(user => ({
            ...user,
            id: user.id,
            name: user.name,
            email: user.email,
            designation: 'Connection',
            role: 'connection'
          }));
        
        console.log('Valid connections:', validConnections);
        projectUsers.push(...validConnections);
      } catch (error) {
        console.log('Failed to get connections:', error);
      }
      
      // Remove duplicates based on user ID
      const uniqueUsers = projectUsers.filter((user, index, self) => 
        index === self.findIndex(u => u.id === user.id)
      );
      
      console.log('Final unique users:', uniqueUsers);
      setUsers(uniqueUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setUsers([]);
    }
  };

  const handleSetAccess = async () => {
    if (!selectedUser || !selectedModule) {
      Alert.alert('Error', 'Please select a user and module');
      return;
    }

    try {
      const accessData = {
        userId: selectedUser.id,
        module: selectedModule,
        ...permissions,
      };

      await setAccess(projectId, accessData);
      await fetchAccesses();
      setShowAddUser(false);
      resetForm();
      Alert.alert('Success', 'Access updated successfully');
    } catch (error) {
      console.error('Failed to set access:', error);
      Alert.alert('Error', 'Failed to update access');
    }
  };

  const handleRemoveAccess = async (userId, module) => {
    Alert.alert(
      'Remove Access',
      'Are you sure you want to remove this access?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeAccess(projectId, { userId, module });
              await fetchAccesses();
              Alert.alert('Success', 'Access removed successfully');
            } catch (error) {
              console.error('Failed to remove access:', error);
              Alert.alert('Error', 'Failed to remove access');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedUser(null);
    setSelectedModule(activeTab);
    setPermissions({
      canView: true,
      canReply: false,
      canEdit: false,
    });
    setSearchQuery('');
    setSelectedRole('all');
  };

  const getFilteredUsers = () => {
    let filteredUsers = users;

    // Filter by search query
    if (searchQuery.trim()) {
      filteredUsers = filteredUsers.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (selectedRole !== 'all') {
      filteredUsers = filteredUsers.filter(user => {
        if (selectedRole === 'owner') return user.role === 'owner';
        if (selectedRole === 'co-admin') return user.role === 'co-admin';
        if (selectedRole === 'connection') return user.role === 'connection';
        return true;
      });
    }

    return filteredUsers;
  };

  const getFilteredAccesses = () => {
    let filteredAccesses = accesses.filter(access => access.module === activeTab);
    
    // Filter by search query
    if (listSearchQuery.trim()) {
      filteredAccesses = filteredAccesses.filter(access =>
        access.User?.name?.toLowerCase().includes(listSearchQuery.toLowerCase()) ||
        access.User?.email?.toLowerCase().includes(listSearchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (listFilterRole !== 'all') {
      filteredAccesses = filteredAccesses.filter(access => {
        const user = users.find(u => u.id === access.userId);
        if (listFilterRole === 'owner') return user?.role === 'owner';
        if (listFilterRole === 'co-admin') return user?.role === 'co-admin';
        if (listFilterRole === 'connection') return user?.role === 'connection';
        return true;
      });
    }

    return filteredAccesses;
  };

  const groupedAccesses = getFilteredAccesses().reduce((groups, access) => {
    if (!access || !access.userId) return groups;
    
    const key = `${access.userId}-${access.User?.name || 'Unknown'}`;
    if (!groups[key]) {
      groups[key] = {
        user: access.User,
        modules: [],
      };
    }
    groups[key].modules.push(access);
    return groups;
  }, {});

  const renderAccessItem = ({ item }) => {
    const [userId, userName] = item[0].split('-');
    const accessData = item[1];
    
    // Find user role
    const user = users.find(u => u.id === parseInt(userId));
    const userRole = user?.role || 'unknown';
    const roleColors = {
      owner: '#FF6B35',
      'co-admin': '#4ECDC4', 
      connection: '#45B7D1',
      unknown: '#95A5A6'
    };

    return (
      <View style={[styles.accessItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarText}>
              {accessData.user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: theme.text }]}>
                {accessData.user?.name || 'Unknown User'}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: roleColors[userRole] }]}>
                <Text style={styles.roleBadgeText}>
                  {userRole === 'co-admin' ? 'Admin' : userRole?.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={[styles.userEmail, { color: theme.secondaryText }]}>
              {accessData.user?.email || ''}
            </Text>
          </View>
        </View>

        <View style={styles.modulesContainer}>
          {accessData.modules.map((moduleAccess, index) => (
            <View key={index} style={styles.moduleItem}>
              <View style={styles.moduleInfo}>
                <Text style={[styles.moduleName, { color: theme.text }]}>
                  {modules.find(m => m.key === moduleAccess.module)?.label || moduleAccess.module}
                </Text>
                <View style={styles.permissionsList}>
                  {moduleAccess.canView && (
                    <Text style={[styles.permission, { color: theme.success }]}>View</Text>
                  )}
                  {moduleAccess.canReply && (
                    <Text style={[styles.permission, { color: theme.primary }]}>Reply</Text>
                  )}
                  {moduleAccess.canEdit && (
                    <Text style={[styles.permission, { color: theme.warning }]}>Edit</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveAccess(moduleAccess.userId, moduleAccess.module)}
                style={styles.removeButton}
              >
                <MaterialIcons name="delete-outline" size={20} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Project Settings</Text>
          <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
            {projectName}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            setSelectedModule(activeTab);
            setShowAddUser(true);
          }}
          style={[styles.addButton, { backgroundColor: theme.primary }]}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Module Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContainer}>
          {modules.map((module) => (
            <TouchableOpacity
              key={module.key}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === module.key ? theme.primary : 'transparent',
                  borderColor: theme.border,
                }
              ]}
              onPress={() => setActiveTab(module.key)}
            >
              <Feather 
                name={module.icon} 
                size={16} 
                color={activeTab === module.key ? '#fff' : theme.text} 
                style={styles.tabIcon}
              />
              <Text style={[
                styles.tabText,
                { color: activeTab === module.key ? '#fff' : theme.text }
              ]}>
                {module.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search and Filter Bar */}
      <View style={[styles.searchFilterBar, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {[
            { key: 'all', label: 'All', count: getFilteredAccesses().length },
            { key: 'owner', label: 'Owner', count: getFilteredAccesses().filter(access => users.find(u => u.id === access.userId)?.role === 'owner').length },
            { key: 'co-admin', label: 'Co-Admin', count: getFilteredAccesses().filter(access => users.find(u => u.id === access.userId)?.role === 'co-admin').length },
            { key: 'connection', label: 'Connections', count: getFilteredAccesses().filter(access => users.find(u => u.id === access.userId)?.role === 'connection').length },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: listFilterRole === filter.key ? theme.primary : theme.card,
                  borderColor: theme.border,
                }
              ]}
              onPress={() => setListFilterRole(filter.key)}
            >
              <Text style={[
                styles.filterChipText,
                { color: listFilterRole === filter.key ? '#fff' : theme.text }
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
            Loading access data...
          </Text>
        </View>
      ) : (
        <FlatList
          data={Object.entries(groupedAccesses)}
          renderItem={renderAccessItem}
          keyExtractor={(item) => item[0]}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name={modules.find(m => m.key === activeTab)?.icon || 'settings'} size={48} color={theme.secondaryText} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {listSearchQuery || listFilterRole !== 'all' 
                  ? 'No matching results found'
                  : `No ${modules.find(m => m.key === activeTab)?.label} Access Configured`
                }
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                {listSearchQuery || listFilterRole !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : `Add users to grant them access to ${modules.find(m => m.key === activeTab)?.label.toLowerCase()}`
                }
              </Text>
              {(listSearchQuery || listFilterRole !== 'all') && (
                <TouchableOpacity
                  style={[styles.clearFiltersButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setListSearchQuery('');
                    setListFilterRole('all');
                  }}
                >
                  <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
              {activeTab === 'discussion' && !listSearchQuery && listFilterRole === 'all' && (
                <TouchableOpacity
                  style={[styles.quickAddButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    setSelectedModule('discussion');
                    setShowAddUser(true);
                  }}
                >
                  <Text style={styles.quickAddButtonText}>Add Discussion Access</Text>
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
        onRequestClose={() => setShowAddUser(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add {modules.find(m => m.key === selectedModule)?.label} Access
              </Text>
              <TouchableOpacity onPress={() => setShowAddUser(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Current Module Display */}
            <View style={[styles.currentModuleContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Feather 
                name={modules.find(m => m.key === selectedModule)?.icon || 'settings'} 
                size={20} 
                color={theme.primary} 
              />
              <Text style={[styles.currentModuleText, { color: theme.text }]}>
                {modules.find(m => m.key === selectedModule)?.label} Access
              </Text>
            </View>

            {/* User Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Select User</Text>
              
              {users.length === 0 ? (
                <View style={[styles.noUsersContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <MaterialIcons name="people-outline" size={24} color={theme.secondaryText} />
                  <Text style={[styles.noUsersText, { color: theme.secondaryText }]}>
                    No users found. Make sure you have connections.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Search and Filter */}
                  <View style={styles.searchFilterContainer}>
                    <View style={[styles.searchContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
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
                              backgroundColor: selectedRole === filter.key ? theme.primary : theme.background,
                              borderColor: theme.border,
                            }
                          ]}
                          onPress={() => setSelectedRole(filter.key)}
                        >
                          <Text style={[
                            styles.filterChipText,
                            { color: selectedRole === filter.key ? '#fff' : theme.text }
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
                            backgroundColor: selectedUser?.id === item.id ? theme.primary : theme.background,
                            borderColor: theme.border,
                          }
                        ]}
                        onPress={() => setSelectedUser(item)}
                      >
                        <View style={styles.userChipContent}>
                          <Text style={[
                            styles.userChipText,
                            { color: selectedUser?.id === item.id ? '#fff' : theme.text }
                          ]}>
                            {item.name}
                          </Text>
                          {item.designation && (
                            <Text style={[
                              styles.userChipDesignation,
                              { color: selectedUser?.id === item.id ? 'rgba(255,255,255,0.8)' : theme.secondaryText }
                            ]}>
                              {item.designation}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => (item.id ? item.id.toString() : Math.random().toString())}
                    ListEmptyComponent={
                      <View style={[styles.noFilterResultsContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                        <MaterialIcons name="filter-list-off" size={24} color={theme.secondaryText} />
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
            
            {/* Permissions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Permissions for {modules.find(m => m.key === selectedModule)?.label}</Text>
              {selectedModule === 'discussion' && (
                <Text style={[styles.sectionDescription, { color: theme.secondaryText }]}>
                  Configure what this user can do in project discussions
                </Text>
              )}
              {Object.entries(permissions).map(([key, value]) => (
                <View key={key} style={styles.permissionRow}>
                  <View style={styles.permissionInfo}>
                    <Text style={[styles.permissionLabel, { color: theme.text }]}>
                      {key === 'canView' ? 'View Messages' : 
                       key === 'canReply' ? 'Send Messages' : 
                       'Manage Discussion'}
                    </Text>
                    {selectedModule === 'discussion' && (
                      <Text style={[styles.permissionDescription, { color: theme.secondaryText }]}>
                        {key === 'canView' ? 'Can see discussion messages' : 
                         key === 'canReply' ? 'Can post messages and replies' : 
                         'Can pin messages and moderate discussion'}
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={value}
                    onValueChange={(newValue) => 
                      setPermissions(prev => ({ ...prev, [key]: newValue }))
                    }
                    trackColor={{ false: theme.border, true: theme.primary }}
                    thumbColor={value ? '#fff' : theme.secondaryText}
                  />
                </View>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowAddUser(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSetAccess}
              >
                <Text style={styles.saveButtonText}>Save Access</Text>
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
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionDescription: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
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
  permissionsList: {
    flexDirection: 'row',
    marginTop: 4,
  },
  permission: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
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
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  searchFilterContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    paddingVertical: 4,
  },
  filterContainer: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
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
    paddingVertical: 12,
  },
  permissionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
