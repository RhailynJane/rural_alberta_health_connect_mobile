import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function SymptomAssessment() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [symptomDescription, setSymptomDescription] = useState("");
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, or 3

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setCurrentStep(2); // Move to description step
  };

  const handleContinue = () => {
    if (currentStep === 1 && !selectedCategory) {
      Alert.alert("Selection Required", "Please select a symptom category or describe your symptoms.");
      return;
    }
    
    if (currentStep === 2 && !symptomDescription.trim()) {
      Alert.alert("Description Required", "Please describe your symptoms.");
      return;
    }

    if (currentStep === 3) {
      console.log("Moving to next step:", { selectedCategory, symptomDescription });
      router.push("/(tabs)/ai-assess/symptom-severity"); 
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 1) {
      router.back();
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTakePhoto = () => {
    // Implement photo taking functionality
    Alert.alert("Camera", "This would open the camera");
  };

  const handleUploadPhoto = () => {
    // Implement photo upload functionality
    Alert.alert("Photo Upload", "This would open the photo gallery");
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Describe Your Symptoms
            </Text>
            <Text style={[styles.sectionSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Select a category or describe what youre experiencing
            </Text>

            {/* Cold Weather Injuries Card Button */}
            <TouchableOpacity 
              style={[
                styles.categoryCard,
                selectedCategory === "Cold Weather Injuries" && styles.categoryCardSelected
              ]}
              onPress={() => handleCategorySelect("Cold Weather Injuries")}
            >
              <View style={styles.categoryHeader}>
                <Ionicons name="snow" size={24} color="#2A7DE1" style={styles.categoryIcon} />
                <Text style={[styles.categoryTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Cold Weather Injuries
                </Text>
              </View>
              <Text style={[styles.categoryItems, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Frostbite, Hypothermia, Chilblains, Cold-induced asthma, Dry skin/cracking, Windburn
              </Text>
            </TouchableOpacity>

            {/* Burns & Heat Injuries Card Button */}
            <TouchableOpacity 
              style={[
                styles.categoryCard,
                selectedCategory === "Burns & Heat Injuries" && styles.categoryCardSelected
              ]}
              onPress={() => handleCategorySelect("Burns & Heat Injuries")}
            >
              <View style={styles.categoryHeader}>
                <Ionicons name="flame" size={24} color="#FF6B35" style={styles.categoryIcon} />
                <Text style={[styles.categoryTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Burns & Heat Injuries
                </Text>
              </View>
              <Text style={[styles.categoryItems, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Thermal burns, Chemical burns, Electrical burns, Sunburn, Heat exhaustion, Heat stroke
              </Text>
            </TouchableOpacity>

            {/* Trauma & Injuries Card Button */}
            <TouchableOpacity 
              style={[
                styles.categoryCard,
                selectedCategory === "Trauma & Injuries" && styles.categoryCardSelected
              ]}
              onPress={() => handleCategorySelect("Trauma & Injuries")}
            >
              <View style={styles.categoryHeader}>
                <Ionicons name="bandage" size={24} color="#DC3545" style={styles.categoryIcon} />
                <Text style={[styles.categoryTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Trauma & Injuries
                </Text>
              </View>
              <Text style={[styles.categoryItems, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Farm equipment injury, Animal-related injury, Motor vehicle accident, Fall from height, Crush Injury, Laceration/Cuts
              </Text>
            </TouchableOpacity>

            <Text style={[styles.orText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Or describe your symptoms:
            </Text>
            
            <TouchableOpacity 
              style={styles.describeButton}
              onPress={() => setCurrentStep(2)}
            >
              <Ionicons name="create-outline" size={20} color="white" />
              <Text style={[styles.describeButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Describe Symptoms
              </Text>
            </TouchableOpacity>
          </>
        );

      case 2:
        return (
          <>
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Describe Your Symptoms
            </Text>
            
            {selectedCategory && (
              <View style={styles.selectedCategory}>
                <Ionicons name="checkmark-circle" size={20} color="#2E7D32" style={styles.selectedIcon} />
                <Text style={[styles.selectedCategoryText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Selected: {selectedCategory}
                </Text>
              </View>
            )}
            
            <TextInput
              style={[styles.symptomInput, { fontFamily: FONTS.BarlowSemiCondensed }]}
              placeholder="I have been experiencing..."
              placeholderTextColor="#999"
              value={symptomDescription}
              onChangeText={setSymptomDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />

            <View style={styles.photoSection}>
              <Text style={[styles.photoTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Add Photos
              </Text>
              <Text style={[styles.photoDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Photos can help better understand your symptoms. Only upload photos youre comfortable sharing.
              </Text>
              
              <View style={styles.photoButtons}>
                <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={20} color="#2A7DE1" />
                  <Text style={[styles.photoButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Take Photo
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.photoButton} onPress={handleUploadPhoto}>
                  <Ionicons name="image" size={20} color="#2A7DE1" />
                  <Text style={[styles.photoButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Upload Photo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        );

      case 3:
        return (
          <>
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Review Your Assessment
            </Text>
            
            <View style={styles.reviewSection}>
              {selectedCategory && (
                <View style={styles.reviewItem}>
                  <Text style={[styles.reviewLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    Category:
                  </Text>
                  <Text style={[styles.reviewValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {selectedCategory}
                  </Text>
                </View>
              )}
              
              <View style={styles.reviewItem}>
                <Text style={[styles.reviewLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Description:
                </Text>
                <Text style={[styles.reviewValue, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {symptomDescription || "No description provided"}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.finalNote, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Please review your information before submitting. Our AI system will analyze your symptoms and provide guidance.
            </Text>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with logo */}
          <CurvedHeader
            title="Symptom Assessment"
            height={120}
            showLogo={true}
          />

          {/* Progress Bar - 3 Steps */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(currentStep / 4) * 100}%` }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Step {currentStep} of 4
            </Text>
          </View>

          <View style={styles.contentSection}>
            {renderStepContent()}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={20} color="#666" />
                <Text style={[styles.backButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {currentStep === 1 ? "Cancel" : "Back"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.continueButton} 
                onPress={handleContinue}
              >
                <Text style={[styles.continueButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {currentStep === 3 ? "Submit Assessment" : "Continue"}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <BottomNavigation />
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2A7DE1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  contentSection: {
    padding: 24,
    paddingTop: 0,
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
    marginLeft: 36, // Align with icon + title
  },
  orText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    marginVertical: 24,
  },
  describeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6C757D",
    padding: 16,
    borderRadius: 8,
  },
  describeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  selectedCategory: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  selectedIcon: {
    marginRight: 8,
  },
  selectedCategoryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
  },
  symptomInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 16,
    minHeight: 120,
    marginBottom: 24,
    textAlignVertical: "top",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  photoSection: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
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
  reviewSection: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  reviewItem: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: "#1A1A1A",
  },
  finalNote: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
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
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
});