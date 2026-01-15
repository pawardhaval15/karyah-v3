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

// Hook for fetching issue details (handles both task-based and traditional issues)
export const useIssueDetails = (issueId) => {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ['issue', issueId],
        queryFn: async () => {
            if (!issueId) return null;
            try {
                // Try fetching as a task first
                const response = await apiClient.get(`api/tasks/details/${issueId}`);
                const taskData = response.data.task;
                if (taskData && taskData.isIssue) {
                    return { ...taskData, isTaskBased: true };
                }
                throw new Error('Not a task-based issue');
            } catch (error) {
                // Fallback to traditional issue fetch
                const response = await apiClient.get(`api/issues/details/${issueId}`);
                return { ...response.data.issue, isTaskBased: false };
            }
        },
        enabled: !!issueId,
        // Pre-populate with data from the issues list cache for "instant" feel
        placeholderData: () => {
            return queryClient.getQueryData(['issues'])?.find((i) => i.id === issueId || i.taskId === issueId || i.issueId === issueId);
        },
        refetchOnWindowFocus: true,
        staleTime: 0, // Always check for fresh data on focus, but do it silently
    });
};

// Hook for resolving an issue
export const useResolveIssue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ issueId, isTaskBased, resolveData }) => {
            if (isTaskBased) {
                const formData = new FormData();
                if (resolveData.remarks) formData.append('remarks', resolveData.remarks);

                if (resolveData.resolvedImages && Array.isArray(resolveData.resolvedImages)) {
                    resolveData.resolvedImages.forEach((file, idx) => {
                        formData.append('images', {
                            uri: file.uri,
                            name: file.name || `resolved_${idx}.jpg`,
                            type: file.type || 'image/jpeg',
                        });
                    });
                }

                // For task-based issues, we use the resolve endpoint if available, 
                // or update status to Completed
                const response = await apiClient.put(`api/tasks/${issueId}/resolve`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                return response.data;
            } else {
                const formData = new FormData();
                formData.append('issueStatus', 'completed');
                formData.append('remarks', resolveData.remarks || '');

                if (resolveData.resolvedImages && Array.isArray(resolveData.resolvedImages)) {
                    resolveData.resolvedImages.forEach((file, idx) => {
                        formData.append('resolvedImages', {
                            uri: file.uri,
                            name: file.name || `resolved_${idx}.jpg`,
                            type: file.type || 'image/jpeg',
                        });
                    });
                }

                const response = await apiClient.put(`api/issues/${issueId}/resolve`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                return response.data;
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.issueId] });
            queryClient.invalidateQueries({ queryKey: ['issues'] });
        },
    });
};

// Hook for deleting an issue
export const useDeleteIssue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ issueId, isTaskBased }) => {
            const endpoint = isTaskBased ? `api/tasks/${issueId}` : `api/issues/${issueId}`;
            await apiClient.delete(endpoint);
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['issues'] });
        },
    });
};

// Hook for updating an issue
export const useUpdateIssue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ issueId, isTaskBased, updateData }) => {
            if (isTaskBased) {
                // Task-based update
                const payload = {
                    name: updateData.issueTitle,
                    description: updateData.description,
                    endDate: updateData.dueDate,
                };
                const response = await apiClient.patch(`api/tasks/${issueId}`, payload);
                return response.data;
            } else {
                // Traditional issue update
                const formData = new FormData();
                Object.entries(updateData).forEach(([key, value]) => {
                    if (value !== undefined && key !== 'unresolvedImages') {
                        formData.append(key, value);
                    }
                });

                if (updateData.unresolvedImages && Array.isArray(updateData.unresolvedImages)) {
                    updateData.unresolvedImages.forEach((file, idx) => {
                        formData.append('unresolvedImages', {
                            uri: file.uri,
                            name: file.name || `edit_${idx}.jpg`,
                            type: file.type || 'image/jpeg',
                        });
                    });
                }

                const response = await apiClient.put(`api/issues/${issueId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                return response.data;
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.issueId] });
            queryClient.invalidateQueries({ queryKey: ['issues'] });
        },
    });
};

