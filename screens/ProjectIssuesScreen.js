import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import IssueList from '../components/issue/IssueList';
import ProjectIssuePopup from '../components/popups/ProjectIssuePopup';
import { useTheme } from '../theme/ThemeContext';
import { getIssuesByProjectId, fetchCreatedByMeIssues, fetchProjectsByUser, fetchUserConnections } from '../utils/issues';
import { Platform } from 'react-native';

export default function ProjectIssuesScreen({ navigation, route }) {
    const { projectId } = route.params || {};

    const theme = useTheme();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');  // This covers "all", "critical", "resolved", "unresolved", "pending_approval"
    const [section, setSection] = useState('assigned'); // Currently only "assigned" used for project issues
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [showProjectIssuePopup, setShowProjectIssuePopup] = useState(false);

    const [issueForm, setIssueForm] = useState({
        title: '',
        description: '',
        projectId: '',
        assignTo: '',
        dueDate: '',
        isCritical: false,
    });

    const [issuesByProjectId, setIssuesByProjectId] = useState([]);
    const [createdIssues, setCreatedIssues] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const [projectIssues, created, projects, connections] = await Promise.all([
                    getIssuesByProjectId(projectId),
                    fetchCreatedByMeIssues(),
                    fetchProjectsByUser(),
                    fetchUserConnections()
                ]);
                setIssuesByProjectId(projectIssues || []);
                setCreatedIssues(created || []);
                setProjects(projects || []);
                setUsers(connections || []);
            } catch (e) {
                console.error("Error fetching issues:", e);
                setIssuesByProjectId([]);
                setCreatedIssues([]);
                setProjects([]);
                setUsers([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [projectId]);

    // Filter function applying search filter only here,
    // let IssueList handle detailed status filtering internally — recommended for single source of truth
    const filterBySearch = (issues) => {
        return issues.filter(item =>
            (item.issueTitle ? item.issueTitle.toLowerCase() : '').includes(search.toLowerCase())
        );
    };

    // Apply search filtering only
    const filteredAssigned = filterBySearch(issuesByProjectId);
    const filteredCreated = filterBySearch(createdIssues);

    /*
    // Optional: If you prefer full filtering here (search + status), use this approach and pass it to IssueList:
    const filterAndStatus = (issues) => {
        let filtered = issues.filter(item =>
            (item.issueTitle ? item.issueTitle.toLowerCase() : '').includes(search.toLowerCase())
        );

        if (activeTab !== 'all') {
            switch (activeTab) {
                case 'critical':
                    filtered = filtered.filter(item => item.isCritical);
                    break;
                case 'resolved':
                    filtered = filtered.filter(item => item.issueStatus === 'resolved');
                    break;
                case 'unresolved':
                    filtered = filtered.filter(item => item.issueStatus === 'unresolved');
                    break;
                case 'pending_approval':
                    filtered = filtered.filter(item => item.issueStatus === 'pending_approval');
                    break;
                default:
                    break;
            }
        }

        return filtered;
    };

    const filteredAssigned = filterAndStatus(issuesByProjectId);
    const filteredCreated = filterAndStatus(createdIssues);
    */

    const handleIssueChange = (field, value) => {
        setIssueForm(prev => ({ ...prev, [field]: value }));
    };

    const handleDateSelect = () => {
        // Your date picker logic here
        console.log("Open date picker");
    };

    const handleIssueCreated = (newIssue) => {
        if (section === 'assigned') {
            setIssuesByProjectId(prev => [newIssue, ...prev]);
        } else {
            setCreatedIssues(prev => [newIssue, ...prev]);
        }

        setShowProjectIssuePopup(false);

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
        setShowProjectIssuePopup(false);

        setIssueForm({
            title: '',
            description: '',
            projectId: '',
            assignTo: '',
            dueDate: '',
            isCritical: false,
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.background }}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <MaterialIcons name="arrow-back-ios" size={20} color={theme.text} />
                <Text style={[styles.backText, { color: theme.text }]}>Back</Text>
            </TouchableOpacity>

            <LinearGradient
                colors={['#011F53', '#366CD9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.banner}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>Issues</Text>
                    <Text style={styles.bannerDesc}>
                        View all issues raised under this project or created by you.
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.bannerAction}
                    onPress={() => {
                        setIssueForm(prev => ({
                            ...prev,
                            projectId, // auto-set projectId
                        }));
                        setShowProjectIssuePopup(true);
                    }}
                >
                    <Text style={styles.bannerActionText}>Issue</Text>
                    <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
            </LinearGradient>

            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        section === 'assigned' && [styles.activeTab, { backgroundColor: theme.primary, borderColor: theme.primary }],
                    ]}
                    onPress={() => setSection('assigned')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            section === 'assigned' ? { color: '#fff' } : { color: theme.secondaryText },
                        ]}
                    >
                        Issues by Project
                    </Text>
                </TouchableOpacity>
                {/* If you want to re-enable created tab, uncomment below:
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        section === 'created' && [styles.activeTab, { backgroundColor: theme.primary, borderColor: theme.primary }],
                    ]}
                    onPress={() => setSection('created')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            section === 'created' ? { color: '#fff' } : { color: theme.secondaryText },
                        ]}
                    >
                        Created by Me
                    </Text>
                </TouchableOpacity>
                */}
            </View>

            {/* Search bar */}
            <View style={[styles.searchBarContainer, { backgroundColor: theme.SearchBar }]}>
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search your issues"
                    placeholderTextColor={theme.secondaryText}
                    value={search}
                    onChangeText={setSearch}
                />
                <Ionicons name="search" size={22} color={theme.text} style={styles.searchIcon} />
            </View>

            {/* Filter tabs: All and Critical (extend as needed) */}
            <View style={styles.tabRow}>
                {/* {['all', 'critical', 'resolved', 'unresolved', 'pending_approval'].map(tabKey => {
                    // Labels for each tab
                    const labels = {
                        all: 'All',
                        critical: 'Critical',
                        resolved: 'Resolved',
                        unresolved: 'Unresolved',
                        pending_approval: 'Pending Approval',
                    };
                    // Count of issues per tab for display
                    const count =
                        section === 'assigned'
                            ? issuesByProjectId.filter(issue => {
                                  if (tabKey === 'all') return true;
                                  if (tabKey === 'critical') return issue.isCritical;
                                  return issue.issueStatus === tabKey;
                            }).length
                            : createdIssues.filter(issue => {
                                  if (tabKey === 'all') return true;
                                  if (tabKey === 'critical') return issue.isCritical;
                                  return issue.issueStatus === tabKey;
                            }).length;

                    return (
                        <TouchableOpacity
                            key={tabKey}
                            style={[
                                styles.tabButton,
                                activeTab === tabKey && [styles.activeTab, { backgroundColor: theme.primary, borderColor: theme.primary }],
                            ]}
                            onPress={() => setActiveTab(tabKey)}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === tabKey ? { color: '#fff' } : { color: theme.secondaryText },
                                ]}
                            >
                                {labels[tabKey]}
                                <Text style={[
                                    styles.countsmall,
                                    activeTab === tabKey ? { color: '#fff' } : { color: theme.secondaryText },
                                ]}>
                                    {' '}{count}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    );
                })} */}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
            ) : (
                <IssueList
                    issues={section === 'assigned' ? filteredAssigned : filteredCreated}
                    onPressIssue={issue => navigation.navigate('IssueDetails', { issueId: issue.issueId, section })}
                    styles={styles}
                    theme={theme}
                    section={section}
                    onStatusFilter={setActiveTab}
                    statusTab={activeTab}
                />
            )}

            <ProjectIssuePopup
                visible={showProjectIssuePopup}
                onClose={() => setShowProjectIssuePopup(false)}
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
        alignSelf: 'flex-start',
        gap: 6,
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
        fontSize: 16,
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
        paddingHorizontal: 20,
        borderRadius: 20,
        marginRight: 6,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    activeTab: {
        backgroundColor: '#366CD9',
    },
    tabText: {
        fontSize: 15,
        fontWeight: '400',
        color: '#666',
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
});