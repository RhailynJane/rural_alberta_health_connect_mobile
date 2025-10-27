import Ionicons from '@expo/vector-icons/Ionicons';
import Voice from '@react-native-voice/voice';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS } from '../constants/constants';

interface SpeechToTextButtonProps {
  onTextReceived: (text: string) => void;
  currentText?: string;
  placeholder?: string;
  style?: object;
  disabled?: boolean;
}

export default function SpeechToTextButton({
  onTextReceived,
  currentText = '',
  placeholder = 'Tap microphone to speak',
  style,
  disabled = false,
}: SpeechToTextButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(true);

  useEffect(() => {
    // Check platform first
    if (Platform.OS === 'web') {
      setIsVoiceAvailable(false);
      return;
    }

    // Check if Voice module is available (requires dev build)
    const checkVoiceModule = async () => {
      try {
        // First check if Voice module exists and is not null
        if (!Voice || typeof Voice.isAvailable !== 'function') {
          console.log('Voice module not loaded - requires dev build with native modules');
          setIsVoiceAvailable(false);
          return;
        }

        // Try to check if the native module is available
        const available = await Voice.isAvailable();
        console.log('Voice available:', available);
        
        if (available) {
          setIsVoiceAvailable(true);
          
          // Initialize voice recognition
          Voice.onSpeechStart = () => {
            console.log('Speech started');
            setIsListening(true);
          };
          
          Voice.onSpeechEnd = () => {
            console.log('Speech ended');
            setIsListening(false);
          };
          
          Voice.onSpeechResults = (event) => {
            console.log('Speech results:', event.value);
            if (event.value && event.value.length > 0) {
              const spokenText = event.value[0];
              // Append to existing text with a space
              const newText = currentText
                ? `${currentText} ${spokenText}`
                : spokenText;
              onTextReceived(newText);
            }
          };
          
          Voice.onSpeechError = (error) => {
            console.log('Speech error:', error);
            setIsListening(false);
            
            // Don't show alert for cancellation
            if (error.error?.code === 'cancel' || error.error?.message?.includes('cancel')) {
              return;
            }
            
            // Show helpful error messages
            if (error.error?.code === '7' || error.error?.message?.includes('No match')) {
              Alert.alert('No Speech Detected', 'Please try speaking again more clearly.');
            } else if (error.error?.code === '9' || error.error?.message?.includes('Insufficient permissions')) {
              Alert.alert(
                'Permission Required',
                'Microphone permission is required for speech recognition. Please enable it in your device settings.'
              );
            } else {
              Alert.alert('Speech Error', 'Failed to recognize speech. Please try again.');
            }
          };
        } else {
          setIsVoiceAvailable(false);
        }
      } catch (err: any) {
        console.log('Voice check error:', err);
        
        // Check if error is due to missing native module (Expo Go or incomplete dev build)
        if (err?.message?.includes('null') || err?.message?.includes('undefined') || err?.message?.includes('not found')) {
          console.log('Voice module not available - requires properly built dev client');
          setIsVoiceAvailable(false);
        } else {
          // Other errors - module might still work
          console.log('Voice module available but initialization failed');
          setIsVoiceAvailable(false);
        }
      }
    };

    checkVoiceModule();

    // Cleanup
    return () => {
      try {
        if (isVoiceAvailable && Voice && typeof Voice.destroy === 'function') {
          Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentText, onTextReceived]);

  const startListening = async () => {
    try {
      // Check platform
      if (Platform.OS === 'web') {
        Alert.alert(
          'Not Available',
          'Speech-to-text is not available on web. Please use the mobile app.'
        );
        return;
      }

      // Check if Voice module is available
      if (!isVoiceAvailable || !Voice || typeof Voice.start !== 'function') {
        Alert.alert(
          'Development Build Required',
          'Speech-to-text requires a development build with native modules properly linked.\n\n' +
          'This feature uses native modules that are not available in Expo Go.\n\n' +
          'To use this feature:\n' +
          '1. Build a development build: npx eas build --profile development --platform android\n' +
          '2. Install the dev build on your device\n' +
          '3. Run: npx expo start --dev-client\n\n' +
          'For now, you can type your symptoms manually.'
        );
        return;
      }

      // Stop if already listening
      if (isListening) {
        await Voice.stop();
        setIsListening(false);
        return;
      }

      // Try to start listening
      console.log('Starting voice recognition...');
      await Voice.start('en-US');
      console.log('Voice recognition started successfully');
    } catch (error: any) {
      console.error('Speech recognition error:', error);
      setIsListening(false);
      
      // Provide specific error messages
      const errorMessage = error?.message || '';
      
      if (errorMessage.includes('null') || errorMessage.includes('undefined')) {
        Alert.alert(
          'Development Build Required',
          'Speech-to-text requires a development build. This feature is not available in Expo Go.\n\n' +
          'Please type your text manually for now.'
        );
        setIsVoiceAvailable(false);
      } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        Alert.alert(
          'Permission Required',
          'Please enable microphone permission in your device settings to use speech-to-text.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'OK', 
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Alert.alert('Open Settings', 'Go to Settings > Privacy > Microphone and enable permission for this app.');
                } else {
                  Alert.alert('Open Settings', 'Go to Settings > Apps > Permissions > Microphone and enable permission for this app.');
                }
              }
            }
          ]
        );
      } else if (errorMessage.includes('not available') || errorMessage.includes('Not available')) {
        Alert.alert(
          'Not Available',
          'Speech recognition is not available on this device. Make sure you have Google app installed (Android) or enabled dictation (iOS).'
        );
        setIsVoiceAvailable(false);
      } else {
        Alert.alert(
          'Error',
          'Failed to start speech recognition. Please try again.\n\nTip: Make sure your device has internet connection and microphone access.'
        );
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, style, (disabled || !isVoiceAvailable) && styles.disabled]}
      onPress={startListening}
      disabled={disabled || !isVoiceAvailable}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Ionicons
          name={isListening ? 'mic' : 'mic-outline'}
          size={20}
          color={(disabled || !isVoiceAvailable) ? '#999' : isListening ? '#DC3545' : COLORS.primary}
        />
        <Text style={[styles.text, (disabled || !isVoiceAvailable) && styles.disabledText, isListening && styles.listeningText]}>
          {!isVoiceAvailable 
            ? 'Dev build required' 
            : isListening 
              ? 'Listening... Tap to stop' 
              : placeholder
          }
        </Text>
      </View>
      {isListening && (
        <View style={styles.pulseContainer}>
          <View style={styles.pulse} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  disabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 8,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  listeningText: {
    color: '#DC3545',
  },
  pulseContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  pulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC3545',
    opacity: 0.3,
  },
});
