import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

// Create a new community
export const createCommunity = async (organizationId, name, description, visibility) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/communities/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        organizationId,
        name,
        description,
        visibility,
      }),
    });

    const data = await response.json();
    // console.log('Community Create Response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create community');
    }

    return data.community;
  } catch (error) {
    console.error('Create Community Error:', error.message);
    throw error;
  }
};

// Fetch all communities for a specific organization
export const fetchCommunitiesByOrganization = async (orgId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/communities/organization/${orgId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    // console.log('Fetched Communities Response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch communities');
    }

    // Notice the property 'communities' nested inside the response
    return data.communities || [];
  } catch (error) {
    console.error('Fetch Communities Error:', error.message);
    throw error;
  }
};

export const fetchProjectsByOrganization = async (organizationId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/projects/organization/${organizationId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    // console.log('Fetched Projects Response:', data);

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch projects'); // use message from backend
    }

    return data.projects || [];
  } catch (error) {
    console.error('Fetch Projects Error:', error.message);
    throw error;
  }
};

// Fetch current user details
export const fetchUserDetails = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No token found');

    const response = await fetch(`${API_URL}api/auth/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch user details');
    }
    return data.user;
  } catch (error) {
    console.error('Error fetching user details:', error.message);
    throw error;
  }
};

// Fetch community details by ID
export const fetchCommunityDetail = async (communityId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/communities/${communityId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    // console.log('Fetched Community Detail:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch community detail');
    }

    return data.community;
  } catch (error) {
    console.error('Fetch Community Detail Error:', error.message);
    throw error;
  }
};

// Update community details
export const updateCommunity = async (communityId, { name, description, visibility }) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/communities/${communityId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, description, visibility }),
    });

    const data = await response.json();
    // console.log('Community Update Response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to update community');
    }

    return data.community;
  } catch (error) {
    console.error('Update Community Error:', error.message);
    throw error;
  }
};

// Assign projects to a community
export const assignProjectsToCommunity = async (communityId, projectIds) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/communities/assign-project`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ communityId, projectIds }),
    });

    const data = await response.json();
    // console.log('Assign Projects Response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to assign projects to community');
    }

    return data.community;
  } catch (error) {
    console.error('Assign Projects Error:', error.message);
    throw error;
  }
};
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

    if (!response.ok) throw new Error(data.message || 'Failed to fetch projects');
    
    // Ensure we return an array even if data.projects is undefined/null
    const projects = data && data.projects ? data.projects : [];
    if (!Array.isArray(projects)) {
        console.warn('API returned non-array for projects:', projects);
        return [];
    }
    
    return projects;
};

export const deleteCommunityById = async (communityId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/communities/${communityId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    // console.log('Delete Community Response:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete community');
    }

    return data;
  } catch (error) {
    console.error('Delete Community Error:', error.message);
    throw error;
  }
};

// Create announcement
export async function createAnnouncement(communityId, message, token) {
  try {
    const res = await fetch(`${API_URL}api/communities/${communityId}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create announcement');
    return data.announcement;
  } catch (error) {
    console.error(' Error creating announcement:', error);
    throw error;
  }
}
// Get announcements
export async function fetchAnnouncements(communityId, token) {
  try {
    const res = await fetch(`${API_URL}api/communities/${communityId}/announcements`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch announcements');
    return data.announcements;
  } catch (error) {
    console.error(' Error fetching announcements:', error);
    throw error;
  }
}
