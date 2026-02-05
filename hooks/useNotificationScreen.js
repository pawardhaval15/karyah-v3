import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/uiStore';
import {
    useAcceptConnection,
    usePendingRequests,
    useRejectConnection
} from './useConnections';
import {
    useMarkAllNotificationsAsRead,
    useMarkNotificationAsRead,
    useNotifications
} from './useNotifications';

export const useNotificationScreen = (defaultTab = 'ALL') => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { homeRefreshing, setHomeRefreshing } = useUIStore();

    const [activeTab, setActiveTab] = useState(defaultTab.toUpperCase());

    // Data Fetching
    const {
        data: notifications = [],
        isLoading: notifsLoading,
        refetch: refetchNotifs
    } = useNotifications();

    const {
        data: pendingRequests = [],
        isLoading: requestsLoading,
        refetch: refetchRequests
    } = usePendingRequests();

    // Mutations
    const markAsRead = useMarkNotificationAsRead();
    const markAllAsRead = useMarkAllNotificationsAsRead();
    const acceptReq = useAcceptConnection();
    const rejectReq = useRejectConnection();

    const isLoadingInitial = (notifsLoading || requestsLoading) && notifications.length === 0 && pendingRequests.length === 0;

    // Tabs logic
    const tabFilters = useMemo(() => [
        { key: 'ALL', label: t('all'), count: notifications.filter(n => !n.read).length },
        { key: 'CRITICAL', label: t('critical'), count: notifications.filter(n => (n.type?.toLowerCase() === 'issue' || n.type?.toLowerCase() === 'critical') && !n.read).length },
        { key: 'TASK', label: t('task'), count: notifications.filter(n => (n.type === 'task' || n.type === 'task_message') && !n.read).length },
        { key: 'PROJECT', label: t('project'), count: notifications.filter(n => ['coadmin_added', 'project_updated', 'discussion'].includes(n.type) && !n.read).length },
        { key: 'CONNECTIONS', label: t('connections'), count: pendingRequests.length },
    ], [notifications, pendingRequests, t]);

    const activeTabs = useMemo(() =>
        tabFilters.filter(tab => tab.key === 'CONNECTIONS' ? tab.count > 0 : tab.count > 0 || tab.key === 'ALL')
        , [tabFilters]);

    // Data filtering for display
    const displayData = useMemo(() => {
        if (activeTab === 'CONNECTIONS') return pendingRequests;
        if (activeTab === 'ALL') return notifications;

        switch (activeTab) {
            case 'CRITICAL':
                return notifications.filter(n => n.type?.toLowerCase() === 'issue' || n.type?.toLowerCase() === 'critical');
            case 'TASK':
                return notifications.filter(n => n.type === 'task' || n.type === 'task_message');
            case 'PROJECT':
                return notifications.filter(n => ['coadmin_added', 'project_updated', 'discussion'].includes(n.type));
            default: return notifications;
        }
    }, [activeTab, notifications, pendingRequests]);

    const handleRefresh = useCallback(async () => {
        setHomeRefreshing(true);
        try {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['notifications'] }),
                queryClient.invalidateQueries({ queryKey: ['pendingRequests'] }),
                refetchNotifs(),
                refetchRequests()
            ]);
        } finally {
            setHomeRefreshing(false);
        }
    }, [refetchNotifs, refetchRequests, setHomeRefreshing, queryClient]);

    // Handle tab synchronization
    useEffect(() => {
        const isTabVisible = activeTabs.some(tab => tab.key === activeTab);
        if (!isTabVisible && activeTab !== 'ALL') {
            setActiveTab('ALL');
        }
    }, [activeTabs, activeTab]);

    return {
        activeTab,
        setActiveTab,
        activeTabs,
        displayData,
        isLoadingInitial,
        isRefreshing: homeRefreshing,
        handleRefresh,
        actions: {
            markAllAsRead: markAllAsRead.mutate,
            markAsRead: markAsRead.mutateAsync,
            acceptRequest: acceptReq.mutate,
            rejectRequest: rejectReq.mutate,
        },
        counts: {
            unread: notifications.filter(n => !n.read).length
        }
    };
};
