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
        <Ionicons name="volume-medium-outline" size={16} color="#94A3B8" />
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
        <ActivityIndicator size="small" color="#22D3EE" />
        <Text style={[styles.buttonText, styles.downloadingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          Downloading... {progressPercent}%
        </Text>
      </View>
    );
  }

  // Loading state
  if (status === 'loading') {
    return (
      <View style={[styles.button, styles.loadingButton, style]}>
        <ActivityIndicator size="small" color="#22D3EE" />
        <Text style={[styles.buttonText, styles.loadingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          Preparing...
        </Text>
      </View>
    );
  }

  // Generating state - icon only, no background
  if (status === 'generating') {
    return (
      <TouchableOpacity
        style={[styles.iconOnlyButton, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <ActivityIndicator size="small" color="#94A3B8" />
      </TouchableOpacity>
    );
  }

  // Speaking state - pause icon only, no background
  if (status === 'speaking') {
    return (
      <TouchableOpacity
        style={[styles.iconOnlyButton, style]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons name="pause" size={18} color="#94A3B8" />
      </TouchableOpacity>
    );
  }

  // Ready state - Listen button
  return (
    <TouchableOpacity
      style={[styles.button, styles.readyButton, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="volume-medium-outline" size={16} color="#22D3EE" />
      <Text
        style={[
          styles.buttonText,
          styles.readyText,
          { fontFamily: FONTS.BarlowSemiCondensed },
        ]}
      >
        {compact ? 'Listen' : 'Listen'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 5,
    minHeight: 28,
  },
  iconOnlyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    minWidth: 28,
    minHeight: 28,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },

  // Download state
  downloadButton: {
    backgroundColor: 'transparent',
  },
  downloadText: {
    color: '#94A3B8',
  },
  sizeHint: {
    fontSize: 11,
    color: '#CBD5E1',
  },

  // Downloading state
  downloadingButton: {
    backgroundColor: 'transparent',
  },
  downloadingText: {
    color: '#22D3EE',
  },

  // Loading state
  loadingButton: {
    backgroundColor: 'transparent',
  },
  loadingText: {
    color: '#22D3EE',
  },

  // Ready state
  readyButton: {
    backgroundColor: 'transparent',
  },
  readyText: {
    color: '#22D3EE',
  },
});
