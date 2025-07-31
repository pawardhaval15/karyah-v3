# Custom Notification System

This system provides custom notification popups for both Android and iOS that slide in from the right side of the screen with enhanced user interaction capabilities.

## Features

- **Custom Popup Notifications**: Beautiful animated notifications that slide in from the right
- **Swipe to Dismiss**: Users can swipe right to dismiss notifications
- **Enlarge Button**: Tap to view detailed notification information
- **Cancel Button**: Quick dismiss option
- **LocalStorage Settings**: Users can enable/disable custom notifications
- **Navigation Support**: Notifications can navigate to relevant screens when tapped
- **Theme Support**: Adapts to app's light/dark theme
- **Auto-hide**: Notifications automatically disappear after 5 seconds (configurable)

## Components

### 1. CustomNotificationPopup
- Main notification popup component
- Slides in from right with smooth animation
- Supports swipe gestures for dismissal
- Shows title, message, and action buttons

### 2. EnlargedNotificationModal
- Full-screen modal for detailed notification view
- Shows complete notification data and metadata
- Provides navigation and dismiss actions

### 3. CustomNotificationManager
- Singleton manager for handling notification display
- Manages notification state and navigation
- Provides listener system for notification events

## Setup

### 1. Integration in App.js
```javascript
import { CustomNotificationProvider } from './utils/CustomNotificationManager';

// Wrap your app content with the provider
<CustomNotificationProvider theme={theme}>
  <AppNavigator />
</CustomNotificationProvider>
```

### 2. Update SystemNotificationService
The service now checks for custom notification preference and shows either:
- Custom notification popup (if enabled)
- System notifications (fallback)

### 3. Settings Integration
Added toggle in Settings screen to enable/disable custom notifications.

## Usage

### Show a Custom Notification
```javascript
import CustomNotificationManager from './utils/CustomNotificationManager';

CustomNotificationManager.showNotification({
  title: 'New Task Assigned',
  message: 'You have been assigned a new task: "Update mobile app UI"',
  data: {
    type: 'task',
    taskId: '12345',
    priority: 'high',
    source: 'FCM',
    timestamp: new Date().toISOString(),
  },
});
```

### Navigation Data Types
The system supports navigation for:
- **task**: Navigate to TaskDetails screen
- **project**: Navigate to ProjectDetailsScreen  
- **issue**: Navigate to IssueDetails screen

### LocalStorage Settings
- Key: `customNotificationsEnabled`
- Value: `'true'` or `'false'`
- Default: `true` (enabled)

## Testing

The Settings screen includes test buttons (when custom notifications are enabled) to demonstrate:
- Task notifications
- Project notifications  
- Issue notifications

## Customization

### Notification Timing
```javascript
// In CustomNotificationPopup component
autoHide={true}
autoHideDelay={5000} // 5 seconds
```

### Animation Positioning
```javascript
// Slide position from right edge
toValue: 20, // 20px from right edge
```

### Theme Colors
The notifications automatically adapt to the app's theme:
- `theme.card` - Background color
- `theme.text` - Text color
- `theme.border` - Border color
- `theme.primary` - Accent color

## Platform Considerations

- **Android**: Supports swipe gestures and system integration
- **iOS**: Optimized for iOS design patterns and safe areas
- **Universal**: Works consistently across both platforms

## Performance

- Lightweight with minimal re-renders
- Efficient animation using native driver
- Memory-friendly listener management
- Automatic cleanup on component unmount
