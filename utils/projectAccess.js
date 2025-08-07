import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserIdFromToken } from './auth';
import { API_URL } from './config';

// Get all access entries for a project
export const getAccessByProject = async (projectId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    // Get the userId using the auth helper function
    const userId = await getUserIdFromToken();
    if (!userId) throw new Error('Unable to get user ID from token');

    const response = await fetch(`${API_URL}api/project-access/${projectId}?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch access data');
    }

    return data;
  } catch (error) {
    console.error('Get Access Error:', error.message);
    throw error;
  }
};

// Add or update access for a user on a project and module
export const setAccess = async (projectId, accessData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/project-access/${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(accessData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to set access');
    }

    return data;
  } catch (error) {
    console.error('Set Access Error:', error.message);
    throw error;
  }
};

// Remove access for a user on a project and module
export const removeAccess = async (projectId, removeData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/project-access/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(removeData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to remove access');
    }

    return data;
  } catch (error) {
    console.error('Remove Access Error:', error.message);
    throw error;
  }
};
