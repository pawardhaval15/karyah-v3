import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';

// Fetch issues by user (tasks marked as issues)
export const useIssues = () => {
    return useQuery({
        queryKey: ['issues'],
        queryFn: async () => {
            const response = await apiClient.get('api/tasks/issues-by-user');
            return response.data.issues || [];
        },
        refetchInterval: 15000, // Refetch every 15s to keep it fresh
        staleTime: 10000,
    });
};

// Fetch assigned critical issues
export const useCriticalIssues = () => {
    return useQuery({
        queryKey: ['issues', 'critical'],
        queryFn: async () => {
            const response = await apiClient.get('api/issues/critical');
            return response.data.issues || [];
        },
        refetchInterval: 15000,
        staleTime: 10000,
    });
};

// Hook for creating an issue
export const useCreateIssue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (issueData) => {
            const formData = new FormData();

            // Append text fields
            Object.entries(issueData).forEach(([key, value]) => {
                if (key !== 'unresolvedImages' && value !== undefined) {
                    formData.append(key, value);
                }
            });

            // Append images
            if (issueData.unresolvedImages && Array.isArray(issueData.unresolvedImages)) {
                issueData.unresolvedImages.forEach((file, idx) => {
                    if (file.uri) {
                        formData.append('unresolvedImages', {
                            uri: file.uri,
                            name: file.name || `issue_image_${idx}.jpg`,
                            type: file.type || 'image/jpeg',
                        });
                    }
                });
            }

            const response = await apiClient.post('api/issues/create', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
        },
    });
};

// Hook for toggling critical status
export const useToggleCritical = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ taskId, isCritical }) => {
            const response = await apiClient.patch(`api/tasks/${taskId}`, {
                isCritical,
                isIssue: true,
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
        },
    });
};

// Hook for updating task/issue status
export const useUpdateIssueStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ taskId, status }) => {
            const response = await apiClient.patch(`api/tasks/${taskId}`, { status });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
        },
    });
};
