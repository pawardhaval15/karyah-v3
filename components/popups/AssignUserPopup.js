import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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

import { getUserConnections } from '../../utils/connections';
import { updateIssue } from '../../utils/issues';

const ReassignPopup = ({ visible, onClose, issueId, theme, currentAssignee }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      getUserConnections()
        .then((data) => {
          setConnections(data);
          // Show all connections initially when popup opens
          setSearchResults(data);
        })
        .catch(() => {
          setConnections([]);
          setSearchResults([]);
        })
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const handleSearch = (value) => {
    setQuery(value);
    if (!value.trim()) {
      // Show all connections when search is empty
      setSearchResults(connections);
      return;
    }
    // Search with any length of input
    const filtered = connections.filter(user =>
      (user.userName || user.name || '').toLowerCase().includes(value.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(value.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowConfirmation(true);
  };

  const handleConfirmReassign = async () => {
    if (!selectedUser) return;
    
    try {
      await updateIssue({ issueId, assignTo: selectedUser.userId || selectedUser.id });
      Alert.alert(
        "Success",
        `The issue has been successfully reassigned to ${selectedUser.userName || selectedUser.name}.`,
        [{ text: "OK", onPress: handleClose }]
      );
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to reassign issue");
    }
  };

  const handleReassign = async (userId, userName) => {
    try {
      await updateIssue({ issueId, assignTo: userId });
      Alert.alert(
        "Success",
        `The issue has been successfully reassigned to ${userName}.`,
        [{ text: "OK", onPress: handleClose }]
      );
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to reassign issue");
    }
  };

  const handleClose = () => {
    setQuery('');
    setSearchResults([]);
    setSelectedUser(null);
    setShowConfirmation(false);
    onClose();
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.userItemCard, { backgroundColor: theme.secCard, borderColor: theme.border }]}
      onPress={() => handleUserSelect(item)}
      activeOpacity={0.85}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {item.profilePhoto ? (
          <View style={styles.avatarBox}>
            <Image source={{ uri: item.profilePhoto }} style={styles.avatarImg} />
          </View>
        ) : (
          <View style={[styles.avatarBox, { backgroundColor: theme.primary + '22' }]}>
            <Ionicons name="person" size={28} color={theme.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { color: theme.text }]}>{item.userName || item.name}</Text>
          <Text style={[styles.userEmail, { color: theme.secondaryText }]}>{item.email}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.popup, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Re-Assign Issue
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerDesc, { color: theme.secondaryText }]}>
            Search and select a user to reassign this issue to:
          </Text>
          
          {/* Current Assignee */}
          {currentAssignee && (
            <View style={[styles.currentAssigneeBox, { backgroundColor: theme.secCard, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              {currentAssignee.profilePhoto ? (
                <View style={styles.avatarBox}>
                  <Image source={{ uri: currentAssignee.profilePhoto }} style={styles.avatarImg} />
                </View>
              ) : (
                <View style={[styles.avatarBox, { backgroundColor: theme.primary + '22' }]}>
                  <Ionicons name="person" size={28} color={theme.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.currentAssigneeLabel, { color: theme.secondaryText }]}>CURRENTLY ASSIGNED TO:</Text>
                <Text style={[styles.currentAssigneeName, { color: theme.text }]}>{currentAssignee.userName || currentAssignee.name || 'Unknown User'}</Text>
              </View>
            </View>
          )}
          
          <Text style={[styles.headerNote, { color: theme.dangerText }]}>
            Note: All images will be cleared when reassigning this issue.
          </Text>

          {/* Search Input */}
          <View style={[styles.inputBox, { backgroundColor: theme.secCard, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Search user by name or email..."
              placeholderTextColor={theme.secondaryText}
              value={query}
              onChangeText={handleSearch}
              autoFocus={true}
            />
          </View>

          {/* Search Results */}
          {loading ? (
            <View style={styles.resultsBox}>
              <Text style={[styles.noResultsText, { color: theme.secondaryText }]}>Loading connections...</Text>
            </View>
          ) : (
            <View style={styles.resultsBox}>
              {searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.userItemCard, { backgroundColor: theme.secCard, borderColor: theme.border }]}
                      onPress={() => handleUserSelect(item)}
                      activeOpacity={0.85}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {item.profilePhoto ? (
                          <View style={styles.avatarBox}>
                            <Image source={{ uri: item.profilePhoto }} style={styles.avatarImg} />
                          </View>
                        ) : (
                          <View style={[styles.avatarBox, { backgroundColor: theme.primary + '22' }]}>
                            <Ionicons name="person" size={28} color={theme.primary} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.userName, { color: theme.text }]}>{item.userName || item.name}</Text>
                          <Text style={[styles.userEmail, { color: theme.secondaryText }]}>{item.email}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => (item.userId || item.id).toString()}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 220 }}
                />
              ) : (
                <View style={[styles.noResultsBox, { backgroundColor: theme.secCard, borderColor: theme.border }]}> 
                  <Text style={[styles.noResultsText, { color: theme.secondaryText }]}>No users found matching your search</Text>
                </View>
              )}
            </View>
          )}

          {/* Minimum Characters Message */}
          {query.length > 0 && searchResults.length === 0 && !loading && (
            <View style={styles.resultsBox}>
              <Text style={[styles.noResultsText, { color: theme.secondaryText }]}>
                No users found matching "{query}"
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: theme.secCard }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelBtnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.confirmationPopup, { backgroundColor: theme.card }]}> 
            <Text style={[styles.confirmationTitle, { color: theme.text }]}>Confirm Reassignment</Text>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              {selectedUser?.profilePhoto ? (
                <View style={styles.avatarBoxLarge}>
                  <Image source={{ uri: selectedUser.profilePhoto }} style={styles.avatarImgLarge} />
                </View>
              ) : (
                <View style={[styles.avatarBoxLarge, { backgroundColor: theme.primary + '22' }]}> 
                  <Ionicons name="person" size={38} color={theme.primary} />
                </View>
              )}
            </View>
            <Text style={[styles.confirmationText, { color: theme.secondaryText }]}>Are you sure you want to reassign this issue to:</Text>
            <Text style={[styles.selectedUserName, { color: theme.text }]}>{selectedUser?.userName || selectedUser?.name}</Text>
            <Text style={[styles.confirmationWarning, { color: theme.dangerText }]}>This action cannot be undone and all images will be cleared.</Text>
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.cancelConfirmBtn, { backgroundColor: theme.secCard }]}
                onPress={() => setShowConfirmation(false)}
              >
                <Text style={[styles.cancelConfirmBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
                onPress={handleConfirmReassign}
              >
                <Text style={styles.confirmBtnText}>Reassign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: '92%',
    borderRadius: 22,
    paddingVertical: 18,
    maxHeight: '90%',
    elevation: 8,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 12,
  },
  headerDesc: {
    fontSize: 14,
    fontWeight: '400',
    marginHorizontal: 20,
    marginBottom: 2,
  },
  headerNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginHorizontal: 20,
    marginBottom: 10,
    fontWeight: '500',
  },
  currentAssigneeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentAssigneeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentAssigneeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
    backgroundColor: 'transparent',
    paddingVertical: 10,
  },
  resultsBox: {
    marginHorizontal: 20,
    marginBottom: 10,
  },
  userItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '400',
  },
  noResultsBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  cancelBtn: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '500',
    fontSize: 15,
  },
  confirmationPopup: {
    width: '88%',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmationText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  selectedUserName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmationWarning: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelConfirmBtnText: {
    fontWeight: '600',
    fontSize: 16,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  avatarBoxLarge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 6,
  },
  avatarImgLarge: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  userItemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});

export default ReassignPopup;