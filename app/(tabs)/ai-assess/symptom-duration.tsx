import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
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

type DurationOption = {
  label: string;
  value: string;
  helper?: string;
};

export default function SymptomDuration() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isOnline } = useNetworkStatus();
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);

  const recentOptions: DurationOption[] = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "2–3 days ago", value: "2-3_days" },
  ];

  const longerOptions: DurationOption[] = [
    { label: "About a week", value: "1_week" },
    { label: "Two weeks or more", value: "2_weeks_plus" },
  ];

  const ongoingOption: DurationOption = {
    label: "Ongoing condition",
    value: "ongoing",
    helper: "No specific start date",
  };

  const handleSelection = (value: string) => {
    setSelectedDuration(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContinue = () => {
    if (!selectedDuration) return;

    router.push({
      pathname: "/(tabs)/ai-assess/assessment-results",
      params: {
        ...params,
        duration: selectedDuration,
      },
    });
  };

  const isSelected = selectedDuration !== null;

  const DurationRow = ({ option }: { option: DurationOption }) => {
    const selected = selectedDuration === option.value;

    return (
      <TouchableOpacity
        style={[styles.row, selected && styles.rowSelected]}
        onPress={() => handleSelection(option.value)}
        activeOpacity={0.7}
      >
        <View style={styles.rowContent}>
          <Text
            style={[
              styles.rowLabel,
              { fontFamily: FONTS.BarlowSemiCondensed },
              selected && styles.rowLabelSelected,
            ]}
          >
            {option.label}
          </Text>
          {option.helper && (
            <Text
              style={[
                styles.rowHelper,
                { fontFamily: FONTS.BarlowSemiCondensed },
                selected && styles.rowHelperSelected,
              ]}
            >
              {option.helper}
            </Text>
          )}
        </View>
        {selected && (
          <Ionicons name="checkmark" size={16} color="#6B7280" />
        )}
      </TouchableOpacity>
    );
  };

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
              {/* Calm instruction */}
              <Text
                style={[
                  styles.instruction,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                When did these symptoms begin
              </Text>

              {/* Recent group */}
              <View style={styles.optionGroup}>
                <Text
                  style={[
                    styles.groupLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Recent
                </Text>
                <View style={styles.groupRows}>
                  {recentOptions.map((option) => (
                    <DurationRow key={option.value} option={option} />
                  ))}
                </View>
              </View>

              {/* Longer group */}
              <View style={styles.optionGroup}>
                <Text
                  style={[
                    styles.groupLabel,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Longer
                </Text>
                <View style={styles.groupRows}>
                  {longerOptions.map((option) => (
                    <DurationRow key={option.value} option={option} />
                  ))}
                </View>
              </View>

              {/* Ongoing - condition, not time */}
              <View style={styles.ongoingSection}>
                <View style={styles.ongoingRow}>
                  <DurationRow option={ongoingOption} />
                </View>
              </View>

              {/* CTA area */}
              <View style={styles.ctaSection}>
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    !isSelected && styles.continueButtonDisabled,
                  ]}
                  onPress={handleContinue}
                  disabled={!isSelected}
                >
                  <Text
                    style={[
                      styles.continueButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                      !isSelected && styles.continueButtonTextDisabled,
                    ]}
                  >
                    Get Assessment
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
      <BottomNavigation />
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
    paddingTop: 16,
  },
  instruction: {
    fontSize: 17,
    color: "#374151",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 24,
  },
  optionGroup: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
    letterSpacing: 0.2,
    marginBottom: 6,
    marginLeft: 4,
  },
  groupRows: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  rowSelected: {
    backgroundColor: "#F8FAFC",
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "400",
  },
  rowLabelSelected: {
    color: "#1F2937",
    fontWeight: "500",
  },
  rowHelper: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 2,
  },
  rowHelperSelected: {
    color: "#6B7280",
  },
  ongoingSection: {
    marginTop: 12,
    marginBottom: 24,
  },
  ongoingRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
  },
  ctaSection: {
    marginTop: 8,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  continueButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  continueButtonTextDisabled: {
    color: "#9CA3AF",
  },
});
