import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextStyle,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
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
}

/**
 * TTSHighlightedText - Visual feedback for TTS chunk generation/playback
 * Uses react-native-reanimated for reliable pulsing animation
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
  // Check if any chunk is playing
  const isAnyPlaying = chunkStates.some(s => s === 'playing');

  // Get visual state for a chunk
  const getVisualState = (state: ChunkState): ChunkState => {
    if (state === 'playing') return 'playing';
    if (state === 'completed') return 'completed';
    if (state === 'generating') {
      return isAnyPlaying ? 'pending' : 'generating';
    }
    return 'pending';
  };

  if (!isActive || chunks.length === 0) {
    return null;
  }

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

        return (
          <ChunkItem
            key={index}
            chunk={chunk}
            visualState={visualState}
            textStyle={textStyle}
            asBulletList={asBulletList}
            bulletChar={bulletChar}
            parentPadding={parentPadding}
            getTextStyleFn={getTextStyle}
          />
        );
      })}
    </View>
  );
}

// Separate component for each chunk to properly use hooks
interface ChunkItemProps {
  chunk: string;
  visualState: ChunkState;
  textStyle?: TextStyle;
  asBulletList: boolean;
  bulletChar: string;
  parentPadding: number;
  getTextStyleFn: (state: ChunkState) => TextStyle;
}

function ChunkItem({
  chunk,
  visualState,
  textStyle,
  asBulletList,
  bulletChar,
  parentPadding,
  getTextStyleFn,
}: ChunkItemProps) {
  const opacity = useSharedValue(0);

  // Get background color based on state (lighter colors)
  const bgColor =
    visualState === 'generating' ? 'rgba(34, 211, 238, 0.3)' :
    visualState === 'playing' ? 'rgba(34, 211, 238, 0.2)' :
    'transparent';

  useEffect(() => {
    // Cancel any existing animation
    cancelAnimation(opacity);

    if (visualState === 'generating') {
      console.log('[TTS-Highlight] Starting blink animation');
      // Start with visible background
      opacity.value = 1;
      // Pulsing animation: 1 -> 0.2 -> 1 repeated (600ms per direction for gentle pulse)
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Infinite repeat
        false // Don't reverse
      );
    } else if (visualState === 'playing') {
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }

    return () => {
      cancelAnimation(opacity);
    };
  }, [visualState]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const chunkTextStyle = getTextStyleFn(visualState);

  const chunkContent = asBulletList ? (
    <View style={styles.bulletItem}>
      <Text style={[styles.bullet, chunkTextStyle]}>{bulletChar}</Text>
      <Text
        style={[
          styles.text,
          { fontFamily: FONTS.BarlowSemiCondensed },
          textStyle,
          chunkTextStyle,
        ]}
      >
        {chunk}
      </Text>
    </View>
  ) : (
    <Text
      style={[
        styles.text,
        { fontFamily: FONTS.BarlowSemiCondensed },
        textStyle,
        chunkTextStyle,
      ]}
    >
      {chunk}
    </Text>
  );

  return (
    <View
      style={[
        styles.chunkContainer,
        {
          marginHorizontal: -parentPadding,
          paddingHorizontal: parentPadding,
        },
      ]}
    >
      {/* Animated background overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: bgColor },
          animatedStyle,
        ]}
      />
      {/* Content */}
      {chunkContent}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  chunkContainer: {
    position: 'relative',
    paddingVertical: 10,
    marginBottom: 8,
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
