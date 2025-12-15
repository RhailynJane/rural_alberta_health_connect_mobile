import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTTS, MODELS, DEFAULT_MODEL_ID } from '../../utils/tts';
import { FONTS } from '../constants/constants';

interface TTSButtonProps {
  text: string;
  style?: object;
  compact?: boolean;
  onError?: (error: string) => void;
}

/**
 * Text-to-Speech Button Component
 *
 * A subtle, calming button for reading assessment guidance aloud.
 * Downloads the TTS model on first use (~86MB).
 *
 * @example
 * ```tsx
 * <TTSButton text="Step 1: Clean the wound gently with water." />
 * ```
 */
export default function TTSButton({ text, style, compact = false, onError }: TTSButtonProps) {
  const {
    status,
    downloadProgress,
    generationProgress,
    error,
    speak,
    stop,
    download,
    isAvailable,
  } = useTTS();

  const handlePress = useCallback(async () => {
    switch (status) {
      case 'not_downloaded':
        // Start download
        const success = await download();
        if (!success && onError) {
          onError('Failed to download voice model');
        }
        break;

      case 'ready':
        // Start speaking
        await speak(text);
        break;

      case 'generating':
      case 'speaking':
        // Stop generating or speaking
        await stop();
        break;

      default:
        // Do nothing for other states
        break;
    }
  }, [status, text, speak, stop, download, onError]);

  // Don't render if TTS is not available on this platform
  if (!isAvailable && status !== 'checking') {
    return null;
  }

  // Checking state - show nothing to avoid flicker
  if (status === 'checking') {
    return null;
  }

  // Error state
  if (status === 'error') {
    return null; // Silently fail - TTS is a nice-to-have feature
  }

  // Download prompt
  if (status === 'not_downloaded') {
    return (
      <TouchableOpacity
        style={[styles.button, styles.downloadButton, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons name="volume-medium-outline" size={16} color="#6B7280" />
        <Text style={[styles.buttonText, styles.downloadText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          {compact ? 'Enable audio' : 'Enable audio guidance'}
        </Text>
        <Text style={[styles.sizeHint, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          {MODELS[DEFAULT_MODEL_ID].size}
        </Text>
      </TouchableOpacity>
    );
  }

  // Downloading state
  if (status === 'downloading') {
    const progressPercent = Math.round(downloadProgress * 100);
    return (
      <View style={[styles.button, styles.downloadingButton, style]}>
        <ActivityIndicator size="small" color="#2A7DE1" />
        <Text style={[styles.buttonText, styles.downloadingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          Downloading voice... {progressPercent}%
        </Text>
      </View>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <View style={[styles.button, styles.loadingButton, style]}>
        <ActivityIndicator size="small" color="#2A7DE1" />
        <Text style={[styles.buttonText, styles.loadingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          Preparing voice...
        </Text>
      </View>
    );
  }

  // Generating state - show progress and allow cancel
  if (status === 'generating') {
    const progressPercent = Math.round(generationProgress * 100);
    return (
      <TouchableOpacity
        style={[styles.button, styles.generatingButton, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <ActivityIndicator size="small" color="#2A7DE1" />
        <Text style={[styles.buttonText, styles.generatingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          Generating... {progressPercent}%
        </Text>
      </TouchableOpacity>
    );
  }

  // Ready or Speaking state
  const isSpeaking = status === 'speaking';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSpeaking ? styles.speakingButton : styles.readyButton,
        style,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isSpeaking ? 'stop-circle' : 'volume-medium'}
        size={18}
        color={isSpeaking ? '#DC3545' : '#2A7DE1'}
      />
      <Text
        style={[
          styles.buttonText,
          isSpeaking ? styles.speakingText : styles.readyText,
          { fontFamily: FONTS.BarlowSemiCondensed },
        ]}
      >
        {isSpeaking ? 'Stop' : (compact ? 'Listen' : 'Listen to guidance')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Download state
  downloadButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  downloadText: {
    color: '#6B7280',
  },
  sizeHint: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Downloading state
  downloadingButton: {
    backgroundColor: '#F0F7FF',
  },
  downloadingText: {
    color: '#2A7DE1',
  },

  // Loading state
  loadingButton: {
    backgroundColor: '#F0F7FF',
  },
  loadingText: {
    color: '#2A7DE1',
  },

  // Ready state
  readyButton: {
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  readyText: {
    color: '#2A7DE1',
  },

  // Speaking state
  speakingButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  speakingText: {
    color: '#DC3545',
  },
});
