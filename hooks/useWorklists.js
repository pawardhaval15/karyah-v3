import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createWorklist,
    deleteWorklist,
    getProjectWorklistsProgress,
    getWorklistsByProjectId,
    updateWorklist,
} from '../utils/worklist';

export const useWorklists = (projectId) => {
    const queryClient = useQueryClient();

    // Query for worklists
    const worklistsQuery = useQuery({
        queryKey: ['worklists', projectId],
        queryFn: () => getWorklistsByProjectId(projectId),
        enabled: !!projectId,
        refetchInterval: 5000,
    });

    // Query for worklists progress
    const progressQuery = useQuery({
        queryKey: ['worklistsProgress', projectId],
        queryFn: () => getProjectWorklistsProgress(projectId),
        enabled: !!projectId,
        refetchInterval: 5000,
    });

    // Mutation for creating worklist
    const createMutation = useMutation({
        mutationFn: ({ name }) => createWorklist(projectId, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worklists', projectId] });
            queryClient.invalidateQueries({ queryKey: ['worklistsProgress', projectId] });
        },
    });

    // Mutation for updating worklist
    const updateMutation = useMutation({
        mutationFn: ({ id, name }) => updateWorklist(id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worklists', projectId] });
        },
    });

    // Mutation for deleting worklist
    const deleteMutation = useMutation({
        mutationFn: (id) => deleteWorklist(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worklists', projectId] });
            queryClient.invalidateQueries({ queryKey: ['worklistsProgress', projectId] });
        },
    });

    return {
        worklists: worklistsQuery.data || [],
        worklistsProgress: progressQuery.data || [],
        isLoading: worklistsQuery.isLoading || progressQuery.isLoading,
        isRefreshing: worklistsQuery.isFetching || progressQuery.isFetching,
        refetch: () => {
            worklistsQuery.refetch();
            progressQuery.refetch();
        },
        createWorklist: createMutation.mutateAsync,
        updateWorklist: updateMutation.mutateAsync,
        deleteWorklist: deleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
};
