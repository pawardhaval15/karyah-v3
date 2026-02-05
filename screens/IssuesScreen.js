import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Components
import IssueList from '../components/issue/IssueList';
import IssuesFilterPanel from '../components/issue/IssuesFilterPanel';
import IssuesHeader from '../components/issue/IssuesHeader';
import IssuePopup from '../components/popups/IssuePopup';

// Hooks
import { useUserConnections } from '../hooks/useConnections';
import { useIssues, useToggleCritical } from '../hooks/useIssues';
import { useIssuesFilter } from '../hooks/useIssuesFilter';
import { useProjects } from '../hooks/useProjects';
import { useIssueStore } from '../store/issueStore';
import { useTheme } from '../theme/ThemeContext';
import { getUserNameFromToken } from '../utils/auth';

/**
 * IssuesScreen - A high-performance, modular screen for managing and filtering issues.
 * Supports searching, multi-criteria filtering, and critical status toggling.
 */
export default function IssuesScreen({ navigation }) {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    // Zustand Store for persistence and global state
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

    // Local UI State
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

    // Data Fetching Hooks
    const {
        data: issues = [],
        isLoading: loadingIssues,
        isError: errorIssues,
        refetch: refetchIssues,
        isRefetching
    } = useIssues();

    const { data: projects = [] } = useProjects();
    const { data: connectionsData = [] } = useUserConnections();
    const toggleCriticalMutation = useToggleCritical();

    // Refetch on focus to ensure data freshness
    useFocusEffect(
        useCallback(() => {
            refetchIssues();
        }, [refetchIssues])
    );

    // Derived State
    const users = connectionsData?.connections || [];
    const isLoading = loadingIssues && issues.length === 0;

    // Fetch user info for UI personalization
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const name = await getUserNameFromToken();
                setCurrentUserName(name);
            } catch (e) {
                console.error('[IssuesScreen] Failed to fetch user name:', e);
            }
        };
        fetchUser();
    }, []);

    // Encapsulated Filtering Logic
    const {
        filteredIssues,
        filterOptions,
        getActiveFiltersCount
    } = useIssuesFilter(issues, searchQuery, filters);

    // Handlers
    const handleRefresh = useCallback(async () => {
        try {
            await Promise.all([
                refetchIssues(),
                queryClient.invalidateQueries({ queryKey: ['projects'] }),
                queryClient.invalidateQueries({ queryKey: ['userConnections'] })
            ]);
        } catch (error) {
            console.error('[IssuesScreen] Refresh failed:', error);
        }
    }, [refetchIssues, queryClient]);

    const handleToggleCritical = useCallback(async (issue, isCritical) => {
        try {
            await toggleCriticalMutation.mutateAsync({
                taskId: issue.id || issue._id || issue.taskId,
                isCritical
            });
        } catch (error) {
            Alert.alert(t('error'), error.message || t('failed_to_update'));
        }
    }, [toggleCriticalMutation, t]);

    const handleFormChange = useCallback((field, value) => {
        setIssueForm(prev => ({ ...prev, [field]: value }));
    }, []);

    // UI Renderers
    if (errorIssues && issues.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Feather name="alert-triangle" size={50} color={theme.secondaryText} />
                <Text style={{ color: theme.text, fontSize: 18, marginTop: 16, fontWeight: '700' }}>{t('something_went_wrong')}</Text>
                <TouchableOpacity
                    onPress={() => refetchIssues()}
                    style={[styles.retryBtn, { backgroundColor: theme.primary }]}
                >
                    <Text style={styles.retryBtnText}>{t('retry')}</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Modular Header */}
            <IssuesHeader
                navigation={navigation}
                theme={theme}
                t={t}
                issuesCount={issues.length}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                activeFiltersCount={getActiveFiltersCount()}
            />

            {/* Modular Filter Panel */}
            {showFilters && (
                <IssuesFilterPanel
                    theme={theme}
                    t={t}
                    filters={filters}
                    filterOptions={filterOptions}
                    toggleFilter={toggleFilter}
                    clearAllFilters={clearAllFilters}
                />
            )}

            {/* Main Content */}
            {isLoading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <IssueList
                    issues={filteredIssues}
                    onPressIssue={issue => navigation.navigate('IssueDetails', { issueId: issue.id || issue._id || issue.taskId })}
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

            {/* Creation Popup */}
            <IssuePopup
                visible={showIssuePopup}
                onClose={() => setShowIssuePopup(false)}
                values={issueForm}
                onChange={handleFormChange}
                onSubmit={() => setShowIssuePopup(false)}
                projects={projects}
                users={users}
                theme={theme}
                onIssueCreated={() => {
                    setShowIssuePopup(false);
                    refetchIssues();
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    retryBtn: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
    },
    retryBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
    }
});
