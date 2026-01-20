import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';

export const useUserConnections = () => {
    return useQuery({
        queryKey: ['userConnections'],
        queryFn: async () => {
            const response = await apiClient.get(`api/connections/list?_t=${Date.now()}`);
            return response.data.connections || [];
        },
        refetchInterval: 5000,
        staleTime: 0,
        gcTime: 0, // Don't keep old data in cache
    });
};

export const useRemoveConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (connectionId) => {
            const response = await apiClient.delete('api/connections/remove', {
                data: { connectionId }
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userConnections'] });
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
            const response = await apiClient.get(`api/connections/pending-requests?_t=${Date.now()}`);
            return response.data.pendingRequests || [];
        },
        refetchInterval: 5000, // Sync faster across devices (5s)
        staleTime: 0,
        gcTime: 0,
    });
};

export const useAcceptConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (connectionId) => {
            const response = await apiClient.post('api/connections/accept-request', { connectionId });
            return response.data;
        },
        onMutate: async (connectionId) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['pendingRequests'] });

            // Snapshot the previous value
            const previousRequests = queryClient.getQueryData(['pendingRequests']);

            // Optimistically update to the new value
            queryClient.setQueryData(['pendingRequests'], (old) =>
                old ? old.filter(req => (req.id || req._id) !== connectionId) : []
            );

            return { previousRequests };
        },
        onError: (err, connectionId, context) => {
            // Rollback if mutation fails
            if (context?.previousRequests) {
                queryClient.setQueryData(['pendingRequests'], context.previousRequests);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
            queryClient.invalidateQueries({ queryKey: ['userConnections'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        }
    });
};

export const useRejectConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (connectionId) => {
            const response = await apiClient.post('api/connections/reject-request', { connectionId });
            return response.data;
        },
        onMutate: async (connectionId) => {
            await queryClient.cancelQueries({ queryKey: ['pendingRequests'] });
            const previousRequests = queryClient.getQueryData(['pendingRequests']);

            queryClient.setQueryData(['pendingRequests'], (old) =>
                old ? old.filter(req => (req.id || req._id) !== connectionId) : []
            );

            return { previousRequests };
        },
        onError: (err, connectionId, context) => {
            if (context?.previousRequests) {
                queryClient.setQueryData(['pendingRequests'], context.previousRequests);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        }
    });
};
