

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';
import { Platform } from 'react-native';

export const fetchAssignedIssues = async () => {
    try {
        // If you use JWT auth, get the token
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}api/issues/assigned`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch issues');
        // console.log('Assigned Issues Data:', data.issues);
        return data.issues;
    } catch (error) {
        console.error('❌ Error fetching assigned issues:', error.message);
        throw error;
    }
};
// Update an issue created by the user (edit fields like title, description, due date)
// Update an issue created by the user (edit fields like title, description, due date, assignTo, removeImages, etc.)
export const updateIssue = async (payload) => {
    const token = await AsyncStorage.getItem('token');
    // If attachments are present, use FormData
    if (payload.unresolvedImages && Array.isArray(payload.unresolvedImages) && payload.unresolvedImages.length > 0) {
        const formData = new FormData();
        if (payload.issueTitle !== undefined) formData.append('issueTitle', payload.issueTitle);
        if (payload.description !== undefined) formData.append('description', payload.description);
        if (payload.dueDate !== undefined) formData.append('dueDate', payload.dueDate);
        if (payload.assignTo !== undefined) formData.append('assignTo', payload.assignTo);
        if (payload.isCritical !== undefined) formData.append('isCritical', payload.isCritical);
        if (payload.issueStatus !== undefined) formData.append('issueStatus', payload.issueStatus);
        if (payload.remarks !== undefined) formData.append('remarks', payload.remarks);
        if (payload.removeImages !== undefined) formData.append('removeImages', payload.removeImages);
        if (payload.removeResolvedImages !== undefined) formData.append('removeResolvedImages', payload.removeResolvedImages);

        // Attach files with normalization
        payload.unresolvedImages.forEach((file, idx) => {
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

        const response = await fetch(`${API_URL}api/issues/${payload.issueId}`, {
            method: 'PUT',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                // Do NOT set Content-Type for FormData
            },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update issue');
        return data;
    } else {
        // No attachments, send JSON
        const body = {
            ...(payload.issueTitle !== undefined ? { issueTitle: payload.issueTitle } : {}),
            ...(payload.description !== undefined ? { description: payload.description } : {}),
            ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate } : {}),
            ...(payload.assignTo !== undefined ? { assignTo: payload.assignTo } : {}),
            ...(payload.isCritical !== undefined ? { isCritical: payload.isCritical } : {}),
            ...(payload.issueStatus !== undefined ? { issueStatus: payload.issueStatus } : {}),
            ...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
            ...(payload.removeImages !== undefined ? { removeImages: payload.removeImages } : {}),
            ...(payload.removeResolvedImages !== undefined ? { removeResolvedImages: payload.removeResolvedImages } : {}),
        };
        const response = await fetch(`${API_URL}api/issues/${payload.issueId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to update issue');
        return data;
    }
};


export const createIssue = async (issueData) => {
    const token = await AsyncStorage.getItem('token');
    const formData = new FormData();

    // Append text fields
    Object.entries(issueData).forEach(([key, value]) => {
        if (key !== 'unresolvedImages') {
            formData.append(key, value);
        }
    });

    // Append files (attachments)
    if (issueData.unresolvedImages && Array.isArray(issueData.unresolvedImages)) {
        issueData.unresolvedImages.forEach((file, idx) => {
            if (!file.uri) return;
            let fileUri = file.uri;
            // Normalize URI for Android
            if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
                fileUri = `file://${fileUri}`;
            }
            // Normalize MIME type
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
    }

    const res = await fetch(`${API_URL}api/issues/create`, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // Do NOT set 'Content-Type' manually here!
        },
        body: formData,
    });

    if (!res.ok) throw new Error((await res.json()).message || 'Failed to create issue');
    return res.json();
};


export const resolveIssueByAssignedUser = async ({ issueId, issueStatus, resolvedImages = [], remarks = '' }) => {
    try {
        const token = await AsyncStorage.getItem('token');

        const formData = new FormData();

        // Append status and remarks
        formData.append('issueStatus', issueStatus);
        formData.append('remarks', remarks);

        // Append resolved images with normalization
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
                else mimeType = 'application/octet-stream';
            }
            formData.append('resolvedImages', {
                uri: fileUri,
                name: file.name || `resolved_${index}`,
                type: mimeType,
            });
        });

        const response = await fetch(`${API_URL}api/issues/${issueId}/resolve`, {
            method: 'PUT',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                // Do NOT manually set Content-Type for FormData
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to resolve issue');
        }

        return data;
    } catch (error) {
        console.error('❌ Error resolving issue:', error.message);
        throw error;
    }
};


export const updateIssueByAssignedUser = async ({ issueId, issueStatus, resolvedImages, remarks }) => {
    const token = await AsyncStorage.getItem('token');
    const formData = new FormData();
    formData.append('issueStatus', issueStatus);
    formData.append('remarks', remarks);

    // Attach resolved images (if any are files)
    resolvedImages.forEach((img, idx) => {
        if (img && img.uri && img.type) {
            // New image picked from device
            formData.append('resolvedImages', {
                uri: img.uri,
                name: img.name || `resolved_${idx}.jpg`,
                type: img.type,
            });
        } else if (typeof img === 'string') {
            // Already uploaded image URL
            formData.append('resolvedImages', img);
        }
    });

    const response = await fetch(`${API_URL}api/issues/${issueId}/resolve`, {
        method: 'PUT',
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update issue');
    return data;
};

export const approveIssue = async (issueId) => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_URL}api/issues/${issueId}/approve`, {
        method: 'PUT',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to approve issue');
    return data;
};

export const fetchIssueById = async (issueId) => {
    try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}api/issues/details/${issueId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch issue');
        return data.issue;
    } catch (error) {
        console.error('❌ Error fetching issue by id:', error.message);
        throw error;
    }
};

export const fetchCreatedByMeIssues = async () => {
    try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}api/issues/myissues`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch issues');
        // console.log("Created by me issues fetched successfully:", data.issues);
        return data.issues;
    } catch (error) {
        console.error('❌ Error fetching created by me issues:', error.message);
        throw error;
    }
};

export const fetchProjectsByUser = async () => {
    try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_URL}api/projects/`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch projects');
        // console.log("Projects fetched successfully:", data.projects);
        return data.projects;
    } catch (error) {
        console.error("fetchProjectsByUser error:", error.message);
        throw error;
    }
};

export const fetchUserConnections = async () => {
    try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`${API_URL}api/connections/list`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch connections');
        // console.log("User connections fetched successfully:", data.connections);
        return data.connections;
    } catch (error) {
        console.error("fetchUserConnections error:", error.message);
        throw error;
    }
};

export const fetchAssignedCriticalIssues = async () => {
    try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}api/issues/critical`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to fetch critical issues');
        return data.issues; // This is an array of critical issues
    } catch (error) {
        console.error(' Error fetching assigned critical issues:', error.message);
        throw error;
    }
};

export const getIssuesByProjectId = async (projectId) => {
    try {
        const token = await AsyncStorage.getItem('token');

        const response = await fetch(`${API_URL}api/issues/project/${projectId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch issues');
        }

        const data = await response.json();
        return data.issues;
    } catch (error) {
        console.error('Error fetching issues by projectId:', error);
        throw error;
    }
};

// Delete an issue by ID
export const deleteIssue = async (issueId) => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_URL}api/issues/${issueId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
    if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete issue');
    return true;
};