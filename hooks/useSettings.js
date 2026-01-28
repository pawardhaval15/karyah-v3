import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';

export const usePublicStatus = () => {
    return useQuery({
        queryKey: ['publicStatus'],
        queryFn: async () => {
            const response = await apiClient.get('api/auth/user');
            return response.data.user?.isPublic;
        },
    });
};

export const useUpdatePublicStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (isPublic) => {
            const response = await apiClient.put('api/auth/is-public', { isPublic });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['publicStatus'] });
            queryClient.invalidateQueries({ queryKey: ['userDetails'] });
        },
    });
};

export const useChangePin = () => {
    return useMutation({
        mutationFn: async ({ currentPin, newPin }) => {
            const response = await apiClient.put('api/auth/change-pin', { currentPin, newPin });
            return response.data;
        },
    });
};
