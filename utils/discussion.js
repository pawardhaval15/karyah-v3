import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserIdFromToken } from './auth';
import { API_URL } from './config';

// Get all messages for a project discussion (with restriction checks)
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
    console.log('Discussion Messages Data:', data);
    if (!response.ok) {
      // Handle restriction-based access denial
      if (response.status === 403) {
        throw new Error(data.error || 'Access restricted');
      }
      throw new Error(data.error || 'Failed to fetch messages');
    }

    // Normalize reactions for each message
    const normalizedMessages = Array.isArray(data)
      ? data.map((msg) => ({
          ...msg,
          reactions:
            msg.reactions && typeof msg.reactions === 'object'
              ? Object.entries(msg.reactions).map(([userId, reaction]) => ({
                  userId,
                  type: reaction,
                  count: 1,
                }))
              : [],
        }))
      : [];

    return normalizedMessages;
  } catch (error) {
    console.error('Get Messages Error:', error.message);
    throw error;
  }
};

// Post a new message to project discussion (with restriction checks)
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
      // Handle restriction-based access denial
      if (response.status === 403) {
        throw new Error(data.error || 'Cannot post messages - access restricted');
      }
      throw new Error(data.error || 'Failed to post message');
    }

    return data;
  } catch (error) {
    console.error('Post Message Error:', error.message);
    throw error;
  }
};

// React to a message (like, dislike, etc.) - with restriction checks
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
      // Handle restriction-based access denial
      if (response.status === 403) {
        throw new Error(data.error || 'Cannot react to messages - access restricted');
      }
      throw new Error(data.error || 'Failed to react to message');
    }

    return data;
  } catch (error) {
    console.error('React to Message Error:', error.message);
    throw error;
  }
};

// Toggle pin status of a message - with restriction checks
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
      // Handle restriction-based access denial
      if (response.status === 403) {
        throw new Error(data.error || 'Cannot pin/unpin messages - access restricted');
      }
      throw new Error(data.error || 'Failed to toggle pin status');
    }

    return data;
  } catch (error) {
    console.error('Toggle Pin Message Error:', error.message);
    throw error;
  }
};

// Check user restrictions for discussion module
export const checkUserDiscussionRestrictions = async (projectId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('User not authenticated');

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
    console.log('Discussion Restrictions Data:', data);
    console.log('Current userId:', userId);
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to check restrictions');
    }

    // Find discussion restrictions for current user
    const userRestrictions = data.find(restriction => 
      restriction.userId === userId && restriction.module === 'discussion'
    );

    console.log('Found restrictions for user:', userRestrictions);

    // If no restrictions found, user has full access
    if (!userRestrictions) {
      console.log('No restrictions found - granting full access');
      return {
        canView: true,
        canReply: true,
        canEdit: true,
      };
    }

    // The restriction record shows what user CAN do when true
    // Based on backend logic: if restriction.canView is false, user cannot view
    const permissions = {
      canView: userRestrictions.canView,    // If canView is true, user can view
      canReply: userRestrictions.canReply,  // If canReply is true, user can reply  
      canEdit: userRestrictions.canEdit,    // If canEdit is true, user can edit
    };

    console.log('Calculated permissions:', permissions);
    return permissions;

  } catch (error) {
    console.error('Check User Restrictions Error:', error.message);
    // On error, default to no access for security
    return {
      canView: false,
      canReply: false,
      canEdit: false,
    };
  }
};
