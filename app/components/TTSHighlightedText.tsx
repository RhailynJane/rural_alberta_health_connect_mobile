import React, { useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { ChunkState } from '../../utils/tts';
import { FONTS } from '../constants/constants';

interface TTSHighlightedTextProps {
  chunks: string[];
  chunkStates: ChunkState[];
  isActive: boolean;
  textStyle?: TextStyle;
  containerStyle?: ViewStyle;
  asBulletList?: boolean;
  bulletChar?: string;
  parentPadding?: number;
  currentChunk?: number;
}

/**
 * TTSHighlightedText - Visual feedback for TTS chunk generation/playback
 */
export default function TTSHighlightedText({
  chunks,
  chunkStates,
  isActive,
  textStyle,
  containerStyle,
  asBulletList = false,
  bulletChar = '•',
  parentPadding = 20,
}: TTSHighlightedTextProps) {
  // Store animation values persistently
  const animValuesRef = useRef<Map<number, Animated.Value>>(new Map());
  const runningAnimsRef = useRef<Map<number, Animated.CompositeAnimation>>(new Map());
  const prevStatesRef = useRef<string>('');

  // Get or create animation value for a chunk
  const getAnimValue = useCallback((index: number): Animated.Value => {
    if (!animValuesRef.current.has(index)) {
      animValuesRef.current.set(index, new Animated.Value(0));
    }
    return animValuesRef.current.get(index)!;
  }, []);

  // Check if any chunk is playing
  const isAnyPlaying = chunkStates.some(s => s === 'playing');

  // Get visual state for a chunk
  const getVisualState = useCallback((state: ChunkState): ChunkState => {
    if (state === 'playing') return 'playing';
    if (state === 'completed') return 'completed';
    if (state === 'generating') {
      // Only show blink if no other chunk is playing
      return isAnyPlaying ? 'pending' : 'generating';
    }
    return 'pending';
  }, [isAnyPlaying]);

  // Manage animations - only update when states actually change
  useEffect(() => {
    if (!isActive || chunks.length === 0) {
      // Stop all animations when not active
      runningAnimsRef.current.forEach(anim => anim.stop());
      runningAnimsRef.current.clear();
      return;
    }

    // Create a string key of current visual states to detect real changes
    const currentStatesKey = chunkStates.map((s, i) => `${i}:${getVisualState(s)}`).join(',');

    // Skip if nothing changed
    if (currentStatesKey === prevStatesRef.current) {
      return;
    }
    prevStatesRef.current = currentStatesKey;

    console.log('[TTS-Highlight] States changed:', currentStatesKey);

    // Update animations for each chunk
    chunkStates.forEach((rawState, index) => {
      const visualState = getVisualState(rawState);
      const animValue = getAnimValue(index);

      // Stop existing animation for this chunk
      const existingAnim = runningAnimsRef.current.get(index);
      if (existingAnim) {
        existingAnim.stop();
        runningAnimsRef.current.delete(index);
      }

      if (visualState === 'generating') {
        console.log(`[TTS-Highlight] Starting blink animation for chunk ${index}`);
        // Start pulsing animation
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(animValue, {
              toValue: 1,
              duration: 1400,
              useNativeDriver: false,
            }),
            Animated.timing(animValue, {
              toValue: 0.3,
              duration: 1400,
              useNativeDriver: false,
            }),
          ])
        );
        runningAnimsRef.current.set(index, pulse);
        pulse.start();
      } else if (visualState === 'playing') {
        // Solid highlight
        Animated.timing(animValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }).start();
      } else {
        // Fade out
        Animated.timing(animValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    });

    return () => {
      // Cleanup on unmount
      runningAnimsRef.current.forEach(anim => anim.stop());
    };
  }, [isActive, chunks.length, chunkStates, getVisualState, getAnimValue]);

  if (!isActive || chunks.length === 0) {
    return null;
  }

  // Get style for a chunk
  const getChunkStyle = (visualState: ChunkState, animValue: Animated.Value): ViewStyle => {
    const baseStyle: ViewStyle = {
      marginHorizontal: -parentPadding,
      paddingHorizontal: parentPadding,
      paddingVertical: 10,
      marginBottom: 8,
    };

    if (visualState === 'generating') {
      return {
        ...baseStyle,
        backgroundColor: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['rgba(34, 211, 238, 0.1)', 'rgba(34, 211, 238, 0.35)'],
        }) as any,
      };
    }

    if (visualState === 'playing') {
      return {
        ...baseStyle,
        backgroundColor: 'rgba(34, 211, 238, 0.2)',
      };
    }

    if (visualState === 'completed') {
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
      };
    }

    // pending
    return {
      ...baseStyle,
      backgroundColor: 'rgba(148, 163, 184, 0.05)',
    };
  };

  const getTextStyle = (visualState: ChunkState): TextStyle => {
    switch (visualState) {
      case 'generating':
        return { color: '#0E7490', fontWeight: '600' };
      case 'playing':
        return { color: '#0891B2', fontWeight: '500' };
      case 'completed':
        return { color: '#374151', fontWeight: '400' };
      default:
        return { color: '#9CA3AF', fontWeight: '400' };
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {chunks.map((chunk, index) => {
        const rawState = chunkStates[index] || 'pending';
        const visualState = getVisualState(rawState);
        const animValue = getAnimValue(index);

        if (asBulletList) {
          return (
            <Animated.View key={index} style={getChunkStyle(visualState, animValue)}>
              <View style={styles.bulletItem}>
                <Text style={[styles.bullet, getTextStyle(visualState)]}>{bulletChar}</Text>
                <Text
                  style={[
                    styles.text,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    textStyle,
                    getTextStyle(visualState),
                  ]}
                >
                  {chunk}
                </Text>
              </View>
            </Animated.View>
          );
        }

        return (
          <Animated.View key={index} style={getChunkStyle(visualState, animValue)}>
            <Text
              style={[
                styles.text,
                { fontFamily: FONTS.BarlowSemiCondensed },
                textStyle,
                getTextStyle(visualState),
              ]}
            >
              {chunk}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 15,
    marginRight: 10,
    marginTop: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    flex: 1,
  },
});
