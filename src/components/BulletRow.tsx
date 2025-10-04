import React from 'react';
import { Text, View } from 'react-native';
import { textStyles } from '../utils/typography';

interface BulletRowProps {
  icon?: string;
  emphasis?: string;
  text: string;
}

export default function BulletRow({ icon, emphasis, text }: BulletRowProps) {
  return (
    <View className="flex-row items-start gap-2 mb-3">
      <Text className={`${textStyles.sectionTitle} text-lg leading-6`}>{icon || '•'}</Text>
      <Text className={`${textStyles.bodyText} text-gray-700 flex-1 leading-6`}>
        {emphasis ? (
          <Text>
            <Text className="font-semibold text-gray-900">{emphasis} </Text>
            {text}
          </Text>
        ) : (
          text
        )}
      </Text>
    </View>
  );
}
