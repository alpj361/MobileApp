import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ExtractedEntity, ENTITY_LABELS, PRIORITY_LABELS } from '../types/entities';
import { EntityBadge } from './EntityBadge';

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
        <Text style={styles.title}>📊 Datos Capturados</Text>
        <Text style={styles.subtitle}>
          {entities.length} {entities.length === 1 ? 'entidad' : 'entidades'} encontradas
        </Text>
      </View>

      {/* Summary by type */}
      <View style={styles.summary}>
        {Object.entries(entityTypeCount).map(([type, count]) => (
          <View key={type} style={styles.summaryItem}>
            <Text style={styles.summaryText}>
              {ENTITY_LABELS[type as keyof typeof ENTITY_LABELS]}: {count}
            </Text>
          </View>
        ))}
      </View>

      {/* HIGH PRIORITY: Content entities (vision + transcription) */}
      {highPriorityEntities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Del Contenido</Text>
          <Text style={styles.sectionSubtitle}>
            {PRIORITY_LABELS.high} (video/audio/imágenes)
          </Text>
          <View style={styles.entityGrid}>
            {highPriorityEntities.map((entity, index) => (
              <EntityBadge
                key={`high-${index}`}
                entity={entity}
                showPriority={false}
                onPress={() => handleEntityPress(entity)}
              />
            ))}
          </View>
        </View>
      )}

      {/* MEDIUM PRIORITY: Context entities (post + description) */}
      {mediumPriorityEntities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Del Contexto</Text>
          <Text style={styles.sectionSubtitle}>
            {PRIORITY_LABELS.medium} (texto/descripción)
          </Text>
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
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setShowPossible(!showPossible)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>
              💬 Datos Posibles de Comentarios ({lowPriorityEntities.length})
            </Text>
            <Text style={styles.expandIcon}>{showPossible ? '▼' : '▶'}</Text>
          </TouchableOpacity>
          {showPossible && (
            <>
              <Text style={styles.sectionSubtitle}>
                {PRIORITY_LABELS.low} (menciones de usuarios)
              </Text>
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
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  summaryItem: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  summaryText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  entityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  expandIcon: {
    fontSize: 12,
    color: '#6B7280',
  },
});
