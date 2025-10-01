import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface CurvedBackgroundProps {
  children?: React.ReactNode;
  style?: object; 
}

/**
 * AnimatedCurvedBackground Component
 * Renders a background with organic oval shapes using radial gradients with smooth animations.
 */
const CurvedBackground: React.FC<CurvedBackgroundProps> = ({
  children,
  style,
}) => {
  // Animation values for each oval
  const oval1Animation = useRef(new Animated.Value(0)).current;
  const oval2Animation = useRef(new Animated.Value(0)).current;
  const oval3Animation = useRef(new Animated.Value(0)).current;
  const oval4Animation = useRef(new Animated.Value(0)).current;
  const oval5Animation = useRef(new Animated.Value(0)).current;
  const oval6Animation = useRef(new Animated.Value(0)).current;
  const oval7Animation = useRef(new Animated.Value(0)).current;
  const oval8Animation = useRef(new Animated.Value(0)).current;

  // Scale animations for breathing effect
  const scaleAnimation1 = useRef(new Animated.Value(1)).current;
  const scaleAnimation2 = useRef(new Animated.Value(1)).current;
  const scaleAnimation3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Create looping animations for movement
    const createLoopAnimation = (animatedValue: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: duration,
            useNativeDriver: false,
          }),
        ])
      );
    };

    // Create breathing scale animations
    const createScaleAnimation = (animatedValue: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1.1,
            duration: duration,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0.9,
            duration: duration,
            useNativeDriver: false,
          }),
        ])
      );
    };

    // Start all animations with different durations for organic movement
    const animations = [
      createLoopAnimation(oval1Animation, 15000), // 15 seconds
      createLoopAnimation(oval2Animation, 12000), // 12 seconds
      createLoopAnimation(oval3Animation, 18000), // 18 seconds
      createLoopAnimation(oval4Animation, 14000), // 14 seconds
      createLoopAnimation(oval5Animation, 16000), // 16 seconds
      createLoopAnimation(oval6Animation, 13000), // 13 seconds
      createLoopAnimation(oval7Animation, 20000), // 20 seconds
      createLoopAnimation(oval8Animation, 11000), // 11 seconds
      createScaleAnimation(scaleAnimation1, 8000), // 8 seconds
      createScaleAnimation(scaleAnimation2, 10000), // 10 seconds
      createScaleAnimation(scaleAnimation3, 12000), // 12 seconds
    ];

    animations.forEach(animation => animation.start());

    return () => {
      animations.forEach(animation => animation.stop());
    };
  }, []);

  // Interpolate values for smooth movement
  const oval1X = oval1Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.15, screenWidth * 0.25],
  });
  
  const oval1Y = oval1Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * 0.2, screenHeight * 0.3],
  });

  const oval2X = oval2Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.75, screenWidth * 0.85],
  });

  const oval2Y = oval2Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * 0.1, screenHeight * 0.2],
  });

  const oval3X = oval3Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth * 0.15, -screenWidth * 0.05],
  });

  const oval3Y = oval3Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * 0.45, screenHeight * 0.55],
  });

  const oval4X = oval4Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.35, screenWidth * 0.45],
  });

  const oval4Y = oval4Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * 0.7, screenHeight * 0.8],
  });

  const oval5X = oval5Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.8, screenWidth * 0.9],
  });

  const oval5Y = oval5Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * 0.55, screenHeight * 0.65],
  });

  const oval6X = oval6Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 1.05, screenWidth * 1.15],
  });

  const oval6Y = oval6Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * 0.85, screenHeight * 0.95],
  });

  const oval7X = oval7Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.55, screenWidth * 0.65],
  });

  const oval7Y = oval7Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * 0.35, screenHeight * 0.45],
  });

  const oval8X = oval8Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenWidth * 0.45, screenWidth * 0.55],
  });

  const oval8Y = oval8Animation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight * 0.05, screenHeight * 0.15],
  });

  return (
    <View style={[styles.container, style]}>
      <Svg
        width={screenWidth}
        height={screenHeight}
        viewBox={`0 0 ${screenWidth} ${screenHeight}`}
        style={StyleSheet.absoluteFillObject}
      >
        <Defs>
          {/* Radial gradient for oval shapes - light to transparent */}
          <RadialGradient id="ovalGradient1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <Stop offset="70%" stopColor="#f8f9fa" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#e9ecef" stopOpacity="0.5" />
          </RadialGradient>
          
          {/* Radial gradient for darker oval shapes */}
          <RadialGradient id="ovalGradient2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#e9ecef" stopOpacity="0.8" />
            <Stop offset="70%" stopColor="#dee2e6" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#ced4da" stopOpacity="0.8" />
          </RadialGradient>
          
          {/* Subtle radial gradient for background ovals */}
          <RadialGradient id="ovalGradient3" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#f1f3f4" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </RadialGradient>
        </Defs>
        <AnimatedEllipse
          cx={oval1X}
          cy={oval1Y}
          rx={screenWidth * 0.35}
          ry={screenHeight * 0.3}
          fill="url(#ovalGradient1)"
          opacity="1"
          scale={scaleAnimation1}
        />

        <AnimatedEllipse
          cx={oval2X}
          cy={oval2Y}
          rx={screenWidth * 0.25}
          ry={screenHeight * 0.2}
          fill="url(#ovalGradient2)"
          opacity="1"
        />

        <AnimatedEllipse
          cx={oval3X}
          cy={oval3Y}
          rx={screenWidth * 0.4}
          ry={screenHeight * 0.35}
          fill="url(#ovalGradient1)"
          opacity="1"
          scale={scaleAnimation2}
        />

        <AnimatedEllipse
          cx={oval4X}
          cy={oval4Y}
          rx={screenWidth * 0.3}
          ry={screenHeight * 0.25}
          fill="url(#ovalGradient3)"
          opacity="0.8"
        />

        <AnimatedEllipse
          cx={oval5X}
          cy={oval5Y}
          rx={screenWidth * 0.2}
          ry={screenHeight * 0.15}
          fill="url(#ovalGradient2)"
          opacity="0.4"
        />

        <AnimatedEllipse
          cx={oval6X}
          cy={oval6Y}
          rx={screenWidth * 0.35}
          ry={screenHeight * 0.3}
          fill="url(#ovalGradient1)"
          opacity="0.6"
        />

        <Animated.View>
          <AnimatedEllipse
            cx={oval7X}
            cy={oval7Y}
            rx={screenWidth * 0.8}
            ry={screenHeight * 0.6}
            fill="url(#ovalGradient3)"
            opacity="0.2"
            scale={scaleAnimation3}
          />
        </Animated.View>

        <AnimatedEllipse
          cx={oval8X}
          cy={oval8Y}
          rx={screenWidth * 0.15}
          ry={screenHeight * 0.1}
          fill="url(#ovalGradient2)"
          opacity="0.5"
        />
      </Svg>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#d4cdcdff",
  },
});

export default CurvedBackground;