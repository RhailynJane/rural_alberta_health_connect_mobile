/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    LayoutAnimation,
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
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
import ScanningOverlay from "../../components/ScanningOverlay";
import TTSButton from "../../components/TTSButton";
import { FONTS } from "../../constants/constants";
import { prepareNextStepsForTTS, prepareTextForTTS, prepareRecommendationsForTTS, useTTS, splitTextIntoChunks } from "../../../utils/tts";
import TTSHighlightedText from "../../components/TTSHighlightedText";
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

// ═══════════════════════════════════════════════════════════
// MEMOIZED CARD COMPONENTS - Stable references to prevent TTS unmount
// ═══════════════════════════════════════════════════════════

// Helper: Parse step item to extract header prefix (e.g., "Today:", "Within 24-48 hours:")
const parseStepItem = (item: string): { label: string | null; content: string } => {
  const match = item.match(/^([^:]{1,30}):\s*(.+)$/);
  if (match) {
    return { label: match[1].trim(), content: match[2].trim() };
  }
  return { label: null, content: item };
};

// Helper: Prepare section items for TTS
const prepareSectionForTTS = (title: string, items: string[]): string => {
  if (!items.length) return '';
  const cleanedItems = items.map(item => prepareTextForTTS(item)).filter(Boolean);
  return `${title}. ${cleanedItems.join('. ')}`;
};

// NextStepsCard - Memoized to prevent unmount on parent re-render
interface NextStepsCardProps {
  items: string[];
}

