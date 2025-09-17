import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_URL } from './config';
// Get all tasks by worklist ID
export const getTasksByWorklistId = async (worklistId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const url = `${API_URL}api/tasks/worklist/${worklistId}`;

    console.log('Fetching tasks from:', url);
    console.log('Using token:', token);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    const contentType = response.headers.get('content-type');
    console.log('Response Content-Type:', contentType);
    console.log('Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response Error Text:', errorText);
      throw new Error('Failed to fetch tasks');
    }

    const data = await response.json();
    console.log('Fetched tasks:', data.tasks);
    return data.tasks;
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    throw error;
  }
};

// Create a new task
// export const createTask = async (taskData) => {
//   try {
//     const token = await AsyncStorage.getItem('token');
//     const url = `${API_URL}api/tasks/create`;

//     const formData = new FormData();
//     for (const key in taskData) {
//       let value = taskData[key];

//       if (key === 'startDate' || key === 'endDate') {
//         if (value && !isNaN(Date.parse(value))) {
//           const isoDate = new Date(value).toISOString();
//           formData.append(key, isoDate);
//         } else {
//           formData.append(key, '');
//         }
//       } else if (Array.isArray(value)) {
//         formData.append(key, JSON.stringify(value));
//       } else if (value !== undefined && value !== null) {
//         formData.append(key, String(value));
//       }

//     }

//     const response = await fetch(url, {
//       method: 'POST',
//       headers: {
//         ...(token && { Authorization: `Bearer ${token}` }),
//       },
//       body: formData,
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Create Task Error:', errorText);
//       throw new Error('Failed to create task');
//     }

//     const data = await response.json();
//     return data.task;
//   } catch (error) {
//     console.error('Error creating task:', error.message);
//     throw error;
//   }
// };

export const createTask = async (taskData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const url = `${API_URL}api/tasks/create`;

    const formData = new FormData();

    for (const key in taskData) {
      const value = taskData[key];

      if (key === 'startDate' || key === 'endDate') {
        if (value && !isNaN(Date.parse(value))) {
          const isoDate = new Date(value).toISOString();
          formData.append(key, isoDate);
        } else {
          formData.append(key, '');
        }

      } else if (key === 'images' && Array.isArray(value)) {
        for (const file of value) {
          if (!file.uri) continue;
          // Convert content:// to file:// on Android
          let fileUri = file.uri;
          if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
            fileUri = `file://${fileUri}`;
          }
          let mimeType = file.type || 'application/octet-stream';
          if (mimeType && !mimeType.includes('/')) {
            if (mimeType === 'image') mimeType = 'image/jpeg';
            else if (mimeType === 'video') mimeType = 'video/mp4';
            else mimeType = 'application/octet-stream';
          }
          formData.append('images', {
            uri: fileUri,
            type: mimeType,
            name: file.name || fileUri.split('/').pop() || 'file',
          });
        }

      } else if (Array.isArray(value)) {
        // Convert array fields like assignedUserIds or dependentTaskIds to JSON string
        formData.append(key, JSON.stringify(value));

      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        'Content-Type': 'multipart/form-data', // Ensure proper upload handling
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create Task Error:', errorText);
      throw new Error('Failed to create task');
    }

    const data = await response.json();
    return data.task;
  } catch (error) {
    console.error('Error creating task:', error.message);
    throw error;
  }
};

// old task create function
// export const createTask = async (taskData) => {
//   try {
//     const token = await AsyncStorage.getItem('token');
//     const url = `${API_URL}api/tasks/create`;

//     const formData = new FormData();

//     for (const key in taskData) {
//       const value = taskData[key];

