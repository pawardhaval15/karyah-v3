import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';

export const useNotifications = () => {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await apiClient.get('api/notifications');
            return response.data || [];
        },
        refetchInterval: 10000,   // Faster polling for 'instant' updates
        staleTime: 5000,
    });
};

export const useMarkNotificationAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (notificationId) => {
            const response = await apiClient.put('api/notifications/read', { notificationId });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};

export const useMarkAllNotificationsAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const response = await apiClient.put('api/notifications/read-all');
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};
