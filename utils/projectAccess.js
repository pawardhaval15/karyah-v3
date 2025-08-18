// Edit restriction for a user on a project and module
export const editRestriction = async (projectId, userId, updateData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/project-access/${projectId}/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update restriction');
    }

    return data;
  } catch (error) {
    console.error('Edit Restriction Error:', error.message);
    throw error;
  }
};
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserIdFromToken } from './auth';
import { API_URL } from './config';

// Get all restrictions for a project
export const getRestrictionsByProject = async (projectId) => {
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
      throw new Error(data.error || 'Failed to fetch restrictions data');
    }

    return data;
  } catch (error) {
    console.error('Get Restrictions Error:', error.message);
    throw error;
  }
};

// Set restriction for a user on a project and module
export const setRestriction = async (projectId, restrictionData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/project-access/${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(restrictionData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to set restriction');
    }

    return data;
  } catch (error) {
    console.error('Set Restriction Error:', error.message);
    throw error;
  }
};

// Remove restriction for a user on a project and module
export const removeRestriction = async (projectId, removeData) => {
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
      throw new Error(data.error || 'Failed to remove restriction');
    }

    return data;
  } catch (error) {
    console.error('Remove Restriction Error:', error.message);
    throw error;
  }
};

// Bulk set restrictions for multiple users/modules
export const bulkSetRestrictions = async (projectId, restrictionList) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/project-access/${projectId}/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ restrictionList }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to bulk set restrictions');
    }

    return data;
  } catch (error) {
    console.error('Bulk Set Restrictions Error:', error.message);
    throw error;
  }
};

// Bulk remove restrictions for multiple users/modules
export const bulkRemoveRestrictions = async (projectId, restrictionList) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/project-access/${projectId}/bulk`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ restrictionList }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to bulk remove restrictions');
    }

    return data;
  } catch (error) {
    console.error('Bulk Remove Restrictions Error:', error.message);
    throw error;
  }
};
