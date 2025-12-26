import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

// Imported Screens
import ConversationsScreen from './screens/ConversationsScreen';
import ChatScreen from './screens/ChatScreen';
import NewChatScreen from './screens/NewChatScreen';
import ProfileScreen from './screens/ProfileScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import TaskDashboardScreen from './screens/TaskDashboardScreen';
import TaskCreateScreen from './screens/TaskCreateScreen';
import TaskDetailScreen from './screens/TaskDetailScreen';

// New Mobile Screens
import DashboardScreen from './screens/DashboardScreen';
import DocumentScreen from './screens/DocumentScreen';
import ComplianceScreen from './screens/ComplianceScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Chat Stack
const ChatStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="Conversations" component={ConversationsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
    <Stack.Screen name="NewChat" component={NewChatScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
    <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

// Task Stack
const TaskStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="TaskDashboard" component={TaskDashboardScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TaskCreate" component={TaskCreateScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TaskChat" component={ChatScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        switch (route.name) {
          case 'DashboardTab':
            iconName = 'dashboard';
            break;
          case 'ChatTab':
            iconName = 'chat-bubble';
            break;
          case 'TaskTab':
            iconName = 'check-circle';
            break;
          case 'DocumentTab':
            iconName = 'description';
            break;
          case 'ComplianceTab':
            iconName = 'policy';
            break;
          case 'SettingsTab':
            iconName = 'settings';
            break;
          default:
            iconName = 'circle';
        }

        return (
          <View>
            <MaterialIcons name={iconName} size={24} color={color} />
            {route.name === 'ChatTab' && (
              <View style={{
                position: 'absolute',
                right: -6,
                top: -3,
                backgroundColor: '#EF4444',
                borderRadius: 8,
                width: 16,
                height: 16,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>4</Text>
              </View>
            )}
          </View>
        );
      },
      tabBarActiveTintColor: '#a413ec', // Primary color from design
      tabBarInactiveTintColor: '#9ca3af', // Gray-400
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        height: 65, // Taller tab bar
        paddingBottom: 10,
        paddingTop: 10,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '500',
      },
      headerShown: false,
    })}
  >
    <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
    <Tab.Screen name="ChatTab" component={ChatStack} options={{ tabBarLabel: 'Chat' }} />
    <Tab.Screen name="TaskTab" component={TaskStack} options={{ tabBarLabel: 'Task' }} />
    <Tab.Screen name="DocumentTab" component={DocumentScreen} options={{ tabBarLabel: 'Document' }} />
    <Tab.Screen name="ComplianceTab" component={ComplianceScreen} options={{ tabBarLabel: 'Compliance' }} />
    <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
  </Tab.Navigator>
);

const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a413ec" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ExpoStatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
