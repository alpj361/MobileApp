import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { textStyles } from '../utils/typography';

interface InfoCardProps {
  icon: string;
  iconColor?: string;
  label: string;
  value: string;
  backgroundColor?: string;
  borderColor?: string;
}

export default function InfoCard({
  icon,
  iconColor = '#6B7280',
  label,
  value,
  backgroundColor = '#F9FAFB',
  borderColor = '#E5E7EB'
}: InfoCardProps) {
  return (
    <View 
      className="px-4 py-3 rounded-2xl border min-w-[110px]"
      style={{ backgroundColor, borderColor }}
    >
      <View className="flex-row items-center mb-1">
        <Text className="text-lg mr-1">{icon}</Text>
        <Text className={`${textStyles.helper} uppercase tracking-wide`} style={{ color: iconColor }}>
          {label}
        </Text>
      </View>
      <Text className={`${textStyles.cardTitle} mt-1`} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}