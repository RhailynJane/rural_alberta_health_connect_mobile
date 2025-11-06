import { api } from "@/convex/_generated/api";
import { useAction, useConvexAuth, useQuery } from "convex/react";

// Removed Picker in favor of StatusModal-based selector for priority
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const [issuePriority, setIssuePriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [issuePhotos, setIssuePhotos] = useState<{ uri: string; base64: string; mimeType: string; fileName: string }[]>([]);
  const DESCRIPTION_MAX = 1000;
  const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
  const MAX_PHOTO_DIM = 1280; // px
  const [priorityModalVisible, setPriorityModalVisible] = useState(false);

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
      answer: "Go to the Emergency tab and tap ‘Download Maps’. Choose a region and tap Download. Use Wi‑Fi — regions are typically 10–50 MB.",
      category: "Emergency"
    },
    {
      id: 11,
      question: "Where do I access offline maps after downloading?",
      answer: "Open the Emergency tab — the map automatically uses your downloaded map tiles when you’re offline. ‘Tiles’ are the small pieces of the map saved for the regions you downloaded, so the background map still shows without internet. Clinic markers come from your last saved results (from your last online search). Directions may still need internet unless your maps app cached a route.\n\nExample: Before a trip, go to Emergency → Download Maps and download ‘Calgary & Area’ and ‘Highway 2 Corridor’. While driving with no signal, open the Emergency tab — the map loads from your downloaded tiles and you can still see clinics from your last refresh. Opening turn‑by‑turn directions may require connectivity.",
      category: "Emergency"
    },
    {
      id: 12,
      question: "How do I add or generate notifications?",
      answer: "Notifications are created by your reminders and important app updates — you don’t add them directly on the Notifications tab. To create them, set up reminders: Go to Profile → App Settings → Symptom Assessment Reminder. Toggle ‘Enable Reminder’, then tap ‘Add Reminder’ to choose the time (and day if weekly). You’ll receive a notification at those times, and it will appear in the Notifications bell.\n\nTips: Make sure notification permissions are allowed for RAHC in your device settings, and that Do Not Disturb is off during your reminder time. If you still don’t see notifications, see ‘Why are my notifications not working?’ below.",
      category: "Notifications"
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
    if (!issueTitle.trim()) {
      setModalType('error');
      setModalTitle('Missing Title');
      setModalMessage('Please enter an issue title.');
      setModalVisible(true);
      return;
    }
    if (!issueDescription.trim()) {
      setModalType('error');
      setModalTitle('Missing Description');
      setModalMessage('Please provide a description of the issue.');
      setModalVisible(true);
      return;
    }
    if (issueDescription.length > DESCRIPTION_MAX) {
      setModalType('error');
      setModalTitle('Description Too Long');
      setModalMessage(`Please keep the description under ${DESCRIPTION_MAX} characters.`);
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
      await reportIssueAction({
        userEmail,
        title: issueTitle,
        description: issueDescription,
        priority: issuePriority,
        photos: issuePhotos.length
          ? issuePhotos.map(p => ({ fileName: p.fileName, mimeType: p.mimeType, base64: p.base64 }))
          : undefined,
      });
      setIssueTitle("");
      setIssueDescription("");
      setIssuePriority("Medium");
      setIssuePhotos([]);
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

  const pickIssuePhoto = async () => {
    if (issuePhotos.length >= 2) {
      setModalType('warning');
      setModalTitle('Attachment Limit');
      setModalMessage('You can attach up to 2 photos. Remove one to add another.');
      setModalVisible(true);
      return;
    }
    // Request media library permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setModalType('warning');
      setModalTitle('Permission Needed');
      setModalMessage('We need access to your photos to attach an image.');
      setModalVisible(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      selectionLimit: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const uri = asset.uri ?? '';
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const fileName = asset.fileName ?? `issue_${Date.now()}.jpg`;

      // Resize and compress to keep under size limits
      const needsResize = (asset.width ?? 0) > MAX_PHOTO_DIM || (asset.height ?? 0) > MAX_PHOTO_DIM;
      const resizeAction = needsResize
        ? (asset.width ?? 0) >= (asset.height ?? 0)
          ? [{ resize: { width: MAX_PHOTO_DIM } }]
          : [{ resize: { height: MAX_PHOTO_DIM } }]
        : [];

      const manipulated = await manipulateAsync(uri, resizeAction, {
        compress: 0.6,
        format: SaveFormat.JPEG,
        base64: true,
      });

      const finalBase64 = manipulated.base64 ?? asset.base64 ?? '';
      const finalUri = manipulated.uri ?? uri;
      if (!finalBase64) {
        setModalType('error');
        setModalTitle('Attachment Error');
        setModalMessage('Could not process image data. Please try another photo.');
        setModalVisible(true);
        return;
      }

      const approxBytes = Math.floor((finalBase64.length * 3) / 4);
      if (approxBytes > MAX_PHOTO_BYTES) {
        setModalType('warning');
        setModalTitle('Photo Too Large');
        setModalMessage('Each photo must be under 2 MB. Try a smaller image.');
        setModalVisible(true);
        return;
      }

      setIssuePhotos(prev => [...prev, { uri: finalUri, base64: finalBase64, mimeType, fileName }]);
    }
  };
  
  const removeIssuePhotoAt = (index: number) =>
    setIssuePhotos(prev => prev.filter((_, i) => i !== index));

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
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
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

                <Text style={styles.inputLabel}>Priority</Text>
                <TouchableOpacity
                  style={styles.selectRow}
                  onPress={() => setPriorityModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectRowValue}>{issuePriority}</Text>
                  <Icon name="keyboard-arrow-down" size={22} color={COLORS.darkGray} />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Issue Description</Text>
                <TextInput
                  style={styles.textArea}
                  value={issueDescription}
                  onChangeText={(t) => setIssueDescription(t.slice(0, DESCRIPTION_MAX))}
                  placeholder={`Detailed description of the issue (max ${DESCRIPTION_MAX} characters)...`}
                  placeholderTextColor={COLORS.lightGray}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{issueDescription.length}/{DESCRIPTION_MAX}</Text>

                <View style={styles.attachmentRow}>
                  <TouchableOpacity style={styles.actionButton} onPress={pickIssuePhoto} activeOpacity={0.7}>
                    <Icon name="attach-file" size={20} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Add Photo</Text>
                  </TouchableOpacity>
                  <Text style={styles.limitNote}>Up to 2 photos, each under 2 MB</Text>
                </View>
                {issuePhotos.length > 0 && (
                  <View>
                    {issuePhotos.map((p, idx) => (
                      <View key={`${p.fileName}-${idx}`} style={styles.attachmentPreview}>
                        <Image source={{ uri: p.uri }} style={styles.attachmentImage} />
                        <View style={styles.attachmentActions}>
                          <Text style={styles.attachmentName}>{p.fileName}</Text>
                          <TouchableOpacity onPress={() => removeIssuePhotoAt(idx)}>
                            <Text style={styles.removeAttachment}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

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

      {/* Priority selection modal */}
      <StatusModal
        visible={priorityModalVisible}
        type="info"
        title="Select Priority"
        message="Choose an issue priority."
        onClose={() => setPriorityModalVisible(false)}
        buttons={[
          { label: 'Low', onPress: () => { setIssuePriority('Low'); setPriorityModalVisible(false); } },
          { label: 'Medium', onPress: () => { setIssuePriority('Medium'); setPriorityModalVisible(false); } },
          { label: 'High', onPress: () => { setIssuePriority('High'); setPriorityModalVisible(false); } },
          { label: 'Critical', onPress: () => { setIssuePriority('Critical'); setPriorityModalVisible(false); } },
          { label: 'Cancel', onPress: () => setPriorityModalVisible(false), variant: 'secondary' },
        ]}
      />
    </SafeAreaView>
  );
}

// Priority selection modal using StatusModal for consistency
// Rendered after component to keep JSX readable

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
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  charCount: {
    alignSelf: "flex-end",
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  attachmentPreview: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    overflow: "hidden",
  },
  attachmentImage: {
    width: "100%",
    height: 160,
  },
  attachmentActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fafafa",
  },
  attachmentName: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
  },
  removeAttachment: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  selectRow: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectRowValue: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
  },
  limitNote: {
    flex: 1,
    marginLeft: 12,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    flexWrap: 'wrap',
  },
});
