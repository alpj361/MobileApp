import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useRecordingStore } from '../state/recordingStore';
import { usePulseConnectionStore } from '../state/pulseConnectionStore';
import { transcribeAudio } from '../api/transcribe-audio';
import { saveRecordingToCodex as saveRecordingToCodexService } from '../services/codexService';
import { useRealtimeTranscription } from '../hooks/useRealtimeTranscription';
import CustomHeader from '../components/CustomHeader';
import { textStyles } from '../utils/typography';
import { getCurrentSpacing } from '../utils/responsive';

const { width } = Dimensions.get('window');

// Audio Wave Visualization Component
const AudioWaveVisualization = ({ isRecording }: { isRecording: boolean }) => {
  const waveCount = 40;
  const animations = useRef<Animated.Value[]>([]);

  if (animations.current.length === 0) {
    animations.current = Array.from({ length: waveCount }, () => new Animated.Value(0.2));
  }

  useEffect(() => {
    if (isRecording) {
      const animateWaves = () => {
        const waveAnimations = animations.current.map((anim, index) => {
          return Animated.loop(
            Animated.sequence([
              Animated.timing(anim, {
                toValue: 0.8 + Math.random() * 0.4,
                duration: 400 + Math.random() * 400,
                useNativeDriver: true,
              }),
              Animated.timing(anim, {
                toValue: 0.2 + Math.random() * 0.3,
                duration: 400 + Math.random() * 400,
                useNativeDriver: true,
              }),
            ])
          );
        });
        
        Animated.stagger(50, waveAnimations).start();
      };
      
      animateWaves();
    } else {
      animations.current.forEach((anim) => {
        anim.setValue(0.2);
      });
    }
  }, [isRecording]);

  return (
    <View className="flex-row items-center justify-center h-16" style={{ width: width - 80 }}>
      {animations.current.map((anim, index) => (
        <Animated.View
          key={index}
          style={{
            width: 3,
            marginHorizontal: 1.5,
            height: 50,
            backgroundColor: index % 2 === 0 ? 'rgba(147, 197, 253, 0.6)' : 'rgba(236, 72, 153, 0.6)',
            borderRadius: 2,
            transform: [{ scaleY: anim }],
          }}
        />
      ))}
    </View>
  );
};

