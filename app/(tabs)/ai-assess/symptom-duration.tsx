import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { FONTS } from "../../constants/constants";

/**
 * Converts an image URI to base64 string using Expo SDK 54+ File API
 */
async function convertImageToBase64(uri: string): Promise<string> {
  try {
    const file = new FileSystem.File(uri);
    const base64 = await file.base64();
    return base64;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
}

/**
 * Converts multiple image URIs to base64 strings
 */
async function convertImagesToBase64(uris: string[]): Promise<string[]> {
  const conversionPromises = uris.map((uri) => convertImageToBase64(uri));
  return await Promise.all(conversionPromises);
}

export default function SymptomDuration() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const durationOptions = [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "2-3 days ago", value: "2-3_days" },
    { label: "1 week ago", value: "1_week" },
    { label: "2+ weeks ago", value: "2_weeks_plus" },
    { label: "Ongoing", value: "ongoing" },
  ];

  const handleContinue = async () => {
    if (!selectedDuration) return;

    setIsProcessing(true);

    try {
      // Parse photos from params
      const photosParam = params.photos as string;
      let photoUris: string[] = [];

      if (photosParam) {
        try {
          photoUris = JSON.parse(photosParam);
        } catch (e) {
          console.error("Error parsing photos:", e);
        }
      }

      // Convert images to base64 if present
      let base64Images: string[] = [];
      if (photoUris.length > 0) {
        console.log(`Processing ${photoUris.length} images for AI analysis...`);
        try {
          base64Images = await convertImagesToBase64(photoUris);
          console.log(
            `Successfully converted ${base64Images.length} images to base64`
          );
        } catch (error) {
          console.error("Error converting images:", error);
          Alert.alert(
            "Image Processing Warning",
            "Some images could not be processed. Continuing with available data."
          );
        }
      }

      // Update aiContext with base64 images
      let updatedAiContext = params.aiContext;
      if (updatedAiContext && typeof updatedAiContext === "string") {
        try {
          const contextObj = JSON.parse(updatedAiContext);
          contextObj.uploadedPhotos = base64Images;
          contextObj.duration = selectedDuration;
          updatedAiContext = JSON.stringify(contextObj);
        } catch (e) {
          console.error("Error updating AI context:", e);
        }
      }

      console.log("Proceeding to assessment with:", {
        duration: selectedDuration,
        imageCount: base64Images.length,
      });

      router.push({
        pathname: "/(tabs)/ai-assess/assessment-results",
        params: {
          ...params,
          duration: selectedDuration,
          aiContext: updatedAiContext,
        },
      });
    } catch (error) {
      console.error("Error during assessment submission:", error);
      Alert.alert("Error", "Failed to submit assessment. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const DurationOption = ({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        selectedDuration === value && styles.optionButtonSelected,
      ]}
      onPress={() => setSelectedDuration(value)}
    >
      <View style={styles.optionRadio}>
        {selectedDuration === value && (
          <View style={styles.optionRadioSelected} />
        )}
      </View>
      <Text
        style={[styles.optionLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header */}
        <CurvedHeader
          title="Symptom Assessment"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
        />

        {/* Content Area - Takes all available space minus header and bottom nav */}
        <View style={styles.contentArea}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentSection}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Duration & Timeline
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                When did your symptoms start?
              </Text>

              <View style={styles.optionsContainer}>
                {durationOptions.map((option) => (
                  <DurationOption
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.continueButton,
                  (!selectedDuration || isProcessing) &&
                    styles.continueButtonDisabled,
                ]}
                onPress={handleContinue}
                disabled={!selectedDuration || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.continueButtonText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Processing Images...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.continueButtonText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Get Assessment
                    </Text>
                    <Ionicons
                      name="analytics-outline"
                      size={20}
                      color="white"
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Bottom Navigation */}
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
    padding: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  optionsContainer: {
    marginBottom: 32,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionButtonSelected: {
    borderColor: "#2A7DE1",
    backgroundColor: "#F0F8FF",
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  optionRadioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2A7DE1",
  },
  optionLabel: {
    fontSize: 16,
    color: "#1A1A1A",
    fontWeight: "500",
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
    backgroundColor: "#A0A0A0",
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
});
