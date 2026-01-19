import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';
import { bulkAssignTasks, updateTaskDetails } from '../utils/task';

export const useMyTasks = () => {
    return useQuery({
        queryKey: ['myTasks'],
        queryFn: async () => {
            const response = await apiClient.get('api/tasks/my-tasks');
            // console.log("mytasks", response.data.tasks);
            return response.data.tasks || [];
        },
        refetchInterval: 5000,
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
        refetchInterval: 5000,
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
        refetchInterval: 5000,
        staleTime: 5000,
    });
};

// Mutations
export const useTaskMutations = () => {
    const queryClient = useQueryClient();

    const invalidateTasks = () => {
        queryClient.invalidateQueries({ queryKey: ['myTasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasksCreatedByMe'] });
        queryClient.invalidateQueries({ queryKey: ['issuesByUser'] });
        // Also invalidate project specific tasks if needed
        queryClient.invalidateQueries({ queryKey: ['projectTasks'] });
    };

    const bulkAssign = useMutation({
        mutationFn: async ({ taskIds, userIds }) => {
            return await bulkAssignTasks(taskIds, userIds);
        },
        onSuccess: () => {
            invalidateTasks();
        },
    });

    const updateTags = useMutation({
        mutationFn: async ({ taskId, tags }) => {
            return await updateTaskDetails(taskId, { tags });
        },
        onSuccess: () => {
            invalidateTasks();
        },
    });

    return {
        bulkAssign,
        updateTags,
        invalidateTasks
    };
};
