import { useAction, useConvexAuth, useQuery } from "convex/react";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";

import { api } from "../../../convex/_generated/api";
import { getReminders, ReminderItem } from "../../_utils/notifications";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import StatusModal from "../../components/StatusModal";
import { COLORS, FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
}

interface PhotoData {
  uri: string;
  base64: string;
  mimeType: string;
  fileName: string;
}

const DESCRIPTION_MAX = 500;
const MAX_PHOTO_DIM = 1024;
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

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
    answer: "Go to the Emergency tab and tap 'Download Maps'. Choose a region and tap Download. Use Wi‑Fi — regions are typically 10–50 MB.",
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
  {
    id: 11,
    question: "Where do I access offline maps after downloading?",
    answer: "Open the Emergency tab — the map automatically uses your downloaded map tiles when you're offline. 'Tiles' are the small pieces of the map saved for the regions you downloaded, so the background map still shows without internet. Clinic markers come from your last saved results (from your last online search). Directions may still need internet unless your maps app cached a route.",
    category: "Emergency"
  },
  {
    id: 12,
    question: "How do I add or generate notifications?",
    answer: "Notifications are created by your reminders and important app updates — you don't add them directly on the Notifications tab. To create them, set up reminders: Go to Profile → App Settings → Symptom Assessment Reminder. Toggle 'Enable Reminder', then tap 'Add Reminder' to choose the time (and day if weekly).",
    category: "Notifications"
  },
];