const NextStepsCard = memo(function NextStepsCard({ items }: NextStepsCardProps) {
  const ttsText = prepareNextStepsForTTS(items);

  const {
    status: ttsStatus,
    speak,
    stop,
    chunks: ttsChunks,
    chunkStates: ttsChunkStates,
    isAvailable: ttsAvailable,
    hasPlayed: ttsHasPlayed,
    isOtherPlaying,
  } = useTTS();

  const isTTSActive = ttsStatus === 'generating' || ttsStatus === 'speaking';
  const isDisabled = isOtherPlaying;
  const listenColor = isDisabled ? '#D1D5DB' : (ttsHasPlayed ? '#10B981' : '#22D3EE');

  const handleTTSPress = useCallback(async () => {
    if (ttsStatus === 'generating' || ttsStatus === 'speaking') {
      await stop();
    } else if (ttsStatus === 'ready' && ttsText) {
      await speak(ttsText);
    }
  }, [ttsStatus, ttsText, speak, stop]);

  return (
    <View style={styles.nextStepsCard}>
      <View style={styles.nextStepsHeader}>
        <Text style={[styles.nextStepsTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>
          Next Steps
        </Text>
        {ttsText && ttsAvailable && ttsStatus !== 'not_downloaded' && ttsStatus !== 'checking' && (
          <>
            {ttsStatus === 'generating' && (
              <TouchableOpacity style={styles.inlineIconOnlyButton} onPress={handleTTSPress} activeOpacity={0.7}>
                <ActivityIndicator size="small" color="#94A3B8" />
              </TouchableOpacity>
            )}
            {ttsStatus === 'speaking' && (
              <TouchableOpacity style={styles.inlineIconOnlyButton} onPress={handleTTSPress} activeOpacity={0.7}>
                <Ionicons name="pause" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
            {ttsStatus === 'ready' && (
              <TouchableOpacity
                style={[styles.inlineTtsButton, isDisabled && { opacity: 0.5 }]}
                onPress={handleTTSPress}
                activeOpacity={isDisabled ? 1 : 0.7}
                disabled={isDisabled}
              >
                <Ionicons name={ttsHasPlayed ? "refresh-outline" : "volume-medium-outline"} size={16} color={listenColor} />
                <Text style={[styles.inlineTtsButtonText, { fontFamily: FONTS.BarlowSemiCondensed, color: listenColor }]}>
                  {ttsHasPlayed ? 'Replay' : 'Listen'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {isTTSActive && ttsChunks.length > 0 ? (
        <TTSHighlightedText
          chunks={ttsChunks}
          chunkStates={ttsChunkStates}
          isActive={isTTSActive}
          containerStyle={styles.ttsHighlightContainer}
          parentPadding={20}
        />
      ) : (
        items.map((item, idx) => {
          const { label, content } = parseStepItem(item);
          return (
            <View key={idx} style={styles.stepRow}>
              <View style={styles.stepContent}>
                {label && (
                  <Text style={[styles.stepLabel, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                    {label}
                  </Text>
                )}
                <Text style={[styles.stepText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {content}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
});

// PrimaryCard - Memoized for stable reference
interface PrimaryCardProps {
  title: string;
  items: string[];
  icon: React.ReactNode;
}

const PrimaryCard = memo(function PrimaryCard({ title, items, icon }: PrimaryCardProps) {
  const ttsText = prepareRecommendationsForTTS(items, 4);

  const {
    status: ttsStatus,
    speak,
    stop,
    chunks: ttsChunks,
    chunkStates: ttsChunkStates,
    isAvailable: ttsAvailable,
    hasPlayed: ttsHasPlayed,
    isOtherPlaying,
  } = useTTS();

  const isTTSActive = ttsStatus === 'generating' || ttsStatus === 'speaking';
  const isDisabled = isOtherPlaying;
  const listenColor = isDisabled ? '#D1D5DB' : (ttsHasPlayed ? '#10B981' : '#22D3EE');

  const handleTTSPress = useCallback(async () => {
    if (ttsStatus === 'generating' || ttsStatus === 'speaking') {
      await stop();
    } else if (ttsStatus === 'ready' && ttsText) {
      await speak(ttsText);
    }
  }, [ttsStatus, ttsText, speak, stop]);

  return (
    <View style={styles.primaryAssessmentCard}>
      <View style={styles.nextStepsHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon}
          <Text style={[styles.primaryCardTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>{title}</Text>
        </View>
        {ttsText && ttsAvailable && ttsStatus !== 'not_downloaded' && ttsStatus !== 'checking' && (
          <>
            {ttsStatus === 'generating' && (
              <TouchableOpacity style={styles.inlineIconOnlyButton} onPress={handleTTSPress} activeOpacity={0.7}>
                <ActivityIndicator size="small" color="#94A3B8" />
              </TouchableOpacity>
            )}
            {ttsStatus === 'speaking' && (
              <TouchableOpacity style={styles.inlineIconOnlyButton} onPress={handleTTSPress} activeOpacity={0.7}>
                <Ionicons name="pause" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
            {ttsStatus === 'ready' && (
              <TouchableOpacity
                style={[styles.inlineTtsButton, isDisabled && { opacity: 0.5 }]}
                onPress={handleTTSPress}
                activeOpacity={isDisabled ? 1 : 0.7}
                disabled={isDisabled}
              >
                <Ionicons name={ttsHasPlayed ? "refresh-outline" : "volume-medium-outline"} size={16} color={listenColor} />
                <Text style={[styles.inlineTtsButtonText, { fontFamily: FONTS.BarlowSemiCondensed, color: listenColor }]}>
                  {ttsHasPlayed ? 'Replay' : 'Listen'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {isTTSActive && ttsChunks.length > 0 ? (
        <TTSHighlightedText
          chunks={ttsChunks}
          chunkStates={ttsChunkStates}
          isActive={isTTSActive}
          asBulletList={true}
          containerStyle={styles.ttsHighlightContainer}
          parentPadding={16}
        />
      ) : (
        items.slice(0, 4).map((it, idx) => (
          <View key={idx} style={styles.cardItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={[styles.cardItemText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
              {it}
            </Text>
          </View>
        ))
      )}
    </View>
  );
});

// AccordionCard - Memoized for stable reference
interface AccordionCardProps {
  title: string;
  items: string[];
  icon: React.ReactNode;
  sectionKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  isPremium: boolean;
  onUpgradePress?: () => void;
}

const AccordionCard = memo(function AccordionCard({
  title,
  items,
  icon,
  sectionKey,
  isExpanded,
  onToggle,
  isPremium,
  onUpgradePress,
}: AccordionCardProps) {
  const previewCount = 2;
  const hasMoreContent = items.length > previewCount;
  const previewItems = items.slice(0, previewCount);
  const showUpgrade = !isPremium && hasMoreContent && isExpanded;

  const visibleItems = isPremium ? items : previewItems;
  const ttsText = prepareSectionForTTS(title, visibleItems);

  const {
    status: ttsStatus,
    speak,
    stop,
    chunks: ttsChunks,
    chunkStates: ttsChunkStates,
    isAvailable: ttsAvailable,
    hasPlayed: ttsHasPlayed,
    isOtherPlaying,
  } = useTTS();

  const isTTSActive = ttsStatus === 'generating' || ttsStatus === 'speaking';
  const isDisabled = isOtherPlaying;
  const listenColor = isDisabled ? '#D1D5DB' : (ttsHasPlayed ? '#10B981' : '#22D3EE');

  const handleTTSPress = useCallback(async () => {
    if (ttsStatus === 'generating' || ttsStatus === 'speaking') {
      await stop();
    } else if (ttsStatus === 'ready' && ttsText) {
      await speak(ttsText);
    }
  }, [ttsStatus, ttsText, speak, stop]);

  return (
    <View style={[styles.accordionCard, !isPremium && styles.accordionCardPremium]}>
      <TouchableOpacity style={styles.accordionHeader} onPress={onToggle} activeOpacity={0.7}>
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
        <View style={styles.accordionHeaderRight}>
          {isExpanded && ttsText && ttsAvailable && ttsStatus !== 'not_downloaded' && ttsStatus !== 'checking' && (
            <>
              {ttsStatus === 'generating' && (
                <TouchableOpacity style={styles.inlineIconOnlyButton} onPress={handleTTSPress} activeOpacity={0.7}>
                  <ActivityIndicator size="small" color="#94A3B8" />
                </TouchableOpacity>
              )}
              {ttsStatus === 'speaking' && (
                <TouchableOpacity style={styles.inlineIconOnlyButton} onPress={handleTTSPress} activeOpacity={0.7}>
                  <Ionicons name="pause" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
              {ttsStatus === 'ready' && (
                <TouchableOpacity
                  style={[styles.inlineTtsButton, isDisabled && { opacity: 0.5 }]}
                  onPress={handleTTSPress}
                  activeOpacity={isDisabled ? 1 : 0.7}
                  disabled={isDisabled}
                >
                  <Ionicons name={ttsHasPlayed ? "refresh-outline" : "volume-medium-outline"} size={16} color={listenColor} />
                  <Text style={[styles.inlineTtsButtonText, { fontFamily: FONTS.BarlowSemiCondensed, color: listenColor }]}>
                    {ttsHasPlayed ? 'Replay' : 'Listen'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
        </View>
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.accordionContent}>
          {isTTSActive && ttsChunks.length > 0 ? (
            <TTSHighlightedText
              chunks={ttsChunks}
              chunkStates={ttsChunkStates}
              isActive={isTTSActive}
              asBulletList={true}
              containerStyle={styles.ttsHighlightContainer}
              parentPadding={14}
            />
          ) : (
            visibleItems.map((it, idx) => (
              <View key={idx} style={styles.cardItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={[styles.cardItemText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                  {it}
                </Text>
              </View>
            ))
          )}

          {showUpgrade && !isTTSActive && (
            <View style={styles.premiumUpgradeContainer}>
              <Text style={[styles.premiumMoreText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                {items.length - previewCount} more insights available
              </Text>
              <TouchableOpacity style={styles.premiumUpgradeLink} onPress={onUpgradePress} activeOpacity={0.7}>
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
});

// ═══════════════════════════════════════════════════════════
// END MEMOIZED CARD COMPONENTS
// ═══════════════════════════════════════════════════════════

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
                isExpanded={expandedSections[key] || false}
                onToggle={() => toggleSection(key)}
                isPremium={isPremium}
                onUpgradePress={onUpgradePress}
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
          isExpanded={expandedSections['OTHER'] || false}
          onToggle={() => toggleSection('OTHER')}
          isPremium={isPremium}
          onUpgradePress={onUpgradePress}
        />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// IMAGE CAROUSEL COMPONENT - Horizontal slideshow for all images
// ═══════════════════════════════════════════════════════════
interface ImageCarouselProps {
  photos: string[];
  yoloResult: PipelineResult | null;
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_PADDING = 40; // 20px padding on each side
const IMAGE_WIDTH = SCREEN_WIDTH - CAROUSEL_PADDING;

// Calculate where image renders within container using "contain" mode
function calculateContainLayout(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
) {
  if (!containerWidth || !containerHeight || !imageWidth || !imageHeight) {
    return null;
  }

  const containerAspect = containerWidth / containerHeight;
  const imageAspect = imageWidth / imageHeight;

  let renderedWidth: number;
  let renderedHeight: number;

  if (imageAspect > containerAspect) {
    // Image is wider - fit to width
    renderedWidth = containerWidth;
    renderedHeight = containerWidth / imageAspect;
  } else {
    // Image is taller - fit to height
    renderedHeight = containerHeight;
    renderedWidth = containerHeight * imageAspect;
  }

  return {
    offsetX: (containerWidth - renderedWidth) / 2,
    offsetY: (containerHeight - renderedHeight) / 2,
    scaleX: renderedWidth / imageWidth,
    scaleY: renderedHeight / imageHeight,
  };
}

// Get color for detection class (same as ScanningOverlay)
function getDetectionColor(className: string): string {
  const colorMap: Record<string, string> = {
    '1st degree burn': '#FF9500',
    '2nd degree burn': '#FF6B00',
    '3rd degree burn': '#FF3B30',
    'Rashes': '#FF2D92',
    'abrasion': '#34C759',
    'bruise': '#AF52DE',
    'cut': '#30D158',
    'frostbite': '#5AC8FA',
  };
  return colorMap[className] || '#2A7DE1';
}

function ImageCarousel({ photos, yoloResult, activeIndex, onIndexChange }: ImageCarouselProps) {
  // Track container layout and image dimensions for label positioning
  const [containerLayout, setContainerLayout] = useState({ width: 0, height: 0 });
  const [imageDimensions, setImageDimensions] = useState<Record<number, { width: number; height: number }>>({});

  // Fetch image dimensions for all photos
  useEffect(() => {
    photos.forEach((uri, index) => {
      // For annotated images (base64), get dimensions from the result
      const result = yoloResult?.results[index];
      if (result?.annotatedImageBase64) {
        // Use original image dimensions from preprocessing if available
        const originalDims = result.originalDimensions;
        if (originalDims) {
          setImageDimensions(prev => ({
            ...prev,
            [index]: { width: originalDims.width, height: originalDims.height },
          }));
          return;
        }
      }
      // Fallback: get dimensions from URI
      Image.getSize(
        uri,
        (width, height) => {
          setImageDimensions(prev => ({
            ...prev,
            [index]: { width, height },
          }));
        },
        () => {} // Ignore errors
      );
    });
  }, [photos, yoloResult]);

  // Handle container layout
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerLayout({ width, height });
  }, []);

  // Get image source for each photo (annotated if available, original otherwise)
  const getImageSource = (index: number) => {
    const result = yoloResult?.results[index];
    const hasAnnotated = result?.annotatedImageBase64 && result.annotatedImageBase64.length > 0;
    return hasAnnotated
      ? { uri: `data:image/jpeg;base64,${result.annotatedImageBase64}` }
      : { uri: photos[index] };
  };

  // Handle scroll end to update active index
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / IMAGE_WIDTH);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < photos.length) {
      onIndexChange(newIndex);
    }
  };

  // Render detection labels for an image
  const renderDetectionLabels = (index: number) => {
    const result = yoloResult?.results[index];
    const detections = result?.detections || [];
    const dims = imageDimensions[index];

    if (!detections.length || !dims || !containerLayout.width || !containerLayout.height) {
      return null;
    }

    // Image is now edge-to-edge, no wrapper padding
    const IMAGE_HEIGHT = 280;
    const layout = calculateContainLayout(
      containerLayout.width,
      IMAGE_HEIGHT,
      dims.width,
      dims.height
    );

    if (!layout) return null;

    const { offsetX, offsetY, scaleX, scaleY } = layout;

    return detections.map((detection, idx) => {
      const { x1, y1 } = detection.boxCorners;
      // Position label at top-left of bounding box
      const labelX = offsetX + x1 * scaleX;
      const labelY = offsetY + y1 * scaleY;

      return (
        <View
          key={idx}
          style={[
            carouselStyles.detectionLabel,
            {
              backgroundColor: getDetectionColor(detection.className),
              left: labelX,
              top: Math.max(8, labelY - 24), // Position above the box with min padding
            },
          ]}
        >
          <Text style={carouselStyles.detectionLabelText}>
            {detection.className}
          </Text>
        </View>
      );
    });
  };

  return (
    <View style={carouselStyles.container}>
      {/* Horizontal Image Scroll */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        decelerationRate="fast"
        snapToInterval={IMAGE_WIDTH}
        snapToAlignment="start"
      >
        {photos.map((_, index) => (
          <View
            key={index}
            style={[carouselStyles.imageSlide, { width: IMAGE_WIDTH }]}
            onLayout={handleContainerLayout}
          >
            {/* Blurred background fill for portrait/narrow images */}
            <Image
              source={getImageSource(index)}
              style={carouselStyles.blurredBackground}
              resizeMode="cover"
              blurRadius={20}
            />
            <View style={carouselStyles.blurOverlay} />
            {/* Main image with contain */}
            <Image
              source={getImageSource(index)}
              style={carouselStyles.image}
              resizeMode="contain"
            />
            {/* Detection labels overlay */}
            {renderDetectionLabels(index)}
          </View>
        ))}
      </ScrollView>

      {/* Floating Page Indicators - Frosted Glass Pill */}
      {photos.length > 1 && (
        <View style={carouselStyles.indicatorsOverlay}>
          <View style={carouselStyles.indicatorsPill}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[
                  carouselStyles.indicator,
                  index === activeIndex && carouselStyles.indicatorActive,
                ]}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Carousel-specific styles
const carouselStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  imageSlide: {
    position: "relative",
    height: 280,
  },
  blurredBackground: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ scale: 1.1 }], // Slight scale to prevent blur edges
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.15)", // Subtle darkening
  },
  image: {
    width: "100%",
    height: 280,
    zIndex: 1,
  },
  detectionLabel: {
    position: "absolute",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 10,
  },
  detectionLabelText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  indicatorsOverlay: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  // Dark frosted pill for visibility on any background
  indicatorsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  indicatorActive: {
    backgroundColor: "#FFFFFF",
    width: 18,
    borderRadius: 3,
  },
});

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

  // Image Carousel State
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Scanning Overlay State - shows scan animation before revealing results
  const [showScanningOverlay, setShowScanningOverlay] = useState(true);

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

        // Use severity-based guidance which already has proper headers for card parsing
        const fallbackContext = getSeverityBasedGuidance(severity);

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

  // Handle scanning overlay completion
  const handleScanningComplete = () => {
    console.log("✅ [ScanningOverlay] Scan complete, revealing carousel");
    setShowScanningOverlay(false);
  };

  // Calm, clinical care level indicators (not alarming)
  const getCareLevel = (severity: number) => {
    if (severity >= 9) return {
      label: "Critical",
      text: "Seek immediate care",
      subtext: "Professional evaluation recommended now",
      color: "#B91C1C",
      bgColor: "#FEF2F2",
      icon: "medical" as const
    };
    if (severity >= 7) return {
      label: "Moderate",
      text: "Schedule care soon",
      subtext: "Consider seeing a healthcare provider today",
      color: "#C2410C",
      bgColor: "#FFF7ED",
      icon: "calendar" as const
    };
    if (severity >= 4) return {
      label: "Mild",
      text: "Monitor and follow guidance",
      subtext: "Home care may be appropriate with watchful attention",
      color: "#1D4ED8",
      bgColor: "#EFF6FF",
      icon: "eye" as const
    };
    return {
      label: "Minor",
      text: "Self-care recommended",
      subtext: "Your symptoms suggest manageable home care",
      color: "#047857",
      bgColor: "#ECFDF5",
      icon: "checkmark-circle" as const
    };
  };

  // Patient-friendly injury names (not technical/system labels)
  const getPatientFriendlyName = (className: string): string => {
    const nameMap: Record<string, string> = {
      '1st degree burn': 'First-degree burn',
      '2nd degree burn': 'Second-degree burn',
      '3rd degree burn': 'Third-degree burn',
      'Rashes': 'Skin rash',
      'abrasion': 'Skin abrasion',
      'bruise': 'Bruise',
      'cut': 'Cut',
      'frostbite': 'Frostbite',
    };
    return nameMap[className] || className;
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
          {/* Scanning Overlay - Shows scan animation on each image before revealing results */}
          {showScanningOverlay && displayPhotos.length > 0 ? (
            <ScanningOverlay
              visible={true}
              images={displayPhotos}
              yoloResult={yoloResult}
              isYoloComplete={!isYoloProcessing && yoloResult !== null}
              onComplete={handleScanningComplete}
            />
          ) : (
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.contentSection}>
                {/* ═══════════════════════════════════════════════════════════
                    EVIDENCE SECTION - Horizontal Image Carousel
                    Shows all images in a slideshow with indicators
                    ═══════════════════════════════════════════════════════════ */}
                {displayPhotos.length > 0 && (
                  <View style={styles.evidenceSection}>
                    {/* Processing State */}
                    {isYoloProcessing && (
                      <View style={styles.yoloProcessingContainer}>
                        <ActivityIndicator size="small" color="#2A7DE1" />
                        <Text style={[styles.yoloProcessingText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          {yoloProgress || "Analyzing your images..."}
                        </Text>
                      </View>
                    )}

                    {/* Error State */}
                    {yoloError && (
                      <View style={styles.yoloErrorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#DC3545" />
                        <Text style={[styles.yoloErrorText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
                          Unable to analyze images
                        </Text>
                      </View>
                    )}

                    {/* Image Carousel - Horizontal slideshow of all images */}
                    {!isYoloProcessing && !yoloError && (
                      <ImageCarousel
                        photos={displayPhotos}
                        yoloResult={yoloResult}
                        activeIndex={activeImageIndex}
                        onIndexChange={setActiveImageIndex}
                      />
                    )}
                  </View>
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
                    {renderAssessmentCards(
                      symptomContext,
                      expandedSections,
                      toggleSection,
                      isPremium,
                      handleUpgradePress
                    )}
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
          )}
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
  // ═══════════════════════════════════════════════════════════
  // EVIDENCE SECTION - Unified Image Card Styles
  // ═══════════════════════════════════════════════════════════
  evidenceSection: {
    marginBottom: 24,
  },
  evidenceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  evidenceLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  evidenceImageWrapper: {
    backgroundColor: "#F8F9FA",
    padding: 8,
    marginHorizontal: 8,
    borderRadius: 10,
  },
  evidenceImage: {
    width: "100%",
    height: 280,
    borderRadius: 8,
  },
  evidenceExplanation: {
    fontSize: 13,
    color: "#9CA3AF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    textAlign: "center",
    fontStyle: "italic",
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
  accordionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  accordionTtsButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cardTtsButton: {
    marginLeft: "auto",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  // Inline TTS button styles - minimal modern theme
  inlineTtsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "transparent",
    gap: 5,
    minHeight: 28,
  },
  inlineIconOnlyButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    minWidth: 28,
    minHeight: 28,
  },
  inlineTtsButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#22D3EE",
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  ttsHighlightContainer: {
    marginTop: 8,
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
  // Next Steps - Clear 3-step timeline
  nextStepsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  nextStepsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  ttsButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  nextStepsTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1, // Allow title to take available space
  },
  stepRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  stepText: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
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
