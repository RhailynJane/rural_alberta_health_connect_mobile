import Ionicons from "@expo/vector-icons/Ionicons";
import { Q } from "@nozbe/watermelondb";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useWatermelonDatabase } from "../../../watermelon/hooks/useDatabase";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import { FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

// Renders AI assessment text into separate cards (mirrors assessment-results)
function renderAssessmentCards(text: string | null) {
  if (!text) return null;

  type SectionKey =
    | "CLINICAL ASSESSMENT"
    | "VISUAL FINDINGS"
    | "CLINICAL INTERPRETATION"
    | "BURN/WOUND GRADING"
    | "INFECTION RISK"
    | "EMERGENCY RED FLAGS"
    | "RURAL GUIDANCE"
    | "URGENCY ASSESSMENT"
    | "RECOMMENDATIONS"
    | "NEXT STEPS"
    | "OTHER";

  const wantedOrder: SectionKey[] = [
    "CLINICAL ASSESSMENT",
    "VISUAL FINDINGS",
    "CLINICAL INTERPRETATION",
    "BURN/WOUND GRADING",
    "INFECTION RISK",
    "EMERGENCY RED FLAGS",
    "RURAL GUIDANCE",
    "URGENCY ASSESSMENT",
    "RECOMMENDATIONS",
    "NEXT STEPS",
  ];

  const sections: Record<SectionKey, string[]> = {
    "CLINICAL ASSESSMENT": [],
    "VISUAL FINDINGS": [],
    "CLINICAL INTERPRETATION": [],
    "BURN/WOUND GRADING": [],
    "INFECTION RISK": [],
    "EMERGENCY RED FLAGS": [],
    "RURAL GUIDANCE": [],
    "URGENCY ASSESSMENT": [],
    "RECOMMENDATIONS": [],
    "NEXT STEPS": [],
    OTHER: [],
  };

  const isHeader = (l: string): SectionKey | null => {
    const lower = l.toLowerCase().trim();
    const cleaned = lower.replace(/\*\*/g, "").replace(/^\d+\.\s*/, "").trim();

    if (/^(clinical|patient|initial)\s+assessment\s*:?/i.test(cleaned)) return "CLINICAL ASSESSMENT";
    if (/^visual\s+findings?\s*(from\s+(medical\s+)?images?)?\s*:?/i.test(cleaned)) return "VISUAL FINDINGS";
    if (/^image\s+analysis\s*:?/i.test(cleaned)) return "VISUAL FINDINGS";
    if (/^clinical\s+interpretation\s*(and\s+differential\s+considerations?)?\s*:?/i.test(cleaned)) return "CLINICAL INTERPRETATION";
    if (/^differential\s+(diagnosis|considerations?)\s*:?/i.test(cleaned)) return "CLINICAL INTERPRETATION";
    if (/^interpretation\s*:?/i.test(cleaned)) return "CLINICAL INTERPRETATION";
    if (/^(burn|wound|injury)\s*[\/,]?\s*(wound|injury)?\s*[\/,]?\s*(injury)?\s*(grading|classification|severity)\s*:?/i.test(cleaned)) return "BURN/WOUND GRADING";
    if (/^severity\s+(grading|classification|level)\s*:?/i.test(cleaned)) return "BURN/WOUND GRADING";
    if (/^grading\s*:?/i.test(cleaned)) return "BURN/WOUND GRADING";
    if (/^infection\s+risk\s*(assessment)?\s*:?/i.test(cleaned)) return "INFECTION RISK";
    if (/^risk\s+of\s+infection\s*:?/i.test(cleaned)) return "INFECTION RISK";
    if (/^(specific\s+)?emergency\s+red\s+flags?\s*:?/i.test(cleaned)) return "EMERGENCY RED FLAGS";
    if (/^red\s+flags?\s*:?/i.test(cleaned)) return "EMERGENCY RED FLAGS";
    if (/^warning\s+signs?\s*:?/i.test(cleaned)) return "EMERGENCY RED FLAGS";
    if (/^rural[-\s]?specific\s+resource\s+guidance\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural[-\s]?specific\s+resource\s+guideline\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural\s+(specific\s+)?(resource\s+)?guidance\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^resource\s+guidance\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural\s+(considerations?|resources?)\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural\s+guidance\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural\s+resource\s+guidance\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural\s+resources?\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^urgency\s+(assessment|level)\s*:?/i.test(cleaned)) return "URGENCY ASSESSMENT";
    if (/^urgency\s*:?/i.test(cleaned)) return "URGENCY ASSESSMENT";
    if (/^recommendations?\s*:?/i.test(cleaned)) return "RECOMMENDATIONS";
    if (/^treatment\s+recommendations?\s*:?/i.test(cleaned)) return "RECOMMENDATIONS";
    if (/^time[-\s]?sensitive\s+treatment\s+recommendations?\s*:?/i.test(cleaned)) return "RECOMMENDATIONS";
    if (/^next\s+steps?\s*:?/i.test(cleaned)) return "NEXT STEPS";
    if (/^action\s+plan\s*:?/i.test(cleaned)) return "NEXT STEPS";
    return null;
  };

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let current: SectionKey = "CLINICAL ASSESSMENT";
  for (const l of lines) {
    if (!l) continue;
    const hdr = isHeader(l);
    if (hdr) {
      current = hdr;
      continue;
    }
    const content = l.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "");
    if (content) sections[current].push(content);
  }

  const Card = ({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) => (
    <View style={styles.assessmentCard}>
      <View style={styles.cardHeader}>
        {icon}
        <Text style={[styles.cardTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>{title}</Text>
      </View>
      {items.map((it, idx) => (
        <View key={idx} style={styles.cardItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={[styles.cardItemText, { fontFamily: FONTS.BarlowSemiCondensed }]}>{it}</Text>
        </View>
      ))}
    </View>
  );

  const icons: Record<SectionKey, { icon: React.ReactNode; color: string }> = {
    "CLINICAL ASSESSMENT": { icon: <Ionicons name="medical" size={20} color="#2A7DE1" />, color: "#2A7DE1" },
    "VISUAL FINDINGS": { icon: <Ionicons name="eye" size={20} color="#9B59B6" />, color: "#9B59B6" },
    "CLINICAL INTERPRETATION": { icon: <Ionicons name="clipboard" size={20} color="#3498DB" />, color: "#3498DB" },
    "BURN/WOUND GRADING": { icon: <Ionicons name="fitness" size={20} color="#E67E22" />, color: "#E67E22" },
    "INFECTION RISK": { icon: <Ionicons name="shield-checkmark" size={20} color="#E74C3C" />, color: "#E74C3C" },
    "EMERGENCY RED FLAGS": { icon: <Ionicons name="warning" size={20} color="#DC3545" />, color: "#DC3545" },
    "RURAL GUIDANCE": { icon: <Ionicons name="location" size={20} color="#16A085" />, color: "#16A085" },
    "URGENCY ASSESSMENT": { icon: <Ionicons name="speedometer" size={20} color="#FF6B35" />, color: "#FF6B35" },
    "RECOMMENDATIONS": { icon: <Ionicons name="checkmark-circle" size={20} color="#28A745" />, color: "#28A745" },
    "NEXT STEPS": { icon: <Ionicons name="arrow-forward-circle" size={20} color="#2A7DE1" />, color: "#2A7DE1" },
    OTHER: { icon: <Ionicons name="information-circle" size={20} color="#6C757D" />, color: "#6C757D" },
  };

  return (
    <View>
      {wantedOrder.map((key) =>
        sections[key] && sections[key].length > 0 ? (
          <Card key={key} title={key} items={sections[key]} icon={icons[key].icon} />
        ) : null
      )}
      {sections["OTHER"] && sections["OTHER"].length > 0 && (
        <Card title="OTHER" items={sections["OTHER"]} icon={icons["OTHER"].icon} />
      )}
    </View>
  );
}

export default function LogDetails() {
  const params = useLocalSearchParams();
  const entryId = params.entryId as string;
  const convexIdParam = (params.convexId as string) || undefined;
  const database = useWatermelonDatabase();
  const { isOnline } = useNetworkStatus();
  const [offlineEntry, setOfflineEntry] = useState<any>(null);
  
  // Convert string to Convex ID type - but only if it looks like a Convex ID
  // Convex IDs start with 'k' or 'j' and are longer than 20 chars
  const isConvexId = entryId && entryId.length > 20 && /^[kj]/.test(entryId);
  const convexEntryId = isConvexId ? (entryId as Id<"healthEntries">) : undefined;
  
  // Online query - only run if we have a valid Convex ID
  const entryOnline = useQuery(api.healthEntries.getEntryById, 
    convexEntryId && isOnline ? { entryId: convexEntryId } : "skip"
  );

  // Offline query from WatermelonDB
  useEffect(() => {
      if ((entryId || convexIdParam) && (!isOnline || !isConvexId)) {
        // Query WatermelonDB if:
        // 1. We're offline, OR
        // 2. We're online but the entryId is a WatermelonDB ID (not Convex format)
      const loadOfflineEntry = async () => {
        try {
          const healthCollection = database.get("health_entries");
          let localEntry: any = null;
          
            // Try to find by WatermelonDB ID first
            if (entryId && !isConvexId) {
            try {
              localEntry = await healthCollection.find(entryId);
            } catch {
              // Not found by WatermelonDB ID, try convexId
            }
          }
          
            // If not found, try querying by convexId field
          if (!localEntry) {
            const convexLookup = convexIdParam || (isConvexId ? entryId : undefined);
            if (convexLookup) {
            const results = await healthCollection.query(
              Q.where('convexId', convexLookup)
            ).fetch();
            if (results.length > 0) {
              localEntry = results[0];
            }
            }
          }
          
          if (!localEntry) {
            console.error(`Failed to find entry with id(s): localId=${entryId || 'n/a'} convexId=${convexIdParam || (isConvexId ? entryId : 'n/a')}`);
            setOfflineEntry(null);
            return;
          }
          
          // Map WatermelonDB entry to Convex format
          const entryData = localEntry as any;
          
          // Safely handle photos - it's already parsed by the @json decorator
          let photos: string[] = [];
          try {
            if (entryData.photos) {
              photos = Array.isArray(entryData.photos) ? entryData.photos : JSON.parse(entryData.photos);
            }
          } catch {
            photos = [];
          }
          
          setOfflineEntry({
            _id: localEntry.id,
            _creationTime: entryData.createdAt || Date.now(),
            userId: entryData.userId,
            timestamp: entryData.timestamp,
            severity: entryData.severity,
            type: entryData.type,
            symptoms: entryData.symptoms || "",
            category: entryData.category || "",
            notes: entryData.notes || "",
            photos: photos,
            aiContext: entryData.aiContext || null,
          });
        } catch (error) {
          console.error("Failed to load offline entry:", error);
          setOfflineEntry(null);
        }
      };
      loadOfflineEntry();
    }
  }, [isOnline, entryId, database, isConvexId, convexIdParam]);

  // Use online entry if available, otherwise offline entry
  const entry = isOnline ? entryOnline : offlineEntry;

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
      <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
        <CurvedBackground style={{ flex: 1 }}>
          <DueReminderBanner topOffset={120} />
          <CurvedHeader
            title="Tracker - Entry Details"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
            showNotificationBell={true}
          />
          <View style={styles.contentArea}>
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading entry details...</Text>
              </View>
            </ScrollView>
          </View>
        </CurvedBackground>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  const dateTime = formatDateTime(entry.timestamp);

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header (not scrollable) */}
        <DueReminderBanner topOffset={120} />
        <CurvedHeader
          title="Tracker - Entry Details"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
        />

        {/* Scrollable content below header */}
        <View style={styles.contentArea}>
          <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.contentSection}>
              {/* Back Button */}
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(entry.severity) }]}>
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

                {/* Edit/Delete Actions - Only for Manual Entries */}
                {entry.type !== "ai_assessment" && (
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        console.log('Edit entry:', entry._id);
                        // TODO: Navigate to edit screen
                      }}
                    >
                      <Ionicons name="pencil" size={18} color="#2A7DE1" />
                      <Text style={styles.editButtonText}>Edit Entry</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        console.log('Delete entry:', entry._id);
                        // TODO: Show confirmation modal
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC3545" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
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

              {/* AI Assessment - split into cards like assessment-results */}
              {entry.aiContext && (
                <View>
                  <Text style={[styles.sectionSubtitle, { fontFamily: FONTS.BarlowSemiCondensed, marginBottom: 12 }]}>Medical Triage Assessment</Text>
                  {renderAssessmentCards(entry.aiContext)}
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
        </View>
      </CurvedBackground>
      <BottomNavigation />
    </SafeAreaView>
  );
}

// ... keep your existing styles the same
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
    marginBottom: 15,
    padding: 10,
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
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A7DE1",
    gap: 8,
  },
  editButtonText: {
    fontSize: 15,
    color: "#2A7DE1",
    fontWeight: "600",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DC3545",
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    color: "#DC3545",
    fontWeight: "600",
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
  // Assessment card styles (match assessment-results)
  assessmentCard: {
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A7DE1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 4,
  },
  bulletPoint: {
    fontSize: 16,
    color: "#1A1A1A",
    marginRight: 8,
    marginTop: 2,
  },
  cardItemText: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    lineHeight: 22,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "left",
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