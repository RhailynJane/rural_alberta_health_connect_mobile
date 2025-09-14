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

/**
 * CurvedHeader Component
 * 
 * A reusable header component with a curved bottom edge and customizable content.
 * Perfect for creating consistent, elegant headers across your app.
 * 
 * Props:
 * - title: Main title text
 * - subtitle: Optional subtitle text
 * - backgroundColor: Background color (default: light blue)
 * - textColor: Text color (default: dark gray)
 * - height: Custom height (default: responsive)
 * - children: Custom content to render instead of title/subtitle
 */
const CurvedHeader: React.FC<CurvedHeaderProps> = ({
  title,
  subtitle,
  backgroundColor = "#D1E4F1",
  textColor = "#2c3e50",
  height = 160,
  children,
}) => {
  return (
    <View style={[styles.container, { height }]}>
      {/* Background with curved bottom */}
      <View style={[styles.background, { backgroundColor }]}>
        <Svg
          width={screenWidth}
          height="40"
          viewBox={`0 0 ${screenWidth} 40`}
          style={styles.curve}
        >
          <Path
            d={`M 0 0 
                L ${screenWidth} 0
                L ${screenWidth} 20
                Q ${screenWidth * 0.5} 40 0 20
                Z`}
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
              <Text style={[styles.title, { color: textColor }]}>
                {title}
              </Text>
            )}
            {subtitle && (
              <Text style={[styles.subtitle, { color: textColor }]}>
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
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "80%",
  },
  curve: {
    position: "absolute",
    bottom: -1,
    left: 0,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
});

export default CurvedHeader;