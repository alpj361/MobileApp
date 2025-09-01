import React from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import CustomHeader from '../components/CustomHeader';

export default function SavedScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  return (
    <View className="flex-1 bg-gray-100">
      <CustomHeader navigation={navigation} title="Saved" />
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-gray-500">Saved items will appear here soon.</Text>
      </View>
    </View>
  );
}