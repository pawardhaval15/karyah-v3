import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Platform,
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
import { useCreateIssue, useIssues, useToggleCritical } from '../hooks/useIssues';
import { useProjects } from '../hooks/useProjects';
import { useTheme } from '../theme/ThemeContext';
import { getUserNameFromToken } from '../utils/auth';

export default function IssuesScreen({ navigation }) {
    const theme = useTheme();
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [statusTab, setStatusTab] = useState('all');
    const [currentUserName, setCurrentUserName] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showIssuePopup, setShowIssuePopup] = useState(false);

    // Filter State
    const [filters, setFilters] = useState({
        status: [],
        projects: [],
        createdBy: [],
        locations: [],
    });

    const [issueForm, setIssueForm] = useState({
        title: '',
        description: '',
        projectId: '',
        assignTo: '',
        dueDate: '',
        isCritical: false,
    });

    // React Query Hooks
    const { data: issues = [], isLoading: loadingIssues, refetch: refetchIssues, isRefetching } = useIssues();
    const { data: projects = [], isLoading: loadingProjects } = useProjects();
    const { data: connectionsData = [] } = useUserConnections();
    const toggleCriticalMutation = useToggleCritical();
    const createIssueMutation = useCreateIssue();

    // Map connections correctly
    const users = useMemo(() => connectionsData.connections || [], [connectionsData]);

    const loading = loadingIssues && issues.length === 0;

    // Fetch user info on mount
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

    // Filter Logic
    const toggleFilter = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: prev[filterType].includes(value)
                ? prev[filterType].filter(item => item !== value)
                : [...prev[filterType], value],
        }));
    };

    const clearAllFilters = () => {
        setFilters({
            status: [],
            projects: [],
            createdBy: [],
            locations: [],
        });
    };

    const getActiveFiltersCount = () => {
        return Object.values(filters).reduce((count, arr) => count + arr.length, 0);
    };

    // Memoized Filtered Issues
    const filteredIssues = useMemo(() => {
        return issues.filter(item => {
            const searchText = (item.name || '').toLowerCase();
            const matchesSearch = searchText.includes(search.toLowerCase());

            const currentStatus = item.status;
            const matchesStatus = filters.status.length === 0 || filters.status.includes(currentStatus);

            const projectName = item.project?.projectName || item.projectName || '';
            const matchesProject = filters.projects.length === 0 || filters.projects.includes(projectName);

            const creatorName = item.creatorName || item.creator?.name || '';
            const matchesCreator = filters.createdBy.length === 0 || filters.createdBy.includes(creatorName);

            const location = item.project?.location || item.projectLocation || '';
            const matchesLocation = filters.locations.length === 0 || filters.locations.includes(location);

            return matchesSearch && matchesStatus && matchesProject && matchesCreator && matchesLocation;
        });
    }, [issues, search, filters]);

    // Derive filter options from current issues
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

    const handleRefresh = useCallback(() => {
        refetchIssues();
    }, [refetchIssues]);

    const handleToggleCritical = async (issue, isCritical) => {
        try {
            await toggleCriticalMutation.mutateAsync({
                taskId: issue.id,
                isCritical
            });
            Alert.alert(t('success'), t('critical_status_updated'));
        } catch (error) {
            Alert.alert(t('error'), error.message || t('failed_to_update'));
        }
    };

    const handleIssueCreated = async (newIssue) => {
        setShowIssuePopup(false);
        setIssueForm({
            title: '',
            description: '',
            projectId: '',
            assignTo: '',
            dueDate: '',
            isCritical: false,
        });
        refetchIssues();
    };

    const handleIssueSubmit = () => {
        setShowIssuePopup(false);
    };

    const handleIssueChange = (field, value) => {
        setIssueForm(prev => ({ ...prev, [field]: value }));
    };

    const handleDateSelect = () => {
        // This will be handled inside IssuePopup or via another picker
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header / Back */}
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
                    <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
                </TouchableOpacity>
            </View>

            {/* Banner */}
            <LinearGradient
                colors={theme.dark ? ['#1A3E2F', '#011F53'] : ['#011F53', '#366CD9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.banner}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>{t('issues')}</Text>
                    <Text style={styles.bannerDesc}>
                        {/* {issues.length}  */}
                        {t('all_issues_assigned_or_created_by_you_are_listed_here')}
                    </Text>
                </View>
                {/* <TouchableOpacity
                    style={styles.fabHeader}
                    onPress={() => setShowIssuePopup(true)}
                >
                    <MaterialIcons name="add" size={24} color="#fff" />
                </TouchableOpacity> */}
            </LinearGradient>

            {/* Search & Filter Trigger */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar || (theme.dark ? '#333' : '#f7f7f7') }]}>
                    <MaterialIcons name="search" size={20} color={theme.secondaryText} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder={t("search_placeholder_issues")}
                        placeholderTextColor={theme.secondaryText}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <MaterialIcons name="close" size={18} color={theme.secondaryText} />
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    style={[
                        styles.filterTrigger,
                        {
                            borderColor: getActiveFiltersCount() > 0 ? theme.primary : theme.border,
                            backgroundColor: getActiveFiltersCount() > 0 ? theme.primary + '10' : 'transparent',
                        },
                    ]}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <MaterialIcons
                        name="tune"
                        size={20}
                        color={getActiveFiltersCount() > 0 ? theme.primary : theme.secondaryText}
                    />
                    {getActiveFiltersCount() > 0 && (
                        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.badgeText}>{getActiveFiltersCount()}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Compact Filters Panel */}
            {showFilters && (
                <View style={[styles.filtersPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.filterHeader}>
                        <Text style={[styles.filterHeaderText, { color: theme.text }]}>{t('filters')}</Text>
                        <TouchableOpacity onPress={clearAllFilters}>
                            <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 13 }}>{t('clear_all')}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filterOptionsContainer}>
                        {/* Status Chips */}
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
                                                backgroundColor: filters.status.includes(s) ? theme.primary : theme.background,
                                                borderColor: filters.status.includes(s) ? theme.primary : theme.border,
                                            }
                                        ]}
                                    >
                                        <Text style={[styles.chipText, { color: filters.status.includes(s) ? '#fff' : theme.text }]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Projects Chips (Only show top 5 or use horizontal scroll) */}
                        {filterOptions.projects.length > 0 && (
                            <View style={styles.filterGroup}>
                                <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>{t('projects')}</Text>
                                <View style={styles.chipsRow}>
                                    {filterOptions.projects.slice(0, 6).map(p => (
                                        <TouchableOpacity
                                            key={p}
                                            onPress={() => toggleFilter('projects', p)}
                                            style={[
                                                styles.chip,
                                                {
                                                    backgroundColor: filters.projects.includes(p) ? theme.primary : theme.background,
                                                    borderColor: filters.projects.includes(p) ? theme.primary : theme.border,
                                                }
                                            ]}
                                        >
                                            <Text style={[styles.chipText, { color: filters.projects.includes(p) ? '#fff' : theme.text }]} numberOfLines={1}>
                                                {p}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Created By Chips */}
                        {filterOptions.creators.length > 0 && (
                            <View style={styles.filterGroup}>
                                <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>{t('created_by') || 'Created By'}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                    <View style={styles.chipsRow}>
                                        {filterOptions.creators.map(person => (
                                            <TouchableOpacity
                                                key={person}
                                                style={[
                                                    styles.chip,
                                                    {
                                                        backgroundColor: filters.createdBy.includes(person) ? theme.primary : 'transparent',
                                                        borderColor: filters.createdBy.includes(person) ? theme.primary : theme.border,
                                                    },
                                                ]}
                                                onPress={() => toggleFilter('createdBy', person)}>
                                                <Text style={[styles.chipText, { color: filters.createdBy.includes(person) ? '#fff' : theme.text }]} numberOfLines={1}>
                                                    {person}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                        {/* Location Chips */}
                        {filterOptions.locations.length > 0 && (
                            <View style={styles.filterGroup}>
                                <Text style={[styles.filterLabel, { color: theme.secondaryText }]}>{t('location')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                    <View style={styles.chipsRow}>
                                        {filterOptions.locations.map(loc => (
                                            <TouchableOpacity
                                                key={loc}
                                                style={[
                                                    styles.chip,
                                                    {
                                                        backgroundColor: filters.locations.includes(loc) ? theme.primary : 'transparent',
                                                        borderColor: filters.locations.includes(loc) ? theme.primary : theme.border,
                                                    },
                                                ]}
                                                onPress={() => toggleFilter('locations', loc)}>
                                                <Text style={[styles.chipText, { color: filters.locations.includes(loc) ? '#fff' : theme.text }]} numberOfLines={1}>
                                                    {loc}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* List Section */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{ color: theme.secondaryText, marginTop: 10 }}>{t('loading_issues')}</Text>
                </View>
            ) : (
                <IssueList
                    issues={filteredIssues}
                    onPressIssue={issue => navigation.navigate('IssueDetails', {
                        issueId: issue.id
                    })}
                    styles={styles}
                    theme={theme}
                    onStatusFilter={setStatusTab}
                    statusTab={statusTab}
                    currentUserName={currentUserName}
                    onToggleCritical={handleToggleCritical}
                    refreshing={isRefetching}
                    onRefresh={handleRefresh}
                />
            )}

            <IssuePopup
                visible={showIssuePopup}
                onClose={() => setShowIssuePopup(false)}
                values={issueForm}
                onChange={handleIssueChange}
                onSubmit={handleIssueSubmit}
                projects={projects}
                onSelectDate={handleDateSelect}
                users={users}
                theme={theme}
                onIssueCreated={handleIssueCreated}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerRow: {
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    backText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 4,
    },
    banner: {
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    bannerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    bannerDesc: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    fabHeader: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 15,
        gap: 10,
    },
    searchBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 48,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
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
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    filtersPanel: {
        marginHorizontal: 16,
        marginBottom: 15,
        borderRadius: 15,
        padding: 15,
        borderWidth: 1,
        // Glassmorphism effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    filterHeaderText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    filterOptionsContainer: {
        gap: 12,
    },
    filterGroup: {
        gap: 6,
    },
    filterLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    horizontalScroll: {
        marginHorizontal: -15,
        paddingHorizontal: 15,
    },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Required from old styles but mapped to new logic
    issueCard: {},
    issueIcon: {},
    issueIconText: {},
    issueName: {},
    issueRow: {},
    issueTitleRow: {},
    issueInfo: {},
    criticalTag: {},
    criticalTagText: {},
});
