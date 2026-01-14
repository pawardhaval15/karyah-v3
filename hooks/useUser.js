import { useQuery } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';

export const useUserDetails = () => {
    return useQuery({
        queryKey: ['userDetails'],
        queryFn: async () => {
            const response = await apiClient.get('api/auth/user');
            return response.data.user;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
