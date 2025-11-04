import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ExtractedEntity, ENTITY_COLORS, ENTITY_ICONS, PRIORITY_ICONS } from '../types/entities';

interface EntityBadgeProps {
  entity: ExtractedEntity;
  showPriority?: boolean;
  showPossibleFlag?: boolean;
  onPress?: () => void;
}

export const EntityBadge: React.FC<EntityBadgeProps> = ({
  entity,
  showPriority = true,
  showPossibleFlag = true,
  onPress,
}) => {
  const color = ENTITY_COLORS[entity.type];
  const icon = ENTITY_ICONS[entity.type];
  const priorityIcon = showPriority ? PRIORITY_ICONS[entity.source_priority] : '';

  const displayValue = entity.display_value || entity.value;

  const content = (
    <View style={[styles.badge, { borderColor: color }]}>
      {/* Priority indicator */}
      {showPriority && (
        <Text style={styles.priorityIcon}>{priorityIcon}</Text>
      )}

      {/* Entity icon */}
      <Text style={styles.icon}>{icon}</Text>

      {/* Entity value */}
      <Text style={[styles.value, { color }]} numberOfLines={1}>
        {displayValue}
      </Text>

      {/* Possible flag (from comments) */}
      {showPossibleFlag && entity.is_possible && (
        <Text style={styles.possible}>(posible)</Text>
      )}

      {/* Occurrence count if appears in multiple sources */}
      {entity.appears_in_sources && entity.appears_in_sources.length > 1 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>×{entity.appears_in_sources.length}</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
    maxWidth: 250,
  },
  priorityIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  icon: {
    fontSize: 14,
    marginRight: 4,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  possible: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  countBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
  },
});
