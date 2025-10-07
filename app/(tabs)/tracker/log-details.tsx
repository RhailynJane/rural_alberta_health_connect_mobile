import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import {
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel"; // Add this import
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

export default function LogDetails() {
  const params = useLocalSearchParams();
  const entryId = params.entryId as string;
  
  // Convert string to Convex ID type
  const convexEntryId = entryId as Id<"healthEntries">;
  
  const entry = useQuery(api.healthEntries.getEntryById, 
    entryId ? { entryId: convexEntryId } : "skip"
  );

  const getSeverityColor = (severity: number) => {
    if (severity >= 9) return "#DC3545";
    if (severity >= 7) return "#FF6B35";
    if (severity >= 4) return "#FFC107";
    return "#28A745";
  };

  const getSeverityText = (severity: number) => {
    if (severity >= 9) return "Critical";
    if (severity >= 7) return "Severe";
    if (severity >= 4) return "Moderate";
    return "Mild";
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      full: date.toLocaleString()
    };
  };

  if (!entry) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CurvedBackground>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading entry details...</Text>
          </View>
        </CurvedBackground>
      </SafeAreaView>
    );
  }

  const dateTime = formatDateTime(entry.timestamp);

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <CurvedHeader title="Entry Details" height={120} showLogo={true} />

          <View style={styles.contentSection}>
            {/* Back Button */}
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="#2A7DE1" />
              <Text style={styles.backButtonText}>Back to Log</Text>
            </TouchableOpacity>

            {/* Entry Header */}
            <View style={styles.headerCard}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.dateText}>{dateTime.date}</Text>
                  <Text style={styles.timeText}>{dateTime.time}</Text>
                </View>
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityColor(entry.severity) }
                ]}>
                  <Text style={styles.severityBadgeText}>
                    {getSeverityText(entry.severity)} ({entry.severity}/10)
                  </Text>
                </View>
              </View>
              
              <View style={styles.typeContainer}>
                <Ionicons
                  name={entry.type === "ai_assessment" ? "hardware-chip-outline" : "person-outline"}
                  size={16}
                  color="#666"
                />
                <Text style={styles.typeText}>
                  {entry.type === "ai_assessment" ? "AI Assessment" : "Manual Entry"} • {entry.createdBy}
                </Text>
              </View>
            </View>

            {/* Symptoms */}
            <View style={styles.detailCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="medical" size={20} color="#2A7DE1" />
                <Text style={styles.cardTitle}>Symptoms & Description</Text>
              </View>
              <Text style={styles.cardContent}>{entry.symptoms}</Text>
            </View>

            {/* Category */}
            {entry.category && (
              <View style={styles.detailCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="pricetag" size={20} color="#2A7DE1" />
                  <Text style={styles.cardTitle}>Category</Text>
                </View>
                <Text style={styles.cardContent}>{entry.category}</Text>
              </View>
            )}

            {/* Duration */}
            {entry.duration && (
              <View style={styles.detailCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="time" size={20} color="#2A7DE1" />
                  <Text style={styles.cardTitle}>Duration</Text>
                </View>
                <Text style={styles.cardContent}>{entry.duration}</Text>
              </View>
            )}

            {/* AI Context */}
            {entry.aiContext && (
              <View style={styles.detailCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="analytics" size={20} color="#2A7DE1" />
                  <Text style={styles.cardTitle}>AI Assessment</Text>
                </View>
                <Text style={styles.cardContent}>{entry.aiContext}</Text>
              </View>
            )}

            {/* Notes */}
            {entry.notes && (
              <View style={styles.detailCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="document-text" size={20} color="#2A7DE1" />
                  <Text style={styles.cardTitle}>Additional Notes</Text>
                </View>
                <Text style={styles.cardContent}>{entry.notes}</Text>
              </View>
            )}

            {/* Photos */}
            {entry.photos && entry.photos.length > 0 && (
              <View style={styles.detailCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="camera" size={20} color="#2A7DE1" />
                  <Text style={styles.cardTitle}>Photos ({entry.photos.length})</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.photosContainer}>
                    {entry.photos.map((photo, index) => (
                      <View key={index} style={styles.photoItem}>
                        <Image source={{ uri: photo }} style={styles.photo} />
                        <Text style={styles.photoLabel}>Photo {index + 1}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Technical Details */}
            <View style={styles.detailCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="information-circle" size={20} color="#2A7DE1" />
                <Text style={styles.cardTitle}>Technical Details</Text>
              </View>
              <View style={styles.techDetails}>
                <View style={styles.techRow}>
                  <Text style={styles.techLabel}>Entry ID:</Text>
                  <Text style={styles.techValue}>{entry._id}</Text>
                </View>
                <View style={styles.techRow}>
                  <Text style={styles.techLabel}>Timestamp:</Text>
                  <Text style={styles.techValue}>{entry.timestamp}</Text>
                </View>
                <View style={styles.techRow}>
                  <Text style={styles.techLabel}>Date Key:</Text>
                  <Text style={styles.techValue}>{entry.date}</Text>
                </View>
                <View style={styles.techRow}>
                  <Text style={styles.techLabel}>Entry Type:</Text>
                  <Text style={styles.techValue}>{entry.type || "manual_entry"}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </CurvedBackground>
    </SafeAreaView>
  );
}

// ... keep your existing styles the same
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  contentSection: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A7DE1",
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#2A7DE1",
    fontWeight: "600",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  headerCard: {
    backgroundColor: "white",
    padding: 20,
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  timeText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  severityBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  detailCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 8,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  cardContent: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  photosContainer: {
    flexDirection: "row",
    gap: 12,
  },
  photoItem: {
    alignItems: "center",
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  photoLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  techDetails: {
    marginTop: 8,
  },
  techRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  techLabel: {
    fontSize: 12,
    color: "#666",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  techValue: {
    fontSize: 12,
    color: "#1A1A1A",
    fontFamily: FONTS.BarlowSemiCondensed,
    fontWeight: "500",
  },
});