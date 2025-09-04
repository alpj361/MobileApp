import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChatScreen from '../screens/ChatScreen';
import RecordingScreen from '../screens/RecordingScreen';
import SavedScreen from '../screens/SavedScreen';
import TrendingScreen from '../screens/TrendingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { textStyles } from '../utils/typography';

const Drawer = createDrawerNavigator();

function CustomDrawerContent({ navigation }: any) {
  const menuItems = [
    { name: 'Chat', icon: 'chatbubble-outline', label: 'Chat' },
    { name: 'Recording', icon: 'mic-outline', label: 'Grabación' },
    { name: 'Saved', icon: 'bookmark-outline', label: 'Guardados' },
    { name: 'Trending', icon: 'trending-up', label: 'Tendencias' },
    { name: 'Settings', icon: 'settings-outline', label: 'Configuración' },
  ];

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="pt-16 pb-6 px-6 bg-gray-50 border-b border-gray-100">
        <Text className={textStyles.sectionTitle}>Menú</Text>
      </View>
      
      {/* Menu Items */}
      <View className="flex-1 pt-2">
        {menuItems.map((item) => (
          <Pressable
            key={item.name}
            className="flex-row items-center px-6 py-4 mx-2 rounded-xl active:bg-gray-50"
            onPress={() => navigation.navigate(item.name)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
              <Ionicons name={item.icon as any} size={20} color="#374151" />
            </View>
            <Text className={`${textStyles.bodyText} ml-4`}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      
      {/* Footer */}
      <View className="px-6 py-4 border-t border-gray-100">
        <Text className={textStyles.helper}>vizta v1.0</Text>
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
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen}
      />
    </Drawer.Navigator>
  );
}