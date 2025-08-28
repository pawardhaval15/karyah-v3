import { API_URL } from './config'; // Make sure this points to your actual backend URL

// Function to create a new worklist
export const createWorklist = async (projectId, name, token) => {
  try {
    const url = `${API_URL}api/worklists/create`;
    console.log('Creating worklist at:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ projectId, name }),
    });

    const contentType = response.headers.get('content-type');
    //console.log('Create Response Status:', response.status);
    //console.log('Create Response Content-Type:', contentType);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create Worklist Error Response:', errorText);
      throw new Error('Failed to create worklist');
    }

    const data = await response.json();
    //console.log('Worklist created successfully:', data);
    return data.worklist;
  } catch (error) {
    console.error('Error creating worklist:', error.message);
    throw error;
  }
};
// Function to fetch worklists by project ID
export const getWorklistsByProjectId = async (projectId, token) => {
  try {
    const url = `${API_URL}api/worklists/project/${projectId}`;
    // console.log('Fetching worklists from:', url);
    // console.log('Using token:', token);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      // Handle HTML/text errors for debugging
      const errorText = await response.text();
      console.error('Response Error Text:', errorText);
      throw new Error('Failed to fetch worklists');
    }

    const data = await response.json();
    // console.log('Fetched worklists:', data.worklists);
    return data.worklists;
  } catch (error) {
    console.error('Error fetching worklists:', error.message);
    throw error;
  }
};

export const updateWorklist = async (id, name, token) => {
  try {
    const url = `${API_URL}api/worklists/${id}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update Worklist Error:', errorText);
      throw new Error('Failed to update worklist');
    }

    const data = await response.json();
    return data.worklist; // Or whatever you want to return
  } catch (error) {
    console.error('Error updating worklist:', error.message);
    throw error;
  }
};

export const deleteWorklist = async (id, token) => {
  try {
    const url = `${API_URL}api/worklists/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Delete Worklist Error:', errorText);
      throw new Error('Failed to delete worklist');
    }

    // Success
    return true; // or you can return response.json() if you need the message
  } catch (error) {
    console.error('Error deleting worklist:', error.message);
    throw error;
  }
};

// Function to fetch project worklists progress
export const getProjectWorklistsProgress = async (projectId, token) => {
  try {
    const url = `${API_URL}api/worklists/project/${projectId}/progress`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Get Project Progress Error:', errorText);
      throw new Error('Failed to fetch project progress');
    }

    const data = await response.json();
    return data.worklists;
  } catch (error) {
    console.error('Error fetching project progress:', error.message);
    throw error;
  }
};
