import AsyncStorage from '@react-native-async-storage/async-storage';

export const fetchDashboardStats = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch('https://api.karyah.in/api/projects/dashboard/counts', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch dashboard stats');
    // console.log(' Dashboard stats fetched:', data);
    return data;
  } catch (error) {
    console.error(' Error fetching dashboard stats:', error.message);
    throw error;
  }
};