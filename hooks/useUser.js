import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { navigationRef } from '../navigation/navigationRef';
import { useAuthStore } from '../store/authStore';
import apiClient from '../utils/apiClient';

export const useUserDetails = () => {
    return useQuery({
        queryKey: ['userDetails'],
        queryFn: async () => {
            const response = await apiClient.get('api/auth/user');
            return response.data.user;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useLogout = (navigation) => {
    const queryClient = useQueryClient();
    const resetAuthStore = useAuthStore(state => state.resetAuthStore);

    return useMutation({
        mutationFn: async () => {
            try {
                const deviceTokenKey = `fcm_token_${Platform.OS}`;
                const deviceToken = await AsyncStorage.getItem(deviceTokenKey);

                // 1. Remove device token from server
                if (deviceToken) {
                    await apiClient.delete('api/devices/deviceToken', {
                        data: { deviceToken }
                    }).catch(() => {
                        console.log('Backend device token removal failed or already gone');
                    });
                    await AsyncStorage.removeItem(deviceTokenKey);
                }

                // 2. Clear critical markers from storage
                await AsyncStorage.multiRemove(['token', 'user']);

                // 3. Clear FileSystem cache
                await FileSystem.deleteAsync(FileSystem.cacheDirectory, { idempotent: true }).catch(() => { });
            } catch (error) {
                console.error('Logout process error:', error);
            }
        },
        onSuccess: () => {
            // Force reset React Query and Auth Store
            queryClient.clear();
            resetAuthStore();

            // Perform root-level navigation reset
            if (navigationRef.isReady()) {
                navigationRef.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'PinLogin' }],
                    })
                );
            } else {
                // Fallback to locally passed navigation if ref isn't ready
                navigation?.dispatch(
                    CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'PinLogin' }],
                    })
                );
            }
        }
    });
};
