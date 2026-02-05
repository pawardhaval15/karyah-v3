import { Feather, MaterialIcons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ProjectScreenHeader = ({
    theme,
    t,
    search,
    setSearch,
    onBack,
    onToggleFilters,
    activeFiltersCount,
    totalVisible,
    totalActual
}) => {
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
                <Feather name="arrow-left" size={24} color={theme.text} />
                <View>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{t('projects')}</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
                        {totalVisible !== totalActual ? `${totalVisible} of ${totalActual}` : `${totalActual} Total`}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.headerRightActions}>
                <View style={[styles.searchBarContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Feather name="search" size={16} color={theme.secondaryText} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder={t('search_projects')}
                        placeholderTextColor={theme.secondaryText}
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <MaterialIcons name="close" size={16} color={theme.secondaryText} />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    style={[
                        styles.filterBtn,
                        {
                            backgroundColor: activeFiltersCount > 0 ? `${theme.primary}15` : theme.card,
                            borderColor: activeFiltersCount > 0 ? theme.primary : theme.border
                        }
                    ]}
                    onPress={onToggleFilters}
                    activeOpacity={0.7}
                >
                    <Feather
                        name="sliders"
                        size={18}
                        color={activeFiltersCount > 0 ? theme.primary : theme.text}
                    />
                    {activeFiltersCount > 0 && (
                        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.badgeText}>{activeFiltersCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
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
        gap: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
        borderRadius: 14,
        borderWidth: 1.5,
        maxWidth: 180,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        padding: 0,
        fontWeight: '500',
    },
    filterBtn: {
        width: 40,
        height: 40,
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '900',
    },
});

export default memo(ProjectScreenHeader);
