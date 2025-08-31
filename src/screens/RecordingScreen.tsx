import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRecordingStore } from '../state/recordingStore';
import { transcribeAudio } from '../api/transcribe-audio';

export default function RecordingScreen() {
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

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Recording Controls */}
      <View className="items-center py-8">
        <View className="bg-white rounded-full w-40 h-40 justify-center items-center mb-6">
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            className={`w-24 h-24 rounded-full justify-center items-center ${
              isRecording ? 'bg-red-500' : 'bg-blue-500'
            }`}
          >
            <Ionicons 
              name={isRecording ? 'stop' : 'mic'} 
              size={32} 
              color="white" 
            />
          </Pressable>
        </View>

        {isRecording && (
          <View className="items-center">
            <Text className="text-red-500 text-lg font-medium mb-2">
              Recording...
            </Text>
            <Text className="text-white text-2xl font-mono">
              {formatDuration(recordingDuration)}
            </Text>
          </View>
        )}

        {!isRecording && recordings.length === 0 && (
          <View className="items-center px-8">
            <Text className="text-white text-lg font-medium mb-2">
              Ready to Record
            </Text>
            <Text className="text-gray-400 text-center">
              Tap the microphone to start recording interviews or audio notes
            </Text>
          </View>
        )}
      </View>

      {/* Recordings List */}
      {recordings.length > 0 && (
        <ScrollView className="flex-1 px-4">
          <Text className="text-white text-xl font-semibold mb-4">
            Recordings ({recordings.length})
          </Text>
          
          {recordings.map((item) => (
            <View key={item.id} className="bg-gray-900 rounded-2xl p-4 mb-3">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-white font-medium text-base">
                    {item.title}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {formatDate(item.timestamp)} • {formatDuration(item.duration)}
                  </Text>
                </View>
                
                <Pressable
                  onPress={() => deleteRecording(item.id)}
                  className="p-2"
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              </View>

              <View className="flex-row items-center space-x-3">
                <Pressable
                  onPress={() => playRecording(item)}
                  className="bg-blue-500 rounded-full w-10 h-10 justify-center items-center"
                >
                  <Ionicons 
                    name={playingId === item.id ? 'pause' : 'play'} 
                    size={16} 
                    color="white" 
                  />
                </Pressable>

                <Pressable
                  onPress={() => transcribeRecording(item)}
                  disabled={item.isTranscribing}
                  className="bg-gray-700 rounded-full px-4 py-2 flex-row items-center"
                >
                  {item.isTranscribing ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Ionicons name="document-text-outline" size={16} color="white" />
                  )}
                  <Text className="text-white ml-2 text-sm">
                    {item.isTranscribing ? 'Transcribing...' : 'Transcribe'}
                  </Text>
                </Pressable>
              </View>

              {item.transcription && (
                <View className="mt-3 p-3 bg-gray-800 rounded-xl">
                  <Text className="text-gray-300 text-sm leading-5">
                    {item.transcription}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}