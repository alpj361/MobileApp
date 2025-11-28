/**
 * Simple Saved Item Card
 * Card component for displaying saved posts with modal integration
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SavedItem } from '../state/savedStore';
import SocialAnalysisModal from './SocialAnalysisModal';

interface SimpleSavedItemCardProps {
    item: SavedItem;
}

export const SimpleSavedItemCard: React.FC<SimpleSavedItemCardProps> = ({ item }) => {
    const [modalVisible, setModalVisible] = useState(false);

    // Handle both structures: direct object (new) or wrapped in data (legacy/potential wrapper)
    const rawData = item.analysisResult?.data || item.analysisResult;

    const handlePress = () => {
        if (item.status === 'completed' && rawData) {
            setModalVisible(true);
        }
    };

    const getStatusIcon = () => {
        switch (item.status) {
            case 'processing':
                return <ActivityIndicator size="small" color="#007AFF" />;
            case 'completed':
                return <Ionicons name="checkmark-circle" size={16} color="#34C759" />;
            case 'failed':
                return <Ionicons name="close-circle" size={16} color="#FF3B30" />;
            default:
                return <Ionicons name="document" size={16} color="#8E8E93" />;
        }
    };

    const getStatusText = () => {
        if (item.isPending) return 'Saving...';
        switch (item.status) {
            case 'processing':
                return 'Analyzing...';
            case 'completed':
                return 'Analysis Complete';
            case 'failed':
                return 'Analysis Failed';
            default:
                return 'Saved';
        }
    };

    const analysisInfo = rawData ? {
        loading: false,
        summary: rawData.ai_generated?.description || '',
        transcript: '', // Will use transcription array instead
        transcription: rawData.transcription || [],
        media_analysis: rawData.media_analysis || [],
        topic: rawData.ai_generated?.category || '',
        sentiment: rawData.ai_generated?.sentiment || 'neutral',
        type: item.type || 'text',
        entities: [],
        images: [],
        lastUpdated: item.lastUpdated || Date.now()
    } : undefined;

    return (
        <>
            <Pressable
                onPress={handlePress}
                style={({ pressed }) => ({
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    margin: 8,
                    padding: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                    borderLeftWidth: 4,
                    borderLeftColor: item.status === 'completed' ? '#34C759' : '#E5E5EA',
                    opacity: pressed ? 0.7 : 1,
                    cursor: 'pointer',
                } as any)}
            >
                {/* Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: '#1C1C1E',
                            lineHeight: 22
                        }} numberOfLines={2}>
                            {item.title || item.url}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            {getStatusIcon()}
                            <Text style={{
                                fontSize: 12,
                                color: '#8E8E93',
                                marginLeft: 6
                            }}>
                                {getStatusText()}
                            </Text>
                            {item.lastUpdated && (
                                <Text style={{ fontSize: 12, color: '#C7C7CC', marginLeft: 8 }}>
                                    • {new Date(item.lastUpdated).toLocaleTimeString()}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Platform indicator */}
                    <View style={{
                        backgroundColor: (item.platform === 'x' || item.platform === 'twitter') ? '#000' : item.platform === 'instagram' ? '#E4405F' : '#007AFF',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6
                    }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>
                            {(item.platform === 'x' || item.platform === 'twitter') ? 'X' : item.platform?.toUpperCase() || 'WEB'}
                        </Text>
                    </View>
                </View>

                {/* Description Preview */}
                {item.description && (
                    <Text style={{
                        fontSize: 14,
                        color: '#3C3C43',
                        lineHeight: 20,
                        marginBottom: 8
                    }} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                {/* Analysis Preview */}
                {item.status === 'completed' && rawData?.ai_generated && (
                    <View style={{
                        backgroundColor: '#F2F2F7',
                        padding: 10,
                        borderRadius: 8,
                        marginTop: 8
                    }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#007AFF', marginBottom: 4 }}>
                            🤖 AI Analysis Ready
                        </Text>
                        <Text style={{ fontSize: 12, color: '#3C3C43' }} numberOfLines={2}>
                            {rawData.ai_generated.description || 'Tap to view full analysis'}
                        </Text>
                    </View>
                )}

                {/* Transcription Indicator */}
                {rawData?.transcription && rawData.transcription.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Ionicons name="videocam" size={14} color="#7C3AED" />
                        <Text style={{ fontSize: 11, color: '#7C3AED', marginLeft: 4, fontWeight: '500' }}>
                            {rawData.transcription.length} transcription(s) available
                        </Text>
                    </View>
                )}

                {/* Error Message */}
                {item.outerErrorMessage && (
                    <View style={{
                        backgroundColor: '#FFEBEE',
                        padding: 8,
                        borderRadius: 6,
                        marginTop: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: '#FF3B30'
                    }}>
                        <Text style={{ color: '#D32F2F', fontSize: 11, fontWeight: '500' }}>
                            Error: {item.outerErrorMessage}
                        </Text>
                    </View>
                )}
            </Pressable>

            {/* Analysis Modal */}
            <SocialAnalysisModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                analysis={analysisInfo as any}
                platform={item.platform as any}
                url={item.url}
            />
        </>
    );
};
