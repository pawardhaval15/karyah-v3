import { MaterialIcons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const UserChip = memo(({ user, onRemove, theme }) => (
    <View style={[styles.selectedUserChip, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
        <Text style={[styles.selectedUserChipText, { color: theme.primary }]} numberOfLines={1}>
            {user.name || 'User'}
        </Text>
        <TouchableOpacity onPress={() => onRemove(user.id)} style={styles.removeUserButton}>
            <MaterialIcons name="close" size={14} color={theme.primary} />
        </TouchableOpacity>
    </View>
));

const BulkAssignPopup = ({
    visible,
    onClose,
    onSubmit,
    selectedTasksCount,
    users,
    theme,
    t
}) => {
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const userId = user.id || user._id || user.userId;
            const matchesSearch =
                (user.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                (user.email || '').toLowerCase().includes(userSearchQuery.toLowerCase());
            const isNotSelected = !selectedUserIds.includes(userId);
            return matchesSearch && isNotSelected;
        });
    }, [users, userSearchQuery, selectedUserIds]);

    const selectedUsersData = useMemo(() => {
        return users.filter(u => selectedUserIds.includes(u.id || u._id || u.userId));
    }, [users, selectedUserIds]);

    const toggleUser = (userId) => {
        setSelectedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    if (!visible) return null;

    return (
        <View style={styles.popupOverlay}>
            <View style={[styles.popupContainer, { backgroundColor: theme.card }]}>
                <Text style={[styles.popupTitle, { color: theme.text }]}>
                    Assign {selectedTasksCount} Task{selectedTasksCount > 1 ? 's' : ''}
                </Text>

                <View style={[styles.userSearchContainer, { backgroundColor: theme.inputBg || theme.avatarBg, borderColor: theme.border }]}>
                    <MaterialIcons name="search" size={20} color={theme.secondaryText} />
                    <TextInput
                        style={[styles.userSearchInput, { color: theme.text }]}
                        placeholder="Search users..."
                        placeholderTextColor={theme.secondaryText}
                        value={userSearchQuery}
                        onChangeText={setUserSearchQuery}
                    />
                    {userSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setUserSearchQuery('')}>
                            <MaterialIcons name="clear" size={20} color={theme.secondaryText} />
                        </TouchableOpacity>
                    )}
                </View>

                {selectedUserIds.length > 0 && (
                    <View style={styles.selectedUsersContainer}>
                        <FlatList
                            horizontal
                            data={selectedUsersData}
                            keyExtractor={(u) => String(u.id || u._id || u.userId)}
                            showsHorizontalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <UserChip
                                    user={item}
                                    onRemove={(id) => setSelectedUserIds(prev => prev.filter(uid => uid !== id))}
                                    theme={theme}
                                />
                            )}
                        />
                    </View>
                )}

                <FlatList
                    style={styles.usersList}
                    data={filteredUsers}
                    keyExtractor={(u, idx) => String(u.id || u._id || u.userId || idx)}
                    renderItem={({ item: user }) => {
                        const userId = user.id || user._id || user.userId;
                        const isSelected = selectedUserIds.includes(userId);
                        return (
                            <TouchableOpacity
                                style={[
                                    styles.compactUserItem,
                                    {
                                        backgroundColor: isSelected ? theme.primary + '15' : 'transparent',
                                        borderColor: isSelected ? theme.primary : theme.border,
                                    },
                                ]}
                                onPress={() => toggleUser(userId)}
                            >
                                <View style={[styles.compactUserAvatar, { backgroundColor: theme.avatarBg }]}>
                                    <Text style={[styles.compactUserAvatarText, { color: theme.primary }]}>
                                        {(user.name || 'U').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.compactUserInfo}>
                                    <Text style={[styles.compactUserName, { color: theme.text }]} numberOfLines={1}>
                                        {user.name || 'Unknown User'}
                                    </Text>
                                    <Text style={[styles.compactUserEmail, { color: theme.secondaryText }]} numberOfLines={1}>
                                        {user.email || 'No email provided'}
                                    </Text>
                                </View>
                                <View style={[styles.selectionIndicator, { borderColor: theme.primary, backgroundColor: isSelected ? theme.primary : 'transparent' }]}>
                                    {isSelected && <MaterialIcons name="check" size={14} color="#fff" />}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={
                        <Text style={[styles.noUsersText, { color: theme.secondaryText }]}>
                            {userSearchQuery ? 'No users found' : 'No users available'}
                        </Text>
                    }
                />

                <View style={styles.popupActions}>
                    <TouchableOpacity
                        style={[styles.popupButton, styles.cancelButton, { borderColor: theme.border }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.popupButtonText, { color: theme.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.popupButton,
                            { backgroundColor: selectedUserIds.length === 0 ? theme.border : theme.primary }
                        ]}
                        onPress={() => onSubmit(selectedUserIds)}
                        disabled={selectedUserIds.length === 0}
                    >
                        <Text style={[styles.popupButtonText, { color: '#fff' }]}>
                            Assign ({selectedUserIds.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    popupOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    popupContainer: {
        width: '92%',
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    popupTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },
    userSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 12,
        borderWidth: 1,
    },
    userSearchInput: {
        flex: 1,
        fontSize: 15,
        marginLeft: 8,
    },
    selectedUsersContainer: {
        marginBottom: 12,
        height: 40,
    },
    selectedUserChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
    },
    selectedUserChipText: {
        fontSize: 12,
        fontWeight: '600',
        marginRight: 4,
    },
    usersList: {
        maxHeight: 300,
    },
    compactUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    compactUserAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    compactUserAvatarText: {
        fontSize: 14,
        fontWeight: '700',
    },
    compactUserInfo: {
        flex: 1,
    },
    compactUserName: {
        fontSize: 14,
        fontWeight: '600',
    },
    compactUserEmail: {
        fontSize: 12,
    },
    selectionIndicator: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    popupActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    popupButton: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    popupButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    noUsersText: {
        textAlign: 'center',
        marginTop: 20,
    }
});

export default memo(BulkAssignPopup);
