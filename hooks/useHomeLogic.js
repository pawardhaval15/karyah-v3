import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useUIStore } from '../store/uiStore';
import { useNotifications } from './useNotifications';
import { useProjectInvites } from './useProjects';

const DRAWER_WIDTH = 300;

export const useHomeLogic = (navigation) => {
    const queryClient = useQueryClient();
    const [showSmartSearch, setShowSmartSearch] = useState(false);

    // Global UI State
    const {
        drawerOpen,
        setDrawerOpen,
        homeRefreshing: refreshing,
        setHomeRefreshing,
        homeRefreshKey: refreshKey,
        incrementHomeRefreshKey
    } = useUIStore();

    const { data: invites = [] } = useProjectInvites();
    const { data: notifications = [] } = useNotifications();

    // Derived State
    const pendingInvites = invites.length || 0;
    const hasUnreadNotifications = notifications?.some(n => !n.read);

    // Reanimated Values
    const drawerTranslateX = useSharedValue(-DRAWER_WIDTH);
    const blinkOpacity = useSharedValue(1);
    const waveScale = useSharedValue(0);
    const waveOpacity = useSharedValue(0);
    const bellWaveScale = useSharedValue(1);
    const bellWaveOpacity = useSharedValue(0);

    // Focus effect for refreshing
    useFocusEffect(
        useCallback(() => {
            const state = navigation.getState();
            const route = state?.routes?.find(r => r.name === 'HomeScreen');
            if (route?.params?.refresh) {
                onRefresh();
                navigation.setParams({ refresh: false });
            }
        }, [navigation])
    );

    // Drawer Animation
    useEffect(() => {
        drawerTranslateX.value = withTiming(drawerOpen ? 0 : -DRAWER_WIDTH, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
        });
    }, [drawerOpen]);

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: drawerTranslateX.value }],
    }));

    // Update blinking and bell animations
    useEffect(() => {
        if (pendingInvites > 0) {
            blinkOpacity.value = withRepeat(
                withSequence(withTiming(0.4, { duration: 600 }), withTiming(1, { duration: 600 })),
                -1,
                true
            );
            waveScale.value = withRepeat(withTiming(1, { duration: 1500 }), -1, false);
            waveOpacity.value = withRepeat(withTiming(0, { duration: 1500 }), -1, false);
        } else {
            blinkOpacity.value = 1;
            waveScale.value = 0;
            waveOpacity.value = 0;
        }
    }, [pendingInvites]);

    useEffect(() => {
        if (hasUnreadNotifications) {
            bellWaveScale.value = 0;
            bellWaveScale.value = withRepeat(withTiming(2.5, { duration: 1500 }), -1, false);
            bellWaveOpacity.value = withRepeat(withTiming(0, { duration: 1500 }), -1, false);
        } else {
            bellWaveScale.value = 1;
            bellWaveOpacity.value = 0;
        }
    }, [hasUnreadNotifications]);

    const bellWaveStyle = useAnimatedStyle(() => ({
        transform: [{ scale: bellWaveScale.value }],
        opacity: bellWaveOpacity.value,
    }));

    const onRefresh = async () => {
        setHomeRefreshing(true);
        try {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['projects'] }),
                queryClient.invalidateQueries({ queryKey: ['myTasks'] }),
                queryClient.invalidateQueries({ queryKey: ['issuesByUser'] }),
                queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }),
                queryClient.invalidateQueries({ queryKey: ['criticalIssues'] }),
                queryClient.invalidateQueries({ queryKey: ['projectInvites'] }),
                queryClient.invalidateQueries({ queryKey: ['notifications'] }),
            ]);
            incrementHomeRefreshKey();
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            setHomeRefreshing(false);
        }
    };

    return {
        drawerOpen,
        setDrawerOpen,
        refreshing,
        refreshKey,
        onRefresh,
        showSmartSearch,
        setShowSmartSearch,
        hasUnreadNotifications,
        pendingInvites,
        drawerStyle,
        bellWaveStyle,
        blinkOpacity,
        waveScale,
        waveOpacity
    };
};
