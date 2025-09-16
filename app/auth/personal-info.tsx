import { useRouter } from "expo-router";
import {
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
} from "react-native";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";

export default function PersonalInfo() {
  const router = useRouter();


  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with logo */}
            <CurvedHeader
              title="Alberta Health Connect"
              height={120}
              showLogo={true}
            />

          </ScrollView>
        </KeyboardAvoidingView>
      </CurvedBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});