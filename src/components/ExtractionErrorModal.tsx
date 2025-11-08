import React from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { reportExtractionError } from '../services/extractionErrorService';

interface ExtractionErrorModalProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  platform?: 'x' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'other';
  message?: string;
}

export default function ExtractionErrorModal({
  visible,
  onClose,
  url,
  platform = 'x',
  message = 'There is an error',
}: ExtractionErrorModalProps) {
  const [reportText, setReportText] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleReport = async () => {
    try {
      setSubmitting(true);
      const res = await reportExtractionError({
        platform,
        post_url: url,
        error_type: 'user_reported',
        error_message: reportText || message,
        extraction_step: 'add_saved_item',
        severity: 'medium',
        full_logs: {
          context: 'outer_error_modal',
        },
      });
      setSubmitting(false);
      if (res.success) {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setReportText('');
          onClose();
        }, 1500);
      } else {
        // Keep modal open to allow retry
      }
    } catch (e) {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (!visible) {
      setReportText('');
      setSubmitted(false);
      setSubmitting(false);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent={false}
      {...(Platform.OS === 'ios' ? { presentationStyle: 'pageSheet' } : {})}
    >
      <LinearGradient colors={["#FFFFFF", "#F9FAFB"]} style={{ flex: 1 }}>
        <View style={{ paddingTop: 24, paddingHorizontal: 16, flex: 1 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#111827' }}>Error</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* Body */}
          <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#B91C1C', fontWeight: '600', marginBottom: 4 }}>{message}</Text>
            <Text style={{ color: '#7F1D1D' }}>We could not process this post. You can report this issue so we can fix it.</Text>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: '#374151', marginBottom: 6 }}>Add details (optional):</Text>
            <TextInput
              value={reportText}
              onChangeText={setReportText}
              multiline
              placeholder="Describe what happened..."
              style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top' }}
            />
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
            <Pressable onPress={onClose} style={({ pressed }) => [{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#E5E7EB', opacity: pressed ? 0.8 : 1 }]}>
              <Text style={{ color: '#111827', fontWeight: '600' }}>Close</Text>
            </Pressable>
            <Pressable onPress={handleReport} disabled={submitting} style={({ pressed }) => [{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#2563EB', opacity: (pressed || submitting) ? 0.8 : 1, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="flag" size={16} color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{submitted ? 'Sent' : 'Report'}</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </Modal>
  );
}

