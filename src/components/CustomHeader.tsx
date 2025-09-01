import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';

interface CustomHeaderProps {
  navigation: DrawerNavigationProp<any>;
  title?: string;
}

export default function CustomHeader({ navigation, title = "vizta" }: CustomHeaderProps) {
  return (
    <SafeAreaView className="bg-gray-100">
      <View className="flex-row items-center justify-between px-4 py-3">
        {/* Hamburger Menu */}
        <Pressable
          onPress={() => navigation.openDrawer()}
          className="p-2"
        >
          <View className="space-y-1">
            <View className="w-6 h-0.5 bg-black" />
            <View className="w-6 h-0.5 bg-black" />
            <View className="w-6 h-0.5 bg-black" />
          </View>
        </Pressable>

        {/* Title */}
        <Text className="text-black text-lg font-medium">
          {title}
        </Text>

        {/* Settings Icon */}
        <Pressable className="p-2">
          <Ionicons name="options-outline" size={24} color="#000000" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}