import { useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CurvedBackground from "../app/components/curvedBackground";
import CurvedHeader from "../app/components/curvedHeader";

export default function Onboarding() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          {/* Header Section using CurvedHeader - NO line breaks in the text */}
          <CurvedHeader
            title="Your trusted healthcare companion for rural Alberta communities"
            backgroundColor="rgba(214, 227, 240, 0.9)"
            textColor="#2c3e50"
            height={200}
          />
        </ScrollView>
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  contentSection: {
    padding: 24,
    paddingTop: 40,
  },
});