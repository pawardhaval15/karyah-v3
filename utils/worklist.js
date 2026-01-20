import apiClient from './apiClient';

// Function to create a new worklist
export const createWorklist = async (projectId, name) => {
  try {
    const response = await apiClient.post('api/worklists/create', { projectId, name });
    return response.data.worklist;
  } catch (error) {
    console.error('Error creating worklist:', error.message);
    throw error;
  }
};

// Function to fetch worklists by project ID
export const getWorklistsByProjectId = async (projectId) => {
  try {
    const response = await apiClient.get(`api/worklists/project/${projectId}`);
    return response.data.worklists;
  } catch (error) {
    console.error('Error fetching worklists:', error.message);
    throw error;
  }
};

export const updateWorklist = async (id, name) => {
  try {
    const response = await apiClient.put(`api/worklists/${id}`, { name });
    return response.data.worklist;
  } catch (error) {
    console.error('Error updating worklist:', error.message);
    throw error;
  }
};

export const deleteWorklist = async (id) => {
  try {
    await apiClient.delete(`api/worklists/${id}`);
    return true;
  } catch (error) {
    console.error('Error deleting worklist:', error.message);
    throw error;
  }
};

// Function to fetch project worklists progress
export const getProjectWorklistsProgress = async (projectId) => {
  try {
    const response = await apiClient.get(`api/worklists/project/${projectId}/progress`);
    return response.data.worklists;
  } catch (error) {
    console.error('Error fetching project progress:', error.message);
    throw error;
  }
};
