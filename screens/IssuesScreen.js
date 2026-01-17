import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import IssueList from '../components/issue/IssueList';
import IssuePopup from '../components/popups/IssuePopup';
import { useUserConnections } from '../hooks/useConnections';
import { useIssues, useToggleCritical } from '../hooks/useIssues';
import { useProjects } from '../hooks/useProjects';
import { useIssueStore } from '../store/issueStore';
import { useTheme } from '../theme/ThemeContext';
import { getUserNameFromToken } from '../utils/auth';

export default function IssuesScreen({ navigation }) {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    // Zustand Store
    const {
        searchQuery,
        setSearchQuery,
        statusTab,
        setStatusTab,
        showFilters,
        setShowFilters,
        filters,
        toggleFilter,
        clearAllFilters
    } = useIssueStore();

    const [currentUserName, setCurrentUserName] = useState(null);
    const [showIssuePopup, setShowIssuePopup] = useState(false);

    const [issueForm, setIssueForm] = useState({
        title: '',
        description: '',
        projectId: '',
        assignTo: '',
        dueDate: '',
        isCritical: false,
    });

    const { data: issues = [], isLoading: loadingIssues, refetch: refetchIssues, isRefetching } = useIssues();
    const { data: projects = [] } = useProjects();
    const { data: connectionsData = [] } = useUserConnections();
    const toggleCriticalMutation = useToggleCritical();

    useFocusEffect(
        useCallback(() => {
            refetchIssues();
        }, [refetchIssues])
    );

    const users = useMemo(() => connectionsData.connections || [], [connectionsData]);
    const loading = loadingIssues && issues.length === 0;

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const name = await getUserNameFromToken();
                setCurrentUserName(name);
            } catch (e) {
                console.error(e);
            }
        };
        fetchUser();
    }, []);

    const getActiveFiltersCount = useCallback(() => {
        return Object.values(filters).reduce((count, arr) => count + arr.length, 0);
    }, [filters]);

    const filteredIssues = useMemo(() => {
        return issues.filter(item => {
            const searchText = (item.name || '').toLowerCase();
            const matchesSearch = searchText.includes(searchQuery.toLowerCase());

            const matchesStatus = filters.status.length === 0 || filters.status.includes(item.status);
            const projectName = item.project?.projectName || item.projectName || '';
            const matchesProject = filters.projects.length === 0 || filters.projects.includes(projectName);
            const creatorName = item.creatorName || item.creator?.name || '';
            const matchesCreator = filters.createdBy.length === 0 || filters.createdBy.includes(creatorName);
            const location = item.project?.location || item.projectLocation || '';
            const matchesLocation = filters.locations.length === 0 || filters.locations.includes(location);

            return matchesSearch && matchesStatus && matchesProject && matchesCreator && matchesLocation;
        });
    }, [issues, searchQuery, filters]);

    const filterOptions = useMemo(() => {
        const statuses = new Set();
        const projectNames = new Set();
        const creators = new Set();
        const locations = new Set();
        issues.forEach(issue => {
            if (issue.status) statuses.add(issue.status);
            const pName = issue.project?.projectName || issue.projectName;
            if (pName) projectNames.add(pName);
            const cName = issue.creatorName || issue.creator?.name;
            if (cName) creators.add(cName);
            const loc = issue.project?.location || issue.projectLocation;
            if (loc) locations.add(loc);
        });
        return {
            statuses: Array.from(statuses),
            projects: Array.from(projectNames),
            creators: Array.from(creators),
            locations: Array.from(locations),
        };
    }, [issues]);

    const handleRefresh = useCallback(async () => {
        await Promise.all([
            refetchIssues(),
            queryClient.invalidateQueries({ queryKey: ['projects'] }),
            queryClient.invalidateQueries({ queryKey: ['userConnections'] })
        ]);
    }, [refetchIssues, queryClient]);

    const handleToggleCritical = async (issue, isCritical) => {
        try {
            await toggleCriticalMutation.mutateAsync({ taskId: issue.id, isCritical });
        } catch (error) {
            Alert.alert(t('error'), error.message || t('failed_to_update'));
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Premium Header - Merged Search & Title */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
                        <Feather name="arrow-left" size={22} color={theme.text} />
                        <Text style={[styles.headerTitle, { color: theme.text }]}>
                            {t('issues')} {issues.length > 0 && `(${issues.length})`}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.headerRightActions}>
                    <View style={[styles.compactSearchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <MaterialIcons name="search" size={18} color={theme.secondaryText} style={{ marginRight: 6 }} />
                        <TextInput
                            style={[styles.compactSearchInput, { color: theme.text }]}
                            placeholder={t("search_placeholder_issues")}
                            placeholderTextColor={theme.secondaryText}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
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
                                borderColor: getActiveFiltersCount() > 0 ? theme.primary : theme.border,
                                backgroundColor: getActiveFiltersCount() > 0 ? theme.primary + '10' : theme.card,
                            },
                        ]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Feather
                            name="sliders"
                            size={18}
                            color={getActiveFiltersCount() > 0 ? theme.primary : theme.secondaryText}
                        />
                        {getActiveFiltersCount() > 0 && (
                            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                                <Text style={styles.badgeText}>{getActiveFiltersCount()}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Commented out Add Button by User Request */}
                    {/* 
                    <TouchableOpacity
                        onPress={() => setShowIssuePopup(true)}
                        style={[styles.actionBtn, { backgroundColor: theme.avatarBg }]}
                        activeOpacity={0.7}
                    >
                        <Feather name="plus-circle" size={18} color={theme.primary} />
                        <Text style={[styles.actionBtnText, { color: theme.primary }]}>{t('add')}</Text>
                    </TouchableOpacity> 
                    */}
                </View>
            </View>

            {showFilters && (
                <View style={[styles.filtersPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.filterHeader}>
                        <Text style={[styles.filterHeaderText, { color: theme.text }]}>{t('filters')}</Text>
                        <TouchableOpacity onPress={clearAllFilters}>
                            <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>{t('clear_all')}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
                        <View style={styles.filterOptionsContainer}>
                            <View style={styles.filterGroup}>
                                <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>{t('status')}</Text>
                                <View style={styles.chipsRow}>
                                    {filterOptions.statuses.map(s => (
                                        <TouchableOpacity
                                            key={s}
                                            onPress={() => toggleFilter('status', s)}
                                            style={[
                                                styles.chip,
                                                {
                                                    backgroundColor: filters.status.includes(s) ? theme.primary : 'transparent',
                                                    borderColor: filters.status.includes(s) ? theme.primary : theme.border,
                                                }
                                            ]}
                                        >
                                            <Text style={[styles.chipText, { color: filters.status.includes(s) ? '#fff' : theme.text }]}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {filterOptions.projects.length > 0 && (
                                <View style={styles.filterGroup}>
                                    <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>{t('projects')}</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                        <View style={styles.chipsRow}>
                                            {filterOptions.projects.map(p => (
                                                <TouchableOpacity
                                                    key={p}
                                                    onPress={() => toggleFilter('projects', p)}
                                                    style={[
                                                        styles.chip,
                                                        {
                                                            backgroundColor: filters.projects.includes(p) ? theme.primary : 'transparent',
                                                            borderColor: filters.projects.includes(p) ? theme.primary : theme.border,
                                                        }
                                                    ]}
                                                >
                                                    <Text style={[styles.chipText, { color: filters.projects.includes(p) ? '#fff' : theme.text }]}>{p}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </View>
            )}

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <IssueList
                    issues={filteredIssues}
                    onPressIssue={issue => navigation.navigate('IssueDetails', { issueId: issue.id })}
                    styles={styles}
                    theme={theme}
                    onStatusFilter={setStatusTab}
                    statusTab={statusTab}
                    currentUserName={currentUserName}
                    onToggleCritical={handleToggleCritical}
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

            <IssuePopup
                visible={showIssuePopup}
                onClose={() => setShowIssuePopup(false)}
                values={issueForm}
                onChange={(field, value) => setIssueForm(prev => ({ ...prev, [field]: value }))}
                onSubmit={() => setShowIssuePopup(false)}
                projects={projects}
                users={users}
                theme={theme}
                onIssueCreated={() => { setShowIssuePopup(false); refetchIssues(); }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 6,
    },
    headerLeft: {
        flexShrink: 1,
        maxWidth: '40%',
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
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    actionBtnText: { fontSize: 13, fontWeight: '700' },
    searchSection: {
        display: 'none',
    },
    searchBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 48,
        borderWidth: 1,
    },
    searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
    filterTrigger: {
        width: 48,
        height: 48,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
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
    filtersPanel: {
        marginHorizontal: 20,
        marginBottom: 15,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    filterHeaderText: { fontSize: 16, fontWeight: '700' },
    filterOptionsContainer: { gap: 16 },
    filterGroup: { gap: 8 },
    filterLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    horizontalScroll: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    chipText: { fontSize: 13, fontWeight: '600' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