//       // Date normalization
//       if (key === 'startDate' || key === 'endDate') {
//         if (value && !isNaN(Date.parse(value))) {
//           const isoDate = new Date(value).toISOString();
//           formData.append(key, isoDate);
//         } else {
//           formData.append(key, '');
//         }
//       // Attachment logic
//       } else if (key === 'images' && Array.isArray(value)) {
//         for (const file of value) {
//           if (!file.uri) continue;
//           // Convert content:// to file:// on Android
//           let fileUri = file.uri;
//           if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
//             fileUri = `file://${fileUri}`;
//           }
//           let mimeType = file.type || 'application/octet-stream';
//           if (mimeType && !mimeType.includes('/')) {
//             if (mimeType === 'image') mimeType = 'image/jpeg';
//             else if (mimeType === 'video') mimeType = 'video/mp4';
//             else mimeType = 'application/octet-stream';
//           }
//           formData.append('images', {
//             uri: fileUri,
//             type: mimeType,
//             name: file.name || fileUri.split('/').pop() || 'file',
//           });
//         }
//       // Array fields as JSON
//       } else if (Array.isArray(value)) {
//         formData.append(key, JSON.stringify(value));
//       } else if (value !== undefined && value !== null) {
//         formData.append(key, String(value));
//       }
//     }

//     const response = await fetch(url, {
//       method: 'POST',
//       headers: {
//         ...(token && { Authorization: `Bearer ${token}` }),
//         // Don't manually set Content-Type for FormData!
//       },
//       body: formData,
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Create Task Error:', errorText);
//       throw new Error('Failed to create task');
//     }

//     const data = await response.json();
//     return data.task;
//   } catch (error) {
//     console.error('Error creating task:', error.message);
//     throw error;
//   }
// };


export const fetchMyTasks = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_URL}api/tasks/my-tasks`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to fetch tasks');
    // console.log('Fetched my tasks:', data.tasks);
    return data.tasks;
  } catch (error) {
    console.error('❌ Error fetching my tasks:', error.message);
    throw error;
  }
};

export const getTaskDetailsById = async (taskId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const url = `${API_URL}api/tasks/details/${taskId}`;

    // console.log('Fetching task details from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Task Detail Error Text:', errorText);
      throw new Error('Failed to fetch task details');
    }

    const data = await response.json();
    console.log('Fetched task details:', data.task);
    return data.task;
  } catch (error) {
    console.error('❌ Error fetching task details:', error.message);
    throw error;
  }
};

export const getTasksByProjectId = async (projectId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const url = `${API_URL}api/tasks/${projectId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Get Tasks By ProjectId Error:', errorText);
      throw new Error('Failed to fetch tasks by projectId');
    }
    const data = await response.json();
    return data.tasks;
  } catch (error) {
    console.error(' Error fetching tasks by projectId:', error.message);
    throw error;
  }
};

export const updateTaskProgress = async (taskId, progress) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const url = `${API_URL}api/tasks/progress/${taskId}`; // PATCH endpoint
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ progress }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to update progress');
    }
    const data = await response.json();
    return data.progress; // <-- Only return the number!
  } catch (error) {
    console.error('Error updating task progress:', error.message);
    throw error;
  }
};

export const updateTask = async (taskId, updateData) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const url = `${API_URL}api/tasks/update/${taskId}`;
    
    console.log('🔄 Updating task:', { taskId, updateData, url });
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(updateData),
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    // Get the raw response text first
    const responseText = await response.text();
    console.log('📄 Raw response:', responseText);
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('❌ Response was not JSON:', responseText);
      throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 200)}`);
    }
    
    if (!response.ok) {
      console.error('❌ API Error Response:', data);
      throw new Error(data.message || 'Failed to update task');
    }
    
    console.log('✅ Task update success:', data);
    return data.task;
  } catch (error) {
    console.error('❌ Error updating task:', error.message);
    throw error;
  }
};

// Alternative function to update task tags using the other endpoint
export const updateTaskTags = async (taskId, tags) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const url = `${API_URL}api/tasks/${taskId}`;
    
    console.log('🔄 Updating task tags:', { taskId, tags, url });
    
    const formData = new FormData();
    formData.append('tags', JSON.stringify(tags));
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type for FormData
      },
      body: formData,
    });
    
    console.log('📡 Response status:', response.status);
    
    const responseText = await response.text();
    console.log('📄 Raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      console.error('❌ Response was not JSON:', responseText);
      throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 200)}`);
    }
    
    if (!response.ok) {
      console.error('❌ API Error Response:', data);
      throw new Error(data.message || 'Failed to update task tags');
    }
    
    console.log('✅ Task tags update success:', data);
    return data.task || data;
  } catch (error) {
    console.error('❌ Error updating task tags:', error.message);
    throw error;
  }
};

