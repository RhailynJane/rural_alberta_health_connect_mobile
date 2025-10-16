import { useState, useEffect } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import { FONTS } from "../../constants/constants";

// Mock health entry data (no Convex)
interface HealthEntry {
  id: string;
  date: string;
  symptoms: string;
  severity: number;
  category: string;
}

const generateMockData = (): HealthEntry[] => {
  const symptoms = ["Headache", "Fever", "Cough", "Fatigue", "Nausea", "Back Pain"];
  const categories = ["General", "Respiratory", "Digestive", "Musculoskeletal"];
  const entries: HealthEntry[] = [];

  for (let i = 0; i < 100; i++) {
    entries.push({
      id: `entry-${i}`,
      date: new Date(Date.now() - i * 86400000).toISOString().split("T")[0],
      symptoms: symptoms[Math.floor(Math.random() * symptoms.length)],
      severity: Math.floor(Math.random() * 10) + 1,
      category: categories[Math.floor(Math.random() * categories.length)],
    });
  }

  return entries;
};

export default function PerformanceTest() {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [counter, setCounter] = useState(0);
  const [renderTime, setRenderTime] = useState(0);

  useEffect(() => {
    const start = performance.now();
    console.log("🚀 [Performance Test] Component mounted");

    const mockData = generateMockData();
    setEntries(mockData);

    const end = performance.now();
    const loadTime = end - start;
    setRenderTime(loadTime);

    console.log(`⏱️ [Performance Test] Initial render time: ${loadTime.toFixed(2)}ms`);
    console.log(`📊 [Performance Test] Loaded ${mockData.length} entries`);
  }, []);

  const handleButtonPress = () => {
    const start = performance.now();
    setCounter(counter + 1);
    const end = performance.now();
    console.log(`🔘 [Performance Test] Button press response: ${(end - start).toFixed(2)}ms`);
  };

  const handleRefresh = () => {
    const start = performance.now();
    console.log("🔄 [Performance Test] Refreshing data...");

    const newData = generateMockData();
    setEntries(newData);

    const end = performance.now();
    const refreshTime = end - start;
    setRenderTime(refreshTime);

    console.log(`⏱️ [Performance Test] Refresh time: ${refreshTime.toFixed(2)}ms`);
  };

  const getSeverityColor = (severity: number): string => {
    if (severity <= 3) return "#28A745";
    if (severity <= 6) return "#FFC107";
    return "#DC3545";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => console.log("📜 [Performance Test] Scroll started")}
          onScrollEndDrag={() => console.log("📜 [Performance Test] Scroll ended")}
        >
          <CurvedHeader title="Performance Test" height={120} showLogo={true} />

          <View style={styles.contentSection}>
            {/* Stats Card */}
            <View style={styles.statsCard}>
              <Text style={[styles.statsTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Performance Stats (No Convex)
              </Text>
              <Text style={[styles.statsText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Entries: {entries.length}
              </Text>
              <Text style={[styles.statsText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Render Time: {renderTime.toFixed(2)}ms
              </Text>
              <Text style={[styles.statsText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Counter: {counter}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleButtonPress}>
                <Text style={[styles.buttonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Increment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, styles.refreshButton]} onPress={handleRefresh}>
                <Text style={[styles.buttonText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>

            {/* Health Entries List */}
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Mock Health Entries
              </Text>
            </View>

            {entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => console.log(`🔍 [Performance Test] Entry tapped: ${entry.id}`)}
              >
                <View style={styles.entryHeader}>
                  <Text style={[styles.entrySymptom, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {entry.symptoms}
                  </Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(entry.severity) }]}>
                    <Text style={[styles.severityText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                      {entry.severity}/10
                    </Text>
                  </View>
                </View>
                <View style={styles.entryDetails}>
                  <Text style={[styles.entryCategory, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {entry.category}
                  </Text>
                  <Text style={[styles.entryDate, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {entry.date}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

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
    paddingBottom: 120,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
  statsCard: {
    backgroundColor: "#E3F2FD",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#90CAF9",
    marginBottom: 20,
    marginTop: -30,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1565C0",
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
    color: "#1976D2",
    marginBottom: 4,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#2A7DE1",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  refreshButton: {
    backgroundColor: "#28A745",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  listHeader: {
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  entryCard: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  entrySymptom: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  entryDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryCategory: {
    fontSize: 14,
    color: "#666",
  },
  entryDate: {
    fontSize: 14,
    color: "#999",
  },
});
