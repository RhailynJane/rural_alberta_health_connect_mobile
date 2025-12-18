import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FONTS } from "../app/constants/constants";

const isColorLight = (hex: string) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  // Perceived luminance
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 186;
};

const onboardingData = [
  {
    image: require("../assets/images/onboarding-1.gif"),
    title: "AI Health, Instantly",
    description: "Get smart guidance in seconds, tuned for rural care.",
    color: "#101c40",
    iconColor: "#2A7DE1",
  },
  {
    image: require("../assets/images/onboarding-2.jpg"),
    title: "Care for Rural Alberta",
    description: "Find clinics, emergency contacts, and support built for remote communities.",
    color: "#ffffff",
    iconColor: "#E91E63",
  },
  {
    image: require("../assets/images/onboarding-3.gif"),
    title: "Privacy as Standard",
    description: "Your health data stays encrypted and in your control—always.",
    color: "#ffffff",
    iconColor: "#4CAF50",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push("/auth/signin");
    }
  };

  const handleSkip = () => {
    router.push("/auth/signin");
  };

  const current = onboardingData[currentIndex];
  const isLightBg = isColorLight(current.color);
  const textColors = {
    title: isLightBg ? "#0F1B2E" : "#E8EDFF",
    description: isLightBg ? "#2F3D50" : "#D7E3FF",
    disclaimer: isLightBg ? "#5A6B7E" : "#AFC2E6",
    skip: isLightBg ? "#4A5565" : "#DDE6FF",
    activeDot: isLightBg ? "#2A7DE1" : "#9CC5FF",
    inactiveDot: isLightBg ? "#BFC9D6" : "#4B5470",
    iconCircle: isLightBg ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.08)",
  };
  const buttonColors = {
    background: isLightBg ? "#0A0A0A" : "#FFFFFF",
    arrowColor: isLightBg ? "#FFFFFF" : "#0A0A0A",
    arcColor: isLightBg ? "#0A0A0A" : "#FFFFFF",
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: current.color }]}>
      <View style={[styles.container, { backgroundColor: current.color }]}>
        {/* Skip Button */}
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={[styles.skipText, { fontFamily: FONTS.BarlowSemiCondensed, color: textColors.skip }]}>
            Skip
          </Text>
        </TouchableOpacity>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          {/* Icon Circle */}
          <View style={[styles.iconCircle, { backgroundColor: textColors.iconCircle }]}>
            <Image 
              source={current.image} 
              style={styles.onboardingImage}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { fontFamily: FONTS.BarlowSemiCondensed, color: textColors.title }]}>
            {current.title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { fontFamily: FONTS.BarlowSemiCondensed, color: textColors.description }]}>
            {current.description}
          </Text>
        </View>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex
                  ? [styles.activeDot, { backgroundColor: textColors.activeDot, width: 24 }]
                  : [styles.inactiveDot, { backgroundColor: textColors.inactiveDot }],
              ]}
            />
          ))}
        </View>

        {/* Minimal Arrow CTA with arc accent */}
        <View style={[styles.arrowWrapper, { backgroundColor: current.color }]}>
          <View style={[styles.outerArc, { borderColor: buttonColors.arcColor }]} />
          <View style={[styles.arcMask, { backgroundColor: current.color }]} />
          <TouchableOpacity style={[styles.arrowButton, { backgroundColor: buttonColors.background }]} onPress={handleNext}>
            <Ionicons name="arrow-forward" size={18} color={buttonColors.arrowColor} />
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={[styles.disclaimer, { fontFamily: FONTS.BarlowSemiCondensed, color: textColors.disclaimer }]}>
          This app provides health information only and does not replace professional medical advice
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  skipButton: {
    alignSelf: "flex-end",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  iconCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  onboardingImage: {
    width: 350,
    height: 350,
    marginBottom: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#E8EDFF",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 10,
    lineHeight: 36,
  },
  description: {
    fontSize: 16,
    color: "#C8D4FF",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#8FB5FF",
    width: 24,
  },
  inactiveDot: {
    backgroundColor: "#4B5470",
  },
  arrowWrapper: {
    alignSelf: "center",
    width: 72,
    height: 72,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  outerArc: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  arcMask: {
    position: "absolute",
    right: 6,
    width: 40,
    height: 90,
    borderRadius: 30,
  },
  arrowButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  disclaimer: {
    fontSize: 11,
    color: "#95A3CC",
    textAlign: "center",
    lineHeight: 14,
    paddingHorizontal: 20,
  },
});