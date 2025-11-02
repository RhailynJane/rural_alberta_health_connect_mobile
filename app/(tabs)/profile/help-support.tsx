import { api } from "@/convex/_generated/api";
import { useAction, useConvexAuth, useQuery } from "convex/react";

import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    SafeAreaView, ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from "react-native";
import { getReminders, ReminderItem } from "../../_utils/notifications";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

import Icon from "react-native-vector-icons/MaterialIcons";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import StatusModal from "../../components/StatusModal";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

export default function HelpSupport() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { isOnline } = useNetworkStatus();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  // State for reminders (for notification bell)
  const [reminders, setReminders] = useState<ReminderItem[]>([]);

  // Load reminders for notification bell
  useEffect(() => {
    if (!currentUser?._id) return;
    (async () => {
      const stored = await getReminders();
      setReminders(stored);
    })();
  }, [currentUser?._id]);

  // Expandable sections
  const [expandedSections, setExpandedSections] = useState({
    faq: false,
    userGuide: false,
    feedback: false,
    reportIssue: false,
  });

  // Expanded FAQ items
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // Feedback and Report Issue forms
  const [feedbackText, setFeedbackText] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');

  // FAQ data
  const faqs: FAQ[] = [
    {
      id: 1,
      question: "How do I create an account?",
      answer: "Open the app and tap 'Sign Up'. Fill in your personal information, accept the terms and privacy policy, then complete your medical history and emergency contact information.",
      category: "Getting Started"
    },
    {
      id: 2,
      question: "What do I do if I forgot my password?",
      answer: "On the sign-in screen, tap 'Forgot Password?'. Enter your registered email address, check your email for an OTP (One-Time Password), enter it in the app, and create a new password.",
      category: "Account"
    },
    {
      id: 3,
      question: "How do I use the AI Health Assessment?",
      answer: "Tap 'AI Assessment' from the Dashboard or bottom navigation. Start a new assessment, describe your symptoms in detail, select duration and severity, then review the AI-generated health insights and recommendations. Remember, this is NOT a medical diagnosis.",
      category: "Features"
    },
    {
      id: 4,
      question: "How do I set up health reminders?",
      answer: "Go to Profile → App Settings → Symptom Assessment Reminder. Toggle 'Enable Reminder', then tap 'Add Reminder' to set your preferred times. You can add daily or custom weekly reminders.",
      category: "Reminders"
    },
    {
      id: 5,
      question: "What works offline?",
      answer: "You can view existing health entries, add new health logs (syncs later), access downloaded offline maps, view emergency contacts, see previous assessment results, and navigate the app. New AI assessments and downloading maps require internet.",
      category: "Offline"
    },
    {
      id: 6,
      question: "How do I download offline maps?",
      answer: "Go to Profile → App Settings → Offline Maps OR Emergency → Offline Maps. Select your region and tap Download. Note: This requires WiFi and may be a large file size.",
      category: "Emergency"
    },
    {
      id: 7,
      question: "Is my health data secure?",
      answer: "Yes! Your personal information is encrypted and stored locally on your device. No data is shared without your explicit consent. We follow Canadian privacy laws and best practices for health data security.",
      category: "Privacy"
    },
    {
      id: 8,
      question: "Can I use this app for emergencies?",
      answer: "RAHC provides quick access to emergency services and your location, but for serious medical emergencies, always call 911 immediately. The app is designed to assist, not replace, emergency services.",
      category: "Emergency"
    },
    {
      id: 9,
      question: "Why are my notifications not working?",
      answer: "Check device notification settings, verify notifications are enabled in Profile → App Settings, disable 'Do Not Disturb' mode, and restart the app. Make sure you granted notification permissions when first setting up reminders.",
      category: "Troubleshooting"
    },
    {
      id: 10,
      question: "How do I update my profile information?",
      answer: "Go to Profile → Profile Information. Tap 'Edit' next to the section you want to update (Personal Info, Emergency Contact, or Medical Info), make your changes, and tap 'Done' to save.",
      category: "Profile"
    },
  ];

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleFAQ = (id: number) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleViewUserGuide = async () => {
    const url = "https://rahc-website.vercel.app/user-guide";
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        "User Guide",
        "Unable to open the user guide. Please visit: https://rahc-website.vercel.app/user-guide",
        [{ text: "OK" }]
      );
    }
  };

  // Use Convex actions for feedback and issue reporting
  const sendFeedbackAction = useAction(api.feedbackActions.sendFeedbackEmail);
  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) {
      setModalType('error');
      setModalTitle('Missing Feedback');
      setModalMessage('Please enter your feedback before submitting.');
      setModalVisible(true);
      return;
    }
    if (!isOnline) {
      setModalType('warning');
      setModalTitle('Offline');
      setModalMessage('You need an internet connection to send feedback. Your feedback has been saved and you can submit it when you\'re back online.');
      setModalVisible(true);
      return;
    }
    try {
      const userEmail = currentUser?.email || "unknown";
      await sendFeedbackAction({ userEmail, message: feedbackText });
      setFeedbackText("");
      setModalType('success');
      setModalTitle('Feedback Sent');
      setModalMessage('Thank you for your feedback! It has been sent to our team.');
      setModalVisible(true);
    } catch {
      setModalType('error');
      setModalTitle('Error');
      setModalMessage('Could not send feedback. Please try again later.');
      setModalVisible(true);
    }
  };

  const reportIssueAction = useAction(api.feedbackActions.reportIssueEmail);
  const handleReportIssue = async () => {
    if (!issueTitle.trim() || !issueDescription.trim()) {
      setModalType('error');
      setModalTitle('Missing Information');
      setModalMessage('Please fill in both the issue title and description.');
      setModalVisible(true);
      return;
    }
    if (!isOnline) {
      setModalType('warning');
      setModalTitle('Offline');
      setModalMessage('You need an internet connection to report issues. Your issue report has been saved and you can submit it when you\'re back online.');
      setModalVisible(true);
      return;
    }
    try {
      const userEmail = currentUser?.email || "unknown";
      await reportIssueAction({ userEmail, title: issueTitle, description: issueDescription });
      setIssueTitle("");
      setIssueDescription("");
      setModalType('success');
      setModalTitle('Issue Reported');
      setModalMessage('Thank you for reporting the issue! Our team will review it as soon as possible.');
      setModalVisible(true);
    } catch {
      setModalType('error');
      setModalTitle('Error');
      setModalMessage('Could not send issue report. Please try again later.');
      setModalVisible(true);
    }
  };

  const handleEmailSupport = async () => {
    try {
      const mailtoUrl = "mailto:ruralalbertahealthconnect@gmail.com";
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          "Email Support",
          "Please send your inquiries to:\nruralalbertahealthconnect@gmail.com",
          [{ text: "OK" }]
        );
      }
    } catch {
      Alert.alert(
        "Email Support",
        "Please send your inquiries to:\nruralalbertahealthconnect@gmail.com",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CurvedBackground>
        <CurvedHeader
          title="Help & Support"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
          reminderEnabled={reminders.some((r) => r.enabled)}
          reminderSettings={
            reminders.find((r) => r.enabled && r.frequency !== "hourly")
              ? {
                  enabled: true,
                  time: reminders.find((r) => r.enabled && r.frequency !== "hourly")?.time || "09:00",
                  frequency: reminders.find((r) => r.enabled && r.frequency !== "hourly")?.frequency as "daily" | "weekly",
                  dayOfWeek: reminders.find((r) => r.enabled && r.frequency !== "hourly")?.dayOfWeek,
                }
              : null
          }
        />
        <DueReminderBanner topOffset={120} />
        <ScrollView style={styles.container}>
          {/* Contact Support Card */}
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Icon name="email" size={24} color={COLORS.primary} />
              <Text style={styles.contactTitle}>Need Help?</Text>
            </View>
            <Text style={styles.contactText}>
              Contact our support team at:
            </Text>
            <TouchableOpacity onPress={handleEmailSupport}>
              <Text style={styles.emailLink}>ruralalbertahealthconnect@gmail.com</Text>
            </TouchableOpacity>
          </View>

          {/* Frequently Asked Questions */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("faq")}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name="question-answer" size={24} color={COLORS.primary} style={{ marginRight: 12 }} />
                <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
              </View>
              <Icon
                name={expandedSections.faq ? "expand-less" : "expand-more"}
                size={24}
                color={COLORS.darkGray}
              />
            </TouchableOpacity>

            {expandedSections.faq && (
              <View style={styles.faqContainer}>
                {faqs.map((faq) => (
                  <View key={faq.id} style={styles.faqItem}>
                    <TouchableOpacity
                      style={styles.faqQuestion}
                      onPress={() => toggleFAQ(faq.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.faqCategory}>{faq.category}</Text>
                        <Text style={styles.faqQuestionText}>{faq.question}</Text>
                      </View>
                      <Icon
                        name={expandedFAQ === faq.id ? "remove-circle-outline" : "add-circle-outline"}
                        size={24}
                        color={COLORS.primary}
                      />
                    </TouchableOpacity>
                    {expandedFAQ === faq.id && (
                      <View style={styles.faqAnswer}>
                        <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* User Guide */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("userGuide")}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name="menu-book" size={24} color={COLORS.primary} style={{ marginRight: 12 }} />
                <Text style={styles.cardTitle}>User Guide</Text>
              </View>
              <Icon
                name={expandedSections.userGuide ? "expand-less" : "expand-more"}
                size={24}
                color={COLORS.darkGray}
              />
            </TouchableOpacity>

            {expandedSections.userGuide && (
              <View style={styles.guideContainer}>
                <Text style={styles.guideText}>
                  Access the comprehensive RAHC User Guide for detailed instructions on:
                </Text>
                <View style={styles.guideList}>
                  <Text style={styles.guideItem}>• Getting started with RAHC</Text>
                  <Text style={styles.guideItem}>• Using AI Health Assessment</Text>
                  <Text style={styles.guideItem}>• Tracking your health</Text>
                  <Text style={styles.guideItem}>• Emergency services features</Text>
                  <Text style={styles.guideItem}>• Managing notifications & reminders</Text>
                  <Text style={styles.guideItem}>• Using offline features</Text>
                  <Text style={styles.guideItem}>• Troubleshooting common issues</Text>
                </View>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleViewUserGuide}
                  activeOpacity={0.7}
                >
                  <Icon name="description" size={20} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>View User Guide</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Feedback */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("feedback")}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name="feedback" size={24} color={COLORS.primary} style={{ marginRight: 12 }} />
                <Text style={styles.cardTitle}>Send Feedback</Text>
              </View>
              <Icon
                name={expandedSections.feedback ? "expand-less" : "expand-more"}
                size={24}
                color={COLORS.darkGray}
              />
            </TouchableOpacity>

            {expandedSections.feedback && (
              <View style={styles.formContainer}>
                <Text style={styles.formLabel}>
                  We&apos;d love to hear your thoughts! Share your feedback to help us improve RAHC.
                </Text>
                <TextInput
                  style={styles.textArea}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  placeholder="Share your feedback, suggestions, or what you love about RAHC..."
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSendFeedback}
                  activeOpacity={0.7}
                >
                  <Icon name="send" size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Send Feedback</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Report Issue */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => toggleSection("reportIssue")}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon name="bug-report" size={24} color={COLORS.primary} style={{ marginRight: 12 }} />
                <Text style={styles.cardTitle}>Report an Issue</Text>
              </View>
              <Icon
                name={expandedSections.reportIssue ? "expand-less" : "expand-more"}
                size={24}
                color={COLORS.darkGray}
              />
            </TouchableOpacity>

            {expandedSections.reportIssue && (
              <View style={styles.formContainer}>
                <Text style={styles.formLabel}>
                  Found a bug or issue? Let us know so we can fix it.
                </Text>
                <Text style={styles.inputLabel}>Issue Title</Text>
                <TextInput
                  style={styles.input}
                  value={issueTitle}
                  onChangeText={setIssueTitle}
                  placeholder="Brief description of the issue"
                  placeholderTextColor={COLORS.lightGray}
                />
                <Text style={styles.inputLabel}>Issue Description</Text>
                <TextInput
                  style={styles.textArea}
                  value={issueDescription}
                  onChangeText={setIssueDescription}
                  placeholder="Detailed description of the issue, including steps to reproduce..."
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleReportIssue}
                  activeOpacity={0.7}
                >
                  <Icon name="report-problem" size={20} color={COLORS.white} />
                  <Text style={styles.submitButtonText}>Report Issue</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back" size={20} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.backButtonText}>Back to Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </CurvedBackground>

      {/* StatusModal for success/error messages */}
      <StatusModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
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
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
  contactCard: {
    backgroundColor: COLORS.primary + "15",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + "30",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  contactTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 20,
    color: COLORS.darkText,
    marginLeft: 12,
  },
  contactText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
    marginBottom: 4,
  },
  emailLink: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: COLORS.darkText,
  },
  faqContainer: {
    marginTop: 16,
  },
  faqItem: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: 12,
  },
  faqQuestion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqCategory: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 4,
  },
  faqQuestionText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.darkText,
  },
  faqAnswer: {
    marginTop: 12,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  faqAnswerText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  guideContainer: {
    marginTop: 16,
  },
  guideText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
    marginBottom: 12,
  },
  guideList: {
    marginBottom: 16,
  },
  guideItem: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
  },
  formContainer: {
    marginTop: 16,
  },
  formLabel: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    color: COLORS.darkText,
    backgroundColor: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    color: COLORS.darkText,
    backgroundColor: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    minHeight: 120,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 100,
    marginTop: 8,
  },
  backButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
  },
});
