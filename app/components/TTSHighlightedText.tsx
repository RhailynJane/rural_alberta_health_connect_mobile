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
 * Improved readability with glow/blink effect:
 * - Generating: Dark readable text with pulsing cyan glow background
 * - Playing: Dark text with solid subtle cyan highlight
 * - Completed: Normal dark text
 * - Pending: Dimmed gray text
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
        // Smooth, gentle breathing animation for glow effect
        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnims[index], {
              toValue: 1,
              duration: 800, // Faster for more noticeable blink
              useNativeDriver: false,
            }),
            Animated.timing(pulseAnims[index], {
              toValue: 0.2,
              duration: 800,
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
          duration: 250,
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

  // Get animated background style for glow effect
  const getChunkStyle = (state: ChunkState, animValue: Animated.Value): ViewStyle => {
    const baseStyle: ViewStyle = {
      paddingHorizontal: 4,
      paddingVertical: 2,
      marginVertical: 1,
      marginHorizontal: -4,
      borderRadius: 4,
    };

    switch (state) {
      case 'generating':
        return {
          ...baseStyle,
          // Pulsing cyan glow background
          backgroundColor: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(34, 211, 238, 0.08)', 'rgba(34, 211, 238, 0.25)'],
          }) as unknown as string,
        };
      case 'playing':
        return {
          ...baseStyle,
          // Solid subtle cyan highlight
          backgroundColor: 'rgba(34, 211, 238, 0.15)',
        };
      case 'completed':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'pending':
      default:
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
    }
  };

  // High contrast, readable text colors
  const getTextStyle = (state: ChunkState): TextStyle => {
    switch (state) {
      case 'generating':
        return {
          color: '#0E7490', // Dark cyan - readable with glow
          fontWeight: '600',
        };
      case 'playing':
        return {
          color: '#0891B2', // Slightly lighter cyan - still readable
          fontWeight: '500',
        };
      case 'completed':
        return {
          color: '#374151', // Dark gray - normal text
          fontWeight: '400',
        };
      case 'pending':
      default:
        return {
          color: '#9CA3AF', // Medium gray - dimmed but readable
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