export default function RecordingScreen() {
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  const recordings = useRecordingStore((state) => state.recordings);
  const isRecording = useRecordingStore((state) => state.isRecording);
  const realtimeTranscriptionEnabled = useRecordingStore((state) => state.realtimeTranscriptionEnabled);
  const addRecording = useRecordingStore((state) => state.addRecording);
  const updateRecording = useRecordingStore((state) => state.updateRecording);
  const deleteRecording = useRecordingStore((state) => state.deleteRecording);
  const setIsRecording = useRecordingStore((state) => state.setRecording);
  const setRealtimeTranscriptionEnabled = useRecordingStore((state) => state.setRealtimeTranscriptionEnabled);

  const isConnected = usePulseConnectionStore((state) => state.isConnected);
  const connectedUser = usePulseConnectionStore((state) => state.connectedUser);

  // Real-time transcription hook (backend-based)
  const { transcribeFile: transcribeFileWithBackend } = useRealtimeTranscription({
    enabled: realtimeTranscriptionEnabled && Boolean(connectedUser?.id),
    userId: connectedUser?.id || 'anonymous',
    onTranscriptionUpdate: (text: string, isFinal: boolean) => {
      // Handle real-time transcription updates if needed
      console.log(`📝 Real-time transcription (${isFinal ? 'final' : 'partial'}):`, text);
    },
    onError: (error: Error) => {
      console.error('❌ Real-time transcription error:', error);
      Alert.alert('Error de Transcripción', 'Error en transcripción en tiempo real: ' + error.message);
    },
    language: 'es'
  });

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        const title = `Recording ${new Date().toLocaleString()}`;
        const newRecordingId = Date.now().toString() + Math.random().toString(36).substring(2, 11);

        addRecording({
          title,
          uri,
          duration: recordingDuration,
        });

        // Auto-transcribe with ElevenLabs Scribe if enabled
        if (realtimeTranscriptionEnabled) {
          setTimeout(() => {
            transcribeWithScribe(newRecordingId, uri);
          }, 500);
        }
      }

      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  const playRecording = async (recordingItem: any) => {
    try {
      if (playingId === recordingItem.id) {
        // Stop current playback
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setPlayingId(null);
        return;
      }

      // Stop any existing playback
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync({ uri: recordingItem.uri });
      soundRef.current = sound;
      setPlayingId(recordingItem.id);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });

      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play recording:', error);
      Alert.alert('Error', 'Failed to play recording.');
    }
  };

  /**
   * Transcribe with ElevenLabs Scribe via Backend (for real-time/fast transcription)
   * This uses the backend API instead of direct ElevenLabs connection
   */
  const transcribeWithScribe = async (id: string, uri: string) => {
    if (!connectedUser?.id) {
      console.warn('⚠️ Usuario no conectado, usando transcripción tradicional');
      return transcribeRecording({ id, uri });
    }

    try {
      updateRecording(id, { isTranscribing: true, isRealtimeTranscribing: true });

      // Use backend transcription service
      const result = await transcribeFileWithBackend(uri, {
        language: 'es',
        recordingId: id
      });

      if (result.success) {
        updateRecording(id, {
          transcription: result.transcription,
          realtimeTranscription: result.transcription,
          isTranscribing: false,
          isRealtimeTranscribing: false,
        });
        console.log('✅ Transcripción completada via backend ElevenLabs');
      } else {
        throw new Error(result.error || 'Error desconocido');
      }

    } catch (error) {
      console.error('❌ Backend transcription failed:', error);

      updateRecording(id, {
        isTranscribing: false,
        isRealtimeTranscribing: false,
      });

      // Fallback to traditional transcription
      console.log('🔄 Fallback a transcripción tradicional...');
      Alert.alert(
        'Transcripción Automática Fallida',
        'Transcripción automática falló. ¿Deseas usar transcripción tradicional?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Usar Whisper', onPress: () => transcribeRecording({ id, uri }) }
        ]
      );
    }
  };

  /**
   * Transcribe with Whisper (manual transcription for saved recordings)
   */
  const transcribeRecording = async (recordingItem: any) => {
    try {
      updateRecording(recordingItem.id, { isTranscribing: true });

      const transcription = await transcribeAudio(recordingItem.uri);

      updateRecording(recordingItem.id, {
        transcription,
        isTranscribing: false
      });
    } catch (error) {
      console.error('Transcription failed:', error);
      updateRecording(recordingItem.id, { isTranscribing: false });
      Alert.alert('Error', 'Failed to transcribe audio. Please try again.');
    }
  };

  const saveRecordingToCodex = async (recordingItem: any) => {
    if (!isConnected || !connectedUser?.id) {
      Alert.alert(
        'Conexión requerida',
        'Necesitas estar conectado a Pulse Journal para guardar grabaciones en el Codex.'
      );
      return;
    }

    try {
      const result = await saveRecordingToCodexService(connectedUser.id, recordingItem);

      if (result.success) {
        Alert.alert('Guardado en Codex', 'La grabación se guardó correctamente en tu Codex.');
      } else {
        Alert.alert('Error', result.error || 'No se pudo guardar la grabación en Codex');
      }
    } catch (error) {
      console.error('Error saving recording to codex:', error);
      Alert.alert('Error', 'No se pudo guardar la grabación en Codex');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const spacing = getCurrentSpacing();

  return (
    <View className="flex-1">
      <CustomHeader navigation={navigation} title="Grabación" />

      {/* Main Recording Interface with Gradient Background */}
      <LinearGradient
        colors={['#F3E8FF', '#FEF3C7', '#FFFFFF']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="flex-1"
      >
        {/* Transcription Display Area or Question Prompt */}
        <View className="px-8 pt-12 pb-8">
          {isRecording && realtimeTranscriptionEnabled ? (
            <ScrollView 
              className="h-64"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            >
              <Text 
                className="text-4xl font-bold text-center leading-tight"
                style={{
                  background: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {recordings.length > 0 && recordings[0].realtimeTranscription
                  ? recordings[0].realtimeTranscription
                  : 'Transcripción en tiempo real aparecerá aquí...'}
              </Text>
            </ScrollView>
          ) : (
            <Text 
              className="text-4xl font-bold text-center leading-tight"
              style={{ color: '#7C3AED' }}
            >
              {isRecording 
                ? 'Grabando tu voz...' 
                : '¿Qué es lo principal que notas en ti mismo ahora?'}
            </Text>
          )}
        </View>

        {/* Audio Wave Visualization */}
        <View className="items-center justify-center py-8">
          <AudioWaveVisualization isRecording={isRecording} />
        </View>

        <View className="flex-1" />

        {/* Timer */}
        {isRecording && (
          <View className="items-center mb-4">
            <Text className="text-2xl font-mono text-gray-500">
              {formatDuration(recordingDuration)}
            </Text>
          </View>
        )}

        {/* Recording Controls */}
        <View className="items-center pb-12">
          <View className="flex-row items-center justify-center gap-8">
            {/* Close Button */}
            <Pressable
              onPress={() => navigation.goBack()}
              className="bg-gray-200 rounded-full w-16 h-16 justify-center items-center"
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  opacity: pressed ? 0.8 : 1,
                }
              ]}
            >
              <Ionicons name="close" size={28} color="#374151" />
            </Pressable>

            {/* Main Record/Stop Button */}
            <Pressable
              onPress={isRecording ? stopRecording : startRecording}
              className="bg-black rounded-full w-24 h-24 justify-center items-center shadow-2xl"
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  shadowColor: isRecording ? '#EC4899' : '#7C3AED',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 20,
                  elevation: 10,
                }
              ]}
            >
              {isRecording ? (
                <View className="bg-white w-8 h-8 rounded-sm" />
              ) : (
                <View className="bg-white w-8 h-8 rounded-full" />
              )}
            </Pressable>

            {/* Settings Button */}
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Transcripción Automática',
                  `Estado actual: ${realtimeTranscriptionEnabled ? 'Activada' : 'Desactivada'}`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: realtimeTranscriptionEnabled ? 'Desactivar' : 'Activar',
                      onPress: () => setRealtimeTranscriptionEnabled(!realtimeTranscriptionEnabled)
                    }
                  ]
                );
              }}
              className="bg-gray-200 rounded-full w-16 h-16 justify-center items-center"
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                  opacity: pressed ? 0.8 : 1,
                }
              ]}
            >
              <Ionicons 
                name={realtimeTranscriptionEnabled ? "flash" : "flash-outline"} 
                size={24} 
                color={realtimeTranscriptionEnabled ? "#7C3AED" : "#374151"} 
              />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: spacing.horizontal, paddingBottom: spacing.section }}
          showsVerticalScrollIndicator={false}
        >
          <Text className={`${textStyles.sectionTitle} mb-6`}>
            Grabaciones ({recordings.length})
          </Text>

          {recordings.map((item) => (
            <View key={item.id} className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className={`${textStyles.cardTitle} mb-1`}>
                    {item.title}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className={textStyles.helper}>
                      {formatDate(item.timestamp)} • {formatDuration(item.duration)}
                    </Text>
                    {item.realtimeTranscription && (
                      <View className="flex-row items-center ml-2 bg-blue-50 px-2 py-1 rounded-full">
                        <Ionicons name="flash" size={10} color="#3B82F6" />
                        <Text className="text-xs text-blue-600 ml-1 font-medium">
                          Auto
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <Pressable
                  onPress={() => deleteRecording(item.id)}
                  className="p-2 rounded-full active:bg-red-50"
                  style={({ pressed }) => [
                    {
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    }
                  ]}
                >
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </Pressable>
              </View>

              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => playRecording(item)}
                  className="bg-blue-500 rounded-full w-12 h-12 justify-center items-center"
                  style={({ pressed }) => [
                    {
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    }
                  ]}
                >
                  <Ionicons
                    name={playingId === item.id ? 'pause' : 'play'}
                    size={18}
                    color="white"
                  />
                </Pressable>

                {/* Only show manual transcribe button if not auto-transcribed */}
                {!item.realtimeTranscription && (
                  <Pressable
                    onPress={() => transcribeRecording(item)}
                    disabled={item.isTranscribing}
                    className="bg-gray-100 rounded-full px-4 py-3 flex-row items-center flex-1"
                    style={({ pressed }) => [
                      {
                        transform: [{ scale: pressed && !item.isTranscribing ? 0.98 : 1 }],
                      }
                    ]}
                  >
                    {item.isTranscribing ? (
                      <ActivityIndicator size="small" color="#3B82F6" />
                    ) : (
                      <Ionicons name="document-text-outline" size={18} color="#374151" />
                    )}
                    <Text className={`${textStyles.badge} text-gray-700 ml-3`}>
                      {item.isTranscribing ? 'Transcribiendo...' : 'Transcribir con Whisper'}
                    </Text>
                  </Pressable>
                )}

                {isConnected && (
                  <Pressable
                    onPress={() => saveRecordingToCodex(item)}
                    className="bg-green-500 rounded-full w-12 h-12 justify-center items-center"
                    style={({ pressed }) => [
                      {
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      }
                    ]}
                  >
                    <Ionicons name="cloud-upload-outline" size={18} color="white" />
                  </Pressable>
                )}
              </View>

              {(item.transcription || item.realtimeTranscription) && (
                <View className="mt-4 p-4 bg-gray-50 rounded-2xl">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name={item.realtimeTranscription ? 'flash' : 'document-text'}
                      size={16}
                      color="#6B7280"
                    />
                    <Text className={`${textStyles.helper} ml-2 font-semibold`}>
                      {item.realtimeTranscription ? 'Transcripción Automática (Scribe)' : 'Transcripción (Whisper)'}
                    </Text>
                  </View>
                  <Text className={`${textStyles.bodyText} text-gray-700`}>
                    {item.transcription || item.realtimeTranscription}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
