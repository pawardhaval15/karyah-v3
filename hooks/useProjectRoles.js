import { useMemo } from 'react';

/**
 * Custom hook to determine user roles within a project.
 * 
 * @param {Object} projectDetails - The project details object
 * @param {String} userId - The current user's ID
 * @param {String} userName - The current user's name
 * @returns {Object} { isCreator, isCoAdmin }
 */
export const useProjectRoles = (projectDetails, userId, userName) => {
    const isCreator = useMemo(() => {
        if (!projectDetails) return false;

        // 1. ID based check
        const projectOwnerId =
            (typeof projectDetails.userId === 'object' ? (projectDetails.userId._id || projectDetails.userId.id) : projectDetails.userId) ||
            projectDetails.creatorId ||
            projectDetails.creatorUserId;

        const idMatch = userId && projectOwnerId && String(userId) === String(projectOwnerId);

        // 2. Name based fallback
        const projectCreatorName = projectDetails.creatorName || (typeof projectDetails.userId === 'object' ? projectDetails.userId.name : null);
        const nameMatch = userName && projectCreatorName && userName.trim().toLowerCase() === projectCreatorName.trim().toLowerCase();

        return !!(idMatch || nameMatch);
    }, [projectDetails, userId, userName]);

    const isCoAdmin = useMemo(() => {
        if (!projectDetails || !userId) return false;
        return projectDetails.coAdmins?.some(admin => {
            const adminId = typeof admin === 'object' ? (admin.id || admin._id) : admin;
            return adminId && String(adminId) === String(userId);
        });
    }, [projectDetails?.coAdmins, userId]);

    return {
        isCreator,
        isCoAdmin
    };
};
