import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import apiClient from '../utils/apiClient';
import { API_URL } from '../utils/config';
import { updateIssue } from '../utils/issues';
import { updateTask, updateTaskDetails } from '../utils/task';

const normalizeFileForUpload = (file, index = 0) => {
    if (!file || !file.uri) return null;

    let uri = file.uri;
    if (Platform.OS === 'android' && !uri.startsWith('file://')) {
        uri = `file://${uri}`;
    }

    let mimeType = file.type || file.mimeType || 'application/octet-stream';
    if (mimeType && !mimeType.includes('/')) {
        if (mimeType === 'image') mimeType = 'image/jpeg';
        else if (mimeType === 'video') mimeType = 'video/mp4';
        else mimeType = 'application/octet-stream';
    }

    return {
        uri,
        name: file.name || (uri.split('/').pop() || `resolved-${index}`),
        type: mimeType || 'application/octet-stream',
    };
};

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
                    const normalized = normalizeFileForUpload(file, idx);
                    if (normalized) {
                        formData.append('unresolvedImages', normalized);
                    }
                });
            }

            const response = await apiClient.post('api/issues/create', formData);
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
            const token = await AsyncStorage.getItem('token');
            console.log(`useIssueDetails: Fetching details for ${issueId}...`);

            try {
                // Try fetching as a task first (api/tasks/details/${issueId})
                const url = `${API_URL}api/tasks/details/${issueId}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { Authorization: `Bearer ${token}` }),
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const taskData = data.task;
                    if (taskData) {
                        console.log(`useIssueDetails: Successfully fetched as task-based issue`, {
                            id: taskData.id || taskData._id || taskData.taskId,
                            status: taskData.status,
                            isIssue: taskData.isIssue,
                            imageCount: taskData.images?.length,
                            resolvedImageCount: (taskData.resolvedImages?.length || 0) + " (Checking 'images' field too: " + (taskData.images?.length || 0) + ")"
                        });
                        return { ...taskData, isTaskBased: true };
                    }
                }
                throw new Error('Not a task-based issue or fetch failed');
            } catch (error) {
                // Fallback to traditional issue fetch (api/issues/details/${issueId})
                console.log(`useIssueDetails: Falling back to traditional issue fetch for ${issueId}...`);
                const url = `${API_URL}api/issues/details/${issueId}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token && { Authorization: `Bearer ${token}` }),
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const issueData = data.issue;
                    console.log(`useIssueDetails: Successfully fetched as traditional issue`, {
                        id: issueData.issueId || issueData.id,
                        status: issueData.issueStatus,
                        unresolvedImageCount: issueData.unresolvedImages?.length,
                        resolvedImageCount: issueData.resolvedImages?.length
                    });
                    return { ...issueData, isTaskBased: false };
                }
                throw new Error('Failed to fetch issue details');
            }
        },
        enabled: !!issueId,
        placeholderData: () => {
            return queryClient.getQueryData(['issues'])?.find((i) => i.id === issueId || i.taskId === issueId || i.issueId === issueId);
        },
        refetchOnWindowFocus: true,
        staleTime: 0,
    });
};

// Hook for resolving an issue
export const useResolveIssue = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ issueId, isTaskBased, resolveData }) => {
            console.log('useResolveIssue mutationFn called with:', { issueId, isTaskBased, resolveData });
            const token = await AsyncStorage.getItem('token');
            const formData = new FormData();

            if (isTaskBased) {
                const url = `${API_URL}api/tasks/${issueId}/resolve`;

                // Add remarks if provided
                if (resolveData.remarks) {
                    formData.append('remarks', resolveData.remarks);
                }

                // Add resolved images if provided
                if (resolveData.resolvedImages && Array.isArray(resolveData.resolvedImages)) {
                    console.log(`Appending ${resolveData.resolvedImages.length} files to Task Resolve FormData (using 'images' field)`);
                    resolveData.resolvedImages.forEach((img, idx) => {
                        if (img && img.uri) {
                            const uri = img.uri.startsWith('file://') ? img.uri : `file://${img.uri}`;

                            // Fix MIME type
                            let mimeType = img.type;
                            if (mimeType && !mimeType.includes('/')) {
                                if (mimeType === 'image') mimeType = 'image/jpeg';
                                else if (mimeType === 'video') mimeType = 'video/mp4';
                                else mimeType = 'application/octet-stream';
                            }

                            // Use 'images' as the field name to match backend multer configuration
                            formData.append('images', {
                                uri,
                                name: img.name || `resolved-${idx}`,
                                type: mimeType || 'application/octet-stream',
                            });
                        }
                    });
                }

                // Add imagesToRemove if provided (as in user snippet)
                if (resolveData.imagesToRemove && Array.isArray(resolveData.imagesToRemove)) {
                    resolveData.imagesToRemove.forEach(index => {
                        formData.append('imagesToRemove', String(index));
                    });
                }

                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const responseText = await response.text();
                const data = JSON.parse(responseText);
                if (!response.ok) throw new Error(data.message || 'Failed to resolve task');
                return data;
            } else {
                // Traditional issue resolution logic (keeping as PUT as per usual)
                const url = `${API_URL}api/issues/${issueId}/resolve`;
                formData.append('issueStatus', 'completed');
                if (resolveData.remarks) {
                    formData.append('remarks', resolveData.remarks);
                }

                if (resolveData.resolvedImages && Array.isArray(resolveData.resolvedImages)) {
                    console.log(`Appending ${resolveData.resolvedImages.length} files to Issue Resolve FormData (using 'resolvedImages' field)`);
                    resolveData.resolvedImages.forEach((file, idx) => {
                        const normalized = normalizeFileForUpload(file, idx);
                        if (normalized) {
                            formData.append('resolvedImages', normalized);
                        }
                    });
                }

                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const responseText = await response.text();
                const data = JSON.parse(responseText);
                if (!response.ok) throw new Error(data.message || 'Failed to resolve issue');
                return data;
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
                if (updateData.unresolvedImages && updateData.unresolvedImages.length > 0) {
                    return await updateTaskDetails(issueId, {
                        name: updateData.issueTitle,
                        description: updateData.description,
                        endDate: updateData.dueDate,
                        attachments: updateData.unresolvedImages,
                        isCritical: updateData.isCritical,
                    });
                } else {
                    return await updateTask(issueId, {
                        taskName: updateData.issueTitle,
                        description: updateData.description,
                        endDate: updateData.dueDate,
                        isCritical: updateData.isCritical,
                    });
                }
            } else {
                return await updateIssue({
                    ...updateData,
                    issueId,
                });
            }
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issue', variables.issueId] });
            queryClient.invalidateQueries({ queryKey: ['issues'] });
        },
    });
};

