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
import { getViztaChatResponse } from '../api/vizta-service';
import { extractLinksFromText, processImprovedLinks, detectSocialPlatform } from '../api/improved-link-processor';
import CustomHeader from '../components/CustomHeader';
import AnimatedCircle from '../components/AnimatedCircle';
import LinkProcessingIndicator from '../components/LinkProcessingIndicator';
import { textStyles } from '../utils/typography';
import { layoutSpacing } from '../utils/spacing';

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const [isProcessingLinks, setIsProcessingLinks] = useState(false);
  const [processingPlatform, setProcessingPlatform] = useState<string>('generic');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  
  const { messages, isLoading, conversationId, addMessage, setLoading, setConversationId } = useChatStore();
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
      
      processImprovedLinks(links).then((linkDataArray) => {
        linkDataArray.forEach((linkData) => {
          addSavedItem(linkData, 'chat');
        });
        setIsProcessingLinks(false);
      }).catch((error) => {
        console.error('[ChatScreen] Failed to process links:', error);
        setIsProcessingLinks(false);
      });
    }

    setLoading(true);

    try {
      // Get Vizta AI response with full toolset
      const viztaResponse = await getViztaChatResponse(
        userMessage,
        conversationId || undefined,
        false // useGenerativeUI - can enable later for charts/visualizations
      );
      
      if (viztaResponse.success) {
        // Update conversation ID for continuity
        if (viztaResponse.conversationId && viztaResponse.conversationId !== conversationId) {
          setConversationId(viztaResponse.conversationId);
        }

        // Add Vizta's response
        addMessage({
          content: viztaResponse.response.message,
          role: 'assistant',
        });

        // Log sources if available (can be displayed in UI later)
        if (viztaResponse.response.sources && viztaResponse.response.sources.length > 0) {
          console.log('📚 Fuentes:', viztaResponse.response.sources);
        }
      } else {
        throw new Error(viztaResponse.error || 'Error desconocido de Vizta');
      }
    } catch (error) {
      console.error('Vizta chat error:', error);
      addMessage({
        content: "Lo siento, tengo problemas para responder en este momento. Por favor intenta de nuevo.",
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
    <View className="flex-1 bg-gray-50">
      <CustomHeader navigation={navigation} />
      
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Animated Circle - Always Visible */}
        <View className={layoutSpacing.section.padding + " items-center"}>
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
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              className={`mb-6 ${
                message.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <View
                className={`max-w-[85%] rounded-3xl px-5 py-4 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-blue-500'
                    : 'bg-white border border-gray-100'
                }`}
              >
                <Text
                  className={`${textStyles.bodyText} ${
                    message.role === 'user' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {message.content}
                </Text>
              </View>
              <Text className={`${textStyles.timestamp} mt-2 mx-2`}>
                {formatTime(message.timestamp)}
              </Text>
            </View>
          ))}
          
          {isLoading && (
            <View className="items-start mb-6">
              <View className="bg-white border border-gray-100 rounded-3xl px-5 py-4 shadow-sm">
                <View className="flex-row items-center gap-3">
                  <ActivityIndicator size="small" color="#6B7280" />
                  <Text className={textStyles.bodyText + " text-gray-500"}>AI está pensando...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View 
          className="px-5 pb-4 pt-3 bg-white border-t border-gray-100"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="flex-row items-end gap-3">
            <View className="flex-1 bg-gray-50 border border-gray-200 rounded-3xl px-5 py-4">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Escribe tu mensaje..."
                placeholderTextColor="#9CA3AF"
                multiline
                className={textStyles.bodyText}
                style={{ maxHeight: 120, minHeight: 20 }}
              />
            </View>
            
            <Pressable
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              className={`w-14 h-14 rounded-full items-center justify-center shadow-sm ${
                !inputText.trim() || isLoading
                  ? 'bg-gray-300'
                  : 'bg-blue-500'
              }`}
              style={({ pressed }) => [
                {
                  transform: [{ scale: pressed && !(!inputText.trim() || isLoading) ? 0.95 : 1 }],
                }
              ]}
            >
              <Ionicons
                name="send"
                size={22}
                color={!inputText.trim() || isLoading ? '#9CA3AF' : 'white'}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}