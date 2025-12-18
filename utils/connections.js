import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

export const getUserConnections = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/connections/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    // console.log('[getUserConnections] Response data:', data);
    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch connections');
    }

    return data.connections;
  } catch (error) {
    console.error('Error fetching connections:', error.message);
    throw error;
  }
};

export const searchUsers = async (query) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/connections/search?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    // console.log('[searchUsers] Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to search users');
    }

    return data.users;
  } catch (error) {
    console.error('Error searching users:', error.message);
    throw error;
  }
};

export const sendConnectionRequest = async (recipientId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/connections/send-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ recipientId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send connection request');
    }

    return data.message;
  } catch (error) {
    console.error('Error sending connection request:', error.message);
    throw error;
  }
};

export const removeConnection = async (connectionId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/connections/remove`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ connectionId }),
    });

    const contentType = response.headers.get('content-type');
    const text = await response.text();

    if (!response.ok) {
      if (contentType && contentType.includes('application/json')) {
        const errorJson = JSON.parse(text);
        throw new Error(errorJson.message || 'Failed to remove connection');
      } else {
        console.error('Server error (non-JSON):', text);
        throw new Error('Unexpected server response');
      }
    }

    // Parse successful JSON response
    const data = JSON.parse(text);
    return data.message || 'Connection removed';
  } catch (error) {
    console.error('Error removing connection:', error.message);
    throw error;
  }
};


export const searchConnections = async (query) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    if (!query || query.trim() === '') {
      console.warn('Search query is empty, returning empty array.');
      return [];
    }

    const response = await fetch(
      `${API_URL}api/connections/search-connections?query=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    // console.log('[searchConnections] Response data:', data);

    if (!response.ok) {
      // Don't throw error for "no connections found" - just return empty array
      if (data.message && data.message.includes('No matching connections found')) {
        return [];
      }
      throw new Error(data.message || 'Failed to search connections');
    }

    return data.connections || [];
  } catch (error) {
    console.log('Error searching connections:', error.message);
    // Return empty array instead of throwing error to prevent app crashes
    return [];
  }
};

export const getPendingRequests = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const url = `${API_URL}api/connections/pending-requests`;
    console.log('Fetching:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    // If fetch fails, response is undefined
    if (!response) {
      console.log('No response from server, returning empty array');
      return [];
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      console.log('JSON Parse Error, returning empty array:', jsonErr.message);
      return [];
    }

    if (!response.ok) {
      console.log('HTTP Error:', response.status, response.statusText);
      // console.log('Response data:', data);
      
      // Handle specific HTTP errors
      if (response.status === 404) {
        console.log('Pending requests endpoint not found - using response data or returning empty array');
        // If the server returns data even with 404, use it, otherwise return empty array
        return data?.pendingRequests || [];
      } else if (response.status === 401) {
        throw new Error('Authentication failed - please login again');
      } else if (response.status === 403) {
        throw new Error('Access denied - insufficient permissions');
      } else {
        console.log('Other HTTP error, returning empty array');
        return [];
      }
    }

    return data.pendingRequests || [];
  } catch (error) {
    console.log('Error fetching pending requests (handled):', error.message);
    
    // For any errors, return empty array to prevent app crashes
    return [];
  }
};

export const acceptConnectionRequest = async (connectionId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/connections/accept-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ connectionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to accept request');
    }

    return data;
  } catch (error) {
    console.error('Error accepting request:', error.message);
    throw error;
  }
};

export const rejectConnectionRequest = async (connectionId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/connections/reject-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ connectionId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to reject request');
    }

    return data;
  } catch (error) {
    console.error('Error rejecting request:', error.message);
    throw error;
  }
};

export const getConnectionSuggestions = async () => {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch(`${API_URL}api/connections/suggestions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to fetch suggestions');
  console.log('[getConnectionSuggestions] Response data:', data);
  return data.suggestions;
};

// Project Invite Functions
export const getMyProjectInvites = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/projects/my-invites`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    console.log('[getMyProjectInvites] Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch project invites');
    }

    return data.invites || [];
  } catch (error) {
    console.error('Error fetching project invites:', error.message);
    throw error;
  }
};

export const respondToProjectInvite = async (inviteId, action) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/projects/invites/${inviteId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action }), // 'accept' or 'decline'
    });

    const data = await response.json();
    console.log('[respondToProjectInvite] Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to respond to invite');
    }

    return data.message;
  } catch (error) {
    console.error('Error responding to project invite:', error.message);
    throw error;
  }
};