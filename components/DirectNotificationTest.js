// Direct test component to verify notifications are working
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomNotificationPopup from '../components/popups/CustomNotificationPopup';

export function DirectNotificationTest({ theme }) {
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState(null);

  const testDirectNotification = () => {
    console.log('🧪 Direct notification test triggered');
    setNotificationData({
      title: 'Direct Test Notification',
      message: 'This is a direct test to verify the notification popup is working correctly.',
      data: {
        type: 'test',
        testId: 'direct_test_123',
        priority: 'high',
        source: 'direct',
        timestamp: new Date().toISOString(),
      },
    });
    setShowNotification(true);
  };

  const handleCancel = () => {
    console.log('❌ Direct notification cancelled');
    setShowNotification(false);
    setNotificationData(null);
  };

  const handleEnlarge = (notification) => {
    console.log('🔍 Direct notification enlarged:', notification);
    alert('Enlarge functionality working! ' + JSON.stringify(notification, null, 2));
  };

  const handleNavigate = (data) => {
    console.log('🔄 Direct notification navigation:', data);
    alert('Navigation functionality working! ' + JSON.stringify(data, null, 2));
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.testButton, { backgroundColor: theme?.primary || '#007AFF' }]}
        onPress={testDirectNotification}
      >
        <Text style={styles.testButtonText}>🧪 Test Direct Notification</Text>
      </TouchableOpacity>
      
      <CustomNotificationPopup
        visible={showNotification}
        title={notificationData?.title}
        message={notificationData?.message}
        data={notificationData?.data}
        onEnlarge={handleEnlarge}
        onCancel={handleCancel}
        onNavigate={handleNavigate}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  testButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
