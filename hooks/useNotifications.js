import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';

export const useNotifications = () => {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await apiClient.get(`api/notifications?_t=${Date.now()}`);
            // console.log(response.data);
            return response.data || [];
        },
        refetchInterval: 5000,   // Rapid polling for cross-device sync
        staleTime: 0,
        gcTime: 0,
    });
};

export const useMarkNotificationAsRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (notificationId) => {
            const response = await apiClient.put('api/notifications/read', { notificationId });
            return response.data;
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            const previousNotifications = queryClient.getQueryData(['notifications']);
            queryClient.setQueryData(['notifications'], (old) =>
                old?.map(n => (n.id === id || n._id === id) ? { ...n, read: true } : n)
            );
            return { previousNotifications };
        },
        onError: (err, id, context) => {
            queryClient.setQueryData(['notifications'], context.previousNotifications);
        },
        onSettled: () => {
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
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });
            const previousNotifications = queryClient.getQueryData(['notifications']);
            queryClient.setQueryData(['notifications'], (old) =>
                old?.map(n => ({ ...n, read: true }))
            );
            return { previousNotifications };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['notifications'], context.previousNotifications);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
};
