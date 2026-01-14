

import { Platform } from 'react-native';
import apiClient from './apiClient';

/**
 * Fetch issues assigned to the current user.
 */
export const fetchAssignedIssues = async () => {
    const response = await apiClient.get('api/issues/assigned');
    return response.data.issues;
};

/**
 * Fetch issues assigned to the user (shorthand for task-based issues).
 */
export const fetchIssuesByUser = async () => {
    const response = await apiClient.get('api/tasks/issues-by-user');
    return response.data.issues;
};

/**
 * Update an existing issue. Handles both JSON and FormData (for attachments).
 */
export const updateIssue = async (payload) => {
    const { issueId, unresolvedImages, removeImages, removeResolvedImages, ...rest } = payload;

    if (unresolvedImages && Array.isArray(unresolvedImages) && unresolvedImages.length > 0) {
        const formData = new FormData();

        // Append all text fields from 'rest'
        Object.entries(rest).forEach(([key, value]) => {
            if (value !== undefined) formData.append(key, value);
        });

        if (removeImages !== undefined) formData.append('removeImages', removeImages);
        if (removeResolvedImages !== undefined) formData.append('removeResolvedImages', removeResolvedImages);

        // Attach files
        unresolvedImages.forEach((file, idx) => {
            if (!file.uri) return;
            let fileUri = file.uri;
            if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
                fileUri = `file://${fileUri}`;
            }
            let mimeType = file.type || 'application/octet-stream';
            if (mimeType && !mimeType.includes('/')) {
                if (mimeType === 'image') mimeType = 'image/jpeg';
                else if (mimeType === 'video') mimeType = 'video/mp4';
                else mimeType = 'application/octet-stream';
            }
            formData.append('unresolvedImages', {
                uri: fileUri,
                name: file.name || `file_${idx}`,
                type: mimeType,
            });
        });

        const response = await apiClient.put(`api/issues/${issueId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } else {
        const response = await apiClient.put(`api/issues/${issueId}`, payload);
        return response.data;
    }
};

/**
 * Create a new issue with optional attachments.
 */
export const createIssue = async (issueData) => {
    const formData = new FormData();
    const { unresolvedImages, ...rest } = issueData;

    Object.entries(rest).forEach(([key, value]) => {
        if (value !== undefined) formData.append(key, value);
    });

    if (unresolvedImages && Array.isArray(unresolvedImages)) {
        unresolvedImages.forEach((file, idx) => {
            if (!file.uri) return;
            let fileUri = file.uri;
            if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
                fileUri = `file://${fileUri}`;
            }
            let mimeType = file.type || 'application/octet-stream';
            if (mimeType && !mimeType.includes('/')) {
                if (mimeType === 'image') mimeType = 'image/jpeg';
                else if (mimeType === 'video') mimeType = 'video/mp4';
            }
            formData.append('unresolvedImages', {
                uri: fileUri,
                name: file.name || `file_${idx}`,
                type: mimeType,
            });
        });
    }

    const response = await apiClient.post('api/issues/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

/**
 * Resolve an issue by the assigned user.
 */
export const resolveIssueByAssignedUser = async ({ issueId, issueStatus, resolvedImages = [], remarks = '' }) => {
    const formData = new FormData();
    formData.append('issueStatus', issueStatus);
    formData.append('remarks', remarks);

    resolvedImages.forEach((file, index) => {
        if (!file.uri) return;
        let fileUri = file.uri;
        if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
            fileUri = `file://${fileUri}`;
        }
        let mimeType = file.type || 'application/octet-stream';
        if (mimeType && !mimeType.includes('/')) {
            if (mimeType === 'image') mimeType = 'image/jpeg';
            else if (mimeType === 'video') mimeType = 'video/mp4';
        }
        formData.append('resolvedImages', {
            uri: fileUri,
            name: file.name || `resolved_${index}`,
            type: mimeType,
        });
    });

    const response = await apiClient.put(`api/issues/${issueId}/resolve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

/**
 * Approve a resolved issue.
 */
export const approveIssue = async (issueId) => {
    const response = await apiClient.put(`api/issues/${issueId}/approve`);
    return response.data;
};

/**
 * Fetch specific issue details.
 */
export const fetchIssueById = async (issueId) => {
    const response = await apiClient.get(`api/issues/details/${issueId}`);
    return response.data.issue;
};

/**
 * Fetch issues created by the current user.
 */
export const fetchCreatedByMeIssues = async () => {
    const response = await apiClient.get('api/issues/myissues');
    return response.data.issues;
};

/**
 * Fetch projects associated with the user.
 */
export const fetchProjectsByUser = async () => {
    const response = await apiClient.get('api/projects/');
    return response.data.projects;
};

/**
 * Fetch user's connections.
 */
export const fetchUserConnections = async () => {
    const response = await apiClient.get('api/connections/list');
    return response.data.connections;
};

/**
 * Fetch critical issues assigned to the user.
 */
export const fetchAssignedCriticalIssues = async () => {
    const response = await apiClient.get('api/issues/critical');
    return response.data.issues;
};

/**
 * Fetch issues by project ID.
 */
export const getIssuesByProjectId = async (projectId) => {
    const response = await apiClient.get(`api/issues/project/${projectId}`);
    return response.data.issues;
};

/**
 * Delete an issue.
 */
export const deleteIssue = async (issueId) => {
    await apiClient.delete(`api/issues/${issueId}`);
    return true;
};
