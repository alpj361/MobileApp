import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../state/chatStore';
import { getOpenAIChatResponse } from '../api/chat-service';

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  
  const { messages, isLoading, addMessage, setLoading } = useChatStore();

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    
    // Add user message
    addMessage({
      content: userMessage,
      role: 'user',
    });

    setLoading(true);

    try {
      // Get AI response
      const response = await getOpenAIChatResponse(userMessage);
      
      // Add AI response
      addMessage({
        content: response.content,
        role: 'assistant',
      });
    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        content: "Sorry, I'm having trouble responding right now. Please try again.",
        role: 'assistant',
      });
    } finally {
      setLoading(false);
    }

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <View className="bg-white rounded-full w-32 h-32 justify-center items-center mb-6">
                <Ionicons name="chatbubble" size={48} color="#3B82F6" />
              </View>
              <Text className="text-white text-lg font-medium mb-2">
                Welcome to AI Chat
              </Text>
              <Text className="text-gray-400 text-center px-8">
                Start a conversation with AI. Ask questions, get help, or just chat!
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                className={`mb-4 ${
                  message.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <View
                  className={`max-w-[80%] rounded-3xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500'
                      : 'bg-white'
                  }`}
                >
                  <Text
                    className={`text-base ${
                      message.role === 'user' ? 'text-white' : 'text-black'
                    }`}
                  >
                    {message.content}
                  </Text>
                </View>
                <Text className="text-gray-500 text-xs mt-1 px-2">
                  {formatTime(message.timestamp)}
                </Text>
              </View>
            ))
          )}
          
          {isLoading && (
            <View className="items-start mb-4">
              <View className="bg-white rounded-3xl px-4 py-3 flex-row items-center">
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text className="text-gray-600 ml-2">AI is typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View 
          className="px-4 pb-4 bg-black"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <View className="flex-row items-center bg-gray-900 rounded-full px-4 py-2">
            <TextInput
              className="flex-1 text-white text-base py-2"
              placeholder="Type your message..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <Pressable
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              className={`ml-2 w-8 h-8 rounded-full items-center justify-center ${
                inputText.trim() && !isLoading ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            >
              <Ionicons 
                name="send" 
                size={16} 
                color={inputText.trim() && !isLoading ? 'white' : '#9CA3AF'} 
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}