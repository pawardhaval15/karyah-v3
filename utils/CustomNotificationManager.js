import React, { useState, useEffect } from 'react';
import { NotificationQueueManager } from '../components/NotificationQueueManager';
import { navigationRef } from '../navigation/navigationRef';

class CustomNotificationManager {
  static instance = null;
  static listeners = [];
  static notificationQueue = [];
  static pendingNotifications = new Map(); // Track pending notifications to prevent rapid duplicates

  static getInstance() {
    if (!CustomNotificationManager.instance) {
      CustomNotificationManager.instance = new CustomNotificationManager();
    }
    return CustomNotificationManager.instance;
  }

  static addListener(listener) {
    console.log('📝 Adding notification listener, total listeners:', this.listeners.length + 1);
    this.listeners.push(listener);
    
    // Send current queue to new listener asynchronously
    if (this.notificationQueue.length > 0) {
      console.log('📬 Sending current queue to new listener:', this.notificationQueue);
      setTimeout(() => {
        listener({ type: 'QUEUE_UPDATE', queue: [...this.notificationQueue] });
      }, 0);
    }
  }

  static removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
    console.log('📝 Removing notification listener, remaining listeners:', this.listeners.length);
  }

  static showNotification(notification) {
    console.log('📢 Attempting to add notification:', notification);
    
    // Create a unique key for this notification
    const notificationKey = `${notification.title}-${notification.data?.type}-${notification.data?.issueId}-${notification.data?.projectId}-${notification.data?.taskId}`;
    
    // Check if this exact notification is already pending (debounce within 500ms)
    if (this.pendingNotifications.has(notificationKey)) {
      console.log('🚫 Notification already pending, ignoring duplicate:', notificationKey);
      return;
    }
    
    // Mark as pending
    this.pendingNotifications.set(notificationKey, true);
    
    // Clear pending status after 500ms
    setTimeout(() => {
      this.pendingNotifications.delete(notificationKey);
    }, 500);
    
    // Enhanced duplicate checking with multiple criteria
    const isDuplicate = this.notificationQueue.some(existing => {
      // Check by ID first (if present)
      if (notification.id && existing.id && notification.id === existing.id) {
        return true;
      }
      
      // Check by content and data
      const sameContent = existing.title === notification.title && 
                         existing.message === notification.message;
      
      const sameData = existing.data?.type === notification.data?.type &&
                      existing.data?.issueId === notification.data?.issueId &&
                      existing.data?.projectId === notification.data?.projectId &&
                      existing.data?.taskId === notification.data?.taskId;
      
      // Consider it duplicate if content and data match, and it's recent (within 2 seconds)
      if (sameContent && sameData) {
        const existingTime = new Date(existing.timestamp).getTime();
        const currentTime = Date.now();
        const timeDiff = currentTime - existingTime;
        
        if (timeDiff < 2000) { // Within 2 seconds
          return true;
        }
      }
      
      return false;
    });
    
    if (isDuplicate) {
      console.log('🚫 Duplicate notification detected and blocked:', {
        title: notification.title,
        data: notification.data
      });
      return;
    }
    
    // Add unique ID and timestamp if not present
    if (!notification.id) {
      notification.id = Date.now() + Math.random();
    }
    
    if (!notification.timestamp) {
      notification.timestamp = new Date();
    }
    
    // Add to queue
    this.notificationQueue.push(notification);
    console.log('✅ Notification added to queue:', {
      id: notification.id,
      title: notification.title,
      queueLength: this.notificationQueue.length
    });
    
    // Broadcast queue update asynchronously
    setTimeout(() => {
      this.listeners.forEach(listener => {
        listener({ type: 'QUEUE_UPDATE', queue: [...this.notificationQueue] });
      });
    }, 0);
  }

  static removeNotification(notificationId) {
    console.log('🗑️ Removing notification:', notificationId);
    this.notificationQueue = this.notificationQueue.filter(n => n.id !== notificationId);
    console.log('📬 Queue length after removal:', this.notificationQueue.length);
    
    // Broadcast queue update asynchronously
    setTimeout(() => {
      this.listeners.forEach(listener => {
        listener({ type: 'QUEUE_UPDATE', queue: [...this.notificationQueue] });
      });
    }, 0);
  }

  static clearAllNotifications() {
    console.log('🧹 Clearing all notifications');
    this.notificationQueue = [];
    
    // Broadcast queue update asynchronously
    setTimeout(() => {
      this.listeners.forEach(listener => {
        listener({ type: 'QUEUE_UPDATE', queue: [] });
      });
    }, 0);
  }

  static handleNotificationNavigation(data) {
    if (!data || !data.type) {
      console.log('📬 Custom notification received without navigation data');
      return;
    }

    console.log('🔄 Custom notification navigation:', data);

    if (!navigationRef.isReady()) {
      console.warn('🔄 Navigation not ready, waiting...');
      setTimeout(() => {
        CustomNotificationManager.handleNotificationNavigation(data);
      }, 1000);
      return;
    }

    switch (data.type) {
      case 'project':
        if (data.projectId) {
          navigationRef.navigate('ProjectDetailsScreen', {
            projectId: data.projectId,
          });
        }
        break;
      case 'task':
        if (data.taskId) {
          navigationRef.navigate('TaskDetails', {
            taskId: data.taskId,
          });
        }
        break;
      case 'issue':
        if (data.issueId) {
          navigationRef.navigate('IssueDetails', {
            issueId: data.issueId,
          });
        }
        break;
      default:
        console.warn('📬 Unknown notification type:', data.type);
    }
  }
}

export function CustomNotificationProvider({ children, theme }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const handleNotificationUpdate = (update) => {
      console.log('🎯 CustomNotificationProvider received update:', update);
      
      if (update.type === 'QUEUE_UPDATE') {
        setNotifications(update.queue);
      }
    };

    console.log('🚀 CustomNotificationProvider mounting, adding listener...');
    CustomNotificationManager.addListener(handleNotificationUpdate);

    return () => {
      console.log('🔥 CustomNotificationProvider unmounting, removing listener...');
      CustomNotificationManager.removeListener(handleNotificationUpdate);
    };
  }, []);

  const handleRemoveNotification = (notificationId) => {
    CustomNotificationManager.removeNotification(notificationId);
  };

  const handleClearAll = () => {
    CustomNotificationManager.clearAllNotifications();
  };

  const handleNavigate = (data) => {
    CustomNotificationManager.handleNotificationNavigation(data);
  };

  return (
    <>
      {children}
      <NotificationQueueManager
        notifications={notifications}
        onRemoveNotification={handleRemoveNotification}
        onClearAll={handleClearAll}
        onNavigate={handleNavigate}
        theme={theme}
      />
    </>
  );
}

export default CustomNotificationManager;
