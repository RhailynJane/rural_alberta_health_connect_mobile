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
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleContinue = () => {
    if (!selectedCategory && !symptomDescription.trim()) {
      Alert.alert("Information Required", "Please select a symptom category or describe your symptoms.");
      return;
    }
    
    console.log("Submitting assessment:", { selectedCategory, symptomDescription, uploadedPhotos });
    router.push({
      pathname: "/(tabs)/ai-assess/symptom-severity",
      params: {
        category: selectedCategory || "Custom",
        description: symptomDescription,
        photos: JSON.stringify(uploadedPhotos),
      },
    });
  };

  const handleTakePhoto = () => {
    Alert.alert("Camera", "Camera functionality would be implemented here", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Simulate Photo", 
        onPress: () => {
          const newPhoto = `photo_${Date.now()}.jpg`;
          setUploadedPhotos(prev => [...prev, newPhoto]);
        }
      }
    ]);
  };

  const handleUploadPhoto = () => {
    Alert.alert("Photo Upload", "Photo gallery would be opened here", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Simulate Upload", 
        onPress: () => {
          const newPhoto = `uploaded_${Date.now()}.jpg`;
          setUploadedPhotos(prev => [...prev, newPhoto]);
        }
      }
    ]);
  };

  const handleRemovePhoto = (photoToRemove: string) => {
    setUploadedPhotos(prev => prev.filter(photo => photo !== photoToRemove));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Cold Weather Injuries":
        return "snow";
      case "Burns & Heat Injuries":
        return "flame";
      case "Trauma & Injuries":
        return "bandage";
      default:
        return "medical";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Cold Weather Injuries":
        return "#2A7DE1";
      case "Burns & Heat Injuries":
        return "#FF6B35";
      case "Trauma & Injuries":
        return "#DC3545";
      default:
        return "#6C757D";
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

          <View style={styles.contentSection}>
            <Text style={[styles.sectionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Describe Your Symptoms
            </Text>
            <Text style={[styles.sectionSubtitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Select a category or describe what you&#39;re experiencing
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
                <Ionicons 
                  name={getCategoryIcon("Cold Weather Injuries")} 
                  size={24} 
                  color={getCategoryColor("Cold Weather Injuries")} 
                  style={styles.categoryIcon} 
                />
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
                <Ionicons 
                  name={getCategoryIcon("Burns & Heat Injuries")} 
                  size={24} 
                  color={getCategoryColor("Burns & Heat Injuries")} 
                  style={styles.categoryIcon} 
                />
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
                <Ionicons 
                  name={getCategoryIcon("Trauma & Injuries")} 
                  size={24} 
                  color={getCategoryColor("Trauma & Injuries")} 
                  style={styles.categoryIcon} 
                />
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
            
            <TextInput
              style={[styles.symptomInput, { fontFamily: FONTS.BarlowSemiCondensed }]}
              placeholder="I have been experiencing..."
              placeholderTextColor="#999"
              value={symptomDescription}
              onChangeText={setSymptomDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.photoSection}>
              <Text style={[styles.photoTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Add Photos
              </Text>
              <Text style={[styles.photoDescription, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Photos can help better understand your symptoms. Only upload photos you&#39;re comfortable sharing.
              </Text>
              
              {/* Display uploaded photos */}
              {uploadedPhotos.length > 0 && (
                <View style={styles.uploadedPhotosContainer}>
                  {uploadedPhotos.map((photo, index) => (
                    <View key={index} style={styles.uploadedPhotoItem}>
                      <Ionicons name="image" size={16} color="#2A7DE1" />
                      <Text style={[styles.uploadedPhotoText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        {photo}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemovePhoto(photo)}>
                        <Ionicons name="close-circle" size={20} color="#DC3545" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
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

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color="#666" />
                <Text style={[styles.backButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.continueButton,
                  (!selectedCategory && !symptomDescription.trim()) && styles.continueButtonDisabled
                ]} 
                onPress={handleContinue}
                disabled={!selectedCategory && !symptomDescription.trim()}
              >
                <Text style={[styles.continueButtonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Continue
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
  uploadedPhotoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  uploadedPhotoText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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