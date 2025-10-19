import { Barlow_600SemiBold, useFonts } from "@expo-google-fonts/barlow";
import React from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const { width: screenWidth } = Dimensions.get("window");

// Constants for better maintainability
const CURVE_HEIGHT = 70;
const LOGO_SIZE_ONBOARDING = 80;
const LOGO_SIZE_SIGNIN = 80;

interface CurvedHeaderProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  height?: number;
  children?: React.ReactNode;
  showLogo?: boolean;
  screenType?: 'onboarding' | 'signin'; // New prop to determine screen type
  bottomSpacing?: number; // controls margin below header container
}

const CurvedHeader: React.FC<CurvedHeaderProps> = ({
  title,
  subtitle,
  backgroundColor = "#B8C6D1",
  textColor = "#2c3e50",
  height = 100,
  children,
  showLogo = false,
  screenType = 'onboarding', // Default to onboarding
  bottomSpacing = 20,
}) => {
  const [fontsLoaded] = useFonts({
    BarlowSemiCondensed: Barlow_600SemiBold,
  });
  
  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { height, marginBottom: bottomSpacing }]}>
      {/* Main background - extended slightly to ensure no gap */}
      <View style={[styles.background, { backgroundColor, height: height - CURVE_HEIGHT + 2 }]} />
      {/* Curved bottom section */}
<View style={[styles.curveContainer, { top: height - CURVE_HEIGHT }]}>
  <Svg
    width={screenWidth}
    height={CURVE_HEIGHT}
    viewBox={`0 0 ${screenWidth} ${CURVE_HEIGHT}`}
  >
    <Path
      d={`M0,0 
         L${screenWidth},0
         L${screenWidth},${CURVE_HEIGHT * 0.3}
         Q${screenWidth * 0.75},${CURVE_HEIGHT * 0.8} ${screenWidth * 0.5},${CURVE_HEIGHT * 0.3}
         Q${screenWidth * 0.25},${CURVE_HEIGHT * -0.2} 0,${CURVE_HEIGHT * 0.3}
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
          <View style={[
            styles.headerContent, 
            screenType === 'signin' ? styles.signinLayout : styles.onboardingLayout
          ]}>
            {showLogo && (
              <Image 
                source={require("../../assets/images/logo-no-name.png")} 
                style={[
                  screenType === 'signin' ? styles.signinLogo : styles.onboardingLogo
                ]}
                resizeMode="contain"
              />
            )}
            <View style={[
              screenType === 'signin' ? styles.signinTextContainer : styles.onboardingTextContainer
            ]}>
              {title && (
                <Text 
                  style={[
                    { color: textColor, fontFamily: 'BarlowSemiCondensed' },
                    screenType === 'signin' ? styles.signinTitle : styles.onboardingTitle
                  ]}
                  numberOfLines={screenType === 'signin' ? 1 : 2} 
                  adjustsFontSizeToFit={true} 
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text style={[
                  { color: textColor, fontFamily: 'BarlowSemiCondensed' },
                  screenType === 'signin' ? styles.signinSubtitle : styles.onboardingSubtitle
                ]}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
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
    bottom: CURVE_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerContent: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  },
  onboardingLayout: {
  justifyContent: "center",
  alignItems: "center",
  },
  onboardingLogo: {
    width: LOGO_SIZE_ONBOARDING,
    height: LOGO_SIZE_ONBOARDING,
    marginRight: 20,
  },
  onboardingTextContainer: {
    flex: 1,
  },
  onboardingTitle: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  onboardingSubtitle: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  // Signin layout (single line title, left-aligned with logo)
  signinLayout: {
    justifyContent: "flex-start",
    alignItems: "center",
  },
  signinLogo: {
    width: LOGO_SIZE_SIGNIN,
    height: LOGO_SIZE_SIGNIN,
    marginRight: 10,
  },
  signinTextContainer: {
    flex: 1,
    marginLeft: 1,
  },
  signinTitle: {
    fontSize: 22,
    textAlign: "left",
    marginBottom: 4,
    lineHeight: 26,
    letterSpacing: 0.5,
  },
  signinSubtitle: {
    fontSize: 18,
    textAlign: "left",
    lineHeight: 22,
    letterSpacing: 0.3,
  },
});

export default CurvedHeader;