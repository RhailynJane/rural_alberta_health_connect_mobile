import { useRouter } from "expo-router";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { FONTS } from "../constants/constants";

export default function PrivacyPolicy() {
  const router = useRouter();

  const handleAgree = () => {
    router.replace("/auth/signup");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        {/* Fixed Header */}
          <CurvedHeader title="Privacy Policy" height={150} showLogo={false} bottomSpacing={0} />
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <View style={styles.contentSection}>
            <Text
              style={[styles.title, { fontFamily: FONTS.BarlowSemiCondensed, marginTop: 16 }]}
            >
              Privacy Policy for Rural Alberta Health Connect
            </Text>
            <Text
              style={[
                styles.effectiveDate,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Effective Date: September 23, 2025
            </Text>

            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Your privacy is paramount to us. This Privacy Policy explains how
              the Rural Alberta Health Connect project team (&quot;we,&quot;
              &quot;our,&quot; or &quot;us&quot;) collects, uses, discloses, and
              safeguards your personal and personal health information when you
              use our mobile application.
            </Text>
            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              We are committed to complying with Alberta&apos;s{" "}
              <Text style={styles.bold}>Health Information Act (HIA)</Text> and
              the federal{" "}
              <Text style={styles.bold}>
                Personal Information Protection and Electronic Documents Act
                (PIPEDA)
              </Text>
              .
            </Text>

            <Text
              style={[
                styles.heading,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              1. Information We Collect
            </Text>
            <Text
              style={[
                styles.subheading,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Personal Information:
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • <Text style={styles.bold}>Account Information:</Text> First
              name, last name, email address.
            </Text>
            <Text
              style={[
                styles.subheading,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Personal Health Information (PHI):
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • <Text style={styles.bold}>User-Inputted Data:</Text> Symptoms,
              general health information, and any other details you voluntarily
              provide for the purpose of receiving guidance.
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • <Text style={styles.bold}>Image Data (if applicable):</Text> If
              you choose to use a feature that involves uploading a photo, that
              image will be collected. We will only collect images when
              explicitly requested by the App to aid in assessment.
            </Text>

            <Text
              style={[
                styles.heading,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              2. How We Use Your Information
            </Text>
            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              We use your information solely for the following purposes:
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • To provide you with general health information and supportive
              guidance based on your inputs.
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • To operate, maintain, and improve the App&apos;s functionality
              for this educational project.
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • To communicate with you about your account or the App.
            </Text>
            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              <Text style={styles.bold}>
                We do not use your data for marketing, advertising, or
                commercial purposes.
              </Text>
            </Text>

            <Text
              style={[
                styles.heading,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              3. How We Protect Your Information
            </Text>
            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              We implement robust security measures to protect your data,
              including:
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • <Text style={styles.bold}>Encryption:</Text> Data is encrypted
              end-to-end using state-of-the-art techniques, both in transit and
              at rest.
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • <Text style={styles.bold}>Access Controls:</Text> Strict access
              controls ensure only authorized personnel involved in this project
              can access data on a need-to-know basis.
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • <Text style={styles.bold}>Data Minimization:</Text> We only
              collect information that is strictly necessary for the App&apos;s
              supportive function.
            </Text>

            <Text
              style={[
                styles.heading,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              4. Data Sharing and Disclosure
            </Text>
            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              <Text style={styles.bold}>
                We do not sell, trade, or rent your Personal Health Information
                to third parties.
              </Text>{" "}
              We may share anonymized, aggregated data for the purpose of
              academic research or project analysis, but this data cannot be
              used to identify you.
            </Text>
            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Disclosure of your PHI will only occur in the following limited
              circumstances:
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • With your explicit, informed consent for a specific purpose.
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • If required by law (e.g., by court order).
            </Text>

            <Text
              style={[
                styles.heading,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              5. Data Storage and Sovereignty
            </Text>
            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              Your data will be stored on servers located within Canada to
              ensure compliance with Canadian privacy laws (HIA and PIPEDA).
            </Text>

            <Text
              style={[
                styles.heading,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              6. Your Rights
            </Text>
            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              You have the right to:
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • <Text style={styles.bold}>Access:</Text> Request access to the
              personal information we hold about you.
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • <Text style={styles.bold}>Correction:</Text> Request corrections
              to any inaccurate or incomplete information.
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • <Text style={styles.bold}>Withdraw Consent:</Text> You may
              withdraw your consent for the collection, use, or disclosure of
              your information at any time, subject to legal or contractual
              restrictions. To do so, please contact us at the email below.
            </Text>
            <Text
              style={[
                styles.listItem,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              • <Text style={styles.bold}>Deletion:</Text> You can request the
              deletion of your account and associated data.
            </Text>

            <Text
              style={[
                styles.heading,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              7. Changes to This Privacy Policy
            </Text>
            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              We may update this policy as part of our project&apos;s
              development. The &quot;Effective Date&quot; at the top will
              indicate when changes were made.
            </Text>

            <Text
              style={[
                styles.heading,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              8. Contact Us
            </Text>
            <Text
              style={[
                styles.paragraph,
                { fontFamily: FONTS.BarlowSemiCondensed },
              ]}
            >
              If you have any questions about these Terms of Service, please
              contact us at:{"\n"}
              Rhailyn Jane Cona - rhailynjane.cona@edu.sait.ca{"\n"}
              Yue Zhou - Yue.Zhou@edu.sait.ca
            </Text>

            {/* I Agree Button - Now at the end of content */}
            <View style={styles.agreeButtonContainer}>
              <TouchableOpacity 
                style={styles.agreeButton}
                onPress={handleAgree}
              >
                <Text
                  style={[
                    styles.agreeButtonText,
                    { fontFamily: FONTS.BarlowSemiCondensed },
                  ]}
                >
                  I Agree
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 30,
    paddingBottom: 40,
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
  subheading: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginTop: 12,
    marginBottom: 4,
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
  agreeButtonContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  agreeButton: {
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  agreeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});