import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import ProfessionalDashboard from '../screens/ProfessionalDashboard';
// Import your other screens here

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderColor: '#f0f0f0',
          height: 62,
          elevation: 10,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Appointment') iconName = 'calendar';
          else if (route.name === 'History') iconName = 'clock';
          else if (route.name === 'Articles') iconName = 'book-open';
          else if (route.name === 'Profile') iconName = 'user';
          return <Feather name={iconName} size={24} color={focused ? '#366CD9' : '#B0B3B8'} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 0,
          // paddingBottom
        },
        tabBarActiveTintColor: '#366CD9',
        tabBarInactiveTintColor: '#B0B3B8',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Appointment" component={ProfessionalDashboard} />
      {/* Add your other screens here */}
      {/* <Tab.Screen name="History" component={HistoryScreen} /> */}
      {/* <Tab.Screen name="Articles" component={ArticlesScreen} /> */}
      {/* <Tab.Screen name="Profile" component={ProfileScreen} /> */}
    </Tab.Navigator>
  );
}