// Test utility to demonstrate custom notifications
import { Alert } from 'react-native';
import CustomNotificationManager from './CustomNotificationManager';

export const testCustomNotification = () => {
  console.log('🧪 Testing custom notification (Task)...');
  try {
    // Show a fallback alert to confirm the button is working
    Alert.alert('Test', 'Task notification button pressed! Check console for details.');
    
    // Example notification for a new task
    CustomNotificationManager.showNotification({
      title: 'New Task Assigned',
      message: 'You have been assigned a new task: "Update mobile app UI". Due date: Tomorrow at 5:00 PM.',
      data: {
        type: 'task',
        taskId: '12345',
        priority: 'high',
        source: 'FCM',
        timestamp: new Date().toISOString(),
      },
    });
    console.log('✅ Task notification triggered successfully');
  } catch (error) {
    console.error('❌ Error showing task notification:', error);
    Alert.alert('Error', 'Failed to show notification: ' + error.message);
  }
};

export const testProjectNotification = () => {
  console.log('🧪 Testing custom notification (Project)...');
  try {
    // Show a fallback alert to confirm the button is working
    Alert.alert('Test', 'Project notification button pressed! Check console for details.');
    
    // Example notification for a project update
    CustomNotificationManager.showNotification({
      title: 'Project Update',
      message: 'Project "Karyah Mobile App v3" has been updated. New milestone added: Beta Testing Phase.',
      data: {
        type: 'project',
        projectId: 'proj_67890',
        priority: 'medium',
        source: 'FCM',
        timestamp: new Date().toISOString(),
      },
    });
    console.log('✅ Project notification triggered successfully');
  } catch (error) {
    console.error('❌ Error showing project notification:', error);
    Alert.alert('Error', 'Failed to show notification: ' + error.message);
  }
};

export const testIssueNotification = () => {
  console.log('🧪 Testing custom notification (Issue)...');
  try {
    // Show a fallback alert to confirm the button is working
    Alert.alert('Test', 'Issue notification button pressed! Check console for details.');
    
    // Example notification for an issue
    CustomNotificationManager.showNotification({
      title: 'Critical Issue Reported',
      message: 'A critical bug has been reported in the login system. Immediate attention required.',
      data: {
        type: 'issue',
        issueId: 'issue_999',
        priority: 'critical',
        source: 'FCM',
        timestamp: new Date().toISOString(),
      },
    });
    console.log('✅ Issue notification triggered successfully');
  } catch (error) {
    console.error('❌ Error showing issue notification:', error);
    Alert.alert('Error', 'Failed to show notification: ' + error.message);
  }
};

export const testMultipleNotifications = () => {
  console.log('🧪 Testing multiple notifications...');
  try {
    Alert.alert('Test', 'Multiple notifications will be shown! Check for queue and Clear All button.');
    
    // First notification
    CustomNotificationManager.showNotification({
      title: 'First Notification',
      message: 'This is the first notification in the queue.',
      data: { type: 'test', id: 'test-1' },
    });
    
    // Second notification after 1 second
    setTimeout(() => {
      CustomNotificationManager.showNotification({
        title: 'Second Notification',
        message: 'This notification should stack below the first one.',
        data: { type: 'test', id: 'test-2' },
      });
    }, 1000);
    
    // Third notification after 2 seconds
    setTimeout(() => {
      CustomNotificationManager.showNotification({
        title: 'Third Notification',
        message: 'This demonstrates the queue system with a Clear All button.',
        data: { type: 'test', id: 'test-3' },
      });
    }, 2000);
    
    console.log('✅ Multiple notifications triggered successfully');
  } catch (error) {
    console.error('❌ Error showing multiple notifications:', error);
    Alert.alert('Error', 'Failed to show notifications: ' + error.message);
  }
};
