import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

export const materialRequestAPI = {
  // Submit a new material request
  createRequest: async (requestData) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}api/material-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit request');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Create material request error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all material requests for a project
  getProjectTaskRequests: async (projectId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}api/material-requests/project/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log(data)
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch requests');
      }

      return { success: true, data: data.requests || [] };
    } catch (error) {
      console.error('Fetch requests error:', error);
      return { success: false, error: error.message };
    }
  },
  getProjectRequests: async (taskId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}api/material-requests/task/${taskId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log(data)
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch requests');
      }

      return { success: true, data: data.requests || [] };
    } catch (error) {
      console.error('Fetch requests error:', error);
      return { success: false, error: error.message };
    }
  },
  // Update material request status (for PM/Admin)
  updateRequestStatus: async (requestId, statusData) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}api/material-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(statusData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update request');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Update request error:', error);
      return { success: false, error: error.message };
    }
  },
};
