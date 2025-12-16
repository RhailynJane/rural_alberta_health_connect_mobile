import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import { FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

// App primary color for all severity levels
const PRIMARY_COLOR = '#2A7DE1';

export default function SymptomSeverity() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isOnline } = useNetworkStatus();
  const [severityLevel, setSeverityLevel] = useState<number | null>(null);

  // Shake animation
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [needsAttention, setNeedsAttention] = useState(false);

  const handleSelection = (level: number) => {
    setSeverityLevel(level);
    setNeedsAttention(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerShake = () => {
    setNeedsAttention(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setNeedsAttention(false), 2000);
  };

  const handleContinue = () => {
    if (severityLevel === null) {
      triggerShake();
      return;
    }

    router.push({
      pathname: "/(tabs)/ai-assess/symptom-duration",
      params: {
        ...params,
        severity: severityLevel.toString(),
      },
    });
  };

  const isSelected = severityLevel !== null;

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        <DueReminderBanner topOffset={120} />
        <CurvedHeader
          title="Symptom Assessment"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
        />

        <View style={styles.contentArea}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.contentSection}>
              {/* Single instruction line */}
              <Text
                style={[
                  styles.instruction,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Rate your overall discomfort level.
              </Text>

              {/* Scale with gradient colors */}
              <Animated.View
                style={[
                  styles.scaleWrapper,
                  { transform: [{ translateX: shakeAnim }] }
                ]}
              >
                {/* Endpoint labels */}
                <View style={styles.endpointLabels}>
                  <Text
                    style={[
                      styles.endpointLabel,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Mild
                  </Text>
                  <Text
                    style={[
                      styles.endpointLabel,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Severe
                  </Text>
                </View>

                {/* Scale dots - single color */}
                <View style={styles.scaleContainer}>
                  {[...Array(10)].map((_, index) => {
                    const dotLevel = index + 1;
                    const isActive = severityLevel !== null && dotLevel <= severityLevel;
                    const isCurrentSelection = dotLevel === severityLevel;

                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.dotTouchArea}
                        onPress={() => handleSelection(dotLevel)}
                        activeOpacity={0.7}
                      >
                        {/* Glow ring behind selected dot */}
                        {isCurrentSelection && <View style={styles.dotGlow} />}
                        <View
                          style={[
                            styles.dot,
                            isActive && styles.dotActive,
                            isCurrentSelection && styles.dotSelected,
                            needsAttention && !isSelected && styles.dotAttention,
                          ]}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>

              </Animated.View>

              {/* Action buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <Ionicons name="arrow-back" size={20} color="#6B7280" />
                  <Text
                    style={[
                      styles.backButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    !isSelected && styles.continueButtonDisabled,
                  ]}
                  onPress={handleContinue}
                >
                  <Text
                    style={[
                      styles.continueButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                      !isSelected && styles.continueButtonTextDisabled,
                    ]}
                  >
                    Continue
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color={isSelected ? "white" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </CurvedBackground>
      <BottomNavigation floating={true} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  contentSection: {
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  instruction: {
    fontSize: 17,
    color: "#374151",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 24,
  },
  scaleWrapper: {
    marginBottom: 40,
  },
  endpointLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  endpointLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: "#6B7280",
  },
  scaleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  dotTouchArea: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  dotGlow: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(42, 125, 225, 0.12)",
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#B0B5BC",
  },
  dotActive: {
    backgroundColor: "#2A7DE1",
    borderColor: "#2A7DE1",
  },
  dotSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: "#2A7DE1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },
  dotAttention: {
    borderColor: "#93C5FD",
    borderWidth: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    flex: 1,
    marginRight: 12,
  },
  backButtonText: {
    color: "#4B5563",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    flex: 1,
    marginLeft: 12,
  },
  continueButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 6,
    lineHeight: 20,
  },
  continueButtonTextDisabled: {
    color: "#9CA3AF",
  },
});
