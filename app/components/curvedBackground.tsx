import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface CurvedBackgroundProps {
  children?: React.ReactNode;
  style?: object;
}

/**
 * CurvedBackground Component
 * Renders a background with organic oval shapes using radial gradients.
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
      >
        <Defs>
          {/* Radial gradient for oval shapes - light to transparent */}
          <RadialGradient id="ovalGradient1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <Stop offset="70%" stopColor="#f8f9fa" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#e9ecef" stopOpacity="0.1" />
          </RadialGradient>
          
          {/* Radial gradient for darker oval shapes */}
          <RadialGradient id="ovalGradient2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#e9ecef" stopOpacity="0.6" />
            <Stop offset="70%" stopColor="#dee2e6" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#ced4da" stopOpacity="0.1" />
          </RadialGradient>
          
          {/* Subtle radial gradient for background ovals */}
          <RadialGradient id="ovalGradient3" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#f1f3f4" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </RadialGradient>
        </Defs>

        {/* Large oval - upper left area */}
        <Ellipse
          cx={screenWidth * 0.2}
          cy={screenHeight * 0.25}
          rx={screenWidth * 0.35}
          ry={screenHeight * 0.3}
          fill="url(#ovalGradient1)"
          opacity="0.7"
        />

        {/* Medium oval - upper right */}
        <Ellipse
          cx={screenWidth * 0.8}
          cy={screenHeight * 0.15}
          rx={screenWidth * 0.25}
          ry={screenHeight * 0.2}
          fill="url(#ovalGradient2)"
          opacity="0.6"
        />

        {/* Large oval - center left, partially off screen */}
        <Ellipse
          cx={-screenWidth * 0.1}
          cy={screenHeight * 0.5}
          rx={screenWidth * 0.4}
          ry={screenHeight * 0.35}
          fill="url(#ovalGradient1)"
          opacity="0.5"
        />

        {/* Medium oval - lower center */}
        <Ellipse
          cx={screenWidth * 0.4}
          cy={screenHeight * 0.75}
          rx={screenWidth * 0.3}
          ry={screenHeight * 0.25}
          fill="url(#ovalGradient3)"
          opacity="0.8"
        />

        {/* Small oval - center right */}
        <Ellipse
          cx={screenWidth * 0.85}
          cy={screenHeight * 0.6}
          rx={screenWidth * 0.2}
          ry={screenHeight * 0.15}
          fill="url(#ovalGradient2)"
          opacity="0.4"
        />

        {/* Large oval - bottom right, extending beyond screen */}
        <Ellipse
          cx={screenWidth * 1.1}
          cy={screenHeight * 0.9}
          rx={screenWidth * 0.35}
          ry={screenHeight * 0.3}
          fill="url(#ovalGradient1)"
          opacity="0.6"
        />

        {/* Background oval - very large, subtle */}
        <Ellipse
          cx={screenWidth * 0.6}
          cy={screenHeight * 0.4}
          rx={screenWidth * 0.8}
          ry={screenHeight * 0.6}
          fill="url(#ovalGradient3)"
          opacity="0.2"
        />

        {/* Small accent oval - upper center */}
        <Ellipse
          cx={screenWidth * 0.5}
          cy={screenHeight * 0.1}
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
    backgroundColor: "#f5f5f5",
  },
});

export default CurvedBackground;

