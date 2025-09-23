import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

export default function TermsOfService() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          {/* Header */}
          <CurvedHeader
            title="Terms of Service"
            height={120}
            showLogo={true}
          />

          <View style={styles.contentSection}>
            <Text style={[styles.title, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Terms of Service for Alberta Health Connect
            </Text>
            <Text style={[styles.effectiveDate, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              Effective Date: [Insert Date]
            </Text>

            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              <Text style={styles.bold}>PLEASE READ THESE TERMS OF SERVICE CAREFULLY BEFORE USING THE ALBERTA HEALTH CONNECT APPLICATION.</Text>
            </Text>

            <Text style={[styles.heading, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              1. Acceptance of Terms
            </Text>
            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              By creating an account or using the Alberta Health Connect application (&quot;the App&quot;), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use the App.
            </Text>

            <Text style={[styles.heading, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              2. Nature of the Service (Critical Disclaimer)
            </Text>
            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              <Text style={styles.bold}>The Alberta Health Connect App is a supportive information and guidance tool only.</Text> It is not a medical device and does not provide medical diagnosis, treatment, or advice.
            </Text>
            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              The App uses an AI-assisted system to provide general health information and suggestions for potential next steps based on user-inputted symptoms.{" "}
              <Text style={styles.bold}>This information is not a substitute for professional medical advice, diagnosis, or treatment from a qualified healthcare provider.</Text>
            </Text>
            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              <Text style={styles.bold}>Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.</Text> Never disregard professional medical advice or delay in seeking it because of something you have read or interpreted within this App. In a medical emergency, call 911 or your local emergency number immediately.
            </Text>

            <Text style={[styles.heading, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              3. User Responsibilities
            </Text>
            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              You agree to:
            </Text>
            <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              • Provide accurate and truthful information about yourself.
            </Text>
            <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              • Use the App only for its intended purpose as a supportive health information tool.
            </Text>
            <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              • Not use the App for medical emergencies.
            </Text>
            <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              • Maintain the security and confidentiality of your account credentials.
            </Text>
            <Text style={[styles.listItem, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              • Contact your healthcare provider for any personal health concerns.
            </Text>

            <Text style={[styles.heading, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              4. Intellectual Property
            </Text>
            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              The App, including its text, graphics, logos, and software, is the property of the Alberta Health Connect project team and its licensors and is protected by intellectual property laws. You are granted a limited license to use the App for its intended purposes.
            </Text>

            <Text style={[styles.heading, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              5. Limitation of Liability
            </Text>
            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              <Text style={styles.bold}>To the fullest extent permitted by law, the Alberta Health Connect project team, its members, and partners shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the App, or any decisions made or actions taken based on information provided by the App.</Text>
            </Text>

            <Text style={[styles.heading, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              6. Project Status
            </Text>
            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              You acknowledge that this version of the Alberta Health Connect App is part of an educational project. It is a prototype and not a commercially deployed medical product. Its primary purpose is for research and demonstration within an academic or project-based setting.
            </Text>

            <Text style={[styles.heading, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              7. Governing Law
            </Text>
            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              These Terms shall be governed by and construed in accordance with the laws of the Province of Alberta and the laws of Canada applicable therein.
            </Text>

            <Text style={[styles.heading, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              8. Contact Us
            </Text>
            <Text style={[styles.paragraph, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              If you have any questions about these Terms of Service, please contact us at: [Insert Project Email Address].
            </Text>
          </View>
        </ScrollView>
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
  },
  contentSection: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  effectiveDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
    marginBottom: 12,
    textAlign: "justify",
  },
  listItem: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
    marginBottom: 4,
    marginLeft: 16,
  },
  bold: {
    fontWeight: "600",
  },
});