import apiClient from './apiClient';

export const getUserConnections = async () => {
  try {
    const response = await apiClient.get('api/connections/list');
    return response.data.connections || [];
  } catch (error) {
    console.error('Error fetching connections:', error.message);
    throw error;
  }
};

export const searchUsers = async (query) => {
  try {
    const response = await apiClient.get(`api/connections/search?query=${encodeURIComponent(query)}`);
    return response.data.users || [];
  } catch (error) {
    console.error('Error searching users:', error.message);
    throw error;
  }
};

export const sendConnectionRequest = async (recipientId) => {
  try {
    const response = await apiClient.post('api/connections/send-request', { recipientId });
    return response.data.message;
  } catch (error) {
    console.error('Error sending connection request:', error.message);
    throw error;
  }
};

export const removeConnection = async (connectionId) => {
  try {
    const response = await apiClient.delete('api/connections/remove', {
      data: { connectionId }
    });
    return response.data.message || 'Connection removed';
  } catch (error) {
    console.error('Error removing connection:', error.message);
    throw error;
  }
};

export const searchConnections = async (query) => {
  try {
    if (!query || query.trim() === '') return [];
    const response = await apiClient.get(`api/connections/search-connections?query=${encodeURIComponent(query)}`);
    return response.data.connections || [];
  } catch (error) {
    if (error.response?.data?.message?.includes('No matching connections found')) {
      return [];
    }
    console.log('Error searching connections:', error.message);
    return [];
  }
};

export const getPendingRequests = async () => {
  try {
    const response = await apiClient.get('api/connections/pending-requests');
    return response.data.pendingRequests || [];
  } catch (error) {
    console.log('Error fetching pending requests:', error.message);
    return [];
  }
};

export const acceptConnectionRequest = async (connectionId) => {
  try {
    const response = await apiClient.post('api/connections/accept-request', { connectionId });
    return response.data;
  } catch (error) {
    console.error('Error accepting request:', error.message);
    throw error;
  }
};

export const rejectConnectionRequest = async (connectionId) => {
  try {
    const response = await apiClient.post('api/connections/reject-request', { connectionId });
    return response.data;
  } catch (error) {
    console.error('Error rejecting request:', error.message);
    throw error;
  }
};

export const getConnectionSuggestions = async () => {
  try {
    const response = await apiClient.get('api/connections/suggestions');
    return response.data.suggestions || [];
  } catch (error) {
    console.error('Error fetching suggestions:', error.message);
    return [];
  }
};

export const getMyProjectInvites = async () => {
  try {
    const response = await apiClient.get('api/projects/my-invites');
    return response.data.invites || [];
  } catch (error) {
    console.error('Error fetching project invites:', error.message);
    throw error;
  }
};

export const respondToProjectInvite = async (inviteId, action) => {
  try {
    const response = await apiClient.post(`api/projects/invites/${inviteId}/respond`, { action });
    return response.data.message;
  } catch (error) {
    console.error('Error responding to project invite:', error.message);
    throw error;
  }
};