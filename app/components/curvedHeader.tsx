import { Barlow_600SemiBold, useFonts } from "@expo-google-fonts/barlow";
import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const { width: screenWidth } = Dimensions.get("window");

interface CurvedHeaderProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  height?: number;
  children?: React.ReactNode;
}

const CurvedHeader: React.FC<CurvedHeaderProps> = ({
  title,
  subtitle,
  backgroundColor = "#D6E3F0",
  textColor = "#2c3e50",
  height = 100,
  children,
}) => {
  // Load the Barlow font
  const [fontsLoaded] = useFonts({
    BarlowSemiCondensed: Barlow_600SemiBold,
  });

  const curveHeight = 70;
  
  // Don't render until fonts are loaded
  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { height }]}>
      {/* Main background */}
      <View style={[styles.background, { backgroundColor, height: height - curveHeight }]} />
      
      {/* Curved bottom section */}
      <View style={[styles.curveContainer, { top: height - curveHeight }]}>
        <Svg
          width={screenWidth}
          height={curveHeight}
          viewBox={`0 0 ${screenWidth} ${curveHeight}`}
        >
          <Path
            d={`M0,0 
               L${screenWidth},0 
               L${screenWidth},${curveHeight} 
               C${screenWidth},${curveHeight} ${screenWidth * 0.7},${curveHeight * 0.3} ${screenWidth * 0.5},${curveHeight * 0.5} 
               C${screenWidth * 0.3},${curveHeight * 0.7} 0,${curveHeight} 0,${curveHeight}`}
            fill={backgroundColor}
          />
        </Svg>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children ? (
          children
        ) : (
          <>
            {title && (
              <Text style={[styles.title, { color: textColor, fontFamily: 'BarlowSemiCondensed' }]}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={[styles.subtitle, { color: textColor, fontFamily: 'BarlowSemiCondensed' }]}>
                {subtitle}
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    marginBottom: 20,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  curveContainer: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  content: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    marginBottom:17,
    lineHeight: 30,
    letterSpacing: 0.5, 
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 24,
    letterSpacing: 0.3,
  },
});

export default CurvedHeader;