import { Feather, MaterialIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const MyTasksHeader = ({
    navigation,
    theme,
    t,
    isSelectionMode,
    selectedCount,
    toggleSelectionMode,
    handleBulkAssign,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    activeFiltersCount,
    setShowAddTaskPopup,
    activeTab
}) => {
    return (
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                <TouchableOpacity
                    onPress={() => isSelectionMode ? toggleSelectionMode() : navigation.navigate('Home')}
                    style={styles.backBtn}
                    activeOpacity={0.7}
                >
                    <Feather name={isSelectionMode ? "x" : "arrow-left"} size={22} color={theme.text} />
                    <Text style={[styles.headerTitle, { color: theme.text }]}>
                        {isSelectionMode ? `${selectedCount} Selected` : t('my_tasks')}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.headerRightActions}>
                {isSelectionMode ? (
                    <View style={styles.selectionActions}>
                        <TouchableOpacity
                            onPress={handleBulkAssign}
                            disabled={selectedCount === 0}
                            style={styles.iconButton}
                        >
                            <MaterialIcons
                                name="group-add"
                                size={24}
                                color={selectedCount === 0 ? theme.secondaryText : theme.primary}
                            />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.normalActions}>
                        <View style={[styles.compactSearchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <MaterialIcons name="search" size={18} color={theme.secondaryText} style={{ marginRight: 6 }} />
                            <TextInput
                                style={[styles.compactSearchInput, { color: theme.text }]}
                                placeholder={t('search_tasks')}
                                placeholderTextColor={theme.secondaryText}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <MaterialIcons name="close" size={16} color={theme.secondaryText} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.compactFilterTrigger,
                                {
                                    borderColor: activeFiltersCount > 0 ? theme.primary : theme.border,
                                    backgroundColor: activeFiltersCount > 0 ? theme.primary + '10' : theme.card,
                                },
                            ]}
                            onPress={() => setShowFilters(!showFilters)}
                        >
                            <Feather
                                name="sliders"
                                size={18}
                                color={activeFiltersCount > 0 ? theme.primary : theme.secondaryText}
                            />
                            {activeFiltersCount > 0 && (
                                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                                    <Text style={styles.badgeText}>{activeFiltersCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: theme.avatarBg }]}
                            onPress={() => setShowAddTaskPopup(true)}
                        >
                            <Feather name="plus" size={18} color={theme.primary} />
                        </TouchableOpacity>

                        {activeTab === 'createdby' && (
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.avatarBg }]}
                                onPress={toggleSelectionMode}
                            >
                                <MaterialIcons name="checklist" size={18} color={theme.primary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 6,
    },
    headerLeft: {
        flexShrink: 1,
        maxWidth: '45%',
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    headerRightActions: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        justifyContent: 'flex-end',
    },
    selectionActions: {
        flexDirection: 'row',
        gap: 8,
    },
    normalActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    iconButton: {
        padding: 8,
    },
    compactSearchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 10,
        height: 38,
        borderWidth: 1,
    },
    compactSearchInput: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        padding: 0,
        height: '100%',
    },
    compactFilterTrigger: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -5,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    actionBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default memo(MyTasksHeader);
