import { Barlow_600SemiBold, useFonts } from "@expo-google-fonts/barlow";
import React from "react";
import { Dimensions, Image, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const { width: screenWidth } = Dimensions.get("window");

interface CurvedHeaderProps {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  height?: number;
  children?: React.ReactNode;
  showLogo?: boolean;
  screenType?: 'onboarding' | 'signin'; // New prop to determine screen type
}

const CurvedHeader: React.FC<CurvedHeaderProps> = ({
  title,
  subtitle,
  backgroundColor = "#D6E3F0",
  textColor = "#2c3e50",
  height = 100,
  children,
  showLogo = false,
  screenType = 'onboarding', // Default to onboarding
}) => {
  const [fontsLoaded] = useFonts({
    BarlowSemiCondensed: Barlow_600SemiBold,
  });

  const curveHeight = 70;
  
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
          <View style={[
            styles.headerContent, 
            screenType === 'signin' ? styles.signinLayout : styles.onboardingLayout
          ]}>
            {showLogo && (
              <Image 
                source={require("../../assets/images/logo.png")} 
                style={[
                  styles.logo,
                  screenType === 'signin' ? styles.signinLogo : styles.onboardingLogo
                ]}
                resizeMode="contain"
              />
            )}
            <View style={[
              styles.textContainer,
              screenType === 'signin' ? styles.signinTextContainer : styles.onboardingTextContainer
            ]}>
              {title && (
                <Text 
                  style={[
                    styles.title, 
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
                  styles.subtitle, 
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
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Onboarding layout (multi-line title, centered)
  onboardingLayout: {
    justifyContent: "center",
  },
  onboardingLogo: {
    width: 90,
    height: 90,
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
  width: 90,
  height: 90,
  marginRight: 10, 
  justifyContent: "flex-start",
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
logo: {
  width: 90,
  height: 90,
  marginRight: 20,
},
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 28,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "left",
    lineHeight: 22,
    letterSpacing: 0.3,
  },
});

export default CurvedHeader;