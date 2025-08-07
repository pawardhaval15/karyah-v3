import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AddConnectionScreen from 'screens/AddConnectionScreen';
import AuthLoadingScreen from 'screens/AuthLoadingScreen';
import ConnectionDetailsScreen from 'screens/ConnectionDetailsModal';
import ConnectionsScreen from 'screens/ConnectionsScreen';
import IssueDetailsScreen from 'screens/IssueDetailsScreen';
import MyTasksScreen from 'screens/MyTasksScreen';
import NotificationScreen from 'screens/NotificationScreen';
import RegistrationForm from 'screens/RegistrationForm';
import UpdateTaskScreen from 'screens/UpdateTaskScreen';
import UserProfileScreen from 'screens/UserProfileScreen';
import HomeScreen from '../screens/HomeScreen';
import IssuesScreen from '../screens/IssuesScreen';
import LoginScreen from '../screens/LoginScreen';
import PinLoginScreen from '../screens/PinLoginScreen';
import ProfessionalDashboard from '../screens/ProfessionalDashboard';
import ProjectAccessScreen from '../screens/ProjectAccessScreen';
import ProjectDetailsScreen from '../screens/ProjectDetailsScreen';
import ProjectDiscussionScreen from '../screens/ProjectDiscussionScreen';
import ProjectIssuesScreen from '../screens/ProjectIssuesScreen';
import ProjectScreen from '../screens/ProjectScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TaskDetailsScreen from '../screens/TaskDetailsScreen';
import TaskListScreen from '../screens/TaskListScreen';
import UpdateProjectScreen from '../screens/UpdateProjectScreen';
import WorklistScreen from '../screens/WorklistScreen';
import { navigationRef } from './navigationRef';
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="AuthLoading" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PinLogin" component={PinLoginScreen} />
        <Stack.Screen name="RegistrationForm" component={RegistrationForm} />
        <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
        <Stack.Screen name="ProfessionalDashboard" component={ProfessionalDashboard} />
        <Stack.Screen name="ProjectScreen" component={ProjectScreen} />
        <Stack.Screen name="ProjectDetailsScreen" component={ProjectDetailsScreen} />
        <Stack.Screen name="UpdateProjectScreen" component={UpdateProjectScreen} />
        <Stack.Screen name="WorklistScreen" component={WorklistScreen} />
        <Stack.Screen name="TaskListScreen" component={TaskListScreen} />
        <Stack.Screen name="MyTasksScreen" component={MyTasksScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddConnectionScreen" component={AddConnectionScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ConnectionDetailsScreen" component={ConnectionDetailsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ConnectionsScreen" component={ConnectionsScreen} />
        <Stack.Screen name="UserProfileScreen" component={UserProfileScreen} />
        <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
        <Stack.Screen name="IssuesScreen" component={IssuesScreen} />
        <Stack.Screen name="ProjectIssuesScreen" component={ProjectIssuesScreen} />
        <Stack.Screen name="IssueDetails" component={IssueDetailsScreen} />
        <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
        <Stack.Screen name="UpdateTaskScreen" component={UpdateTaskScreen} options={{ title: 'Update Task' }} />
        <Stack.Screen name="ProjectDiscussionScreen" component={ProjectDiscussionScreen} />
        <Stack.Screen name="ProjectAccessScreen" component={ProjectAccessScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}