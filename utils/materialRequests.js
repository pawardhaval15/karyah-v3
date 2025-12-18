import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

export const materialRequestAPI = {
  // Submit a new material request
  createRequest: async ({ projectId, taskId = null, requestedItems, assignedUserIds = [], actionType = null }) => {
    try {
      const token = await AsyncStorage.getItem('token');

      const payload = {
        projectId,
        taskId,            // can be null (optional)
        requestedItems,    // [{ itemName, quantityRequested, unit }]
        assignedUserIds,   // optional array, default empty
      };

      if (actionType) {
        payload.actionType = actionType;
      }

      const response = await fetch(`${API_URL}api/material-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text(); // Read raw response text for debug
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error('Failed to parse JSON:', jsonError);
        console.error('Response text:', text);
        throw new Error(`Invalid JSON response from server.`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit request');
      }

      return { success: true, data };
    } catch (error) {
      console.error('Create material request error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  },


  // Get all material requests for a project
  getProjectRequests: async (projectId) => {  // Renamed from getProjectTaskRequests for clarity
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
      // console.log('Project Requests:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch requests');
      }

      return { success: true, data: data.requests || [] };
    } catch (error) {
      console.error('Fetch project requests error:', error);
      return { success: false, error: error.message };
    }
  },

  getTaskRequests: async (taskId) => {
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
      // console.log(data)
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
  // New: Edit material request details (task, requested items, remarks, etc.)
  editRequest: async (requestId, updateData) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}api/material-requests/material/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update request');
      return { success: true, data };
    } catch (error) {
      console.error('Edit request error:', error);
      return { success: false, error: error.message };
    }
  },
};
