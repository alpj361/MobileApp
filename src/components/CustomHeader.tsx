import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { textStyles } from '../utils/typography';

interface CustomHeaderProps {
  navigation: DrawerNavigationProp<any>;
  title?: string;
  rightElement?: React.ReactNode;
}

export default function CustomHeader({ navigation, title = "vizta", rightElement }: CustomHeaderProps) {
  return (
    <SafeAreaView className="bg-white border-b border-gray-100">
      <View className="flex-row items-center justify-between px-5 py-4">
        {/* Hamburger Menu */}
        <Pressable
          onPress={() => navigation.openDrawer()}
          className="p-2 -ml-2 rounded-xl active:bg-gray-100 active:scale-95"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => [
            {
              transform: [{ scale: pressed ? 0.95 : 1 }],
            }
          ]}
        >
          <View className="space-y-1.5">
            <View className="w-6 h-0.5 bg-gray-800 rounded-full" />
            <View className="w-6 h-0.5 bg-gray-800 rounded-full" />
            <View className="w-6 h-0.5 bg-gray-800 rounded-full" />
          </View>
        </Pressable>

        {/* Title */}
        <Text className={textStyles.navTitle}>
          {title}
        </Text>

        {/* Right Element or Settings Icon */}
        {rightElement ? (
          rightElement
        ) : (
          <Pressable 
            className="p-2 -mr-2 rounded-xl active:bg-gray-100"
            onPress={() => navigation.navigate('Settings')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed ? 0.95 : 1 }],
              }
            ]}
          >
            <Ionicons name="options-outline" size={24} color="#374151" />
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}