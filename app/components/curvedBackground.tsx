import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface CurvedBackgroundProps {
  children?: React.ReactNode;
  style?: object; 
}

/**
 * Static Background Component
 * Keeps visual design but removes all animations
 */
const CurvedBackground: React.FC<CurvedBackgroundProps> = ({
  children,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Svg
        width={screenWidth}
        height={screenHeight}
        viewBox={`0 0 ${screenWidth} ${screenHeight}`}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="bgGradient1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#e9eef8" stopOpacity="0.5" />
          </RadialGradient>
          <RadialGradient id="bgGradient2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#d7e3ff" stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#c7d5f1" stopOpacity="0.3" />
          </RadialGradient>
        </Defs>
        {/* Static ellipses - minimal, soft tint */}
        <Ellipse
          cx={screenWidth * 0.18}
          cy={screenHeight * 0.2}
          rx={screenWidth * 0.32}
          ry={screenHeight * 0.26}
          fill="url(#bgGradient1)"
          opacity="0.72"
        />

        <Ellipse
          cx={screenWidth * 0.78}
          cy={screenHeight * 0.18}
          rx={screenWidth * 0.22}
          ry={screenHeight * 0.18}
          fill="url(#bgGradient2)"
          opacity="0.48"
        />
      </Svg>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef2f8",
  },
});

export default CurvedBackground;