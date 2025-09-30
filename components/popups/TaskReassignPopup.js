import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '../../theme/ThemeContext';
import { getUserConnections } from '../../utils/connections';
import { reassignTask } from '../../utils/task';

const TaskReassignPopup = ({ visible, onClose, taskId, theme: propTheme, currentAssignees = [], isCreator = false }) => {
  const { t } = useTranslation();
  const contextTheme = useTheme();
  const theme = propTheme || contextTheme;
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [removedUsers, setRemovedUsers] = useState([]); // Track users being removed
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Get current user ID when component mounts
  useEffect(() => {
    const getCurrentUserId = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          const decoded = jwtDecode(token);
          setCurrentUserId(decoded.id || decoded.userId);
        }
      } catch (error) {
        console.error('Error getting current user ID:', error);
      }
    };
    getCurrentUserId();
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setSelectedUsers([]); // Reset selection when opening
      setQuery(''); // Reset search query
      getUserConnections()
        .then((data) => {
          if (data && Array.isArray(data)) {
            setConnections(data);
        
            // Show all connections initially when popup opens (including current assignees)
            setSearchResults(data);
          } else {
            setConnections([]);
            setSearchResults([]);
          }
        })
        .catch((error) => {
          console.error('[TaskReassignPopup] Error loading connections:', error);
          setConnections([]);
          setSearchResults([]);
        })
        .finally(() => {
          console.log('[TaskReassignPopup] Finished loading connections');
          setLoading(false);
        });
    } else {
      // Reset everything when popup closes
      setConnections([]);
      setSearchResults([]);
      setSelectedUsers([]);
      setRemovedUsers([]);
      setQuery('');
    }
  }, [visible, currentAssignees]);

  const handleSearch = (value) => {
    setQuery(value);
    
    if (!value.trim()) {
      // Show all connections when search is empty
      setSearchResults(connections);
      return;
    }
    
    // Search with any length of input (include all users, current assignees will be marked)
    const filtered = connections.filter(user =>
      (user.userName || user.name || '').toLowerCase().includes(value.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(value.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const handleUserSelect = (user) => {
    const userId = user.userId || user.id;
    const isCurrentlyAssigned = currentAssignees.some(assignee => (assignee.userId || assignee.id) === userId);
    
    // If creator: allow selection/deselection of anyone except current user
    // If not creator: don't allow selection/deselection of current assignees or current user
    if (!isCreator && (isCurrentlyAssigned || userId === currentUserId)) {
      return;
    }
    
    // Don't allow the current user to select/deselect themselves
    if (userId === currentUserId) {
      return;
    }
    
    if (isCurrentlyAssigned) {
      // Handle removal of current assignee (only if creator)
      const isMarkedForRemoval = removedUsers.some(u => (u.userId || u.id) === userId);
      if (isMarkedForRemoval) {
        // Remove from removal list (keep them assigned)
        setRemovedUsers(prev => prev.filter(u => (u.userId || u.id) !== userId));
      } else {
        // Add to removal list
        setRemovedUsers(prev => [...prev, user]);
      }
    } else {
      // Handle addition of new assignee
      const isSelected = selectedUsers.some(u => (u.userId || u.id) === userId);
      if (isSelected) {
        // Remove user from selection
        setSelectedUsers(prev => prev.filter(u => (u.userId || u.id) !== userId));
      } else {
        // Add user to selection
        setSelectedUsers(prev => [...prev, user]);
      }
    }
  };

  const handleConfirmReassign = async () => {
    if (selectedUsers.length === 0 && removedUsers.length === 0) {
      Alert.alert("Error", "Please select users to add or remove.");
      return;
    }
    
    try {
      // Create new assignment array by:
      // 1. Starting with all existing assignees
      // 2. Removing users marked for removal
      // 3. Adding newly selected users
      // 4. Removing current user if they're not the creator (existing logic)
      
      const currentAssigneeIds = (currentAssignees || []).map(assignee => assignee.userId || assignee.id);
      const removedUserIds = removedUsers.map(user => user.userId || user.id);
      const newUserIds = selectedUsers.map(user => user.userId || user.id);
      
      // Start with existing assignees, remove those marked for removal
      let finalAssignedUserIds = currentAssigneeIds.filter(id => !removedUserIds.includes(id));
      
      // If not creator, remove current user (existing behavior)
      if (!isCreator) {
        finalAssignedUserIds = finalAssignedUserIds.filter(id => id !== currentUserId);
      }
      
      // Add newly selected users, remove duplicates
      finalAssignedUserIds = [...new Set([...finalAssignedUserIds, ...newUserIds])];
      
      await reassignTask(taskId, finalAssignedUserIds);
      
      // Create success message that matches backend logic
      let messageParts = [];
      
      // Users actually removed (including current user if not creator)
      const actuallyRemoved = currentAssigneeIds.filter(id => 
        removedUserIds.includes(id) || (!isCreator && id === currentUserId)
      );
      
      // Users actually added (new selections)
      const actuallyAdded = newUserIds;
      
      // Users retained (existing assignees not removed)
      const retained = currentAssigneeIds.filter(id => 
        !removedUserIds.includes(id) && (isCreator || id !== currentUserId)
      );
      
      if (actuallyRemoved.includes(currentUserId)) {
        messageParts.push("✅ You have been removed from this task");
      }
      
      if (actuallyAdded.length > 0) {
        const addedUserNames = selectedUsers.map(u => u.userName || u.name).join(', ');
        messageParts.push(`✅ ${actuallyAdded.length} new user(s) added: ${addedUserNames}`);
      }
      
      if (removedUsers.length > 0 && !actuallyRemoved.includes(currentUserId)) {
        const removedUserNames = removedUsers.map(u => u.userName || u.name).join(', ');
        messageParts.push(`✅ ${removedUsers.length} user(s) removed: ${removedUserNames}`);
      }
      
      if (retained.length > 0) {
        const retainedAssignees = currentAssignees
          .filter(assignee => retained.includes(assignee.userId || assignee.id))
          .map(assignee => assignee.userName || assignee.name)
          .join(', ');
        messageParts.push(`✅ ${retained.length} assignee(s) retained: ${retainedAssignees}`);
      }
      
      const message = messageParts.length > 0 
        ? `Assignment updated successfully!\n\n${messageParts.join('\n')}`
        : "Assignment updated successfully!";
      
      Alert.alert("Success", message, [{ text: "OK", onPress: () => handleClose(true) }]);
    } catch (err) {
      console.error('[TaskReassignPopup] Error:', err);
      Alert.alert("Error", err.message || "Failed to reassign");
    }
  };

  const handleClose = (wasReassigned = false) => {
    // Reset all popup state
    setQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setRemovedUsers([]);
    setShowConfirmation(false);
    setConnections([]);
    setLoading(false);
    
    // Only call onClose with wasReassigned parameter
    // Don't pass any navigation actions that might cause unwanted navigation
    if (onClose) {
      onClose(wasReassigned);
    }
  };

  const renderUserItem = ({ item }) => {
    const userId = item.userId || item.id;
    const isSelected = selectedUsers.some(u => (u.userId || u.id) === userId);
    const isCurrentUser = userId === currentUserId;
    const isCurrentlyAssigned = currentAssignees.some(assignee => (assignee.userId || assignee.id) === userId);
    const isMarkedForRemoval = removedUsers.some(u => (u.userId || u.id) === userId);
    
    // Disable interaction for current user or (non-creators with current assignees)
    const isDisabled = isCurrentUser || (!isCreator && isCurrentlyAssigned);
    
    // Determine visual state
    let borderColor = theme.border;
    let showCheckmark = false;
    let showRemovalIcon = false;
    
    if (isCurrentlyAssigned) {
      if (isCreator && isMarkedForRemoval) {
        borderColor = '#FF6B6B'; // Red border for removal
        showRemovalIcon = true;
      } else if (!isMarkedForRemoval) {
        borderColor = theme.border; // Normal border for staying assigned
      }
    } else if (isSelected) {
      borderColor = theme.primary; // Blue border for new selection
      showCheckmark = true;
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.userItemCard, 
          {  
            backgroundColor: theme.card,
            borderColor: borderColor,
            borderWidth: 1,
            opacity: isDisabled ? 0.6 : 1
          }
        ]}
        onPress={() => handleUserSelect(item)}
        activeOpacity={isDisabled ? 1 : 0.7}
        disabled={isDisabled}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {item.profilePhoto ? (
            <View style={styles.avatarBox}>
              <Image source={{ uri: item.profilePhoto }} style={styles.avatarImg} />
            </View>
          ) : (
            <View style={[styles.avatarBox, { backgroundColor: theme.avatarBg }]}>
              <Ionicons name="person" size={20} color={theme.secondaryText} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { 
              color: isCurrentlyAssigned ? theme.secondaryText : theme.text
            }]}>
              {item.userName || item.name}
            </Text>
            <Text style={[styles.userEmail, { color: theme.secondaryText, fontSize: 12 }]}>{item.email}</Text>
          </View>
          {isCurrentlyAssigned && !isMarkedForRemoval && (
            <View style={[styles.badge, { backgroundColor: theme.secCard, borderWidth: 1, borderColor: theme.border }]}>
              <Text style={[styles.badgeText, { color: theme.secondaryText }]}>ASSIGNED</Text>
            </View>
          )}
          {isMarkedForRemoval && (
            <View style={[styles.badge, { backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FF6B6B' }]}>
              <Text style={[styles.badgeText, { color: '#FF6B6B' }]}>REMOVING</Text>
            </View>
          )}
          {showCheckmark && (
            <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
          )}
          {showRemovalIcon && (
            <Ionicons name="remove-circle" size={20} color="#FF6B6B" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { 
        backgroundColor: theme.background === '#1A1A1A' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' 
      }]}>
        <View style={[styles.popup, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {t("Reassign") || "Reassign"}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          {/* Current Assignees - Compact Capsules */}
          {currentAssignees && currentAssignees.length > 0 && (
            <View style={[styles.currentAssigneesSection, { marginBottom: 20 }]}>
              <Text style={[styles.currentAssigneesLabel, { color: theme.secondaryText, marginBottom: 12 }]}>
                {t("CURRENT ASSIGNEES") || "CURRENT ASSIGNEES"} ({currentAssignees.length}):
              </Text>
              <View style={styles.capsuleContainer}>
                {currentAssignees.map((assignee, index) => {
                  const isCurrentUser = (assignee.userId || assignee.id) === currentUserId;
                  const isMarkedForRemoval = removedUsers.some(u => (u.userId || u.id) === (assignee.userId || assignee.id));
                  const displayName = assignee.userName || assignee.name || 'Unknown User';
                  const canBeRemoved = isCreator && !isCurrentUser; // Creator can remove others, but not themselves
                  
                  return (
                    <TouchableOpacity 
                      key={index} 
                      style={[
                        styles.assigneeCapsule, 
                        { 
                          backgroundColor: isMarkedForRemoval ? '#FFF5F5' : (isCurrentUser ? theme.secCard : theme.card),
                          borderColor: isMarkedForRemoval ? '#FF6B6B' : (isCurrentUser ? theme.primary : theme.border),
                          opacity: canBeRemoved ? 1 : 0.8,
                        }
                      ]}
                      onPress={() => {
                        if (canBeRemoved) {
                          handleUserSelect(assignee);
                        }
                      }}
                      activeOpacity={canBeRemoved ? 0.7 : 1}
                      disabled={!canBeRemoved}
                    >
                      <Text style={[styles.capsuleName, { 
                        color: isMarkedForRemoval ? '#FF6B6B' : (isCurrentUser ? theme.primary : theme.text)
                      }]}>
                        {displayName}
                      </Text>
                      {isCurrentUser && !isCreator && (
                        <Ionicons name="remove-circle-outline" size={14} color={theme.primary} style={{ marginLeft: 4 }} />
                      )}
                      {!isCurrentUser && !isMarkedForRemoval && canBeRemoved && (
                        <Ionicons name="checkmark-circle-outline" size={14} color={theme.secondaryText} style={{ marginLeft: 4 }} />
                      )}
                      {!isCurrentUser && !isMarkedForRemoval && !canBeRemoved && (
                        <Ionicons name="checkmark-circle-outline" size={14} color={theme.secondaryText} style={{ marginLeft: 4 }} />
                      )}
                      {isMarkedForRemoval && (
                        <Ionicons name="remove-circle" size={14} color="#FF6B6B" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {isCreator && currentAssignees.length > 0 && (
                <Text style={[styles.tapHintText, { color: theme.secondaryText + '80', marginTop: 8, fontSize: 11, fontStyle: 'italic' }]}>
                  {t("Tap assignees above to remove them") || "Tap assignees above to remove them"}
                </Text>
              )}
            </View>
          )}

          {/* Search Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.searchSectionLabel, { color: theme.secondaryText, marginBottom: 12 }]}>
              {t("SELECT USERS TO ADDED") || "SELECT USERS TO ADDED"}
            </Text>
            <Text style={[styles.searchHintText, { color: theme.secondaryText + '80', marginBottom: 8, fontSize: 12 }]}>
              {isCreator 
                ? (t("As creator, you can add new users or remove existing assignees") || "As creator, you can add new users or remove existing assignees")
                : (t("Current assignees are marked and cannot be removed") || "Current assignees are marked and cannot be removed")
              }
            </Text>
            <View style={[styles.inputBox, { backgroundColor: theme.secCard, borderColor: theme.border, marginBottom: 0 }]}>
              <Ionicons name="search" size={20} color={theme.secondaryText} style={{ marginRight: 12 }} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder={t("Search user by name or email...") || "Search user by name or email..."}
                placeholderTextColor={theme.secondaryText}
                value={query}
                onChangeText={handleSearch}
                autoFocus={false}
              />
            </View>
          </View>

          {/* Selected Users Count */}
          {(selectedUsers.length > 0 || removedUsers.length > 0) && (
            <View style={[styles.selectedCountBox, { 
              backgroundColor: theme.primary + '15',
              borderColor: theme.primary + '30'
            }]}>
              <Text style={[styles.selectedCountText, { color: theme.primary }]}>
                {selectedUsers.length > 0 && `${selectedUsers.length} ${t("user(s) to add") || "user(s) to add"}`}
                {selectedUsers.length > 0 && removedUsers.length > 0 && " • "}
                {removedUsers.length > 0 && `${removedUsers.length} ${t("user(s) to remove") || "user(s) to remove"}`}
              </Text>
            </View>
          )}

          {/* Search Results */}
          {loading ? (
            <View style={styles.resultsBox}>
              <Text style={[styles.noResultsText, { color: theme.secondaryText }]}>
                {t("Loading connections...") || "Loading connections..."}
              </Text>
            </View>
          ) : (
            <View style={styles.resultsBox}>
              {searchResults.length > 0 ? (
                <>
                  
                  <FlatList
                    data={searchResults}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => (item.userId || item.id).toString()}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={false}
                    initialNumToRender={10}
                    nestedScrollEnabled={true}
                  />
                </>
              ) : (
                <View style={[styles.noResultsBox, { backgroundColor: theme.secCard, borderColor: theme.border }]}> 
                  <Text style={[styles.noResultsText, { color: theme.secondaryText }]}>
                    {query ? 
                      (t("No users found matching your search") || "No users found matching your search") :
                      (t("No connections available") || "No connections available")
                    }
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Buttons */}
          <View style={[styles.buttonRow, { marginTop: 20 }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { 
                backgroundColor: theme.secCard, 
                borderColor: theme.border,
                borderWidth: 1 
              }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelBtnText, { color: theme.text }]}>
                {t("Cancel") || "Cancel"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.assignBtn, 
                { 
                  backgroundColor: (selectedUsers.length > 0 || removedUsers.length > 0) ? theme.primary : theme.border,
                  opacity: (selectedUsers.length > 0 || removedUsers.length > 0) ? 1 : 0.6,
                  shadowColor: (selectedUsers.length > 0 || removedUsers.length > 0) ? theme.primary : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: (selectedUsers.length > 0 || removedUsers.length > 0) ? 2 : 0
                }
              ]}
              onPress={handleConfirmReassign}
              disabled={selectedUsers.length === 0 && removedUsers.length === 0}
            >
              <Text style={[styles.assignBtnText, { 
                color: (selectedUsers.length > 0 || removedUsers.length > 0) ? '#fff' : theme.secondaryText 
              }]}>
                {t("Update") || "Update"} {(selectedUsers.length > 0 || removedUsers.length > 0) && `(${selectedUsers.length + removedUsers.length})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: '92%',
    borderRadius: 22,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 8,
  },
  headerDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  currentAssigneesSection: {
    // Container for current assignees section
  },
  capsuleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assigneeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  capsuleName: {
    fontSize: 12,
    fontWeight: '500',
  },
  searchHintText: {
    fontStyle: 'italic',
    lineHeight: 16,
  },
  tapHintText: {
    fontStyle: 'italic',
    lineHeight: 14,
    textAlign: 'center',
  },
  currentAssigneesLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentAssigneeCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  avatarBoxSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImgSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  assigneeCardName: {
    fontSize: 14,
    fontWeight: '600',
  },
  assigneeCardEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  searchSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  selectedCountBox: {
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultsBox: {
    marginBottom: 16,
    minHeight: 180,
    maxHeight: 280,
  },
  userItemCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  noResultsBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  assignBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  assignBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default TaskReassignPopup;
