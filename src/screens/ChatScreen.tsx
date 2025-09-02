import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useChatStore } from '../state/chatStore';
import { getOpenAIChatResponse } from '../api/chat-service';
import CustomHeader from '../components/CustomHeader';
import AnimatedCircle from '../components/AnimatedCircle';

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  
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
    <View className="flex-1 bg-gray-100">
      <CustomHeader navigation={navigation} />
      
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Main Content Area */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View className="flex-1 justify-center items-center px-8">
              {/* Animated Black Circle */}
              <AnimatedCircle isAnimating={isLoading} />
              
              {/* Welcome Text */}
              <Text className="text-black text-2xl font-normal text-center">
                what's new, pablo?
              </Text>
            </View>
          ) : (
            <View className="flex-1 px-4 pt-4">
              {messages.map((message) => (
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
                        : 'bg-white shadow-sm'
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
              ))}
              
              {isLoading && (
                <View className="items-start mb-4">
                  <View className="bg-white rounded-3xl px-4 py-3 flex-row items-center shadow-sm">
                    <ActivityIndicator size="small" color="#3B82F6" />
                    <Text className="text-gray-600 ml-2">AI is typing...</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View 
          className="px-4 pb-4 bg-gray-100"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <TextInput
            className="bg-white rounded-2xl px-4 py-3 text-base text-black border border-gray-200"
            placeholder="Message..."
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}