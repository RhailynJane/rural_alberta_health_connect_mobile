/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from "react-native";

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../convex/_generated/api";
import { useWatermelonDatabase } from "../../../watermelon/hooks/useDatabase";
import { healthEntriesEvents } from "../../_context/HealthEntriesEvents";

// YOLO Pipeline for wound detection
import { formatForGemini, runPipeline, type PipelineResult } from "../../../utils/yolo";

// On-device LLM for offline assessment (use Static variant - no streaming re-renders)
import { useWoundLLMStatic } from "../../../utils/llm";
import { getSeverityBasedGuidance, formatOfflineResult } from "../../../utils/llm/offlineFallback";

import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import { FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

/**
 * Compresses and resizes an image to reduce file size for API transmission
 * Target: Keep images under 500KB each
 */
async function compressImage(uri: string): Promise<string> {
  try {
    console.log(`🔄 Compressing image: ${uri.substring(0, 50)}...`);
    
    // Resize to max 1200px width/height while maintaining aspect ratio
    // Compress to 0.7 quality (good balance between quality and size)
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }], // Maintains aspect ratio
      { 
        compress: 0.7, 
        format: ImageManipulator.SaveFormat.JPEG 
      }
    );
    
    console.log(`✅ Image compressed: ${manipulatedImage.uri.substring(0, 50)}...`);
    return manipulatedImage.uri;
  } catch (error) {
    console.error("⚠️ Error compressing image, using original:", error);
    return uri; // Fallback to original if compression fails
  }
}

/**
 * Converts an image URI to base64 string using Expo SDK 54+ File API
 * Now includes automatic compression before conversion
 */
async function convertImageToBase64(uri: string): Promise<string> {
  try {
    // Compress image first
    const compressedUri = await compressImage(uri);
    
    const file = new FileSystem.File(compressedUri);
    const base64 = await file.base64();
    
    // Log approximate size
    const sizeKB = Math.round((base64.length * 0.75) / 1024);
    console.log(`📊 Converted image size: ~${sizeKB}KB`);
    
    return base64;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    throw error;
  }
}

/**
 * Converts multiple image URIs to base64 strings with compression
 */
async function convertImagesToBase64(uris: string[]): Promise<string[]> {
  console.log(`📸 Converting ${uris.length} images to base64 with compression...`);
  const conversionPromises = uris.map(uri => convertImageToBase64(uri));
  const results = await Promise.all(conversionPromises);
  console.log(`✅ All ${results.length} images converted and compressed`);
  return results;
}

// Helper functions
const getDurationDisplay = (duration: string): string => {
  const durationMap: Record<string, string> = {
    today: "Started today",
    yesterday: "Started yesterday",
    "2-3_days": "2-3 days ago",
    "1_week": "1 week ago",
    "2_weeks_plus": "2+ weeks ago",
    ongoing: "Ongoing condition",
  };
  return durationMap[duration] || duration || "Not specified";
};

const cleanGeminiResponse = (text: string): string => {
  return text.replace(/\*\*/g, "");
};

