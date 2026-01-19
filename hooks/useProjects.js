import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';
import { getMyProjectInvites } from '../utils/connections';

// Fetch projects function
const fetchProjects = async () => {
    const response = await apiClient.get('api/projects');
    // Ensure we return an array even if data.projects is undefined/null
    return response.data && response.data.projects ? response.data.projects : [];
};

// Hook for projects
export const useProjects = () => {
    return useQuery({
        queryKey: ['projects'],
        queryFn: fetchProjects,
        refetchInterval: 15000,   // Check for new projects every 15s for 'instant' feel
        staleTime: 10000,
    });
};

// Hook for creating a project
export const useCreateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (projectData) => {
            const response = await apiClient.post('api/projects/create', projectData);
            return response.data.project;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
};

// Hook for updating project tags
export const useUpdateProjectTags = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ projectId, tags }) => {
            const response = await apiClient.patch(`api/projects/${projectId}/tags`, { tags });
            return response.data.project;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
};

// Hook for project invites
export const useProjectInvites = () => {
    return useQuery({
        queryKey: ['projectInvites'],
        queryFn: async () => {
            const invites = await getMyProjectInvites();
            return invites;
        },
        refetchInterval: 10000,
    });
};
// Hook for project details
export const useProjectDetails = (projectId) => {
    return useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const response = await apiClient.get(`api/projects/${projectId}`);
            return response.data.project;
        },
        enabled: !!projectId,
        staleTime: 5000,
    });
};

// Hook for updating a project
export const useUpdateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ projectId, projectData }) => {
            const response = await apiClient.put(`api/projects/${projectId}`, projectData);
            return response.data.project;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        },
    });
};
