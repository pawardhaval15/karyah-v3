import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { API_URL } from './config';

// Forgot PIN API
export const forgotPin = async (email) => {
  try {
    const url = `${API_URL}api/auth/forget-pin`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to send OTP');
    return data;
  } catch (error) {
    console.error('Error in forgotPin:', error.message);
    throw error;
  }
};

// Reset PIN API
export const resetPin = async (email, otp, newPin) => {
  try {
    const url = `${API_URL}api/auth/reset-pin`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPin }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to reset PIN');
    return data;
  } catch (error) {
    console.error('Error in resetPin:', error.message);
    throw error;
  }
};
// Change PIN API
export const changePin = async (currentPin, newPin) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const url = `${API_URL}api/auth/change-pin`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPin, newPin }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to change PIN');
    return data;
  } catch (error) {
    console.error('Error in changePin:', error.message);
    throw error;
  }
};
// Get user's public/private status
export const getIsPublic = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const url = `${API_URL}api/auth/user`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch user details');
    return data.user?.isPublic;
  } catch (error) {
    console.error('Error in getIsPublic:', error.message);
    throw error;
  }
};
// Update user's public visibility
export const updateIsPublic = async (isPublic) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) throw new Error('No token found');
    const url = `${API_URL}api/auth/is-public`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isPublic }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to update public visibility');
    return data;
  } catch (error) {
    console.error('Error in updateIsPublic:', error.message);
    throw error;
  }
};
// Register user API
export const registerUser = async (data) => {
  const url = `${API_URL}api/auth/register`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const resData = await response.json();
    if (!response.ok) throw new Error(resData.message || 'Registration failed');
    return resData;
  } catch (error) {
    console.error('Error in registerUser:', error.message);
    throw error;
  }
};


export const checkEmailOrMobile = async (identifier) => {
  const url = `${API_URL}api/auth/check-email`;
  // Detect if identifier is email (contains @)
  const isEmail = identifier.includes('@');
  const body = isEmail ? { email: identifier } : { mobile: identifier };

  console.log('[checkEmailOrMobile] Sending request to:', url);
  console.log(' Request body:', body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log(' Response status:', response.status);

    const data = await response.json();
    console.log(' Response JSON:', data);

    if (!response.ok) throw new Error(data.message || 'Failed to send OTP');
    return data;
  } catch (error) {
    console.error(' Error in checkEmailOrMobile:', error.message);
    throw error;
  }
};

export const verifyOtp = async (identifier, otp) => {
  const url = `${API_URL}api/auth/verify-otp`;
  const body = { identifier, otp };

  console.log(' [verifyOtp] Sending request to:', url);
  console.log(' Request body:', body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    console.log('Response status:', response.status);

    const data = await response.json();
    // console.log(' Response JSON:', data);

    if (!response.ok) throw new Error(data.message || 'OTP verification failed');
    return data;
  } catch (error) {
    console.error(' Error in verifyOtp:', error.message);
    throw error;
  }
};

export const loginWithPin = async (identifier, pin) => {
  const url = `${API_URL}api/auth/login`;

  console.log(' [loginWithPin] Sending request to:', url);
  console.log(' Request body:', { identifier, pin });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, pin }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(' [loginWithPin] Failed:', data);
    throw new Error(data.message || 'Login failed');
  }

  // console.log(' [loginWithPin] Response:', data);
  return data;
};

export const getUserNameFromToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;
    const decoded = jwtDecode(token); // decode safely
    return decoded.name || decoded.username || decoded.email || null;
  } catch (error) {
    console.error('Error decoding token:', error.message);
    return null;
  }
};

export const getUserIdFromToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return null;
    const decoded = jwtDecode(token); // decode safely
    return decoded.userId || decoded.id || decoded.sub || null;
  } catch (error) {
    console.error('Error decoding token for userId:', error.message);
    return null;
  }
};

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
    if (!response.ok) throw new Error(data.message || 'Failed to fetch user details');
    return data.user;
  } catch (error) {
    console.error('Error fetching user details:', error.message);
    throw error;
  }
};

export async function updateUserDetails(data) {
  const token = await AsyncStorage.getItem('token');

  // If profilePhoto is a local file URI, use FormData
  let isLocalPhoto = data.profilePhoto && data.profilePhoto.startsWith('file://');
  if (isLocalPhoto) {
    let formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'profilePhoto') {
        formData.append('profilePhoto', {
          uri: value,
          name: 'profile.jpg',
          type: 'image/jpeg',
        });
      } else if (value !== undefined) {
        formData.append(key, value);
      }
    });

    const res = await fetch(`${API_URL}api/auth/user`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Do not set Content-Type, let fetch set it for FormData
      },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to update user');
    return await res.json();
  } else {
    // No new photo, send JSON
    const res = await fetch(`${API_URL}api/auth/user`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user');
    return await res.json();
  }
}