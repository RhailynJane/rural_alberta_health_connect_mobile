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
      >
        <Defs>
          <RadialGradient id="bgGradient1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#f8f9fa" stopOpacity="0.3" />
          </RadialGradient>
          <RadialGradient id="bgGradient2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#e9ecef" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#dee2e6" stopOpacity="0.2" />
          </RadialGradient>
        </Defs>
        
        {/* Static ellipses - no animations */}
        <Ellipse
          cx={screenWidth * 0.2}
          cy={screenHeight * 0.25}
          rx={screenWidth * 0.35}
          ry={screenHeight * 0.3}
          fill="url(#bgGradient1)"
          opacity="0.6"
        />
        
        <Ellipse
          cx={screenWidth * 0.8}
          cy={screenHeight * 0.15}
          rx={screenWidth * 0.25}
          ry={screenHeight * 0.2}
          fill="url(#bgGradient2)"
          opacity="0.4"
        />
        
        <Ellipse
          cx={screenWidth * 0.4}
          cy={screenHeight * 0.7}
          rx={screenWidth * 0.3}
          ry={screenHeight * 0.25}
          fill="url(#bgGradient1)"
          opacity="0.3"
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