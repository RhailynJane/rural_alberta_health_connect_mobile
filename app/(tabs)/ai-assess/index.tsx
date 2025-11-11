/* eslint-disable @typescript-eslint/no-unused-vars */
import Ionicons from "@expo/vector-icons/Ionicons";
import { useConvexAuth, useQuery } from "convex/react";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../convex/_generated/api";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

// AI Context Types
type SymptomCategory =
  | "Cold Weather Injuries"
  | "Burns & Heat Injuries"
  | "Trauma & Injuries"
  | "Rash & Skin Conditions"
  | "Infections"
  | "Custom";
type BodyPart =
  | "face"
  | "hands"
  | "feet"
  | "torso"
  | "arms"
  | "legs"
  | "full_body"
  | "other";
type SeverityLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface AIImageContext {
  category: SymptomCategory;
  description: string;
  severity: SeverityLevel;
  duration: string;
  bodyParts: BodyPart[];
  symptoms: string[];
  environmentalFactors: string[];
  uploadedPhotos: string[];
  timestamp: string;
  patientDemographics?: {
    age?: number;
    gender?: string;
    occupation?: string;
  };
}

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


export default function SymptomAssessment() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { isOnline } = useNetworkStatus();
  const [selectedCategory, setSelectedCategory] =
    useState<SymptomCategory | null>(null);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [selectedBodyParts] = useState<BodyPart[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Error modal state
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  // Alert modal state
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [alertModalTitle, setAlertModalTitle] = useState("");
  const [alertModalMessage, setAlertModalMessage] = useState("");
  const [alertModalButtons, setAlertModalButtons] = useState<
    {
      label: string;
      onPress: () => void;
      variant?: "primary" | "secondary" | "destructive";
    }[]
  >([]);

  // AI context data
  const [aiContext, setAiContext] = useState<Partial<AIImageContext>>({
    timestamp: new Date().toISOString(),
  });
  
  // Get reminder settings
  const reminderSettings = useQuery(
    (api as any)["profile/reminders"].getReminderSettings,
    isAuthenticated && !authLoading ? {} : "skip"
  );

  const handleCategorySelect = (category: SymptomCategory) => {
    setSelectedCategory(category);
    setAiContext((prev) => ({
      ...prev,
      category,
      symptoms: getDefaultSymptoms(category),
      environmentalFactors: getEnvironmentalFactors(category),
    }));
  };

  const getDefaultSymptoms = (category: SymptomCategory): string[] => {
    switch (category) {
      case "Cold Weather Injuries":
        return ["numbness", "tingling", "discoloration", "swelling", "pain"];
      case "Burns & Heat Injuries":
        return ["redness", "blistering", "pain", "swelling", "peeling"];
      case "Trauma & Injuries":
        return ["pain", "swelling", "bruising", "bleeding", "limited_mobility"];
      case "Rash & Skin Conditions":
        return ["itching", "redness", "bumps", "dryness", "flaking"];
      case "Infections":
        return ["redness", "swelling", "pain", "warmth", "pus", "fever"];
      default:
        return [];
    }
  };

  const getEnvironmentalFactors = (category: SymptomCategory): string[] => {
    switch (category) {
      case "Cold Weather Injuries":
        return ["cold_exposure", "wind_chill", "wet_clothing"];
      case "Burns & Heat Injuries":
        return ["heat_exposure", "sun_exposure", "chemical_contact"];
      case "Trauma & Injuries":
        return ["physical_impact", "fall", "equipment_use"];
      case "Rash & Skin Conditions":
        return ["allergen_exposure", "irritant_contact", "heat_humidity"];
      case "Infections":
        return ["wound_exposure", "contaminated_water", "animal_contact"];
      default:
        return [];
    }
  };

  const handleContinue = async () => {
    if (!selectedCategory && !symptomDescription.trim()) {
      setAlertModalTitle("Information Required");
      setAlertModalMessage("Please select a symptom category or describe your symptoms.");
      setAlertModalButtons([
        {
          label: "OK",
          onPress: () => setAlertModalVisible(false),
          variant: "primary",
        },
      ]);
      setAlertModalVisible(true);
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare initial AI context WITHOUT base64 images for fast navigation
      const initialAiContext: AIImageContext = {
        category: selectedCategory || "Custom",
        description: symptomDescription,
        severity: 5,
        duration: "",
        bodyParts: selectedBodyParts,
        symptoms: extractSymptomsFromDescription(symptomDescription),
        environmentalFactors: aiContext.environmentalFactors || [],
        uploadedPhotos: [], // Will be processed after navigation
        timestamp: new Date().toISOString(),
      };

      console.log("Navigating to severity screen:", {
        category: initialAiContext.category,
        descriptionLength: symptomDescription.length,
        photoCount: uploadedPhotos.length,
        symptomsCount: initialAiContext.symptoms.length,
      });

      // Navigate IMMEDIATELY for better UX - process images in next screen
      router.push({
        pathname: "/(tabs)/ai-assess/symptom-severity",
        params: {
          category: selectedCategory || "Custom",
          description: symptomDescription,
          photos: JSON.stringify(uploadedPhotos), // Pass URIs, will convert later
          aiContext: JSON.stringify(initialAiContext),
        },
      });
    } catch (error) {
      console.error("Error during navigation:", error);
      setAlertModalTitle("Navigation Error");
      setAlertModalMessage("Failed to proceed. Please try again.");
      setAlertModalButtons([
        {
          label: "OK",
          onPress: () => setAlertModalVisible(false),
          variant: "primary",
        },
      ]);
      setAlertModalVisible(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const extractSymptomsFromDescription = (description: string): string[] => {
    const symptomKeywords = {
      pain: ["pain", "hurt", "sore", "aching"],
      itching: ["itch", "itchy", "scratching"],
      redness: ["red", "redness", "inflamed"],
      swelling: ["swell", "swollen", "puffy"],
      numbness: ["numb", "tingling", "pins needles"],
      blistering: ["blister", "bubble", "fluid"],
      fever: ["fever", "hot", "temperature"],
      discharge: ["pus", "ooze", "drainage"],
    };

    const foundSymptoms: string[] = [];
    const lowerDescription = description.toLowerCase();

    Object.entries(symptomKeywords).forEach(([symptom, keywords]) => {
      if (keywords.some((keyword) => lowerDescription.includes(keyword))) {
        foundSymptoms.push(symptom);
      }
    });

    return foundSymptoms;
  };

  // Camera capture removed: no camera permission requests are needed now.

  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setAlertModalTitle("Permission Required");
      setAlertModalMessage("Gallery permissions are needed to upload photos.");
      setAlertModalButtons([
        {
          label: "OK",
          onPress: () => setAlertModalVisible(false),
          variant: "primary",
        },
      ]);
      setAlertModalVisible(true);
      return false;
    }
    return true;
  };

  // Camera capture removed: only gallery upload is supported.

  const handleUploadPhoto = async () => {
    try {
      // Check photo limit
      if (uploadedPhotos.length >= 3) {
        setErrorModalMessage("You can only add up to 3 photos for AI assessment.");
        setErrorModalVisible(true);
        return;
      }

      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhotos = result.assets.map((asset) => asset.uri);
        const remainingSlots = 3 - uploadedPhotos.length;
        
        if (newPhotos.length > remainingSlots) {
          setErrorModalMessage(`You can only add ${remainingSlots} more photo${remainingSlots !== 1 ? 's' : ''}. Maximum is 3 photos.`);
          setErrorModalVisible(true);
          // Only add what fits
          setUploadedPhotos((prev) => [...prev, ...newPhotos.slice(0, remainingSlots)]);
        } else {
          setUploadedPhotos((prev) => [...prev, ...newPhotos]);
          console.log(`Uploaded ${newPhotos.length} photos`);
        }
      }
    } catch (error) {
      console.error("Error uploading photos:", error);
      setErrorModalMessage("Failed to upload photos. Please try again.");
      setErrorModalVisible(true);
    }
  };

  const handleRemovePhoto = (photoToRemove: string) => {
    setUploadedPhotos((prev) =>
      prev.filter((photo) => photo !== photoToRemove)
    );
  };

  const getCategoryIcon = (category: SymptomCategory) => {
    switch (category) {
      case "Cold Weather Injuries":
        return "snow";
      case "Burns & Heat Injuries":
        return "flame";
      case "Trauma & Injuries":
        return "bandage";
      case "Rash & Skin Conditions":
        return "ellipsis-horizontal";
      case "Infections":
        return "bug";
      default:
        return "medical";
    }
  };

  const getCategoryColor = (category: SymptomCategory) => {
    switch (category) {
      case "Cold Weather Injuries":
        return "#2A7DE1";
      case "Burns & Heat Injuries":
        return "#FF6B35";
      case "Trauma & Injuries":
        return "#DC3545";
      case "Rash & Skin Conditions":
        return "#8A2BE2";
      case "Infections":
        return "#28A745";
      default:
        return "#6C757D";
    }
  };

  const getFileName = (uri: string) => {
    return uri.split("/").pop() || "photo.jpg";
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Due reminder banner (offline-capable) */}
        <DueReminderBanner topOffset={120} />
        {/* Fixed Header */}
        <CurvedHeader
          title="Symptom Assessment"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
          reminderEnabled={reminderSettings?.enabled || false}
          reminderSettings={reminderSettings || null}
        />

        {/* Content Area - Takes all available space minus header and bottom nav */}
        <View style={styles.contentArea}>
          <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.contentSection}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Describe Your Symptoms
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Select a category or describe what you&apos;re experiencing
              </Text>

              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  selectedCategory === "Cold Weather Injuries" &&
                    styles.categoryCardSelected,
                ]}
                onPress={() => handleCategorySelect("Cold Weather Injuries")}
              >
                <View style={styles.categoryHeader}>
                  <Ionicons
                    name={getCategoryIcon("Cold Weather Injuries")}
                    size={24}
                    color={getCategoryColor("Cold Weather Injuries")}
                    style={styles.categoryIcon}
                  />
                  <Text
                    style={[
                      styles.categoryTitle,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Cold Weather Injuries
                  </Text>
                </View>
                <Text
                  style={[
                    styles.categoryItems,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Frostbite, Hypothermia, Chilblains, Cold-induced asthma, Dry
                  skin/cracking, Windburn
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  selectedCategory === "Burns & Heat Injuries" &&
                    styles.categoryCardSelected,
                ]}
                onPress={() => handleCategorySelect("Burns & Heat Injuries")}
              >
                <View style={styles.categoryHeader}>
                  <Ionicons
                    name={getCategoryIcon("Burns & Heat Injuries")}
                    size={24}
                    color={getCategoryColor("Burns & Heat Injuries")}
                    style={styles.categoryIcon}
                  />
                  <Text
                    style={[
                      styles.categoryTitle,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Burns & Heat Injuries
                  </Text>
                </View>
                <Text
                  style={[
                    styles.categoryItems,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Thermal burns, Chemical burns, Electrical burns, Sunburn, Heat
                  exhaustion, Heat stroke
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  selectedCategory === "Trauma & Injuries" &&
                    styles.categoryCardSelected,
                ]}
                onPress={() => handleCategorySelect("Trauma & Injuries")}
              >
                <View style={styles.categoryHeader}>
                  <Ionicons
                    name={getCategoryIcon("Trauma & Injuries")}
                    size={24}
                    color={getCategoryColor("Trauma & Injuries")}
                    style={styles.categoryIcon}
                  />
                  <Text
                    style={[
                      styles.categoryTitle,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Trauma & Injuries
                  </Text>
                </View>
                <Text
                  style={[
                    styles.categoryItems,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Farm equipment injury, Animal-related injury, Motor vehicle
                  accident, Fall from height, Crush Injury, Laceration/Cuts
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  selectedCategory === "Rash & Skin Conditions" &&
                    styles.categoryCardSelected,
                ]}
                onPress={() => handleCategorySelect("Rash & Skin Conditions")}
              >
                <View style={styles.categoryHeader}>
                  <Ionicons
                    name={getCategoryIcon("Rash & Skin Conditions")}
                    size={24}
                    color={getCategoryColor("Rash & Skin Conditions")}
                    style={styles.categoryIcon}
                  />
                  <Text
                    style={[
                      styles.categoryTitle,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Rash & Skin Conditions
                  </Text>
                </View>
                <Text
                  style={[
                    styles.categoryItems,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Contact dermatitis, Eczema, Psoriasis, Hives, Heat rash,
                  Allergic reactions, Poison ivy/oak
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryCard,
                  selectedCategory === "Infections" &&
                    styles.categoryCardSelected,
                ]}
                onPress={() => handleCategorySelect("Infections")}
              >
                <View style={styles.categoryHeader}>
                  <Ionicons
                    name={getCategoryIcon("Infections")}
                    size={24}
                    color={getCategoryColor("Infections")}
                    style={styles.categoryIcon}
                  />
                  <Text
                    style={[
                      styles.categoryTitle,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Infections
                  </Text>
                </View>
                <Text
                  style={[
                    styles.categoryItems,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Cellulitis, Abscess, Infected wounds, Fungal infections,
                  Bacterial infections, Viral rashes, Sepsis signs
                </Text>
              </TouchableOpacity>

              <Text
                style={[
                  styles.orText,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                Or describe your symptoms:
              </Text>



              <TextInput
                style={[
                  styles.symptomInput,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
                placeholder="I have been experiencing... (include location, appearance, and any other details)"
                placeholderTextColor="#999"
                value={symptomDescription}
                onChangeText={setSymptomDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <View style={styles.photoSection}>
                <Text
                  style={[
                    styles.photoTitle,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Add Photos for AI Analysis
                </Text>
                <Text
                  style={[
                    styles.photoDescription,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  Clear, well-lit photos help AI assess your condition
                  accurately. Include different angles and close-ups.
                </Text>

                {uploadedPhotos.length > 0 && (
                  <View style={styles.uploadedPhotosContainer}>
                    <Text
                      style={[
                        styles.uploadedPhotosTitle,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Photos for AI Analysis ({uploadedPhotos.length})
                    </Text>
                    {uploadedPhotos.map((photo, index) => (
                      <View key={index} style={styles.uploadedPhotoItem}>
                        <Image
                          source={{ uri: photo }}
                          style={styles.photoThumbnail}
                        />
                        <View style={styles.photoInfo}>
                          <Text
                            style={[
                              styles.uploadedPhotoText,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            {getFileName(photo)}
                          </Text>
                          <Text
                            style={[
                              styles.photoSizeText,
                              { fontFamily: FONTS.BarlowSemiCondensed },
                            ]}
                          >
                            Photo {index + 1} - Ready for AI analysis
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => handleRemovePhoto(photo)}
                        >
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color="#DC3545"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={[
                      styles.photoButton,
                      uploadedPhotos.length >= 3 && styles.photoButtonDisabled,
                    ]}
                    onPress={handleUploadPhoto}
                    disabled={uploadedPhotos.length >= 3}
                  >
                    <Ionicons 
                      name="image" 
                      size={20} 
                      color={uploadedPhotos.length >= 3 ? "#999" : "#2A7DE1"} 
                    />
                    <Text
                      style={[
                        styles.photoButtonText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                        uploadedPhotos.length >= 3 && styles.photoButtonTextDisabled,
                      ]}
                    >
                      Upload Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                  disabled={isProcessing}
                >
                  <Ionicons name="arrow-back" size={20} color="#666" />
                  <Text
                    style={[
                      styles.backButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    ((!selectedCategory && !symptomDescription.trim()) ||
                      isProcessing) &&
                      styles.continueButtonDisabled,
                  ]}
                  onPress={handleContinue}
                  disabled={
                    (!selectedCategory && !symptomDescription.trim()) ||
                    isProcessing
                  }
                >
                  <Text
                    style={[
                      styles.continueButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {isProcessing ? "Processing..." : "Continue to Severity"}
                  </Text>
                  {!isProcessing && (
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  )}
                </TouchableOpacity>
              </View>
              </View>
            </ScrollView>
          </Pressable>
        </View>

        {/* Error Modal */}
        <Modal
          visible={errorModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setErrorModalVisible(false)}
        >
          <View style={styles.errorModalOverlay}>
            <View style={styles.errorModalContainer}>
              <Text
                style={[
                  styles.errorModalMessage,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                {errorModalMessage}
              </Text>
              <TouchableOpacity
                style={styles.errorModalButton}
                onPress={() => setErrorModalVisible(false)}
              >
                <Text
                  style={[
                    styles.errorModalButtonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </CurvedBackground>
      <BottomNavigation />

      {/* Alert Modal */}
      <Modal
        visible={alertModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAlertModalVisible(false)}
      >
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContent}>
            <Text style={styles.alertModalTitle}>{alertModalTitle}</Text>
            <Text style={styles.alertModalMessage}>{alertModalMessage}</Text>
            <View style={styles.alertModalButtons}>
              {alertModalButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertModalButton,
                    button.variant === "destructive" && styles.alertDestructiveButton,
                    button.variant === "secondary" && styles.alertSecondaryButton,
                  ]}
                  onPress={button.onPress}
                >
                  <Text
                    style={[
                      styles.alertModalButtonText,
                      button.variant === "secondary" && styles.alertSecondaryButtonText,
                    ]}
                  >
                    {button.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  categoryCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryCardSelected: {
    borderColor: "#2A7DE1",
    borderWidth: 2,
    backgroundColor: "#F0F8FF",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIcon: {
    marginRight: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  categoryItems: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginLeft: 36,
  },
  orText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    marginVertical: 24,
  },
  symptomInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    minHeight: 100,
    marginBottom: 24,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    fontSize: 16,
  },
  photoSection: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 24,
  },
  photoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  photoDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  uploadedPhotosContainer: {
    marginBottom: 16,
  },
  uploadedPhotosTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  uploadedPhotoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  photoThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  photoInfo: {
    flex: 1,
  },
  uploadedPhotoText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  photoSizeText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  photoButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  photoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A7DE1",
    marginHorizontal: 4,
  },
  photoButtonText: {
    color: "#2A7DE1",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F0",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    flex: 1,
    marginRight: 12,
  },
  backButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    flex: 1,
    marginLeft: 12,
  },
  continueButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  continueButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  photoButtonDisabled: {
    backgroundColor: "#F8F9FA",
    borderColor: "#E9ECEF",
  },
  photoButtonTextDisabled: {
    color: "#999",
  },
  errorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorModalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorModalMessage: {
    fontSize: 16,
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  errorModalButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 30,
    minWidth: 120,
    alignItems: "center",
  },
  errorModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Alert Modal styles
  alertModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  alertModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  alertModalMessage: {
    fontSize: 16,
    color: "#333",
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  alertModalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  alertModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    minWidth: 100,
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  alertSecondaryButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  alertDestructiveButton: {
    backgroundColor: "#DC3545",
  },
  alertModalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  alertSecondaryButtonText: {
    color: COLORS.primary,
  },
});
