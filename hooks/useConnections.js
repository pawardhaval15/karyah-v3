import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';

export const useUserConnections = () => {
    return useQuery({
        queryKey: ['userConnections'],
        queryFn: async () => {
            const response = await apiClient.get('api/connections/list');
            return response.data.connections || [];
        },
    });
};

export const useSearchUsers = (query) => {
    return useQuery({
        queryKey: ['usersSearch', query],
        queryFn: async () => {
            if (!query || query.length < 2) return [];
            const response = await apiClient.get(`api/connections/search?query=${encodeURIComponent(query)}`);
            return response.data.users || [];
        },
        enabled: !!query && query.length >= 2,
    });
};

export const useSendConnectionRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId) => {
            const response = await apiClient.post('api/connections/request', { userId });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userConnections'] });
        },
    });
};

export const usePendingRequests = () => {
    return useQuery({
        queryKey: ['pendingRequests'],
        queryFn: async () => {
            const response = await apiClient.get('api/connections/pending-requests');
            return response.data.pendingRequests || [];
        },
        refetchInterval: 15000, // Faster polling (15s)
        staleTime: 10000,
    });
};

export const useAcceptConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (connectionId) => {
            const response = await apiClient.post('api/connections/accept-request', { connectionId });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
            queryClient.invalidateQueries({ queryKey: ['userConnections'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] }); // Notifications might change too
        },
    });
};

export const useRejectConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (connectionId) => {
            const response = await apiClient.post('api/connections/reject-request', { connectionId });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });
};
