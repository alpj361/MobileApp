import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useChatStore } from '../state/chatStore';
import { useSavedStore } from '../state/savedStore';
import { getOpenAIChatResponse } from '../api/chat-service';
import { extractLinksFromText, processLinks, detectSocialPlatform } from '../api/link-processor';
import CustomHeader from '../components/CustomHeader';
import AnimatedCircle from '../components/AnimatedCircle';
import LinkProcessingIndicator from '../components/LinkProcessingIndicator';

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [isProcessingLinks, setIsProcessingLinks] = useState(false);
  const [processingPlatform, setProcessingPlatform] = useState<string>('generic');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  
  const { messages, isLoading, addMessage, setLoading } = useChatStore();
  const { addSavedItem } = useSavedStore();

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    
    // Add user message
    addMessage({
      content: userMessage,
      role: 'user',
    });

    // Process links in background
    const links = extractLinksFromText(userMessage);
    if (links.length > 0) {
      setIsProcessingLinks(true);
      
      // Detectar plataforma del primer link para el indicador
      if (links.length > 0) {
        const platform = detectSocialPlatform(links[0]);
        setProcessingPlatform(platform || 'generic');
      }
      
      processLinks(links).then((linkDataArray) => {
        linkDataArray.forEach((linkData) => {
          addSavedItem(linkData, 'chat');
        });
        setIsProcessingLinks(false);
      }).catch((error) => {
        console.error('Failed to process links:', error);
        setIsProcessingLinks(false);
      });
    }

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
        {/* Animated Circle - Always Visible */}
        <View className="items-center py-6">
          <AnimatedCircle isAnimating={isLoading} size={60} />
        </View>

        {/* Link Processing Indicator */}
        <LinkProcessingIndicator 
          isProcessing={isProcessingLinks}
          platform={processingPlatform}
          message="Procesando link..."
        />

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, index) => (
            <View
              key={message.id}
              className={`mb-4 ${
                message.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <View
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-500'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <Text
                  className={`text-base ${
                    message.role === 'user' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {message.content}
                </Text>
              </View>
              <Text className="text-gray-500 text-xs mt-2">
                {formatTime(message.timestamp)}
              </Text>
            </View>
          ))}
          
          {isLoading && (
            <View className="items-start mb-4">
              <View className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <View className="flex-row items-center space-x-2">
                  <ActivityIndicator size="small" color="#6B7280" />
                  <Text className="text-gray-500 text-base">AI está pensando...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View 
          className="px-4 pb-4 pt-2"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="flex-row items-end space-x-3">
            <View className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Escribe tu mensaje..."
                multiline
                className="text-base text-gray-900"
                style={{ maxHeight: 100 }}
              />
            </View>
            
            <Pressable
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              className={`w-12 h-12 rounded-2xl items-center justify-center ${
                !inputText.trim() || isLoading
                  ? 'bg-gray-300'
                  : 'bg-blue-500'
              }`}
            >
              <Ionicons
                name="send"
                size={20}
                color={!inputText.trim() || isLoading ? '#9CA3AF' : 'white'}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}