export const updateTaskDetails = async (taskId, data) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const formData = new FormData();

    // ✅ Append basic fields
    formData.append('name', data.taskName || '');
    formData.append('description', data.description || '');
    formData.append('startDate', data.startDate || '');
    formData.append('endDate', data.endDate || '');

    // ✅ Assigned user IDs
    if (Array.isArray(data.assignedUserIds)) {
      data.assignedUserIds.forEach(id => {
        formData.append('assignedUserIds', String(id));
      });
    }

    // ✅ Images to remove
    if (Array.isArray(data.imagesToRemove)) {
      data.imagesToRemove.forEach(index => {
        formData.append('imagesToRemove', String(index));
      });
    }

    // ✅ Append new files
    if (Array.isArray(data.attachments)) {
  data.attachments.forEach(att => {
    if (att && att.uri) {
      const uri = att.uri.startsWith('file://') ? att.uri : `file://${att.uri}`;

      // Fix MIME type here - ensure it contains '/' character
      let mimeType = att.type;
      if (mimeType && !mimeType.includes('/')) {
        if (mimeType === 'image') mimeType = 'image/jpeg';
        else if (mimeType === 'video') mimeType = 'video/mp4';
        else mimeType = 'application/octet-stream';
      }

      formData.append('images', {
        uri,
        name: att.name || 'file',
        type: mimeType || 'application/octet-stream',
      });
    }
  });
}

    // ✅ Dependent task IDs
    if (Array.isArray(data.dependentTaskIds)) {
      data.dependentTaskIds.forEach(id => {
        formData.append('dependentTaskIds', String(id));
      });
    }

    // ✅ Debug log
    console.log('[updateTaskDetails] Final FormData:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    const url = `${API_URL}api/tasks/${taskId}`;
    console.log('[updateTaskDetails] Final URL:', url);

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const text = await res.text();

    try {
      const json = JSON.parse(text);
      if (!res.ok) {
        console.error('[updateTaskDetails] Server error response:', json);
        throw new Error(json.message || 'Failed to update task');
      }
      console.log('[updateTaskDetails] Success response:', json);
      return json;
    } catch (err) {
      console.error('[updateTaskDetails] Invalid JSON:', text);
      throw new Error('Server response was not JSON');
    }
  } catch (error) {
    console.error('[updateTaskDetails] Network error:', error);
    throw error;
  }
};

export const deleteTask = async (taskId) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const url = `${API_URL}api/tasks/${taskId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    const data = await response.json();

    if (!response.ok) {
      // Backend sends e.g. { message: "Task not found." } or { message: "You are not authorized..." }
      throw new Error(data.message || 'Failed to delete task');
    }
    return data; // { message: "...", ... }
  } catch (error) {
    console.error('Error deleting task:', error.message);
    throw error;
  }
};

export const bulkAssignTasks = async (taskIds, assignedUserIds) => {
  try {
    const token = await AsyncStorage.getItem('token');
    const url = `${API_URL}api/tasks/bulk-assign`;
    
    console.log('🔄 Bulk assign API call:', {
      url,
      taskIds,
      assignedUserIds,
      taskIdsType: typeof taskIds,
      assignedUserIdsType: typeof assignedUserIds,
      taskIdsLength: taskIds?.length,
      assignedUserIdsLength: assignedUserIds?.length
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        taskIds,
        assignedUserIds,
      }),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);

    const data = await response.json();
    console.log('📊 Response data:', data);

    if (!response.ok) {
      console.error('❌ API Error Response:', data);
      throw new Error(data.message || 'Failed to bulk assign tasks');
    }

    console.log('✅ Bulk assign API success:', data);
    return data;
  } catch (error) {
    console.error('❌ Error bulk assigning tasks:', error.message);
    console.error('❌ Full error:', error);
    throw error;
  }
};