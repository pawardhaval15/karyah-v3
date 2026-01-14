import { useQuery } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';

export const useMyTasks = () => {
    return useQuery({
        queryKey: ['myTasks'],
        queryFn: async () => {
            const response = await apiClient.get('api/tasks/my-tasks');
            return response.data.tasks || [];
        },
        refetchInterval: 15000,   // Polling every 15 seconds for background updates
        staleTime: 10000,         // Consider data fresh for 10s
    });
};

export const useIssuesByUser = () => {
    return useQuery({
        queryKey: ['issuesByUser'],
        queryFn: async () => {
            const response = await apiClient.get('api/tasks/issues-by-user');
            return response.data.issues || [];
        },
        refetchInterval: 15000,
        staleTime: 10000,
    });
};
