import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useRecordingStore } from '../state/recordingStore';
import { usePulseConnectionStore } from '../state/pulseConnectionStore';
import { transcribeAudio } from '../api/transcribe-audio';
import { saveRecordingToCodex as saveRecordingToCodexService } from '../services/codexService';
import CustomHeader from '../components/CustomHeader';
import { textStyles } from '../utils/typography';
import { getCurrentSpacing } from '../utils/responsive';

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
   * Transcribe with ElevenLabs Scribe (for real-time/fast transcription)
   * This uses the same Whisper API but is triggered automatically when enabled
   */
  const transcribeWithScribe = async (id: string, uri: string) => {
    try {
      updateRecording(id, { isTranscribing: true, isRealtimeTranscribing: true });

      const transcription = await transcribeAudio(uri, {
        language: 'es', // Spanish by default, can be made configurable
      });

      updateRecording(id, {
        transcription,
        realtimeTranscription: transcription,
        isTranscribing: false,
        isRealtimeTranscribing: false,
      });
    } catch (error) {
      console.error('ElevenLabs Scribe transcription failed:', error);
      updateRecording(id, {
        isTranscribing: false,
        isRealtimeTranscribing: false,
      });
      Alert.alert('Error', 'Failed to transcribe audio with ElevenLabs Scribe.');
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
    <View className="flex-1 bg-gray-50">
      <CustomHeader navigation={navigation} title="Grabación" />

      {/* Real-time Transcription Toggle */}
      <View className="bg-white mx-4 mt-4 p-4 rounded-2xl shadow-sm border border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center mb-1">
              <Ionicons name="flash" size={18} color="#3B82F6" />
              <Text className={`${textStyles.cardTitle} ml-2`}>
                Transcripción Automática
              </Text>
            </View>
            <Text className={`${textStyles.helper}`}>
              Transcribe automáticamente al terminar de grabar con ElevenLabs Scribe
            </Text>
          </View>
          <Switch
            value={realtimeTranscriptionEnabled}
            onValueChange={setRealtimeTranscriptionEnabled}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={realtimeTranscriptionEnabled ? '#3B82F6' : '#F3F4F6'}
          />
        </View>
      </View>

      {/* Recording Controls */}
      <View className="items-center py-12">
        <View className="bg-white rounded-full w-44 h-44 justify-center items-center mb-8 shadow-lg">
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            className={`w-28 h-28 rounded-full justify-center items-center ${
              isRecording ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed ? 0.95 : 1 }],
              }
            ]}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={36}
              color="white"
            />
          </Pressable>
        </View>

        {isRecording && (
          <View className="items-center">
            <Text className={`${textStyles.sectionTitle} text-red-500 mb-3`}>
              Grabando...
            </Text>
            <Text className="text-3xl font-mono font-bold text-gray-900">
              {formatDuration(recordingDuration)}
            </Text>
            {realtimeTranscriptionEnabled && (
              <View className="flex-row items-center mt-3 bg-blue-50 px-4 py-2 rounded-full">
                <Ionicons name="flash" size={14} color="#3B82F6" />
                <Text className={`${textStyles.helper} text-blue-600 ml-2`}>
                  Transcripción automática activada
                </Text>
              </View>
            )}
          </View>
        )}

        {!isRecording && recordings.length === 0 && (
          <View className="items-center px-8">
            <Text className={`${textStyles.sectionTitle} mb-3`}>
              Listo para grabar
            </Text>
            <Text className={`${textStyles.description} text-center`}>
              Toca el micrófono para comenzar a grabar entrevistas o notas de audio
            </Text>
          </View>
        )}
      </View>

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
