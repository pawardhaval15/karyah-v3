import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
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

    return useMutation({
        mutationFn: async () => {
            const deviceTokenKey = `fcm_token_${Platform.OS}`;
            const deviceToken = await AsyncStorage.getItem(deviceTokenKey);
            const userToken = await AsyncStorage.getItem('token');

            if (deviceToken && userToken) {
                try {
                    await apiClient.delete('api/devices/deviceToken', {
                        data: { deviceToken }
                    });
                    await AsyncStorage.removeItem(deviceTokenKey);
                } catch (error) {
                    console.error('Error deleting device token:', error);
                }
            }

            await AsyncStorage.removeItem('token');
            try {
                await FileSystem.deleteAsync(FileSystem.cacheDirectory, { idempotent: true });
            } catch (cacheErr) {
                console.error('Error clearing cache:', cacheErr);
            }
        },
        onSuccess: () => {
            queryClient.clear();
            navigation.reset({
                index: 0,
                routes: [{ name: 'PinLogin' }],
            });
        }
    });
};
