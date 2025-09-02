import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChatScreen from '../screens/ChatScreen';
import RecordingScreen from '../screens/RecordingScreen';
import SavedScreen from '../screens/SavedScreen';
import TrendingScreen from '../screens/TrendingScreen';

const Drawer = createDrawerNavigator();

function CustomDrawerContent({ navigation }: any) {
  return (
    <View className="flex-1 bg-white pt-12">
      <View className="px-6 py-4 border-b border-gray-200">
        <Text className="text-xl font-semibold text-black">Menu</Text>
      </View>
      
      <View className="flex-1 pt-4">
        <View
          className="flex-row items-center px-6 py-4 active:bg-gray-100"
          onTouchEnd={() => navigation.navigate('Chat')}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#374151" />
          <Text className="ml-4 text-base text-gray-700">Chat</Text>
        </View>
        
        <View
          className="flex-row items-center px-6 py-4 active:bg-gray-100"
          onTouchEnd={() => navigation.navigate('Recording')}
        >
          <Ionicons name="mic-outline" size={24} color="#374151" />
          <Text className="ml-4 text-base text-gray-700">Recording</Text>
        </View>

        <View
          className="flex-row items-center px-6 py-4 active:bg-gray-100"
          onTouchEnd={() => navigation.navigate('Saved')}
        >
          <Ionicons name="bookmark-outline" size={24} color="#374151" />
          <Text className="ml-4 text-base text-gray-700">Saved</Text>
        </View>

        <View
          className="flex-row items-center px-6 py-4 active:bg-gray-100"
          onTouchEnd={() => navigation.navigate('Trending')}
        >
          <Ionicons name="trending-up" size={24} color="#374151" />
          <Text className="ml-4 text-base text-gray-700">Trending</Text>
        </View>
      </View>
    </View>
  );
}

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          width: 280,
        },
        drawerType: 'slide',
      }}
    >
      <Drawer.Screen 
        name="Chat" 
        component={ChatScreen}
      />
      <Drawer.Screen 
        name="Recording" 
        component={RecordingScreen}
      />
      <Drawer.Screen 
        name="Saved" 
        component={SavedScreen}
      />
      <Drawer.Screen 
        name="Trending" 
        component={TrendingScreen}
      />
    </Drawer.Navigator>
  );
}