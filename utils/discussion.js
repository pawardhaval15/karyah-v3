import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserIdFromToken } from './auth';
import { API_URL } from './config';

// Get all messages for a project discussion
export const getMessagesByProject = async (projectId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    // Get the userId using the auth helper function
    const userId = await getUserIdFromToken();
    if (!userId) throw new Error('Unable to get user ID from token');

    const response = await fetch(`${API_URL}api/discussions/${projectId}?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch messages');
    }

    return data;
  } catch (error) {
    console.error('Get Messages Error:', error.message);
    throw error;
  }
};

// Post a new message to project discussion
export const postMessage = async (projectId, messageData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    // Get the userId using the auth helper function
    const senderId = await getUserIdFromToken();
    if (!senderId) throw new Error('Unable to get user ID from token');

    // Add senderId to messageData
    const dataWithSender = {
      ...messageData,
      senderId,
    };

    const response = await fetch(`${API_URL}api/discussions/${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(dataWithSender),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to post message');
    }

    return data;
  } catch (error) {
    console.error('Post Message Error:', error.message);
    throw error;
  }
};

// React to a message (like, dislike, etc.)
export const reactToMessage = async (messageId, reactionData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    // Get the userId using the auth helper function
    const userId = await getUserIdFromToken();
    if (!userId) throw new Error('Unable to get user ID from token');

    // Add userId to reactionData
    const dataWithUserId = {
      ...reactionData,
      userId,
    };

    const response = await fetch(`${API_URL}api/discussions/react/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(dataWithUserId),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to react to message');
    }

    return data;
  } catch (error) {
    console.error('React to Message Error:', error.message);
    throw error;
  }
};

// Toggle pin status of a message
export const togglePinMessage = async (messageId, requestData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

    const response = await fetch(`${API_URL}api/discussions/pin/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to toggle pin status');
    }

    return data;
  } catch (error) {
    console.error('Toggle Pin Message Error:', error.message);
    throw error;
  }
};
