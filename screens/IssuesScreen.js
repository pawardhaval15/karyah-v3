import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    RefreshControl,
    Text,
    TextInput,
    TouchableOpacity,
    View, ScrollView,
} from 'react-native';
import IssueList from '../components/issue/IssueList';
import IssuePopup from '../components/popups/IssuePopup';
import { useTheme } from '../theme/ThemeContext';
import { fetchAssignedIssues, fetchCreatedByMeIssues, fetchProjectsByUser, fetchUserConnections } from '../utils/issues';
import { useTranslation } from 'react-i18next';
export default function IssuesScreen({ navigation }) {
    const theme = useTheme();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [section, setSection] = useState('assigned');
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [showIssuePopup, setShowIssuePopup] = useState(false);
    const [viewMode, setViewMode] = useState('assigned'); // 'assigned' or 'created'
    const [refreshing, setRefreshing] = useState(false);
    const { t } = useTranslation();
    const [issueForm, setIssueForm] = useState({
        title: '',
        description: '',
        projectId: '',    // <-- add this
        assignTo: '',
        dueDate: '',
        isCritical: false,
    });

    const [assignedIssues, setAssignedIssues] = useState([]);
    const [createdIssues, setCreatedIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusTab, setStatusTab] = useState('all'); // 'all', 'resolved', 'unresolved'
    const [filters, setFilters] = useState({
        status: [],
        progress: [],     // Optional: if progress applies to issues
        projects: [],
        assignedTo: [],
        locations: [], // Optional: if you have location-based filtering
    });
    // Show/hide filters panel
    const [showFilters, setShowFilters] = useState(false);
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
            progress: [],
            projects: [],
            assignedTo: [],
            locations: [], // Reset all filters
        });
    };
    const getActiveFiltersCount = () => {
        return Object.values(filters).reduce((count, filterArray) => count + filterArray.length, 0);
    };
    const currentIssues = section === 'assigned' ? assignedIssues : createdIssues;
    const statuses = Array.from(new Set(currentIssues.map(issue => issue.issueStatus).filter(Boolean)));
    const projectOptions = Array.from(new Set(currentIssues.map(issue => issue.projectName || issue.project?.name).filter(Boolean)));
    const assignedOptions = Array.from(new Set(
        section === 'assigned'
            ? currentIssues.map(issue => issue.creatorName || issue.creator?.name).filter(Boolean)
            : currentIssues.map(issue => issue.assignToUserName || issue.assignTo?.name).filter(Boolean)
    ));
    const locationOptions = Array.from(
        new Set(currentIssues.map(issue => issue.projectLocation).filter(Boolean))
    );


    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            // You can use your fetchData logic from useFocusEffect for full reload:
            const token = await AsyncStorage.getItem('token');
            const [assigned, created, projects, connections] = await Promise.all([
                fetchAssignedIssues(),
                fetchCreatedByMeIssues(),
                fetchProjectsByUser(),
                fetchUserConnections()
            ]);
            console.log(`Fetched assignedIssues: ${assigned ? assigned.length : 0}`);
            setAssignedIssues(assigned || []);
            setCreatedIssues(created || []);
            setProjects(projects || []);
            setUsers(connections || []);
        } catch (e) {
            setAssignedIssues([]);
            setCreatedIssues([]);
            setProjects([]);
            setUsers([]);
        } finally {
            setRefreshing(false);
            setLoading(false);
        }
    };
    // Refetch issues on mount and when coming back from details with refresh param
    useFocusEffect(
        React.useCallback(() => {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const token = await AsyncStorage.getItem('token');
                    const [assigned, created, projects, connections] = await Promise.all([
                        fetchAssignedIssues(),
                        fetchCreatedByMeIssues(),
                        fetchProjectsByUser(),
                        fetchUserConnections()
                    ]);
                    setAssignedIssues(assigned || []);
                    setCreatedIssues(created || []);
                    setProjects(projects || []);
                    setUsers(connections || []);
                } catch (e) {
                    setAssignedIssues([]);
                    setCreatedIssues([]);
                    setProjects([]);
                    setUsers([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }, [])
    );

    const filterAndSortIssues = (issues) => {
        return issues
            .filter(item => {
                const searchMatch = (item.issueTitle || '').toLowerCase().includes(search.toLowerCase());
                const activeTabMatch = activeTab === 'all' || (activeTab === 'critical' && item.isCritical);

                // Status filter OR all if filters.status empty
                const statusMatch = filters.status.length === 0 || filters.status.includes(item.issueStatus);

                // Progress filter (adjust if issues have progress)
                const progressMatch = filters.progress.length === 0 || filters.progress.some(range => {
                    const progress = item.progress ?? 0;
                    switch (range) {
                        case 'not-started': return progress === 0;
                        case 'in-progress': return progress > 0 && progress < 100;
                        case 'completed': return progress === 100;
                        default: return false;
                    }
                });
                // Projects filter
                const issueProjectName = item.projectName || item.project?.name || '';
                const projectMatch = filters.projects.length === 0 || filters.projects.includes(issueProjectName);
                // AssignedTo filter (depends on section)
                let assignedMatch = true;
                if (filters.assignedTo.length > 0) {
                    if (section === 'assigned') {
                        const creatorName = item.creatorName || item.creator?.name || '';
                        assignedMatch = filters.assignedTo.includes(creatorName);
                    } else {
                        const assignedToName = item.assignToUserName || item.assignTo?.name || '';
                        assignedMatch = filters.assignedTo.includes(assignedToName);
                    }
                }
                const location = item.projectLocation || '';  // use projectLocation field
                const locationMatch =
                    filters.locations.length === 0 ||
                    filters.locations.includes(location);

                return searchMatch && activeTabMatch && statusMatch && progressMatch && projectMatch && assignedMatch && locationMatch;
            })
            .sort((a, b) => {
                // Unresolved first, then resolved
                const aResolved = a.issueStatus === 'resolved';
                const bResolved = b.issueStatus === 'resolved';
                if (aResolved === bResolved) return 0;
                return aResolved ? 1 : -1;
            });
    };

    const filteredAssigned = filterAndSortIssues(assignedIssues);
    const filteredCreated = filterAndSortIssues(createdIssues);

    const handleIssueChange = (field, value) => {
        setIssueForm(prev => ({ ...prev, [field]: value }));
    };
    const handleDateSelect = () => {
        // Use your preferred date picker here
        console.log("Open date picker");
        // Example with DateTimePickerModal or native DatePickerAndroid/DatePickerIOS
    };
    const handleIssueCreated = async (newIssue) => {
        // After creating a new issue, refresh the issues from the API for up-to-date data
        setLoading(true);
        try {
            const [assigned, created] = await Promise.all([
                fetchAssignedIssues(),
                fetchCreatedByMeIssues()
            ]);
            setAssignedIssues(assigned || []);
            setCreatedIssues(created || []);
        } catch (e) {
            setAssignedIssues([]);
            setCreatedIssues([]);
        } finally {
            setLoading(false);
        }
        setShowIssuePopup(false);
        setIssueForm({
            title: '',
            description: '',
            projectId: '',
            assignTo: '',
            dueDate: '',
            isCritical: false,
        });
    };

    const handleIssueSubmit = () => {
        setShowIssuePopup(false);
        setIssueForm({
            title: '',
            description: '',
            projectId: '',    // <-- reset this too
            assignTo: '',
            dueDate: '',
            isCritical: false,
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
                <Text style={[styles.backText, { color: theme.text }]}>{t('back')}</Text>
            </TouchableOpacity>

            <LinearGradient
                colors={['#011F53', '#366CD9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.banner}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>{t('issues')}</Text>
                    <Text style={styles.bannerDesc}>{t('all_issues_assigned_or_created_by_you_are_listed_here')}</Text>
                </View>
                <TouchableOpacity style={styles.bannerAction} onPress={() => setShowIssuePopup(true)}>
                    <Text style={styles.bannerActionText}>{t('issue')}</Text>
                    <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
            </LinearGradient>
            {/* Dynamic Section Tabs */}
            <View style={[styles.tabRow, { borderColor: theme.border }]}>
                {[
                    { key: 'assigned', label: t('assigned_to_me') },
                    { key: 'created', label: t('created_by_me') },
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[
                            styles.tabButton,
                            { borderColor: theme.border },
                            section === tab.key && [styles.activeTab, { backgroundColor: theme.primary, borderColor: theme.border }]
                        ]}
                        onPress={() => setSection(tab.key)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                section === tab.key ? { color: '#fff' } : { color: theme.secondaryText, borderColor: theme.border }
                            ]}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            {/* Search */}
            <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search your issues"
                    placeholderTextColor={theme.secondaryText}
                    value={search}
                    onChangeText={setSearch}
                />
                {/* <Ionicons name="search" size={22} color={theme.text} style={styles.searchIcon} /> */}
                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        {
                            backgroundColor: getActiveFiltersCount() > 0 ? theme.primary + '15' : 'transparent',
                            borderColor: getActiveFiltersCount() > 0 ? theme.primary : theme.border,
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
                        <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
                        </View>
                    )}
                </TouchableOpacity>

            </View>
            {showFilters && (
                <View style={[styles.filtersPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.filterHeader}>
                        <Text style={[styles.filterHeaderText, { color: theme.text }]}>{t('filters')}</Text>
                        <View style={styles.filterHeaderActions}>
                            <TouchableOpacity onPress={clearAllFilters} style={styles.clearFiltersBtn}>
                                <Text style={[styles.clearFiltersText, { color: theme.primary }]}>{t('clear')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowFilters(false)} style={styles.closeBtn}>
                                <MaterialIcons name="close" size={16} color={theme.secondaryText} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView style={styles.filtersScrollView} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                        {/* Status Filter */}
                        {statuses.length > 0 && (
                            <View style={styles.compactFilterSection}>
                                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>{t('status')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                    <View style={styles.compactChipsRow}>
                                        {statuses.map(status => (
                                            <TouchableOpacity
                                                key={status}
                                                style={[
                                                    styles.compactChip,
                                                    {
                                                        backgroundColor: filters.status.includes(status) ? theme.primary : 'transparent',
                                                        borderColor: filters.status.includes(status) ? theme.primary : theme.border,
                                                    },
                                                ]}
                                                onPress={() => toggleFilter('status', status)}>
                                                <Text style={[styles.compactChipText, { color: filters.status.includes(status) ? '#fff' : theme.text }]}>
                                                    {status}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}
                        {/* Projects Filter */}
                        {projectOptions.length > 0 && (
                            <View style={styles.compactFilterSection}>
                                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>{t('projects')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                    <View style={styles.compactChipsRow}>
                                        {projectOptions.map(project => (
                                            <TouchableOpacity
                                                key={project}
                                                style={[
                                                    styles.compactChip,
                                                    {
                                                        backgroundColor: filters.projects.includes(project) ? theme.primary : 'transparent',
                                                        borderColor: filters.projects.includes(project) ? theme.primary : theme.border,
                                                    },
                                                ]}
                                                onPress={() => toggleFilter('projects', project)}>
                                                <Text
                                                    style={[styles.compactChipText, { color: filters.projects.includes(project) ? '#fff' : theme.text }]}
                                                    numberOfLines={1}>
                                                    {project.length > 10 ? project.substring(0, 10) + '...' : project}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                        {/* Assigned To/By Filter */}
                        {assignedOptions.length > 0 && (
                            <View style={styles.compactFilterSection}>
                                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>
                                    {section === 'assigned' ? t('assigned_by') : t('assigned_to')}
                                </Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                    <View style={styles.compactChipsRow}>
                                        {assignedOptions.map(person => (
                                            <TouchableOpacity
                                                key={person}
                                                style={[
                                                    styles.compactChip,
                                                    {
                                                        backgroundColor: filters.assignedTo.includes(person) ? theme.primary : 'transparent',
                                                        borderColor: filters.assignedTo.includes(person) ? theme.primary : theme.border,
                                                    },
                                                ]}
                                                onPress={() => toggleFilter('assignedTo', person)}>
                                                <Text style={[styles.compactChipText, { color: filters.assignedTo.includes(person) ? '#fff' : theme.text }]} numberOfLines={1}>
                                                    {person.length > 8 ? person.substring(0, 8) + '...' : person}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}
                        {/* Location Filter */}
                        {locationOptions.length > 0 && (
                            <View style={styles.compactFilterSection}>
                                <Text style={[styles.compactFilterTitle, { color: theme.text }]}>{t('location')}</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.horizontalScroll}
                                >
                                    <View style={styles.compactChipsRow}>
                                        {locationOptions.map(location => (
                                            <TouchableOpacity
                                                key={location}
                                                style={[
                                                    styles.compactChip,
                                                    {
                                                        backgroundColor: filters.locations.includes(location)
                                                            ? theme.primary
                                                            : 'transparent',
                                                        borderColor: filters.locations.includes(location)
                                                            ? theme.primary
                                                            : theme.border,
                                                    },
                                                ]}
                                                onPress={() => toggleFilter('locations', location)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.compactChipText,
                                                        {
                                                            color: filters.locations.includes(location)
                                                                ? '#fff'
                                                                : theme.text,
                                                        },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {location.length > 10 ? location.substring(0, 10) + '...' : location}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        )}

                    </ScrollView>
                </View>
            )}
            {/* Issue List */}
            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
            ) : (
                <IssueList
                    issues={section === 'assigned' ? filteredAssigned : filteredCreated}
                    onPressIssue={issue => navigation.navigate('IssueDetails', { issueId: issue.issueId, section })}
                    styles={styles}
                    theme={theme}
                    section={section}
                    onStatusFilter={setStatusTab}
                    statusTab={statusTab}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
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
                onChange={handleIssueChange}
                onSubmit={handleIssueSubmit}
                projects={projects}
                onSelectDate={handleDateSelect} // ← PASS IT
                users={users}
                theme={theme}
                onIssueCreated={handleIssueCreated} // <-- pass the handler
            />
        </View>
    );
}

const styles = StyleSheet.create({
    toggleWrapper: {
        marginHorizontal: 20,
        marginTop: 6,
        marginBottom: 12,
        maxWidth: "60%"
    },
    toggleContainer: {
        flexDirection: 'row',
        borderRadius: 12,
        overflow: 'hidden',
        padding: 2,
    },
    toggleOption: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
    },
    backBtn: {
        marginTop: Platform.OS === 'ios' ? 70 : 25,
        marginLeft: 16,
        marginBottom: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
    },
    backText: {
        fontSize: 18,
        color: '#222',
        fontWeight: '500',
        marginLeft: 2,
    },
    banner: {
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        minHeight: 110,
    },
    bannerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 2,
    },
    bannerDesc: {
        color: '#e6eaf3',
        fontSize: 14,
        fontWeight: '400',
        maxWidth: "80%"
    },
    bannerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    bannerActionText: {
        color: '#fff',
        fontWeight: '400',
        fontSize: 15,
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginBottom: 0,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#363942',
    },
    count: {
        color: '#222',
        fontWeight: '600',
        fontSize: 20,
        marginLeft: 8,
    },
    countsmall: {
        color: '#222',
        fontWeight: '400',
        fontSize: 14,
        marginLeft: 8,
    },
    viewAll: {
        color: '#366CD9',
        fontWeight: '400',
        fontSize: 14,
    },
    tabRow: {
        flexDirection: 'row',
        marginTop: 4,
        marginHorizontal: 20,
        marginBottom: 14,
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginRight: 6,
        borderWidth: 1,
    },
    activeTab: {
        backgroundColor: '#366CD9',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '400',
    },
    activeTabText: {
        color: '#fff',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f7f7f7',
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: "400",
        color: '#363942',
        paddingVertical: 0,
    },
    searchIcon: {
        marginLeft: 8,
    },
    issueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        marginBottom: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e6eaf3',
    },
    issueIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F2F6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    issueIconText: {
        color: '#366CD9',
        fontWeight: '600',
        fontSize: 20,
    },
    issueName: {
        color: '#222',
        fontWeight: '500',
        fontSize: 16,
        marginBottom: 2,
    },
    issueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    issueTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    issueInfo: {
        color: '#666',
        fontSize: 13,
        marginLeft: 5,
        fontWeight: '400',
    },
    criticalTag: {
        backgroundColor: '#FEE2E2',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 8,
    },
    criticalTagText: {
        color: '#E67514',
        fontWeight: 'bold',
        fontSize: 12,
    },
    chevronBox: {
        marginLeft: 10,
    },
    filterButton: {
        position: 'relative',
        marginLeft: 8,
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    filterBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    filtersPanel: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        maxHeight: 180,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    filterHeaderText: {
        fontSize: 16,
        fontWeight: '600',
    },
    filterHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    clearFiltersBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    clearFiltersText: {
        fontSize: 12,
        fontWeight: '600',
    },
    closeBtn: {
        padding: 4,
        borderRadius: 4,
    },
    filtersScrollView: {
        maxHeight: 120,
    },
    compactFilterSection: {
        marginBottom: 12,
    },
    compactFilterTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        opacity: 0.8,
    },
    horizontalScroll: {
        flexGrow: 0,
    },
    compactChipsRow: {
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: 2,
    },
    compactChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        minHeight: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    compactChipText: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
    filteredResultsText: {
        fontSize: 12,
        textAlign: 'center',
        marginVertical: 8,
        fontStyle: 'italic',
    },
});