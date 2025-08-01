import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import IssueList from '../components/issue/IssueList';
import IssuePopup from '../components/popups/IssuePopup';
import { useTheme } from '../theme/ThemeContext';
import { fetchAssignedIssues, fetchCreatedByMeIssues, fetchProjectsByUser, fetchUserConnections } from '../utils/issues';

export default function IssuesScreen({ navigation }) {
    const theme = useTheme();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [section, setSection] = useState('assigned');
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [showIssuePopup, setShowIssuePopup] = useState(false);
    const [viewMode, setViewMode] = useState('assigned'); // 'assigned' or 'created'

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
        let filtered = issues.filter(
            item =>
                (item.issueTitle ? item.issueTitle.toLowerCase() : '').includes(search.toLowerCase()) &&
                (activeTab === 'all' || (activeTab === 'critical' && item.isCritical))
        );
        // Filter by statusTab
        if (statusTab === 'resolved') {
            filtered = filtered.filter(item => item.issueStatus === 'resolved');
        } else if (statusTab === 'unresolved') {
            filtered = filtered.filter(item => item.issueStatus !== 'resolved');
        }
        // Sort: unresolved first, then resolved
        return filtered.sort((a, b) => {
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
                    <Text style={styles.bannerDesc}>All issues assigned or created by you are listed here.</Text>
                </View>
                <TouchableOpacity style={styles.bannerAction} onPress={() => setShowIssuePopup(true)}>
                    <Text style={styles.bannerActionText}>Issue</Text>
                    <Feather name="plus" size={18} color="#fff" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
            </LinearGradient>

            {/* Dynamic Section Tabs */}
            <View style={[styles.tabRow, { borderColor: theme.border }]}>
                {[
                    { key: 'assigned', label: 'Assigned to Me' },
                    { key: 'created', label: 'Created by Me' },
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
            </View>

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
});