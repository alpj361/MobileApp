import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MorphLoading from './MorphLoading';
import { textStyles } from '../utils/typography';

interface LoadingItemCardProps {
  url: string;
}

export default function LoadingItemCard({ url }: LoadingItemCardProps) {
  // Extract domain from URL for display
  const getDomain = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Procesando...';
    }
  };

  return (
    <View style={styles.card}>
      {/* Loading Animation Container */}
      <View style={styles.content}>
        <MorphLoading size="md" />
        <Text style={[styles.processingText, { marginTop: 16 }]}>
          Procesando enlace...
        </Text>
        <Text style={[styles.domainText, { marginTop: 4 }]} numberOfLines={1}>
          {getDomain(url)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  processingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  domainText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

