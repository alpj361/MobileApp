/**
 * Modal de carga para análisis de posts
 * Muestra progreso en tiempo real durante la extracción y análisis
 */

import React from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AnalysisLoadingModalProps {
  visible: boolean;
  postUrl?: string;
  stage: 'saving' | 'extracting' | 'analyzing' | 'completed' | 'error';
  progress?: {
    current: number;
    total: number;
  };
}

export const AnalysisLoadingModal: React.FC<AnalysisLoadingModalProps> = ({
  visible,
  postUrl,
  stage,
  progress
}) => {
  const getStageInfo = (currentStage: string) => {
    const stages = {
      saving: {
        icon: 'cloud-upload-outline',
        title: 'Guardando post...',
        description: 'Almacenando en la base de datos',
        color: '#007AFF'
      },
      extracting: {
        icon: 'download-outline',
        title: 'Extrayendo contenido...',
        description: 'Descargando medios y metadata de X/Twitter',
        color: '#FF9500'
      },
      analyzing: {
        icon: 'analytics-outline',
        title: 'Analizando con AI...',
        description: 'Generando título, descripción y resumen inteligente',
        color: '#34C759'
      },
      completed: {
        icon: 'checkmark-circle',
        title: 'Análisis completo',
        description: 'Post procesado exitosamente',
        color: '#34C759'
      },
      error: {
        icon: 'close-circle',
        title: 'Error en análisis',
        description: 'No se pudo completar el procesamiento',
        color: '#FF3B30'
      }
    };

    return stages[currentStage] || stages.saving;
  };

  const stageInfo = getStageInfo(stage);

  const formatUrl = (url: string) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      return `${urlObj.hostname}${urlObj.pathname}`.substring(0, 40) + '...';
    } catch {
      return url.substring(0, 40) + '...';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: stageInfo.color + '20' }]}>
              <Ionicons
                name={stageInfo.icon as any}
                size={32}
                color={stageInfo.color}
              />
            </View>
            <Text style={styles.title}>{stageInfo.title}</Text>
            <Text style={styles.description}>{stageInfo.description}</Text>
          </View>

          {/* URL */}
          {postUrl && (
            <View style={styles.urlContainer}>
              <Text style={styles.urlLabel}>Procesando:</Text>
              <Text style={styles.urlText}>{formatUrl(postUrl)}</Text>
            </View>
          )}

          {/* Progress */}
          {progress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(progress.current / progress.total) * 100}%`,
                      backgroundColor: stageInfo.color
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {progress.current} de {progress.total} pasos
              </Text>
            </View>
          )}

          {/* Loading indicator */}
          {stage !== 'completed' && stage !== 'error' && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={stageInfo.color} />
            </View>
          )}

          {/* Stage steps */}
          <View style={styles.stepsContainer}>
            {[
              { key: 'saving', label: 'Guardando' },
              { key: 'extracting', label: 'Extrayendo' },
              { key: 'analyzing', label: 'Analizando' }
            ].map((step, index) => {
              const isActive = step.key === stage;
              const isCompleted = ['extracting', 'analyzing', 'completed'].includes(stage) &&
                                 ['saving'].includes(step.key) ||
                                 ['analyzing', 'completed'].includes(stage) &&
                                 ['saving', 'extracting'].includes(step.key) ||
                                 stage === 'completed';

              return (
                <View key={step.key} style={styles.stepItem}>
                  <View style={[
                    styles.stepDot,
                    isCompleted
                      ? { backgroundColor: '#34C759' }
                      : isActive
                        ? { backgroundColor: stageInfo.color }
                        : { backgroundColor: '#E5E5EA' }
                  ]}>
                    {isCompleted ? (
                      <Ionicons name="checkmark" size={12} color="white" />
                    ) : (
                      <Text style={[
                        styles.stepNumber,
                        isActive ? { color: 'white' } : { color: '#8E8E93' }
                      ]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    isActive || isCompleted ? { color: '#1C1C1E' } : { color: '#8E8E93' }
                  ]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Mientras esperas...</Text>
            <Text style={styles.tipsText}>
              • Este proceso puede tomar 30-60 segundos
              • Estamos extrayendo imágenes, videos y métricas
              • La AI generará un resumen inteligente del contenido
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 4
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18
  },
  urlContainer: {
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 2
  },
  urlText: {
    fontSize: 13,
    color: '#3C3C43',
    fontFamily: 'monospace'
  },
  progressContainer: {
    marginBottom: 20
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8
  },
  progressFill: {
    height: '100%',
    borderRadius: 2
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center'
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 20
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10
  },
  stepItem: {
    alignItems: 'center',
    flex: 1
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '600'
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center'
  },
  tipsContainer: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF'
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6
  },
  tipsText: {
    fontSize: 12,
    color: '#3C3C43',
    lineHeight: 16
  }
});