import { useQuery } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';

export const useDashboardStats = () => {
    return useQuery({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            const response = await apiClient.get('api/projects/dashboard/counts');
            console.log(response.data);
            return response.data;
        },
        staleTime: 10000,
        refetchInterval: 15000,   // Synchronized with tasks/projects
    });
};

export const useCriticalIssues = () => {
    return useQuery({
        queryKey: ['criticalIssues'],
        queryFn: async () => {
            const response = await apiClient.get('api/issues/critical');
            return response.data.issues || [];
        },
        staleTime: 20000,
        refetchInterval: 20000,   // Critical issues should be checked more often
    });
};
