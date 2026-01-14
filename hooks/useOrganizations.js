import { useQuery } from '@tanstack/react-query';
import apiClient from '../utils/apiClient';

export const useUserOrganizations = () => {
    return useQuery({
        queryKey: ['userOrganizations'],
        queryFn: async () => {
            const response = await apiClient.get('api/auth/user');
            const userData = response.data.user;

            if (userData && userData.OrganizationUsers) {
                return userData.OrganizationUsers
                    .filter(orgUser => orgUser.status === 'Active' || orgUser.status === 'active')
                    .map(orgUser => ({
                        id: orgUser.Organization?.id,
                        name: orgUser.Organization?.name || 'Unnamed Organization',
                        role: orgUser.role
                    }))
                    .filter(org => org.id);
            }
            return [];
        },
    });
};
