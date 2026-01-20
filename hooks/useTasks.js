import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';
import { bulkAssignTasks } from '../utils/task';

// --- Task Queries ---

export const useMyTasks = () => {
    return useQuery({
        queryKey: ['myTasks'],
        queryFn: async () => {
            const response = await apiClient.get('api/tasks/my-tasks');
            return response.data.tasks || [];
        },
        refetchInterval: 10000,
        staleTime: 5000,
    });
};

export const useTasksCreatedByMe = () => {
    return useQuery({
        queryKey: ['tasksCreatedByMe'],
        queryFn: async () => {
            const response = await apiClient.get('api/tasks/my-created-tasks');
            return response.data.tasks || [];
        },
        refetchInterval: 10000,
        staleTime: 5000,
    });
};

export const useIssuesByUser = () => {
    return useQuery({
        queryKey: ['issuesByUser'],
        queryFn: async () => {
            const response = await apiClient.get('api/tasks/issues-by-user');
            return response.data.issues || [];
        },
        refetchInterval: 10000,
        staleTime: 5000,
    });
};

export const useTasksByWorklist = (worklistId) => {
    return useQuery({
        queryKey: ['tasks', 'worklist', worklistId],
        queryFn: async () => {
            const response = await apiClient.get(`api/tasks/worklist/${worklistId}`);
            return response.data.tasks || [];
        },
        enabled: !!worklistId,
        refetchInterval: 10000,
    });
};

export const useTasksByProject = (projectId) => {
    return useQuery({
        queryKey: ['tasks', 'project', projectId],
        queryFn: async () => {
            const response = await apiClient.get(`api/tasks/${projectId}`);
            return response.data.tasks || [];
        },
        enabled: !!projectId,
    });
};

export const useWorklistProgress = (projectId, worklistId) => {
    return useQuery({
        queryKey: ['worklistsProgress', projectId],
        queryFn: async () => {
            const response = await apiClient.get(`api/worklist/project/${projectId}/progress`);
            return response.data;
        },
        enabled: !!projectId,
        select: (data) => data.find(p => p.worklistId === worklistId),
    });
};

// --- Mutations ---

export const useTaskMutations = () => {
    const queryClient = useQueryClient();

    const invalidateTasks = (worklistId, projectId) => {
        queryClient.invalidateQueries({ queryKey: ['myTasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasksCreatedByMe'] });
        queryClient.invalidateQueries({ queryKey: ['issuesByUser'] });
        if (worklistId) queryClient.invalidateQueries({ queryKey: ['tasks', 'worklist', worklistId] });
        if (projectId) {
            queryClient.invalidateQueries({ queryKey: ['tasks', 'project', projectId] });
            queryClient.invalidateQueries({ queryKey: ['worklistsProgress', projectId] });
        }
    };

    const createTaskMutation = useMutation({
        mutationFn: async (taskData) => {
            const formData = new FormData();
            for (const key in taskData) {
                const value = taskData[key];
                if (key === 'images' && Array.isArray(value)) {
                    // Logic for images handling if needed, usually better in utils
                } else if (Array.isArray(value)) {
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            }
            // For now, let's assume we use the existing util which handles FormData
            const { createTask } = require('../utils/task');
            return await createTask(taskData);
        },
        onSuccess: (data) => {
            invalidateTasks(data.worklistId, data.projectId);
        },
    });

    const bulkAssign = useMutation({
        mutationFn: async ({ taskIds, userIds }) => {
            return await bulkAssignTasks(taskIds, userIds);
        },
        onSuccess: () => {
            invalidateTasks();
        },
    });

    const updateWorklistMutation = useMutation({
        mutationFn: async ({ id, name }) => {
            const { updateWorklist } = require('../utils/worklist');
            return await updateWorklist(id, name);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['worklists'] });
            queryClient.invalidateQueries({ queryKey: ['worklistsProgress'] });
        }
    });

    const deleteWorklistMutation = useMutation({
        mutationFn: async (id) => {
            const { deleteWorklist } = require('../utils/worklist');
            return await deleteWorklist(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worklists'] });
            queryClient.invalidateQueries({ queryKey: ['worklistsProgress'] });
        }
    });

    const updateTags = useMutation({
        mutationFn: async ({ taskId, tags }) => {
            const { updateTaskDetails } = require('../utils/task');
            return await updateTaskDetails(taskId, { tags });
        },
        onSuccess: () => {
            invalidateTasks();
        },
    });

    return {
        createTask: createTaskMutation,
        bulkAssign,
        updateWorklist: updateWorklistMutation,
        deleteWorklist: deleteWorklistMutation,
        updateTags,
        invalidateTasks
    };
};
