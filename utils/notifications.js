import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

export const fetchNotifications = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No token found in storage.');

    const response = await fetch(`${API_URL}api/notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    const text = await response.text();

    if (!response.ok) {
      console.error('Failed to fetch notifications. Status:', response.status, 'Response:', text);
      try {
        const errorJson = JSON.parse(text);
        throw new Error(errorJson.message || 'Failed to fetch notifications');
      } catch {
        throw new Error('Failed to fetch notifications');
      }
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      console.error('Response was not valid JSON:', text);
      throw new Error('Invalid JSON from server');
    }
  } catch (err) {
    console.error('Error in fetchNotifications:', err.message);
    throw err;
  }
};

export const markAllNotificationsAsRead = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No token found in storage.');

    const res = await fetch(`${API_URL}api/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await res.text();

    try {
      if (!res.ok) {
        // If error response, try to parse JSON message
        try {
          const json = JSON.parse(text);
          throw new Error(json.message || 'Failed to mark as read');
        } catch (e) {
          throw new Error('Failed to mark as read (Server Error)');
        }
      }

      // If success, try parse JSON, but if fails (e.g. empty 200 OK), just return true
      try {
        const json = JSON.parse(text);
        return json;
      } catch (e) {
        // Assume success if status was OK but body wasn't JSON
        return true;
      }
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error.message);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No token found in storage.');

    const response = await fetch(`${API_URL}api/notifications/read`, {
      method: 'PUT',  // assuming POST, adjust if PUT or PATCH
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationId }),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error('Failed to mark notification as read. Status:', response.status, 'Response:', text);
      try {
        const errorJson = JSON.parse(text);
        throw new Error(errorJson.message || 'Failed to mark notification as read');
      } catch {
        throw new Error('Failed to mark notification as read');
      }
    }
    try {
      return JSON.parse(text);  // return whatever backend returns (maybe confirmation)
    } catch (err) {
      console.error('Response was not valid JSON:', text);
      throw new Error('Invalid JSON from server');
    }
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error.message);
    throw error;
  }
};