export default function HelpSupport() {
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, isAuthenticated && !isLoading ? {} : "skip");
  const reportIssueAction = useAction(api.feedbackActions.reportIssueEmail);
  const sendFeedbackAction = useAction(api.feedbackActions.sendFeedbackEmail);

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  
  // FAQ expandable
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  
  // Active modal section
  const [activeModal, setActiveModal] = useState<'faq' | 'guide' | 'feedback' | 'issue' | null>(null);
  
  // Feedback form
  const [feedbackText, setFeedbackText] = useState("");
  
  // Issue report form
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issuePriority, setIssuePriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [issuePhotos, setIssuePhotos] = useState<PhotoData[]>([]);

  useEffect(() => {
    (async () => {
      const stored = await getReminders();
      setReminders(stored);
    })();
  }, []);

  // Enable smooth layout animations (Android requires experimental flag)
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const toggleFAQ = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleEmailSupport = async () => {
    try {
      await Linking.openURL("mailto:ruralalbertahealthconnect@gmail.com");
    } catch {
      Alert.alert(
        "Email Support",
        "Could not open email app. Please send your inquiries to:\nruralalbertahealthconnect@gmail.com",
        [{ text: "OK" }]
      );
    }
  };

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
      setModalMessage('You need an internet connection to send feedback.');
      setModalVisible(true);
      return;
    }
    try {
      const userEmail = (currentUser as any)?.email || "unknown";
      await sendFeedbackAction({ userEmail, message: feedbackText });
      setFeedbackText("");
      setActiveModal(null);
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
      const userEmail = (currentUser as any)?.email || "unknown";
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
      setActiveModal(null);
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
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.heroTitle}>Find answers to common questions and get the help you need</Text>

          {/* Cards Grid */}
          <View style={styles.cardsGrid}>
            {/* FAQ Card */}
            <TouchableOpacity 
              style={[styles.sectionCard, activeModal === 'faq' && styles.sectionCardActive]}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveModal('faq'); }}
              activeOpacity={0.7}
            >
              <View style={styles.sectionIcon}>
                <Icon name="question-answer" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionCardTitle}>FAQ</Text>
              <Text style={styles.sectionCardSubtitle}>Common Questions</Text>
            </TouchableOpacity>

            {/* User Guide Card */}
            <TouchableOpacity 
              style={[styles.sectionCard, activeModal === 'guide' && styles.sectionCardActive]}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveModal('guide'); }}
              activeOpacity={0.7}
            >
              <View style={styles.sectionIcon}>
                <Icon name="menu-book" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionCardTitle}>User Guide</Text>
              <Text style={styles.sectionCardSubtitle}>Learn More</Text>
            </TouchableOpacity>

            {/* Send Feedback Card */}
            <TouchableOpacity 
              style={[styles.sectionCard, activeModal === 'feedback' && styles.sectionCardActive]}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveModal('feedback'); }}
              activeOpacity={0.7}
            >
              <View style={styles.sectionIcon}>
                <Icon name="feedback" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionCardTitle}>Feedback</Text>
              <Text style={styles.sectionCardSubtitle}>Share Thoughts</Text>
            </TouchableOpacity>

            {/* Report Issue Card */}
            <TouchableOpacity 
              style={[styles.sectionCard, activeModal === 'issue' && styles.sectionCardActive]}
              onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setActiveModal('issue'); }}
              activeOpacity={0.7}
            >
              <View style={styles.sectionIcon}>
                <Icon name="bug-report" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionCardTitle}>Report</Text>
              <Text style={styles.sectionCardSubtitle}>Report Issue</Text>
            </TouchableOpacity>
          </View>

          {/* Contact Card */}
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
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity style={styles.actionButton} onPress={handleEmailSupport} activeOpacity={0.7}>
                <Icon name="email" size={20} color={COLORS.white} />
                <Text style={styles.actionButtonText}>Email Support</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </CurvedBackground>

      {/* Modal Sections */}
      <Modal
        visible={!!activeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                {activeModal === 'faq' && <Icon name="question-answer" size={22} color={COLORS.primary} />}
                {activeModal === 'guide' && <Icon name="menu-book" size={22} color={COLORS.primary} />}
                {activeModal === 'feedback' && <Icon name="feedback" size={22} color={COLORS.primary} />}
                {activeModal === 'issue' && <Icon name="bug-report" size={22} color={COLORS.primary} />}
                <Text style={styles.modalTitle}>
                  {activeModal === 'faq' && 'Frequently Asked Questions'}
                  {activeModal === 'guide' && 'User Guide'}
                  {activeModal === 'feedback' && 'Send Feedback'}
                  {activeModal === 'issue' && 'Report an Issue'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color={COLORS.darkText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {activeModal === 'faq' && (
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

              {activeModal === 'guide' && (
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

              {activeModal === 'feedback' && (
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

              {activeModal === 'issue' && (
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
                  <View style={styles.selectRow}>
                    <Text style={styles.selectRowValue}>{issuePriority}</Text>
                    <Icon name="keyboard-arrow-down" size={22} color={COLORS.darkGray} />
                  </View>

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
            </ScrollView>
          </View>
        </View>
      </Modal>

      <StatusModal
        visible={modalVisible}
        message={modalMessage}
        type={modalType}
        title={modalTitle}
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
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "transparent",
  },
  heroTitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 16,
    color: COLORS.darkText,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 22,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 0,
    marginBottom: 20,
    gap: 12,
  },
  sectionCard: {
    width: '47%',
    aspectRatio: 1.05,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  sectionCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 1,
    elevation: 3,
  },
  sectionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(67,160,71,0.12)',
    marginBottom: 10,
  },
  sectionCardTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.darkText,
    marginTop: 2,
    textAlign: 'left',
  },
  sectionCardSubtitle: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 4,
    textAlign: 'left',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.darkText,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  contactTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 18,
    color: COLORS.darkText,
    marginLeft: 12,
  },
  contactText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  emailLink: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  faqContainer: {
    paddingHorizontal: 0,
    paddingBottom: 16,
  },
  faqItem: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingVertical: 12,
  },
  faqQuestion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  faqCategory: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 4,
  },
  faqQuestionText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: COLORS.darkText,
    flex: 1,
  },
  faqAnswer: {
    marginTop: 12,
    paddingLeft: 16,
    paddingRight: 8,
  },
  faqAnswerText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  guideContainer: {
    padding: 16,
  },
  guideText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  guideList: {
    marginVertical: 12,
  },
  guideItem: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
    marginBottom: 8,
    lineHeight: 20,
  },
  formContainer: {
    padding: 16,
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