// Render assessment as separate cards with priority sections at top and accordions for details
function renderAssessmentCards(
  text: string | null,
  expandedSections: Record<string, boolean>,
  toggleSection: (key: string) => void,
  isPremium: boolean = false,
  onUpgradePress?: () => void
) {
  if (!text) return null;

  console.log("=== Parsing Medical Triage Assessment ===");
  console.log("Raw text length:", text.length);

  const lines = text.split(/\r?\n/).map((l) => l.trim());

  type SectionKey =
    | 'CLINICAL ASSESSMENT'
    | 'VISUAL FINDINGS'
    | 'CLINICAL INTERPRETATION'
    | 'BURN/WOUND GRADING'
    | 'INFECTION RISK'
    | 'URGENCY ASSESSMENT'
    | 'RECOMMENDATIONS'
    | 'NEXT STEPS'
    | 'OTHER';

  // Layer 2: Next Steps - Most prominent, actionable guidance
  const prioritySections: SectionKey[] = [
    'NEXT STEPS',
    'RECOMMENDATIONS',
  ];

  // Layer 3: Supporting Details - Collapsible accordions (default collapsed)
  const accordionSections: SectionKey[] = [
    'CLINICAL ASSESSMENT',
    'VISUAL FINDINGS',
    'CLINICAL INTERPRETATION',
    'BURN/WOUND GRADING',
    'INFECTION RISK',
    'URGENCY ASSESSMENT',
  ];

  const sections: Record<SectionKey, string[]> = {
    'CLINICAL ASSESSMENT': [],
    'VISUAL FINDINGS': [],
    'CLINICAL INTERPRETATION': [],
    'BURN/WOUND GRADING': [],
    'INFECTION RISK': [],
    'URGENCY ASSESSMENT': [],
    'RECOMMENDATIONS': [],
    'NEXT STEPS': [],
    'OTHER': [],
  };
  let current: SectionKey = 'CLINICAL ASSESSMENT';

  const isHeader = (l: string): SectionKey | null => {
    const lower = l.toLowerCase().trim();
    const cleaned = lower.replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').trim();

    if (/^(clinical|patient|initial)\s+assessment\s*:?/i.test(cleaned)) return 'CLINICAL ASSESSMENT';
    if (/^visual\s+findings?\s*(from\s+(medical\s+)?images?)?\s*:?/i.test(cleaned)) return 'VISUAL FINDINGS';
    if (/^image\s+analysis\s*:?/i.test(cleaned)) return 'VISUAL FINDINGS';
    if (/^clinical\s+interpretation\s*(and\s+differential\s+considerations?)?\s*:?/i.test(cleaned)) return 'CLINICAL INTERPRETATION';
    if (/^differential\s+(diagnosis|considerations?)\s*:?/i.test(cleaned)) return 'CLINICAL INTERPRETATION';
    if (/^interpretation\s*:?/i.test(cleaned)) return 'CLINICAL INTERPRETATION';
    if (/^(burn|wound|injury)\s*[\/,]?\s*(wound|injury)?\s*[\/,]?\s*(injury)?\s*(grading|classification|severity)\s*:?/i.test(cleaned)) return 'BURN/WOUND GRADING';
    if (/^severity\s+(grading|classification|level)\s*:?/i.test(cleaned)) return 'BURN/WOUND GRADING';
    if (/^grading\s*:?/i.test(cleaned)) return 'BURN/WOUND GRADING';
    if (/^infection\s+risk\s*(assessment)?\s*:?/i.test(cleaned)) return 'INFECTION RISK';
    if (/^risk\s+of\s+infection\s*:?/i.test(cleaned)) return 'INFECTION RISK';
    if (/^urgency\s+(assessment|level)\s*:?/i.test(cleaned)) return 'URGENCY ASSESSMENT';
    if (/^urgency\s*:?/i.test(cleaned)) return 'URGENCY ASSESSMENT';
    if (/^recommendations?\s*:?/i.test(cleaned)) return 'RECOMMENDATIONS';
    if (/^treatment\s+recommendations?\s*:?/i.test(cleaned)) return 'RECOMMENDATIONS';
    if (/^time[-\s]?sensitive\s+treatment\s+recommendations?\s*:?/i.test(cleaned)) return 'RECOMMENDATIONS';
    if (/^next\s+steps?\s*:?/i.test(cleaned)) return 'NEXT STEPS';
    if (/^action\s+plan\s*:?/i.test(cleaned)) return 'NEXT STEPS';

    // Skip Rural and Emergency Red Flags sections (removed per requirements)
    if (/^rural/i.test(cleaned)) return null;
    if (/^(emergency\s+)?red\s+flags?/i.test(cleaned)) return null;
    if (/^warning\s+signs?/i.test(cleaned)) return null;

    return null;
  };

  for (const l of lines) {
    if (!l) continue;
    const hdr = isHeader(l);
    if (hdr) {
      current = hdr;
      continue;
    }
    // Skip lines that look like rural or emergency headers we want to ignore
    const lowerLine = l.toLowerCase();
    if (lowerLine.includes('rural') && (lowerLine.includes('guidance') || lowerLine.includes('resource'))) continue;
    if (lowerLine.includes('red flag') || lowerLine.includes('warning sign')) continue;

    const content = l.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '');
    if (content) {
      sections[current].push(content);
    }
  }

  console.log("=== Parsed Medical Sections ===");
  Object.keys(sections).forEach(key => {
    console.log(`${key}: ${sections[key as SectionKey].length} items`);
  });

  // Categorize Next Steps into primary actions vs conditional escalation
  const categorizeNextSteps = (items: string[]) => {
    const categorized = {
      primaryActions: [] as string[],
      conditionalEscalation: [] as string[],
      followUpHint: null as string | null,
    };

    items.forEach(item => {
      const lower = item.toLowerCase();

      // Conditional escalation patterns (collapsed section)
      if (lower.includes('if symptoms') || lower.includes('seek') || lower.includes('worsen') ||
          lower.includes('persist') || lower.includes('go to') || lower.includes('contact') ||
          lower.includes('call 911') || lower.includes('emergency') || lower.includes('urgent')) {
        const cleaned = item
          .replace(/^(if symptoms?[^:]*:|seek[^:]*:|urgent[^:]*:|when to[^:]*:)\s*/i, '')
          .trim();
        categorized.conditionalEscalation.push(cleaned);
      }
      // Follow-up timing patterns (becomes hint text)
      else if (lower.includes('reassess') || lower.includes('follow up') || lower.includes('follow-up') ||
               (lower.includes('within') && (lower.includes('hour') || lower.includes('day')))) {
        if (!categorized.followUpHint) {
          categorized.followUpHint = item.replace(/^(follow[- ]?up:?|reassess:?)\s*/i, '').trim();
        } else {
          categorized.primaryActions.push(item.replace(/^(today:|now:)\s*/i, '').trim());
        }
      }
      // Primary actions (main visible content)
      else {
        categorized.primaryActions.push(item.replace(/^(today:|now:|immediately:)\s*/i, '').trim());
      }
    });

    return categorized;
  };

  // Next Steps Card - Primary path + collapsed conditional + follow-up hint
  const NextStepsCard = ({ items }: { items: string[] }) => {
    const [showConditional, setShowConditional] = useState(false);
    const { primaryActions, conditionalEscalation, followUpHint } = categorizeNextSteps(items);

    const toggleConditional = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowConditional(!showConditional);
    };

    // Limit primary actions to 2 for clarity
    const visibleActions = primaryActions.slice(0, 2);

    return (
      <View style={styles.nextStepsContainer}>
        {/* Primary Path Block */}
        <View style={styles.primaryPathCard}>
          <Text style={[styles.primaryPathTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
            What to do now
          </Text>
          <View style={styles.primaryPathActions}>
            {visibleActions.map((action, idx) => (
              <View key={idx} style={styles.primaryActionRow}>
                <View style={styles.primaryActionBullet} />
                <Text style={[styles.primaryActionText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {action}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Conditional Escalation - Collapsed by default */}
        {conditionalEscalation.length > 0 && (
          <View style={styles.conditionalSection}>
            <TouchableOpacity
              style={styles.conditionalHeader}
              onPress={toggleConditional}
              activeOpacity={0.7}
            >
              <View style={styles.conditionalHeaderLeft}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color="#9CA3AF"
                />
                <Text style={[styles.conditionalHeaderText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  If symptoms change
                </Text>
              </View>
              <Ionicons
                name={showConditional ? "chevron-up" : "chevron-down"}
                size={16}
                color="#9CA3AF"
              />
            </TouchableOpacity>
            {showConditional && (
              <View style={styles.conditionalContent}>
                {conditionalEscalation.map((item, idx) => (
                  <Text
                    key={idx}
                    style={[styles.conditionalText, { fontFamily: FONTS.BarlowSemiCondensed }]}
                  >
                    {item}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Time-based Follow-up Hint */}
        {followUpHint && (
          <Text style={[styles.followUpHint, { fontFamily: FONTS.BarlowSemiCondensed }]}>
            Reassess within 24–48 hours
          </Text>
        )}
      </View>
    );
  };

  // Standard Card Component (for Recommendations)
  const PrimaryCard = ({ title, items, icon }: {
    title: string;
    items: string[];
    icon: React.ReactNode;
  }) => (
    <View style={styles.primaryAssessmentCard}>
      <View style={styles.primaryCardHeader}>
        {icon}
        <Text style={[styles.primaryCardTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>{title}</Text>
      </View>
      {items.slice(0, 4).map((it, idx) => (
        <View key={idx} style={styles.cardItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={[styles.cardItemText, { fontFamily: FONTS.BarlowSemiCondensed }]} numberOfLines={2}>
            {it}
          </Text>
        </View>
      ))}
    </View>
  );

  // Accordion Component with Premium Gating (for secondary sections)
  const AccordionCard = ({ title, items, icon, sectionKey }: {
    title: string;
    items: string[];
    icon: React.ReactNode;
    sectionKey: string;
  }) => {
    const isExpanded = expandedSections[sectionKey] || false;
    const previewCount = 2; // Show 2 items as preview
    const hasMoreContent = items.length > previewCount;
    const previewItems = items.slice(0, previewCount);
    const showUpgrade = !isPremium && hasMoreContent && isExpanded;

    return (
      <View style={[
        styles.accordionCard,
        !isPremium && styles.accordionCardPremium
      ]}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.7}
        >
          <View style={styles.accordionHeaderLeft}>
            {icon}
            <Text style={[styles.accordionTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>{title}</Text>
            {!isPremium && hasMoreContent && (
              <View style={styles.premiumBadge}>
                <Text style={[styles.premiumBadgeText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Advanced
                </Text>
              </View>
            )}
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.accordionContent}>
            {/* Show preview items (always visible) */}
            {(isPremium ? items : previewItems).map((it, idx) => (
              <View key={idx} style={styles.cardItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={[styles.cardItemText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {it}
                </Text>
              </View>
            ))}

            {/* Premium upgrade prompt - soft, non-aggressive */}
            {showUpgrade && (
              <View style={styles.premiumUpgradeContainer}>
                <Text style={[styles.premiumMoreText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {items.length - previewCount} more insights available
                </Text>
                <TouchableOpacity
                  style={styles.premiumUpgradeLink}
                  onPress={onUpgradePress}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.premiumUpgradeLinkText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    See upgrade options →
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const icons: Record<SectionKey, { icon: React.ReactNode; color: string }> = {
    'CLINICAL ASSESSMENT': { icon: <Ionicons name="medical" size={20} color="#2A7DE1" />, color: "#2A7DE1" },
    'VISUAL FINDINGS': { icon: <Ionicons name="eye" size={20} color="#9B59B6" />, color: "#9B59B6" },
    'CLINICAL INTERPRETATION': { icon: <Ionicons name="clipboard" size={20} color="#3498DB" />, color: "#3498DB" },
    'BURN/WOUND GRADING': { icon: <Ionicons name="fitness" size={20} color="#E67E22" />, color: "#E67E22" },
    'INFECTION RISK': { icon: <Ionicons name="shield-checkmark" size={20} color="#E74C3C" />, color: "#E74C3C" },
    'URGENCY ASSESSMENT': { icon: <Ionicons name="speedometer" size={20} color="#FF6B35" />, color: "#FF6B35" },
    'RECOMMENDATIONS': { icon: <Ionicons name="checkmark-circle" size={20} color="#28A745" />, color: "#28A745" },
    'NEXT STEPS': { icon: <Ionicons name="arrow-forward-circle" size={20} color="#2A7DE1" />, color: "#2A7DE1" },
    'OTHER': { icon: <Ionicons name="information-circle" size={20} color="#6C757D" />, color: "#6C757D" },
  };

  const displayNames: Record<SectionKey, string> = {
    'CLINICAL ASSESSMENT': 'Clinical Assessment',
    'VISUAL FINDINGS': 'Visual Findings',
    'CLINICAL INTERPRETATION': 'Clinical Interpretation',
    'BURN/WOUND GRADING': 'Wound Grading',
    'INFECTION RISK': 'Infection Risk',
    'URGENCY ASSESSMENT': 'Urgency Level',
    'RECOMMENDATIONS': 'Recommendations',
    'NEXT STEPS': 'Next Steps',
    'OTHER': 'Additional Information',
  };

  // Check if there are any accordion sections with content
  const hasAccordionContent = accordionSections.some(key => sections[key] && sections[key].length > 0);

  return (
    <View>
      {/* Priority Sections - Next Steps uses 3-step layout, others use standard cards */}
      {prioritySections.map((key) => {
        if (!sections[key] || sections[key].length === 0) return null;

        // Use 3-step action layout for Next Steps
        if (key === 'NEXT STEPS') {
          return <NextStepsCard key={key} items={sections[key]} />;
        }

        // Standard card for Recommendations
        return (
          <PrimaryCard
            key={key}
            title={displayNames[key]}
            items={sections[key]}
            icon={icons[key].icon}
          />
        );
      })}

      {/* Subtle disclaimer below main actions */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
        <Text style={[styles.disclaimerText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          This guidance is informational only. For medical emergencies, call 911. Always consult a healthcare provider for diagnosis and treatment.
        </Text>
      </View>

      {/* Accordion Sections - Collapsible (Premium gated) */}
      {hasAccordionContent && (
        <View style={styles.accordionContainer}>
          <View style={styles.accordionSectionHeader}>
            <View style={styles.accordionLabelRow}>
              <Ionicons name="layers-outline" size={14} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={[styles.accordionSectionLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                Want to understand more?
              </Text>
            </View>
            {!isPremium && (
              <View style={styles.previewBadge}>
                <Text style={[styles.previewBadgeText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  Preview
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.accordionIntro, { fontFamily: FONTS.BarlowSemiCondensed }]}>
            Explore clinical context behind this assessment
          </Text>
          {accordionSections.map((key) => (
            sections[key] && sections[key].length > 0 ? (
              <AccordionCard
                key={key}
                title={displayNames[key]}
                items={sections[key]}
                icon={icons[key].icon}
                sectionKey={key}
              />
            ) : null
          ))}
        </View>
      )}

      {/* Other content */}
      {sections['OTHER'] && sections['OTHER'].length > 0 && (
        <AccordionCard
          title={displayNames['OTHER']}
          items={sections['OTHER']}
          icon={icons['OTHER'].icon}
          sectionKey="OTHER"
        />
      )}
    </View>
  );
}

export default function AssessmentResults() {
  const database = useWatermelonDatabase();
  const { isOnline, isChecking } = useNetworkStatus();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [symptomContext, setSymptomContext] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [assessmentError, setAssessmentError] = useState(false);
  const [actualSeverity, setActualSeverity] = useState(5);
  const [isLogged, setIsLogged] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // Accordion expanded state for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Premium state (TODO: integrate with actual subscription system)
  const [isPremium, setIsPremium] = useState(false);

  const toggleSection = (key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleUpgradePress = () => {
    // TODO: Navigate to subscription/upgrade screen
    router.push("/(tabs)/profile");
  };

  // YOLO Detection State
  const [yoloResult, setYoloResult] = useState<PipelineResult | null>(null);
  const [isYoloProcessing, setIsYoloProcessing] = useState(false);
  const [yoloError, setYoloError] = useState<string | null>(null);
  const [yoloProgress, setYoloProgress] = useState<string>("");

  // On-device LLM for offline assessment (Android only)
  // Using useWoundLLMStatic - only subscribes to isAvailable/isReady
  // This prevents 1000+ re-renders during generation (no response subscription)
  const {
    isAvailable: llmAvailable,
    isReady: llmReady,
    generateFromPipeline: llmGenerateFromPipeline,
  } = useWoundLLMStatic();
  const [usedOfflineLLM, setUsedOfflineLLM] = useState(false);
  const [isLLMGenerating, setIsLLMGenerating] = useState(false); // Local state - no streaming re-renders

  // Use ref to track if we're currently fetching to prevent multiple calls
  const isFetchingRef = useRef(false);

  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  const logAIAssessment = useMutation(api.healthEntries.logAIAssessment);
  const generateContext = useAction(api.aiAssessment.generateContextWithGemini);

  // Get display photos from params (original URIs for display)
  const displayPhotos = params.photos
    ? JSON.parse(params.photos as string)
    : [];

  const aiContext = params.aiContext
    ? JSON.parse(params.aiContext as string)
    : null;

  // AI Source preference from user selection ("cloud" or "device")
  const aiSourceParam = (params.aiSource as string) || "cloud";

  // Define fetchAIAssessment first so it is in scope and can be called after images are processed
  const fetchAIAssessment = async (imagesArg: string[] = [], yoloPipelineResult?: PipelineResult | null) => {
    // Prevent multiple simultaneous requests and re-fetches
    if (isFetchingRef.current || hasAttemptedFetch) {
      return;
    }

    console.log(`🔍 fetchAIAssessment called - aiSource: ${aiSourceParam}, isOnline: ${isOnline}`);

    try {
      isFetchingRef.current = true;
      setHasAttemptedFetch(true);
      setIsLoading(true);
      setAssessmentError(false);

      // Extract parameters with proper fallbacks
      const description = Array.isArray(params.description)
        ? params.description[0]
        : (params.description as string) || "";

      const severity = parseInt(
        Array.isArray(params.severity)
          ? params.severity[0]
          : (params.severity as string) || "5"
      );

      const duration = Array.isArray(params.duration)
        ? params.duration[0]
        : (params.duration as string) || "";

      const category =
        aiContext?.category ||
        (Array.isArray(params.category)
          ? params.category[0]
          : (params.category as string)) ||
        "General Symptoms";

      console.log("📋 [AI Assessment Params]", {
        description: description || "(empty)",
        descriptionLength: description.length,
        severity,
        duration: duration || "(empty)",
        category,
        hasAiContext: !!aiContext,
        isOnline
      });

      // Use imagesArg if provided; otherwise fallback to any already-processed photos in aiContext
      const imagesToSend = imagesArg && imagesArg.length > 0
        ? imagesArg
        : (aiContext?.uploadedPhotos || []);

      // Helper: Get user ID for offline storage
      const getUserId = async (): Promise<string> => {
        let uid: string | undefined = currentUser?._id as any;
        if (!uid) {
          try {
            const raw = await AsyncStorage.getItem("@profile_user");
            if (raw) {
              const parsed = JSON.parse(raw);
              uid = parsed?._id || parsed?.id;
            }
          } catch {}
        }
        if (!uid) {
          try {
            const usersCol = database.get('users');
            const allUsers = await usersCol.query().fetch();
            const first = (allUsers as any[])[0];
            if (first) {
              const r = (first as any)._raw || {};
              uid = (first as any).convexUserId || r.convex_user_id || (first as any).id || r.id;
            }
          } catch {}
        }
        return uid || "offline_user";
      };

      // Helper: Save assessment to local DB
      const saveToLocalDB = async (context: string, source: string) => {
        const today = new Date();
        const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const timestamp = today.getTime();
        const uid = await getUserId();

        try {
          const collection = database.get("health_entries");
          let wmEntryId: string | undefined;
          await database.write(async () => {
            const newEntry = await collection.create((entry: any) => {
              entry.userId = uid || "offline_user";
              entry.symptoms = description;
              entry.severity = severity;
              entry.category = category;
              entry.duration = duration;
              entry.notes = `AI Assessment (${source}) - ${category}`;
              entry.timestamp = timestamp;
              entry.date = dateString;
              entry.type = "ai_assessment";
              entry.createdBy = `AI Assessment (${source})`;
              entry.aiContext = context;
              entry.photos = JSON.stringify(displayPhotos || []);
              entry.isSynced = source === "Cloud";
            });
            wmEntryId = newEntry.id;
          });

          console.log(`✅ Assessment saved to local DB (${source})`);

          // Emit event to notify tracker/daily-log that a new entry was added (offline)
          healthEntriesEvents.emit({
            type: 'add',
            watermelonId: wmEntryId,
            timestamp
          });
          console.log("📡 Emitted healthEntriesEvents.add event for offline AI assessment");

          setIsLogged(true);
        } catch (saveError) {
          console.error("❌ Failed to save to local DB:", saveError);
        }
      };

      // ========================================
      // DECISION: Use On-Device LLM or Cloud AI
      // ========================================
      const shouldUseDeviceLLM = aiSourceParam === "device" || (!isOnline && llmReady);

      if (shouldUseDeviceLLM && llmAvailable && llmReady) {
        // ========================================
        // PATH A: On-Device LLM (ExecuTorch)
        // ========================================
        console.log("🤖 Using ON-DEVICE LLM for assessment");
        setIsLLMGenerating(true); // Set local state - no streaming re-renders

        try {
          // Use generateContext directly with detections (like LLMTest does)
          const llmResult = await llmGenerateFromPipeline(
            yoloPipelineResult || { results: [], totalDetections: 0, successfulImages: 0, failedImages: 0, summary: { byClass: {}, highestConfidence: null, averageConfidence: 0 } },
            {
              userSymptoms: description,
              bodyLocation: category,
              injuryDuration: duration,
            }
          );

          if (llmResult.success && llmResult.context) {
            console.log(`✅ On-device LLM completed in ${llmResult.generationTimeMs}ms`);
            setUsedOfflineLLM(true);

            // Format the response
            const formattedContext = formatOfflineResult(llmResult.context, {
              description,
              severity,
              duration,
              category,
              yoloResult: yoloPipelineResult,
            });

            setSymptomContext(formattedContext);

            // Save to databases
            // If online AND authenticated, save to Convex first, then local
            // If offline or not authenticated, save to local only
            console.log("💾 [SAVE] Preparing to save on-device assessment...");
            console.log("💾 [SAVE] isOnline:", isOnline);
            console.log("💾 [SAVE] currentUser?._id:", currentUser?._id);
            console.log("💾 [SAVE] formattedContext length:", formattedContext.length);

            if (isOnline && currentUser?._id) {
              console.log("💾 [SAVE] Path: Online + Authenticated → Saving to Convex + WatermelonDB");
              try {
                const today = new Date();
                const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                const timestamp = today.getTime();

                console.log("💾 [SAVE] Convex payload:", {
                  userId: currentUser._id,
                  date: dateString,
                  timestamp,
                  symptoms: description?.substring(0, 50),
                  severity,
                  category,
                  duration,
                  photosCount: displayPhotos?.length || 0,
                  aiContextLength: formattedContext.length,
                });

                // Save to Convex (cloud)
                const newId = await logAIAssessment({
                  userId: currentUser._id,
                  date: dateString,
                  timestamp,
                  symptoms: description,
                  severity: severity,
                  category: category,
                  duration: duration,
                  aiContext: formattedContext,
                  photos: displayPhotos,
                  notes: `AI Assessment (On-Device) - ${category}`,
                });
                console.log("✅ On-device assessment saved to Convex:", newId);

                // Also save to WatermelonDB with sync flag
                const collection = database.get("health_entries");
                await database.write(async () => {
                  await collection.create((entry: any) => {
                    entry.userId = currentUser._id;
                    entry.symptoms = description;
                    entry.severity = severity;
                    entry.category = category;
                    entry.duration = duration;
                    entry.notes = `AI Assessment (On-Device) - ${category}`;
                    entry.timestamp = timestamp;
                    entry.date = dateString;
                    entry.type = "ai_assessment";
                    entry.createdBy = "AI Assessment (On-Device)";
                    entry.aiContext = formattedContext;
                    entry.photos = JSON.stringify(displayPhotos || []);
                    entry.isSynced = true;
                    entry.convexId = newId;
                  });
                });
                console.log("✅ On-device assessment also saved to WatermelonDB");
                setIsLogged(true);
              } catch (saveError) {
                console.error("❌ Failed to save to Convex, falling back to local:", saveError);
                await saveToLocalDB(formattedContext, "On-Device");
              }
            } else {
              // Offline or not authenticated - save locally only
              console.log("💾 [SAVE] Path: Offline/Not authenticated → Saving to WatermelonDB only");
              await saveToLocalDB(formattedContext, "On-Device");
            }
          } else {
            throw new Error(llmResult.error || "LLM returned empty response");
          }
        } catch (llmError: any) {
          console.error("❌ On-device LLM failed:", llmError);
          setAssessmentError(true);

          // Fallback: Use severity-based guidance
          const fallbackContext = getSeverityBasedGuidance(severity);
          setSymptomContext(fallbackContext);
          await saveToLocalDB(fallbackContext, "Fallback");
        } finally {
          setIsLLMGenerating(false); // Clear local state after generation completes
        }

        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // ========================================
      // EDGE CASE: Offline but LLM not ready
      // ========================================
      if (!isOnline && (!llmAvailable || !llmReady)) {
        console.log("⚠️ Offline and LLM not available");
        setAssessmentError(true);

        const fallbackContext = `OFFLINE - AI NOT AVAILABLE
==================================
${llmAvailable ? "The on-device AI model has not been downloaded yet." : "On-device AI is not available on this platform."}

${getSeverityBasedGuidance(severity)}

To enable offline assessments:
1. Connect to the internet
2. Return to the AI Assessment screen
3. ${llmAvailable ? "The model will download automatically (~400MB)" : "Use Cloud AI for assessment"}`;

        setSymptomContext(fallbackContext);
        await saveToLocalDB(fallbackContext, "Offline-Pending");

        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // ========================================
      // PATH B: Cloud AI (Gemini) - Original flow
      // ========================================
      console.log("🚀 Calling Gemini with:", {
        description: description.substring(0, 50),
        severity,
        duration,
        category,
        symptomsCount: aiContext?.symptoms?.length || 0,
        imageCount: imagesToSend.length,
        hasImages: imagesToSend.length > 0,
      });

      // Format YOLO detection results for Gemini (if available)
      // Use the passed parameter (not state) to avoid timing issues
      const yoloContextForGemini = yoloPipelineResult ? formatForGemini(yoloPipelineResult) : undefined;

      if (yoloContextForGemini) {
        console.log(`🔬 [YOLO→Gemini] Sending detection context to Gemini (${yoloContextForGemini.length} chars)`);
      }

      const res = await generateContext({
        description,
        severity,
        duration,
        environmentalFactors: aiContext?.environmentalFactors || [],
        category,
        symptoms: aiContext?.symptoms || [],
        images: imagesToSend,
        yoloContext: yoloContextForGemini,
      });

      console.log("📥 Gemini response received:", {
        contextLength: res.context?.length || 0,
        contextPreview: res.context?.substring(0, 150) + "...",
        hasContext: !!res.context
      });

      const cleanedContext = cleanGeminiResponse(res.context);
      console.log("✨ Cleaned context:", {
        cleanedLength: cleanedContext.length,
        cleanedPreview: cleanedContext.substring(0, 150) + "..."
      });
      
      setSymptomContext(cleanedContext);

      // Automatically log the AI assessment (online only - offline is handled above)
      if (currentUser?._id && !isLogged) {
        try {
          const today = new Date();
          // Use LOCAL date parts (not UTC) to match manual entry format
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, "0");
          const day = String(today.getDate()).padStart(2, "0");
          const dateString = `${year}-${month}-${day}`;
          const timestamp = today.getTime();

          console.log("🔍 AI Assessment Date Debug:", {
            rawDate: today.toString(),
            year,
            month,
            day,
            dateString,
            getDate: today.getDate(),
            getUTCDate: today.getUTCDate(),
            getMonth: today.getMonth(),
            getUTCMonth: today.getUTCMonth(),
          });

          // Online - save to Convex
          const newId = await logAIAssessment({
            userId: currentUser._id,
            date: dateString,
            timestamp,
            symptoms: description,
            severity: severity,
            category: category,
            duration: duration,
            aiContext: cleanedContext,
            photos: displayPhotos,
            notes: `AI Assessment - ${category}`,
          });

          console.log(
            "✅ AI assessment automatically logged to health entries with date:",
            dateString
          );

          // Also save to WatermelonDB for offline access (mirror of online write)
          try {
            const collection = database.get("health_entries");
            await database.write(async () => {
              await collection.create((entry: any) => {
                entry.userId = currentUser._id;
                entry.symptoms = description;
                entry.severity = severity;
                entry.category = category;
                entry.duration = duration;
                entry.notes = `AI Assessment - ${category}`;
                entry.timestamp = timestamp;
                entry.date = dateString;
                entry.type = "ai_assessment";
                entry.createdBy = "AI Assessment";
                entry.aiContext = cleanedContext;
                // photos is a @json field; store as JSON string for safety
                entry.photos = JSON.stringify(displayPhotos || []);
                entry.isSynced = true; // Already synced online
                entry.convexId = newId;
              });
            });
            console.log("✅ AI assessment also saved to WatermelonDB for offline access");
          } catch (wmError) {
            console.warn("⚠️ Failed to write AI assessment to WatermelonDB (online mirror)", wmError);
          }
          
          // Emit event to notify tracker/daily-log that a new entry was added
          healthEntriesEvents.emit({
            type: 'add',
            convexId: newId,
            timestamp
          });
          console.log("📡 Emitted healthEntriesEvents.add event for AI assessment");
          
          setIsLogged(true);
        } catch (logError) {
          console.error("❌ Failed to log AI assessment:", logError);
        }
      }
    } catch (error: any) {
      console.error("❌ AI assessment error:", error);

      const description = Array.isArray(params.description)
        ? params.description[0]
        : (params.description as string) || "";
      const severity = parseInt(
        Array.isArray(params.severity)
          ? params.severity[0]
          : (params.severity as string) || "5"
      );
      const duration = Array.isArray(params.duration)
        ? params.duration[0]
        : (params.duration as string) || "";
      const category =
        aiContext?.category ||
        (Array.isArray(params.category)
          ? params.category[0]
          : (params.category as string)) ||
        "General Symptoms";

      // Check if it's a rate limit error
      if ((error as any)?.code === 429 || (error as any)?.status === "RESOURCE_EXHAUSTED") {
        console.log("⏳ Rate limit hit, using fallback assessment");
        setAssessmentError(true);
        const fallback = getDetailedFallbackAssessment(
          category,
          severity,
          duration,
          aiContext?.symptoms || []
        );
        setSymptomContext(fallback.context);
        return;
      }

      // For other errors, use fallback but don't retry
      setAssessmentError(true);
      const fallback = getDetailedFallbackAssessment(
        category,
        severity,
        duration,
        aiContext?.symptoms || []
      );
      setSymptomContext(fallback.context);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Process images on mount (deferred from previous screens)
  useEffect(() => {
    // Wait for network check to complete before fetching
    if (isChecking) {
      console.log("⏳ Waiting for network status check...");
      return;
    }

    console.log(`🌐 Network status ready - isOnline: ${isOnline}`);
    
    const processImagesAndFetchAssessment = async () => {
      let base64Images: string[] = [];
      let yoloPipelineResult: PipelineResult | null = null;

      // Step 1: Run YOLO detection on images (if any)
      if (displayPhotos.length > 0) {
        console.log(`🔬 [YOLO] Starting wound detection on ${displayPhotos.length} image(s)...`);
        setIsYoloProcessing(true);
        setYoloError(null);
        setYoloProgress("Loading wound detection model...");

        try {
          yoloPipelineResult = await runPipeline(
            displayPhotos,
            { continueOnError: true },
            (progress) => {
              console.log(`🔬 [YOLO] Progress: ${progress.percentComplete}% - ${progress.message}`);
              setYoloProgress(progress.message);
            }
          );

          setYoloResult(yoloPipelineResult);
          console.log(`✅ [YOLO] Detection complete:`, {
            totalDetections: yoloPipelineResult.totalDetections,
            successfulImages: yoloPipelineResult.successfulImages,
            failedImages: yoloPipelineResult.failedImages,
            summary: yoloPipelineResult.summary.byClass,
          });

          // Log individual results
          yoloPipelineResult.results.forEach((result, idx) => {
            console.log(`🔬 [YOLO] Image ${idx + 1}:`, {
              success: result.success,
              detections: result.detections.length,
              classes: result.detections.map(d => `${d.className} (${(d.confidence * 100).toFixed(0)}%)`),
              hasAnnotatedImage: result.annotatedImageBase64.length > 0,
            });
          });
        } catch (error) {
          console.error(`❌ [YOLO] Detection failed:`, error);
          setYoloError(String(error));
        } finally {
          setIsYoloProcessing(false);
          setYoloProgress("");
        }
      }

      // Step 2: Convert images to base64 for Gemini (if online)
      if (displayPhotos.length > 0 && aiContext) {
        console.log(`📸 Processing ${displayPhotos.length} images for Gemini...`);
        try {
          base64Images = await convertImagesToBase64(displayPhotos);
          console.log(`✅ Successfully converted ${base64Images.length} images to base64`);
          aiContext.uploadedPhotos = base64Images;
        } catch (error) {
          console.error("❌ Error converting images:", error);
          aiContext.uploadedPhotos = [];
        }
      }

      // Step 3: Trigger Gemini request after images are ready (or immediately if no images)
      // Pass YOLO results directly to avoid state timing issues
      fetchAIAssessment(base64Images, yoloPipelineResult);
    };

    processImagesAndFetchAssessment();
  }, [isChecking, isOnline]); // Run when network status is known

  useEffect(() => {
    console.log("📋 ALL RECEIVED PARAMS:", {
      description: params.description,
      severity: params.severity,
      duration: params.duration,
      category: params.category,
      hasAiContext: !!params.aiContext,
      photoCount: displayPhotos.length,
    });

    // Extract severity with proper debugging
    const rawSeverity = params.severity;
    console.log("🔍 Raw severity value:", rawSeverity);

    const severity = parseInt(
      Array.isArray(rawSeverity) ? rawSeverity[0] : rawSeverity || "5"
    );

    console.log("✅ Parsed severity:", severity);
    setActualSeverity(severity);
  }, [
    displayPhotos.length,
    params.aiContext,
    params.category,
    params.description,
    params.duration,
    params.severity,
  ]);

  // Simplified fallback for client-side errors
  const getDetailedFallbackAssessment = (
    category: string,
    severity: number,
    duration: string,
    symptoms: string[]
  ): { context: string } => {
    const mainSymptoms =
      symptoms.length > 0
        ? symptoms.slice(0, 3).join(", ")
        : "the symptoms you described";

    return {
      context: `I apologize, but I'm unable to provide a detailed assessment at this time. Based on your reported symptoms (${mainSymptoms}) with severity ${severity}/10:

${severity >= 7 ? "⚠️ URGENT: Your severity level indicates this requires prompt medical attention. Contact Health Link Alberta at 811 immediately for professional guidance, or proceed to the nearest emergency department if symptoms are worsening." : "Please contact Health Link Alberta at 811 for a proper medical assessment. They can provide personalized guidance based on your specific situation."}

For immediate medical emergencies (difficulty breathing, chest pain, severe bleeding, loss of consciousness), always call 911.`,
    };
  };

  const handleReturnHome = () => router.replace("/(tabs)/dashboard");

  // Calm, clinical care level indicators (not alarming)
  const getCareLevel = (severity: number) => {
    if (severity >= 9) return {
      text: "Seek immediate care",
      subtext: "Professional evaluation recommended now",
      color: "#B91C1C", // Muted red
      bgColor: "#FEF2F2",
      icon: "medical" as const
    };
    if (severity >= 7) return {
      text: "Schedule care soon",
      subtext: "Consider seeing a healthcare provider today",
      color: "#C2410C", // Muted orange
      bgColor: "#FFF7ED",
      icon: "calendar" as const
    };
    if (severity >= 4) return {
      text: "Monitor and follow guidance",
      subtext: "Home care may be appropriate with watchful attention",
      color: "#1D4ED8", // Calm blue
      bgColor: "#EFF6FF",
      icon: "eye" as const
    };
    return {
      text: "Self-care recommended",
      subtext: "Your symptoms suggest manageable home care",
      color: "#047857", // Muted green
      bgColor: "#ECFDF5",
      icon: "checkmark-circle" as const
    };
  };

  const ResultCard = ({
    title,
    children,
    icon,
  }: {
    title: string;
    children: React.ReactNode;
    icon: string;
  }) => (
    <View style={styles.resultCard}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon as any} size={20} color="#2A7DE1" />
        <Text
          style={[styles.cardTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Due reminder banner (offline-capable) */}
        <DueReminderBanner topOffset={120} />
        {/* Fixed Header */}
        <CurvedHeader
          title="Assessment Results"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
        />

        {/* Content Area - Takes all available space minus header and bottom nav */}
        <View style={styles.contentArea}>
          <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.contentSection}>
              {/* Layer 1: Primary Outcome - Calm care level conclusion */}
              {(() => {
                const careLevel = getCareLevel(actualSeverity);
                return (
                  <View style={[styles.careLevelContainer, { backgroundColor: careLevel.bgColor }]}>
                    <View style={styles.careLevelIconContainer}>
                      <Ionicons name={careLevel.icon} size={28} color={careLevel.color} />
                    </View>
                    <View style={styles.careLevelContent}>
                      <Text
                        style={[
                          styles.careLevelText,
                          { fontFamily: FONTS.BarlowSemiCondensed, color: careLevel.color },
                        ]}
                      >
                        {careLevel.text}
                      </Text>
                      <Text
                        style={[
                          styles.careLevelSubtext,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        {careLevel.subtext}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* YOLO Wound Detection Results - SHOWN FIRST for immediate value */}
              {displayPhotos.length > 0 && (
                <ResultCard title="Wound Detection Analysis" icon="scan">
                  {/* Processing State */}
                  {isYoloProcessing && (
                    <View style={styles.yoloProcessingContainer}>
                      <ActivityIndicator size="small" color="#2A7DE1" />
                      <Text style={[styles.yoloProcessingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        {yoloProgress || "Analyzing images..."}
                      </Text>
                    </View>
                  )}

                  {/* Error State */}
                  {yoloError && (
                    <View style={styles.yoloErrorContainer}>
                      <Ionicons name="alert-circle" size={20} color="#DC3545" />
                      <Text style={[styles.yoloErrorText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Detection failed: {yoloError}
                      </Text>
                    </View>
                  )}

                  {/* Detection Summary */}
                  {yoloResult && !isYoloProcessing && (
                    <View style={styles.yoloSummaryContainer}>
                      {yoloResult.totalDetections > 0 ? (
                        <>
                          <View style={styles.yoloSummaryHeader}>
                            <Ionicons name="checkmark-circle" size={20} color="#28A745" />
                            <Text style={[styles.yoloSummaryTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                              {yoloResult.totalDetections} wound(s) detected
                            </Text>
                          </View>
                          <View style={styles.yoloClassList}>
                            {Object.entries(yoloResult.summary.byClass).map(([className, count]) => (
                              <View key={className} style={styles.yoloClassItem}>
                                <View style={[styles.yoloClassBadge, {
                                  backgroundColor:
                                    className === '1st degree burn' ? '#FF8C00' :    // Orange - mild burn
                                    className === '2nd degree burn' ? '#FF4500' :    // Red-Orange - moderate burn
                                    className === '3rd degree burn' ? '#C80000' :    // Dark Red - severe burn
                                    className === 'Rashes' ? '#FFB6C1' :             // Pink
                                    className === 'abrasion' ? '#DC3545' :           // Red
                                    className === 'bruise' ? '#6f42c1' :             // Purple
                                    className === 'cut' ? '#28A745' :                // Green
                                    className === 'frostbite' ? '#00CED1' :          // Cyan - cold injury
                                    '#6c757d'                                        // Default gray
                                }]}>
                                  <Text style={[styles.yoloClassBadgeText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                    {className.toUpperCase()}
                                  </Text>
                                </View>
                                <Text style={[styles.yoloClassCount, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                  × {count}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </>
                      ) : (
                        <View style={styles.yoloSummaryHeader}>
                          <Ionicons name="information-circle" size={20} color="#6c757d" />
                          <Text style={[styles.yoloSummaryTitle, { fontFamily: FONTS.BarlowSemiCondensed, color: '#6c757d' }]}>
                            No wounds detected in images
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Annotated Images (with bounding boxes) */}
                  <Text
                    style={[
                      styles.cardText,
                      {
                        fontFamily: FONTS.BarlowSemiCondensed,
                        marginTop: 12,
                        marginBottom: 8,
                      },
                    ]}
                  >
                    {displayPhotos.length} photo(s) analyzed
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {displayPhotos.map((photo: string, index: number) => {
                      // Use annotated image if available, otherwise fall back to original
                      const yoloImageResult = yoloResult?.results[index];
                      const hasAnnotatedImage = yoloImageResult?.annotatedImageBase64 && yoloImageResult.annotatedImageBase64.length > 0;
                      const imageSource = hasAnnotatedImage
                        ? { uri: `data:image/jpeg;base64,${yoloImageResult.annotatedImageBase64}` }
                        : { uri: photo };
                      const detectionsInImage = yoloImageResult?.detections.length || 0;

                      return (
                        <View key={index} style={styles.photoContainer}>
                          <Image
                            source={imageSource}
                            style={styles.assessmentPhoto}
                          />
                          <View style={styles.photoLabelContainer}>
                            <Text
                              style={[
                                styles.photoLabel,
                                { fontFamily: FONTS.BarlowSemiCondensed },
                              ]}
                            >
                              Photo {index + 1}
                            </Text>
                            {yoloResult && !isYoloProcessing && (
                              <View style={[styles.detectionBadge, {
                                backgroundColor: detectionsInImage > 0 ? '#28A745' : '#6c757d'
                              }]}>
                                <Text style={[styles.detectionBadgeText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                                  {detectionsInImage} found
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </ResultCard>
              )}

              {/* Layer 2 & 3: Assessment Content */}
              {isLoading ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="large" color="#2A7DE1" />
                  <Text
                    style={[
                      styles.loadingText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    {isLLMGenerating
                      ? "Generating assessment..."
                      : "Analyzing your symptoms with AI assessment..."}
                  </Text>
                  {isLLMGenerating && (
                    <View style={styles.offlineLLMIndicator}>
                      <Ionicons name="hardware-chip" size={16} color="#FF6B35" />
                      <Text style={[styles.offlineLLMText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Using on-device AI
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  {usedOfflineLLM && (
                    <View style={styles.offlineNotice}>
                      <Ionicons name="cloud-offline-outline" size={14} color="#6B7280" />
                      <Text style={[styles.offlineNoticeText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                        Generated offline
                      </Text>
                    </View>
                  )}
                  {renderAssessmentCards(symptomContext, expandedSections, toggleSection, isPremium, handleUpgradePress)}
                  {assessmentError && (
                    <View style={styles.errorNote}>
                      <Ionicons
                        name="information-circle"
                        size={16}
                        color="#FF6B35"
                      />
                      <Text
                        style={[
                          styles.errorNoteText,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Note: Unable to complete full AI analysis. For medical
                        guidance, contact Health Link Alberta at 811.
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Single Primary CTA */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.primaryCTA}
                  onPress={() => router.push("/(tabs)/tracker")}
                >
                  <Text
                    style={[
                      styles.primaryCTAText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Track Your Health
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryCTA}
                  onPress={handleReturnHome}
                >
                  <Text
                    style={[
                      styles.secondaryCTAText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Return to Dashboard
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </CurvedBackground>
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  contentArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  contentSection: {
    padding: 20,
    paddingTop: 16,
  },
  // Layer 1: Calm care level indicator
  careLevelContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  careLevelIconContainer: {
    marginRight: 14,
  },
  careLevelContent: {
    flex: 1,
  },
  careLevelText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  careLevelSubtext: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 8,
  },
  cardText: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  errorNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF6B35",
  },
  errorNoteText: {
    fontSize: 12,
    color: "#E65100",
    marginLeft: 8,
    flex: 1,
  },
  photoContainer: {
    alignItems: "center",
    marginRight: 12,
  },
  assessmentPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 4,
  },
  photoLabel: {
    fontSize: 12,
    color: "#666",
  },
  actionButtons: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  primaryCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A7DE1",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginBottom: 12,
  },
  primaryCTAText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  secondaryCTA: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  secondaryCTAText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  // Assessment Card Styles (like vision-test)
  assessmentCard: {
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2A7DE1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 4,
  },
  cardItemTimeBased: {
    flexDirection: "column",
    marginBottom: 12,
    paddingLeft: 0,
  },
  bulletPoint: {
    fontSize: 16,
    color: "#1A1A1A",
    marginRight: 8,
    marginTop: 2,
  },
  timePrefix: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2A7DE1",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  cardItemText: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    lineHeight: 22,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    textAlign: "left",
  },
  loadingCard: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  // YOLO Detection Styles
  yoloProcessingContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    marginBottom: 12,
  },
  yoloProcessingText: {
    marginLeft: 12,
    fontSize: 14,
    color: "#2A7DE1",
  },
  yoloErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#DC3545",
  },
  yoloErrorText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#DC3545",
    flex: 1,
  },
  yoloSummaryContainer: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  yoloSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  yoloSummaryTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  yoloClassList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  yoloClassItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  yoloClassBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  yoloClassBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  yoloClassCount: {
    marginLeft: 4,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  photoLabelContainer: {
    alignItems: "center",
    marginTop: 4,
  },
  detectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  detectionBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  // Offline LLM Indicator Styles
  offlineLLMIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 8,
    backgroundColor: "#FFF5EB",
    borderRadius: 8,
  },
  offlineLLMText: {
    fontSize: 13,
    color: "#FF6B35",
    marginLeft: 6,
    fontWeight: "500",
  },
  // Subtle offline notice
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  offlineNoticeText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginLeft: 6,
  },
  // Primary Assessment Card Styles (for key sections)
  primaryAssessmentCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  primaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  primaryCardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 10,
  },
  // Accordion Styles (for secondary sections)
  accordionContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  accordionSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  accordionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  accordionSectionLabel: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  previewBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  previewBadgeText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  accordionIntro: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 12,
    paddingHorizontal: 4,
    fontStyle: "italic",
  },
  accordionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  accordionCardPremium: {
    backgroundColor: "#FAFBFC",
  },
  // Premium badge and upgrade styles
  premiumBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  premiumBadgeText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  premiumUpgradeContainer: {
    marginTop: 8,
    paddingTop: 10,
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  premiumMoreText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 6,
  },
  premiumUpgradeLink: {
    paddingVertical: 4,
  },
  premiumUpgradeLinkText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 10,
  },
  accordionContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  // Next Steps - Primary Path + Conditional Escalation
  nextStepsContainer: {
    marginBottom: 16,
  },
  primaryPathCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  primaryPathTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
    letterSpacing: 0.1,
  },
  primaryPathActions: {
    gap: 12,
  },
  primaryActionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  primaryActionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    marginTop: 8,
    marginRight: 12,
  },
  primaryActionText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  // Conditional Escalation - Collapsed by default
  conditionalSection: {
    marginTop: 12,
  },
  conditionalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  conditionalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  conditionalHeaderText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginLeft: 6,
  },
  conditionalContent: {
    paddingLeft: 26,
    paddingTop: 4,
    paddingBottom: 8,
  },
  conditionalText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
    marginBottom: 6,
  },
  // Follow-up Hint
  followUpHint: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 14,
    paddingHorizontal: 4,
  },
  // Disclaimer styles
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 16,
    marginLeft: 6,
    flex: 1,
  },
});
