import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

export const getProjectsByUserId = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error("User not authenticated");

    const response = await fetch(`${API_URL}api/projects`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });
    const data = await response.json();
    // console.log('Response data:', data);

    if (!response.ok) throw new Error(data.message || 'Failed to fetch projects');
    return data.projects;
};

export const getProjectById = async (id) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('User not authenticated');

  const response = await fetch(`${API_URL}api/projects/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch project details');
  }

  return data.project;
};

export const createProject = async (projectData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    // Log your payload to debug easily
    console.log(' Final JSON Payload:', JSON.stringify(projectData, null, 2));

    const response = await fetch(`${API_URL}api/projects/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(' Create Project Error Response:', errorText);
      throw new Error('Failed to create project');
    }

    const data = await response.json();
    return data.project;
  } catch (error) {
    console.log(' Create Project Error:', error.message);
    throw error;
  }
};

export const updateProject = async (id, projectData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    // console.log(' Updating project:', id);
    // console.log(' Payload:', JSON.stringify(projectData, null, 2));

    const response = await fetch(`${API_URL}api/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(projectData),
    });

    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch {
      throw new Error('Invalid JSON response from server');
    }

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update project');
    }

    return data.project;
  } catch (error) {
    console.error('Update Project Error:', error.message);
    throw error;
  }
};

export const getTaskDependencyChartByProjectId = async (projectId) => {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('User not authenticated');

  const response = await fetch(`${API_URL}api/projects/dependency-chart/${projectId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch task dependency chart');
  }

  return data; // Contains: dependencyTrees, sequentialChains, dependencies, tasks
};

export const deleteProjectById = async (id) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/projects/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete project');
    }

    return data.message; // Expected: "Project deleted successfully."
  } catch (error) {
    console.error('Delete Project Error:', error.message);
    throw error;
  }
};