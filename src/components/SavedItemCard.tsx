import React from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedItem } from '../state/savedStore';
import LinkPreview from './LinkPreview';

interface SavedItemCardProps {
  item: SavedItem;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export default function SavedItemCard({ item, onDelete, onToggleFavorite }: SavedItemCardProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Link',
      'Are you sure you want to remove this saved link?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => onDelete(item.id)
        },
      ]
    );
  };

  const getSourceIcon = () => {
    switch (item.source) {
      case 'chat':
        return 'chatbubble';
      case 'clipboard':
        return 'clipboard';
      default:
        return 'add-circle';
    }
  };

  return (
    <View className="mb-4">
      <LinkPreview linkData={item} />
      
      {/* Action Bar */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-gray-50 rounded-b-2xl border-t border-gray-100">
        <View className="flex-row items-center">
          <Ionicons 
            name={getSourceIcon() as any} 
            size={14} 
            color="#9CA3AF" 
          />
          <Text className="text-gray-500 text-xs ml-1 capitalize">
            From {item.source}
          </Text>
        </View>
        
        <View className="flex-row items-center space-x-4">
          <Pressable
            onPress={() => onToggleFavorite(item.id)}
            className="p-1"
          >
            <Ionicons 
              name={item.isFavorite ? 'heart' : 'heart-outline'} 
              size={18} 
              color={item.isFavorite ? '#EF4444' : '#9CA3AF'} 
            />
          </Pressable>
          
          <Pressable
            onPress={handleDelete}
            className="p-1"
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}