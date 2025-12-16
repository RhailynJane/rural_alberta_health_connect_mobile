import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Rive, { Fit, RiveRef } from 'rive-react-native';
import { FONTS } from '../constants/constants';
import type { PipelineResult } from '../../utils/yolo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageLayout {
  containerWidth: number;
  containerHeight: number;
  imageWidth: number;
  imageHeight: number;
}

// Calculate where the image renders within container using "contain" mode
function calculateContainLayout(layout: ImageLayout) {
  const { containerWidth, containerHeight, imageWidth, imageHeight } = layout;

  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
    return null;
  }

  const containerAspect = containerWidth / containerHeight;
  const imageAspect = imageWidth / imageHeight;

  let renderedWidth: number;
  let renderedHeight: number;

  if (imageAspect > containerAspect) {
    // Image is wider than container - fit to width
    renderedWidth = containerWidth;
    renderedHeight = containerWidth / imageAspect;
  } else {
    // Image is taller than container - fit to height
    renderedHeight = containerHeight;
    renderedWidth = containerHeight * imageAspect;
  }

  const offsetX = (containerWidth - renderedWidth) / 2;
  const offsetY = (containerHeight - renderedHeight) / 2;

  return {
    renderedWidth,
    renderedHeight,
    offsetX,
    offsetY,
    scaleX: renderedWidth / imageWidth,
    scaleY: renderedHeight / imageHeight,
  };
}

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

  // Layout tracking for proper bounding box positioning
  const [containerLayout, setContainerLayout] = useState({ width: 0, height: 0 });
  const [imageDimensions, setImageDimensions] = useState<Record<number, { width: number; height: number }>>({});

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

  // Fetch image dimensions for all images
  useEffect(() => {
    if (visible && images.length > 0) {
      images.forEach((uri, index) => {
        Image.getSize(
          uri,
          (width, height) => {
            setImageDimensions((prev) => ({
              ...prev,
              [index]: { width, height },
            }));
          },
          (error) => {
            console.warn(`Failed to get image size for index ${index}:`, error);
          }
        );
      });
    }
  }, [visible, images]);

  // Handle container layout changes
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerLayout({ width, height });
  }, []);

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

  // Calculate contain layout for current image
  const currentImageDims = imageDimensions[currentIndex];
  const containLayout = currentImageDims
    ? calculateContainLayout({
        containerWidth: containerLayout.width,
        containerHeight: containerLayout.height,
        imageWidth: currentImageDims.width,
        imageHeight: currentImageDims.height,
      })
    : null;

  return (
    <Animated.View style={[styles.container, { opacity: overlayOpacity }]}>
      {/* Image container - fills available space */}
      <Animated.View
        style={[styles.imageContainer, { opacity: imageOpacity }]}
        onLayout={handleContainerLayout}
      >
        {/* Blurred background fill for portrait/narrow images */}
        <Image
          source={{ uri: currentImage }}
          style={styles.blurredBackground}
          resizeMode="cover"
          blurRadius={20}
        />
        <View style={styles.blurOverlay} />
        {/* The actual image with contain mode for proper bounding box alignment */}
        <Image
          source={{ uri: currentImage }}
          style={styles.image}
          resizeMode="contain"
        />

        {/* Floating progress indicator pill */}
        <View style={styles.progressPill}>
          <Text style={[styles.progressText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
            Analyzing image {currentIndex + 1} of {images.length}
          </Text>
          {images.length > 1 && (
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
          )}
        </View>

        {/* Detection boxes overlay */}
        {showDetections && containLayout && (
          <Animated.View style={[styles.detectionsContainer, { opacity: detectionsOpacity }]}>
            {detections.map((detection, idx) => {
              // Calculate proper screen coordinates based on contain layout
              const { offsetX, offsetY, scaleX, scaleY } = containLayout;

              // Detection coords are in original image space, transform to screen space
              const screenX1 = offsetX + detection.x1 * scaleX;
              const screenY1 = offsetY + detection.y1 * scaleY;
              const screenWidth = (detection.x2 - detection.x1) * scaleX;
              const screenHeight = (detection.y2 - detection.y1) * scaleY;

              return (
                <View
                  key={idx}
                  style={[
                    styles.detectionBox,
                    {
                      borderColor: getClassColor(detection.className),
                      position: 'absolute',
                      left: screenX1,
                      top: screenY1,
                      width: screenWidth,
                      height: screenHeight,
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
  progressPill: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    zIndex: 10,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  progressDotActive: {
    backgroundColor: '#2A7DE1',
    width: 18,
  },
  progressDotComplete: {
    backgroundColor: '#34C759',
  },
  imageContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurredBackground: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.1 }],
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  image: {
    width: '100%',
    height: '100%',
    zIndex: 1,
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
