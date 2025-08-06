import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from './config';

export async function fetchTaskMessages(taskId) {
  const token = await AsyncStorage.getItem('token');
  try {
    const res = await fetch(`${API_URL}api/messages/task/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('[fetchTaskMessages] Response:', data);
    if (!res.ok) throw new Error(data.message || 'Failed to fetch messages');
    console.log('[fetchTaskMessages] Messages:', data.messages);
    return (data.messages || []).map(msg => ({
      id: msg.id,
      text: msg.message,
      userId: msg.senderId || (msg.sender && msg.sender.userId),
      sender: msg.sender,
      createdAt: msg.createdAt,
      attachments: msg.attachments || [],
    }));
  } catch (err) {
    console.error('[fetchTaskMessages] Error:', err);
    throw err;
  }
}

export async function sendTaskMessage({ taskId, message, attachments = [], mentions = [] }) {
  const token = await AsyncStorage.getItem('token');
  const formData = new FormData();
  formData.append('taskId', taskId);
  formData.append('message', message);
  
  // Add mentions if any
  if (mentions && mentions.length > 0) {
    mentions.forEach((mentionUserId) => {
      formData.append('mentions[]', mentionUserId);
    });
  }
  
  // Attach files if any
  attachments.forEach((file, idx) => {
    formData.append('attachments', {
      uri: file.uri,
      name: file.name || `attachment_${idx}`,
      type: file.type || 'application/octet-stream',
    });
  });
  try {
    const res = await fetch(`${API_URL}api/messages/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    const data = await res.json();
    console.log('[sendTaskMessage] Response:', data);
    if (!res.ok) throw new Error(data.message || 'Failed to send message');
    // Normalize for frontend
    const msg = data.taskMessage;
    return {
      id: msg.id,
      text: msg.message,
      userId: msg.senderId || (msg.sender && msg.sender.userId),
      sender: msg.sender,
      createdAt: msg.createdAt,
      attachments: msg.attachments || [],
      mentions: msg.mentions || [],
      readBy: msg.readBy || [],
    };
  } catch (err) {
    console.error('[sendTaskMessage] Error:', err);
    throw err;
  }
}