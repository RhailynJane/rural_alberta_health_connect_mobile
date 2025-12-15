import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Rive, { Fit, RiveRef } from 'rive-react-native';
import { FONTS } from '../constants/constants';
import type { PipelineResult } from '../../utils/yolo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScanningOverlayProps {
  visible: boolean;
  images: string[];
  yoloResult: PipelineResult | null;
  isYoloComplete: boolean;
  onComplete: () => void;
}

interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  className: string;
  confidence: number;
}

// Minimum loops before we can proceed (ensures user sees the scan effect)
const MIN_LOOPS_REQUIRED = 1;
// Delay after showing detections before moving to next image (ms)
const REVEAL_DELAY = 800;
// Delay between images during transition (ms)
const TRANSITION_DELAY = 300;
// Fallback: assume one loop takes approximately this many ms
const ESTIMATED_LOOP_DURATION_MS = 2000;

export default function ScanningOverlay({
  visible,
  images,
  yoloResult,
  isYoloComplete,
  onComplete,
}: ScanningOverlayProps) {
  const riveRef = useRef<RiveRef>(null);

  // Current image being scanned
  const [currentIndex, setCurrentIndex] = useState(0);
  // How many loops the animation has completed for current image
  const [loopCount, setLoopCount] = useState(0);
  // Whether we're showing detection boxes
  const [showDetections, setShowDetections] = useState(false);
  // Phase: 'scanning' | 'revealing' | 'transitioning' | 'complete'
  const [phase, setPhase] = useState<'scanning' | 'revealing' | 'transitioning' | 'complete'>('scanning');

  // Animation values
  const imageOpacity = useRef(new Animated.Value(1)).current;
  const detectionsOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  // Fallback timer ref
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when overlay becomes visible
  useEffect(() => {
    if (visible) {
      console.log('🎬 [ScanningOverlay] Overlay visible, resetting state');
      setCurrentIndex(0);
      setLoopCount(0);
      setShowDetections(false);
      setPhase('scanning');
      imageOpacity.setValue(1);
      detectionsOpacity.setValue(0);
      overlayOpacity.setValue(1);
    }

    return () => {
      // Cleanup fallback timer
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [visible, imageOpacity, detectionsOpacity, overlayOpacity]);

  // Fallback timer: if onLoopEnd doesn't fire, proceed after estimated duration
  useEffect(() => {
    if (phase === 'scanning' && visible) {
      console.log(`⏱️ [ScanningOverlay] Starting fallback timer for ${ESTIMATED_LOOP_DURATION_MS}ms`);

      fallbackTimerRef.current = setTimeout(() => {
        console.log('⏱️ [ScanningOverlay] Fallback timer fired - forcing loop count');
        setLoopCount((prev) => {
          if (prev < MIN_LOOPS_REQUIRED) {
            return MIN_LOOPS_REQUIRED;
          }
          return prev;
        });
      }, ESTIMATED_LOOP_DURATION_MS);

      return () => {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
        }
      };
    }
  }, [phase, visible, currentIndex]);

  // Handle loop completion from Rive
  const handleLoopEnd = useCallback(() => {
    console.log(`🔄 [ScanningOverlay] onLoopEnd fired!`);
    setLoopCount((prev) => {
      const newCount = prev + 1;
      console.log(`🔄 [ScanningOverlay] Loop count updated: ${newCount}`);
      return newCount;
    });
  }, []);

  // Also try onStop and onStateChange for debugging
  const handleStateChange = useCallback((stateMachineName: string, stateName: string) => {
    console.log(`🔀 [ScanningOverlay] State changed: ${stateMachineName} -> ${stateName}`);
  }, []);

  const handlePlay = useCallback(() => {
    console.log('▶️ [ScanningOverlay] Animation started playing');
  }, []);

  const handleStop = useCallback(() => {
    console.log('⏹️ [ScanningOverlay] Animation stopped');
  }, []);

  // Check if we can proceed to reveal phase
  useEffect(() => {
    if (phase !== 'scanning') return;

    const hasMinLoops = loopCount >= MIN_LOOPS_REQUIRED;
    const currentImageYoloReady = isYoloComplete && yoloResult !== null;

    console.log(`📊 [ScanningOverlay] Check proceed:`, {
      loopCount,
      hasMinLoops,
      isYoloComplete,
      hasYoloResult: yoloResult !== null,
      currentImageYoloReady,
      phase,
      currentIndex,
    });

    if (hasMinLoops && currentImageYoloReady) {
      console.log('✅ [ScanningOverlay] Conditions met! Proceeding to reveal phase');
      // Proceed to reveal phase
      setPhase('revealing');
      setShowDetections(true);

      // Fade in detection boxes
      Animated.timing(detectionsOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // After reveal delay, transition to next image or complete
      setTimeout(() => {
        if (currentIndex < images.length - 1) {
          transitionToNextImage();
        } else {
          completeScanning();
        }
      }, REVEAL_DELAY);
    }
  }, [loopCount, isYoloComplete, yoloResult, phase, currentIndex, images.length, detectionsOpacity]);

  // Transition to next image
  const transitionToNextImage = () => {
    setPhase('transitioning');

    // Fade out current image
    Animated.timing(imageOpacity, {
      toValue: 0,
      duration: TRANSITION_DELAY,
      useNativeDriver: true,
    }).start(() => {
      // Reset for next image
      setCurrentIndex((prev) => prev + 1);
      setLoopCount(0);
      setShowDetections(false);
      detectionsOpacity.setValue(0);

      // Fade in next image
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: TRANSITION_DELAY,
        useNativeDriver: true,
      }).start(() => {
        setPhase('scanning');
      });
    });
  };

  // Complete the scanning process
  const completeScanning = () => {
    setPhase('complete');

    // Fade out the entire overlay
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  };

  // Get detection boxes for current image
  const getCurrentDetections = (): DetectionBox[] => {
    if (!yoloResult || !yoloResult.results[currentIndex]) return [];

    const result = yoloResult.results[currentIndex];
    return result.detections.map((d) => ({
      x1: d.boxCorners.x1,
      y1: d.boxCorners.y1,
      x2: d.boxCorners.x2,
      y2: d.boxCorners.y2,
      className: d.className,
      confidence: d.confidence,
    }));
  };

  // Get color for detection class
  const getClassColor = (className: string): string => {
    const colorMap: Record<string, string> = {
      '1st degree burn': '#FF9500',
      '2nd degree burn': '#FF6B00',
      '3rd degree burn': '#FF3B30',
      'Rashes': '#FF2D92',
      'abrasion': '#34C759',
      'bruise': '#AF52DE',
      'cut': '#30D158',
      'frostbite': '#5AC8FA',
    };
    return colorMap[className] || '#2A7DE1';
  };

  if (!visible || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const detections = getCurrentDetections();
  const detectionCount = detections.length;

  return (
    <Animated.View style={[styles.container, { opacity: overlayOpacity }]}>
      {/* Progress indicator at top */}
      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          Analyzing image {currentIndex + 1} of {images.length}
        </Text>
        <View style={styles.progressDots}>
          {images.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.progressDot,
                idx === currentIndex && styles.progressDotActive,
                idx < currentIndex && styles.progressDotComplete,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Image container - fills available space */}
      <Animated.View style={[styles.imageContainer, { opacity: imageOpacity }]}>
        {/* The actual image with cover mode */}
        <Image
          source={{ uri: currentImage }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Detection boxes overlay */}
        {showDetections && (
          <Animated.View style={[styles.detectionsContainer, { opacity: detectionsOpacity }]}>
            {detections.map((detection, idx) => {
              // For now, use simplified positioning
              // In production, you'd calculate based on actual image dimensions
              return (
                <View
                  key={idx}
                  style={[
                    styles.detectionBox,
                    {
                      borderColor: getClassColor(detection.className),
                      // Simplified positioning - will need adjustment
                      position: 'absolute',
                      left: `${(detection.x1 / 640) * 100}%`,
                      top: `${(detection.y1 / 640) * 100}%`,
                      width: `${((detection.x2 - detection.x1) / 640) * 100}%`,
                      height: `${((detection.y2 - detection.y1) / 640) * 100}%`,
                    },
                  ]}
                >
                  <View style={[styles.detectionLabel, { backgroundColor: getClassColor(detection.className) }]}>
                    <Text style={styles.detectionLabelText}>
                      {detection.className}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* Rive scan animation overlay */}
        {phase === 'scanning' && (
          <View style={styles.riveContainer}>
            <Rive
              ref={riveRef}
              source={require('../../assets/rive/scanner.riv')}
              stateMachineName="State Machine 1"
              artboardName="scan_board"
              fit={Fit.Cover}
              style={styles.riveAnimation}
              onLoopEnd={handleLoopEnd}
              onPlay={handlePlay}
              onStop={handleStop}
              onStateChanged={handleStateChange}
            />
          </View>
        )}
      </Animated.View>

      {/* Status text at bottom */}
      <View style={styles.statusContainer}>
        {phase === 'scanning' && (
          <Text style={[styles.statusText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
            Scanning for affected areas...
          </Text>
        )}
        {phase === 'revealing' && detectionCount > 0 && (
          <Text style={[styles.statusText, styles.statusSuccess, { fontFamily: FONTS.BarlowSemiCondensed }]}>
            {detectionCount} {detectionCount === 1 ? 'area' : 'areas'} detected
          </Text>
        )}
        {phase === 'revealing' && detectionCount === 0 && (
          <Text style={[styles.statusText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
            No injuries detected
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  progressContainer: {
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#2A7DE1',
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: '#34C759',
  },
  imageContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  detectionsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  detectionBox: {
    borderWidth: 2,
    borderRadius: 4,
  },
  detectionLabel: {
    position: 'absolute',
    top: -20,
    left: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  detectionLabelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  riveContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  riveAnimation: {
    width: '100%',
    height: '100%',
  },
  statusContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
  },
  statusSuccess: {
    color: '#34C759',
  },
});
