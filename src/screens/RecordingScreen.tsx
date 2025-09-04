import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useRecordingStore } from '../state/recordingStore';
import { transcribeAudio } from '../api/transcribe-audio';
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

  const {
    recordings,
    isRecording,
    addRecording,
    updateRecording,
    deleteRecording,
    setRecording: setIsRecording,
  } = useRecordingStore();

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
        addRecording({
          title,
          uri,
          duration: recordingDuration,
        });
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
            <Text className={`text-3xl font-mono font-bold text-gray-900`}>
              {formatDuration(recordingDuration)}
            </Text>
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
                  <Text className={textStyles.helper}>
                    {formatDate(item.timestamp)} • {formatDuration(item.duration)}
                  </Text>
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
                    {item.isTranscribing ? 'Transcribiendo...' : 'Transcribir'}
                  </Text>
                </Pressable>
              </View>

              {item.transcription && (
                <View className="mt-4 p-4 bg-gray-50 rounded-2xl">
                  <Text className={`${textStyles.bodyText} text-gray-700`}>
                    {item.transcription}
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