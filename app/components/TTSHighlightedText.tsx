import React, { useEffect, useRef } from 'react';
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
  /** The text chunks from TTS */
  chunks: string[];
  /** State of each chunk */
  chunkStates: ChunkState[];
  /** Whether TTS is active (generating or speaking) */
  isActive: boolean;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Custom container style */
  containerStyle?: ViewStyle;
  /** Render as bullet list items */
  asBulletList?: boolean;
  /** Custom bullet character */
  bulletChar?: string;
}

/**
 * TTSHighlightedText - Visual feedback for TTS chunk generation/playback
 *
 * Shows which part of the text is being generated or played:
 * - Generating: Pulsing blue background animation
 * - Playing: Solid blue highlight
 * - Completed: Normal text
 * - Pending: Slightly dimmed text
 */
export default function TTSHighlightedText({
  chunks,
  chunkStates,
  isActive,
  textStyle,
  containerStyle,
  asBulletList = false,
  bulletChar = '•',
}: TTSHighlightedTextProps) {
  // Animation values for each chunk
  const pulseAnims = useRef<Animated.Value[]>([]).current;

  // Initialize animation values when chunks change
  useEffect(() => {
    // Create animation values for new chunks
    while (pulseAnims.length < chunks.length) {
      pulseAnims.push(new Animated.Value(0));
    }
    // Remove extra animation values
    while (pulseAnims.length > chunks.length) {
      pulseAnims.pop();
    }
  }, [chunks.length]);

  // Run pulse animation for generating chunks
  useEffect(() => {
    if (!isActive) {
      // Reset all animations when not active
      pulseAnims.forEach(anim => anim.setValue(0));
      return;
    }

    // Start pulse animation for generating chunks
    const animations: Animated.CompositeAnimation[] = [];

    chunkStates.forEach((state, index) => {
      if (state === 'generating' && pulseAnims[index]) {
        // Smooth, gentle breathing animation
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnims[index], {
              toValue: 1,
              duration: 1200, // Slower for calmer feel
              useNativeDriver: false,
            }),
            Animated.timing(pulseAnims[index], {
              toValue: 0.3, // Don't go fully to 0 for smoother transition
              duration: 1200,
              useNativeDriver: false,
            }),
          ])
        );
        animations.push(pulse);
        pulse.start();
      } else if (pulseAnims[index]) {
        // Smooth transition for non-generating chunks
        Animated.timing(pulseAnims[index], {
          toValue: state === 'playing' ? 1 : 0,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    });

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [chunkStates, isActive]);

  // If no chunks or not active, don't render anything special
  if (!isActive || chunks.length === 0) {
    return null;
  }

  // Minimal, modern approach - no boxes, just subtle text styling
  const getChunkStyle = (state: ChunkState, animValue: Animated.Value): ViewStyle => {
    const baseStyle: ViewStyle = {
      paddingHorizontal: 0,
      paddingVertical: 0,
      marginVertical: 1,
    };

    switch (state) {
      case 'generating':
        return {
          ...baseStyle,
          // Very subtle background pulse - almost imperceptible
          opacity: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0.7, 1],
          }) as unknown as number,
        };
      case 'playing':
        return {
          ...baseStyle,
          opacity: 1,
        };
      case 'completed':
        return {
          ...baseStyle,
          opacity: 1,
        };
      case 'pending':
      default:
        return {
          ...baseStyle,
          opacity: 0.4,
        };
    }
  };

  // Light, modern text colors - no harsh saturated tones
  const getTextStyle = (state: ChunkState): TextStyle => {
    switch (state) {
      case 'generating':
        return {
          color: '#06B6D4', // Light cyan
          fontWeight: '500',
        };
      case 'playing':
        return {
          color: '#0EA5E9', // Light sky blue
          fontWeight: '500',
        };
      case 'completed':
        return {
          color: '#64748B', // Soft slate
          fontWeight: '400',
        };
      case 'pending':
      default:
        return {
          color: '#CBD5E1', // Very light gray
          fontWeight: '400',
        };
    }
  };

  if (asBulletList) {
    return (
      <View style={[styles.container, containerStyle]}>
        {chunks.map((chunk, index) => {
          const state = chunkStates[index] || 'pending';
          const animValue = pulseAnims[index] || new Animated.Value(0);

          return (
            <View key={index} style={styles.bulletItem}>
              <Text style={[styles.bullet, getTextStyle(state)]}>{bulletChar}</Text>
              <Animated.View style={[styles.chunkWrapper, getChunkStyle(state, animValue)]}>
                <Text
                  style={[
                    styles.text,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                    textStyle,
                    getTextStyle(state),
                  ]}
                >
                  {chunk}
                </Text>
              </Animated.View>
            </View>
          );
        })}
      </View>
    );
  }

  // Inline text with highlighting
  return (
    <View style={[styles.inlineContainer, containerStyle]}>
      {chunks.map((chunk, index) => {
        const state = chunkStates[index] || 'pending';
        const animValue = pulseAnims[index] || new Animated.Value(0);

        return (
          <Animated.View key={index} style={[styles.inlineChunk, getChunkStyle(state, animValue)]}>
            <Text
              style={[
                styles.text,
                { fontFamily: FONTS.BarlowSemiCondensed },
                textStyle,
                getTextStyle(state),
              ]}
            >
              {chunk}
              {index < chunks.length - 1 ? ' ' : ''}
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
  inlineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
  },
  chunkWrapper: {
    flex: 1,
  },
  inlineChunk: {
    flexShrink: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
});
