import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExtractedEntity, ENTITY_LABELS, PRIORITY_LABELS } from '../types/entities';
import { EntityBadge } from './EntityBadge';
import { textStyles } from '../utils/typography';

interface EntityPanelProps {
  entities: ExtractedEntity[];
  platform?: string;
}

export const EntityPanel: React.FC<EntityPanelProps> = ({ entities, platform = 'social' }) => {
  const [showPossible, setShowPossible] = useState(false);

  if (!entities || entities.length === 0) {
    return null;
  }

  // Group entities by priority
  const highPriorityEntities = entities.filter((e) => e.source_priority === 'high');
  const mediumPriorityEntities = entities.filter((e) => e.source_priority === 'medium');
  const lowPriorityEntities = entities.filter((e) => e.is_possible && e.source_priority === 'low');

  // Group entities by type for summary
  const entityTypeCount = entities.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleEntityPress = (entity: ExtractedEntity) => {
    const sources = entity.appears_in_sources?.join(', ') || entity.source;
    const message = [
      `Tipo: ${ENTITY_LABELS[entity.type]}`,
      `Valor: ${entity.display_value || entity.value}`,
      entity.context ? `\nContexto: "${entity.context}"` : '',
      `\nFuentes: ${sources}`,
      entity.source_author ? `Autor: ${entity.source_author}` : '',
      entity.confidence ? `\nConfianza: ${Math.round(entity.confidence * 100)}%` : '',
      entity.is_possible ? '\n⚠️ Dato posible (de comentarios)' : '',
    ]
      .filter(Boolean)
      .join('\n');

    Alert.alert('Detalle de Entidad', message);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View className="flex-row items-center mb-5">
          <Ionicons name="analytics" size={20} color="#7C3AED" />
          <Text className={`${textStyles.cardTitle} text-gray-900 font-bold ml-2`} style={{ fontSize: 20 }}>
            Datos Capturados
          </Text>
        </View>

        <View className="px-3 py-1.5 rounded-full bg-purple-100 flex-row items-center" style={{ alignSelf: 'flex-start', marginBottom: 20 }}>
          <Text className={`${textStyles.helper} text-purple-700 font-semibold`}>
            {entities.length} datos encontrados
          </Text>
        </View>
      </View>

      <View style={styles.spacedSection}>
        {/* HIGH PRIORITY: Content entities (vision + transcription) */}
        {highPriorityEntities.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text className={`${textStyles.helper} font-bold uppercase tracking-wide text-gray-700`}>
                Del Contenido
              </Text>
            </View>

            <View style={styles.entityTypeSection}>
              {Object.entries(
                highPriorityEntities.reduce((acc, e) => {
                  acc[e.type] = acc[e.type] || [];
                  acc[e.type].push(e);
                  return acc;
                }, {} as Record<string, ExtractedEntity[]>)
              ).map(([type, entitiesOfType]) => (
                <View key={type} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons
                      name={
                        type === 'location'
                          ? 'location'
                          : type === 'organization'
                          ? 'business'
                          : type === 'date'
                          ? 'calendar'
                          : type === 'money'
                          ? 'cash'
                          : 'pricetag'
                      }
                      size={16}
                      color="#6B7280"
                    />
                    <Text className={`${textStyles.helper} text-gray-600 font-semibold ml-1.5`}>
                      {ENTITY_LABELS[type as keyof typeof ENTITY_LABELS]}: {entitiesOfType.length}
                    </Text>
                  </View>
                  <View style={styles.entityGrid}>
                    {entitiesOfType.map((entity, index) => (
                      <EntityBadge
                        key={`high-${type}-${index}`}
                        entity={entity}
                        showPriority={false}
                        onPress={() => handleEntityPress(entity)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* MEDIUM PRIORITY: Context entities (post + description) */}
        {mediumPriorityEntities.length > 0 && (
          <View>
            <View style={styles.sectionHeader}>
              <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
              <Text className={`${textStyles.helper} font-bold uppercase tracking-wide text-gray-700`}>
                Del Contexto
              </Text>
            </View>

            <View style={styles.entityGrid}>
              {mediumPriorityEntities.map((entity, index) => (
                <EntityBadge
                  key={`medium-${index}`}
                  entity={entity}
                  showPriority={false}
                  onPress={() => handleEntityPress(entity)}
                />
              ))}
            </View>
          </View>
        )}

        {/* LOW PRIORITY: Possible entities from comments (collapsible) */}
        {lowPriorityEntities.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity
              style={styles.collapsibleHeader}
              onPress={() => setShowPossible(!showPossible)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                <Text className={`${textStyles.helper} font-bold uppercase tracking-wide text-gray-700`}>
                  Posibles de Comentarios ({lowPriorityEntities.length})
                </Text>
              </View>
              <Ionicons
                name={showPossible ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>
            {showPossible && (
              <View style={styles.entityGrid}>
                {lowPriorityEntities.map((entity, index) => (
                  <EntityBadge
                    key={`low-${index}`}
                    entity={entity}
                    showPriority={false}
                    showPossibleFlag={true}
                    onPress={() => handleEntityPress(entity)}
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    marginBottom: 0,
  },
  spacedSection: {
    gap: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entityTypeSection: {
    marginTop: 4,
  },
  entityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});
