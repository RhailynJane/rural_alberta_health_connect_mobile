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
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section using CurvedHeader */}
          <CurvedHeader
            title="Your trusted healthcare companion"
            subtitle="for rural Alberta communities"
            backgroundColor="rgba(214, 227, 240, 0.9)"
            textColor="#2c3e50"
            height={180}
          />
        </ScrollView>
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
});