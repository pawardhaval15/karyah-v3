import React, { useState } from 'react';
import { NotificationQueueManager } from '../components/NotificationQueueManager';
import { navigationRef } from '../navigation/navigationRef';

class CustomNotificationManager {
  static instance = null;
  static listeners = [];
  static notificationQueue = [];

  static getInstance() {
    if (!CustomNotificationManager.instance) {
      CustomNotificationManager.instance = new CustomNotificationManager();
    }
    return CustomNotificationManager.instance;
  }

  static addListener(listener) {
    console.log('📝 Adding notification listener, total listeners:', this.listeners.length + 1);
    this.listeners.push(listener);
    
    // Send current queue to new listener
    if (this.notificationQueue.length > 0) {
      console.log('📬 Sending current queue to new listener:', this.notificationQueue);
      listener({ type: 'QUEUE_UPDATE', queue: [...this.notificationQueue] });
    }
  }

  static removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
    console.log('📝 Removing notification listener, remaining listeners:', this.listeners.length);
  }

  static showNotification(notification) {
    console.log('📢 Adding notification to queue:', notification);
    
    // Add unique ID if not present
    if (!notification.id) {
      notification.id = Date.now() + Math.random();
    }
    
    // Add to queue
    this.notificationQueue.push(notification);
    console.log('📬 Queue length after adding:', this.notificationQueue.length);
    
    // Broadcast queue update
    this.listeners.forEach(listener => {
      listener({ type: 'QUEUE_UPDATE', queue: [...this.notificationQueue] });
    });
  }

  static removeNotification(notificationId) {
    console.log('🗑️ Removing notification:', notificationId);
    this.notificationQueue = this.notificationQueue.filter(n => n.id !== notificationId);
    console.log('📬 Queue length after removal:', this.notificationQueue.length);
    
    // Broadcast queue update
    this.listeners.forEach(listener => {
      listener({ type: 'QUEUE_UPDATE', queue: [...this.notificationQueue] });
    });
  }

  static clearAllNotifications() {
    console.log('🧹 Clearing all notifications');
    this.notificationQueue = [];
    
    // Broadcast queue update
    this.listeners.forEach(listener => {
      listener({ type: 'QUEUE_UPDATE', queue: [] });
    });
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

  React.useEffect(() => {
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
