import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CurvedBackground from "../app/components/curvedBackground";

export default function Onboarding() {
  const router = useRouter();

  return (
    <SafeAreaView>
    <CurvedBackground>
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.headerText}>
          Your trusted healthcare companion{'\n'}
          for rural Alberta communities
        </Text>
      </View>
    </ScrollView>
    </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  headerSection: {
    backgroundColor: 'rgba(214, 227, 240, 0.9)', 
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingVertical: 40,
    marginTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerText: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#2c3e50',
    lineHeight: 32,
  },
});