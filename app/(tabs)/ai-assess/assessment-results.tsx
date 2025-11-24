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
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../convex/_generated/api";
import { useWatermelonDatabase } from "../../../watermelon/hooks/useDatabase";

// YOLO Pipeline for wound detection
import { runPipeline, type PipelineResult } from "../../../utils/yolo";

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

// Render assessment as separate cards: Summary, Severity, Recommendations, Red Flags, Next Steps
function renderAssessmentCards(text: string | null) {
  if (!text) return null;
  
  console.log("=== Parsing Medical Triage Assessment ===");
  console.log("Raw text length:", text.length);
  
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  
  // Add debug logging to see actual content
  console.log('=== Raw Assessment Text Sample (first 500 chars) ===');
  console.log(text.substring(0, 500));
  console.log('=== Lines with ** markers (potential headers) ===');
  lines.forEach((line, idx) => {
    if (line.includes('**') || line.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*:$/)) {
      console.log(`Line ${idx}: "${line}"`);
    }
  });
  
  type SectionKey = 
    | 'CLINICAL ASSESSMENT'
    | 'VISUAL FINDINGS'
    | 'CLINICAL INTERPRETATION'
    | 'BURN/WOUND GRADING'
    | 'INFECTION RISK'
    | 'EMERGENCY RED FLAGS'
    | 'RURAL GUIDANCE'
    | 'URGENCY ASSESSMENT'
    | 'RECOMMENDATIONS'
    | 'NEXT STEPS'
    | 'OTHER';
    
  const wantedOrder: SectionKey[] = [
    'CLINICAL ASSESSMENT',
    'VISUAL FINDINGS',
    'CLINICAL INTERPRETATION',
    'BURN/WOUND GRADING',
    'INFECTION RISK',
    'EMERGENCY RED FLAGS',
    'RURAL GUIDANCE',
    'URGENCY ASSESSMENT',
    'RECOMMENDATIONS',
    'NEXT STEPS'
  ];
  
  const sections: Record<SectionKey, string[]> = {
    'CLINICAL ASSESSMENT': [],
    'VISUAL FINDINGS': [],
    'CLINICAL INTERPRETATION': [],
    'BURN/WOUND GRADING': [],
    'INFECTION RISK': [],
    'EMERGENCY RED FLAGS': [],
    'RURAL GUIDANCE': [],
    'URGENCY ASSESSMENT': [],
    'RECOMMENDATIONS': [],
    'NEXT STEPS': [],
    'OTHER': [],
  };
  let current: SectionKey = 'CLINICAL ASSESSMENT';

  const isHeader = (l: string): SectionKey | null => {
    const lower = l.toLowerCase().trim();
    // Remove markdown bold markers and numbered prefixes (e.g., "1. ", "2. ")
    const cleaned = lower.replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').trim();
    
    // Clinical Assessment (also matches variations like "Patient Assessment", "Initial Assessment")
    if (/^(clinical|patient|initial)\s+assessment\s*:?/i.test(cleaned)) return 'CLINICAL ASSESSMENT';
    
    // Visual Findings from Medical Images
    if (/^visual\s+findings?\s*(from\s+(medical\s+)?images?)?\s*:?/i.test(cleaned)) return 'VISUAL FINDINGS';
    if (/^image\s+analysis\s*:?/i.test(cleaned)) return 'VISUAL FINDINGS';
    
    // Clinical Interpretation and Differential Considerations
    if (/^clinical\s+interpretation\s*(and\s+differential\s+considerations?)?\s*:?/i.test(cleaned)) return 'CLINICAL INTERPRETATION';
    if (/^differential\s+(diagnosis|considerations?)\s*:?/i.test(cleaned)) return 'CLINICAL INTERPRETATION';
    if (/^interpretation\s*:?/i.test(cleaned)) return 'CLINICAL INTERPRETATION';
    
    // Burn/Wound/Injury Grading
    if (/^(burn|wound|injury)\s*[\/,]?\s*(wound|injury)?\s*[\/,]?\s*(injury)?\s*(grading|classification|severity)\s*:?/i.test(cleaned)) return 'BURN/WOUND GRADING';
    if (/^severity\s+(grading|classification|level)\s*:?/i.test(cleaned)) return 'BURN/WOUND GRADING';
    if (/^grading\s*:?/i.test(cleaned)) return 'BURN/WOUND GRADING';
    
    // Infection Risk Assessment
    if (/^infection\s+risk\s*(assessment)?\s*:?/i.test(cleaned)) return 'INFECTION RISK';
    if (/^risk\s+of\s+infection\s*:?/i.test(cleaned)) return 'INFECTION RISK';
    
    // Specific Emergency Red Flags
    if (/^(specific\s+)?emergency\s+red\s+flags?\s*:?/i.test(cleaned)) return 'EMERGENCY RED FLAGS';
    if (/^red\s+flags?\s*:?/i.test(cleaned)) return 'EMERGENCY RED FLAGS';
    if (/^warning\s+signs?\s*:?/i.test(cleaned)) return 'EMERGENCY RED FLAGS';
    
    // Rural Specific Resource Guidance
  if (/^rural[-\s]?specific\s+resource\s+guidance\s*:?$/i.test(cleaned)) return 'RURAL GUIDANCE';
  if (/^rural[-\s]?specific\s+resource\s+guideline\s*:?$/i.test(cleaned)) return 'RURAL GUIDANCE';
  if (/^rural\s+(specific\s+)?(resource\s+)?guidance\s*:?$/i.test(cleaned)) return 'RURAL GUIDANCE';
  if (/^resource\s+guidance\s*:?$/i.test(cleaned)) return 'RURAL GUIDANCE';
  if (/^rural\s+(considerations?|resources?)\s*:?$/i.test(cleaned)) return 'RURAL GUIDANCE';
  if (/^rural\s+guidance\s*:?$/i.test(cleaned)) return 'RURAL GUIDANCE';
  if (/^rural\s+resource\s+guidance\s*:?$/i.test(cleaned)) return 'RURAL GUIDANCE';
  if (/^rural\s+resources?\s*:?$/i.test(cleaned)) return 'RURAL GUIDANCE';
    
    // Urgency Assessment
    if (/^urgency\s+(assessment|level)\s*:?/i.test(cleaned)) return 'URGENCY ASSESSMENT';
    if (/^urgency\s*:?/i.test(cleaned)) return 'URGENCY ASSESSMENT';
    
    // Recommendations
  if (/^recommendations?\s*:?/i.test(cleaned)) return 'RECOMMENDATIONS';
  if (/^treatment\s+recommendations?\s*:?/i.test(cleaned)) return 'RECOMMENDATIONS';
  if (/^time[-\s]?sensitive\s+treatment\s+recommendations?\s*:?/i.test(cleaned)) return 'RECOMMENDATIONS';
    
    // Next Steps
    if (/^next\s+steps?\s*:?/i.test(cleaned)) return 'NEXT STEPS';
    if (/^action\s+plan\s*:?/i.test(cleaned)) return 'NEXT STEPS';
    
    return null;
  };

  for (const l of lines) {
    if (!l) continue;
    const hdr = isHeader(l);
    if (hdr) { 
      console.log(`✅ Found header: "${l}" → ${hdr}`);
      current = hdr;
      continue; 
    }
    const content = l.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '');
    if (content) {
      sections[current].push(content);
    }
  }
  
  console.log("=== Parsed Medical Sections ===");
  Object.keys(sections).forEach(key => {
    console.log(`${key}: ${sections[key as SectionKey].length} items`);
  });

  const Card = ({ title, items, icon, iconColor = "#2A7DE1" }: { 
    title: string; 
    items: string[]; 
    icon: React.ReactNode;
    iconColor?: string;
  }) => (
    <View style={styles.assessmentCard}>
      <View style={styles.cardHeader}>
        {icon}
        <Text style={[styles.cardTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>{title}</Text>
      </View>
      {items.map((it, idx) => (
        <View key={idx} style={styles.cardItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={[styles.cardItemText, { fontFamily: FONTS.BarlowSemiCondensed }]}>
            {it}
          </Text>
        </View>
      ))}
    </View>
  );

  const icons: Record<SectionKey, { icon: React.ReactNode; color: string }> = {
    'CLINICAL ASSESSMENT': { icon: <Ionicons name="medical" size={20} color="#2A7DE1" />, color: "#2A7DE1" },
    'VISUAL FINDINGS': { icon: <Ionicons name="eye" size={20} color="#9B59B6" />, color: "#9B59B6" },
    'CLINICAL INTERPRETATION': { icon: <Ionicons name="clipboard" size={20} color="#3498DB" />, color: "#3498DB" },
    'BURN/WOUND GRADING': { icon: <Ionicons name="fitness" size={20} color="#E67E22" />, color: "#E67E22" },
    'INFECTION RISK': { icon: <Ionicons name="shield-checkmark" size={20} color="#E74C3C" />, color: "#E74C3C" },
    'EMERGENCY RED FLAGS': { icon: <Ionicons name="warning" size={20} color="#DC3545" />, color: "#DC3545" },
    'RURAL GUIDANCE': { icon: <Ionicons name="location" size={20} color="#16A085" />, color: "#16A085" },
    'URGENCY ASSESSMENT': { icon: <Ionicons name="speedometer" size={20} color="#FF6B35" />, color: "#FF6B35" },
    'RECOMMENDATIONS': { icon: <Ionicons name="checkmark-circle" size={20} color="#28A745" />, color: "#28A745" },
    'NEXT STEPS': { icon: <Ionicons name="arrow-forward-circle" size={20} color="#2A7DE1" />, color: "#2A7DE1" },
    'OTHER': { icon: <Ionicons name="information-circle" size={20} color="#6C757D" />, color: "#6C757D" },
  };

  return (
    <View>
      {wantedOrder.map((key) => (
        sections[key] && sections[key].length > 0 ? (
          <Card 
            key={key} 
            title={key} 
            items={sections[key]} 
            icon={icons[key].icon}
            iconColor={icons[key].color}
          />
        ) : null
      ))}
      {sections['OTHER'] && sections['OTHER'].length > 0 && (
        <Card title="OTHER" items={sections['OTHER']} icon={icons['OTHER'].icon} />
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

  // YOLO Detection State
  const [yoloResult, setYoloResult] = useState<PipelineResult | null>(null);
  const [isYoloProcessing, setIsYoloProcessing] = useState(false);
  const [yoloError, setYoloError] = useState<string | null>(null);
  const [yoloProgress, setYoloProgress] = useState<string>("");

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

  // Define fetchAIAssessment first so it is in scope and can be called after images are processed
  const fetchAIAssessment = async (imagesArg: string[] = []) => {
    // Prevent multiple simultaneous requests and re-fetches
    if (isFetchingRef.current || hasAttemptedFetch) {
      return;
    }
    
    console.log(`🔍 fetchAIAssessment called - isOnline: ${isOnline}, isChecking: ${isChecking}`);
    
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

      // Use imagesArg if provided; otherwise fallback to any already-processed photos in aiContext
      const imagesToSend = imagesArg && imagesArg.length > 0
        ? imagesArg
        : (aiContext?.uploadedPhotos || []);

      // If offline, save locally and show offline message
      if (!isOnline) {
        console.log("📴 Offline: Saving AI assessment to local database");
        
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const dateString = `${year}-${month}-${day}`;
        const timestamp = today.getTime();

        try {
          // Determine user id while offline
          let uid: string | undefined = currentUser?._id as any;
          if (!uid) {
            try {
              const raw = await AsyncStorage.getItem("@profile_user");
              if (raw) {
                const parsed = JSON.parse(raw);
                uid = parsed?._id || parsed?.id || uid;
              }
            } catch {}
          }
          if (!uid) {
            // Try Watermelon users table
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

          const collection = database.get("health_entries");
          await database.write(async () => {
            await collection.create((entry: any) => {
              entry.userId = uid || "offline_user";
              entry.symptoms = description;
              entry.severity = severity;
              entry.category = category;
              entry.notes = `AI Assessment - ${category}`;
              entry.timestamp = timestamp;
              entry.date = dateString;
              entry.type = "ai_assessment";
              entry.createdBy = "AI Assessment";
              entry.isSynced = false;
            });
          });

          console.log("✅ AI assessment saved offline successfully");
          setIsLogged(true);
          
          // Show offline success message instead of error
          setSymptomContext("Your assessment has been saved offline and will be analyzed when you reconnect to the internet. The entry is now visible in your health history.");
        } catch (offlineError) {
          console.error("❌ Failed to save offline:", offlineError);
          setAssessmentError(true);
          } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
          }
          return;
      }

      console.log("🚀 Calling Gemini with:", {
        description: description.substring(0, 50),
        severity,
        duration,
        category,
        symptomsCount: aiContext?.symptoms?.length || 0,
        imageCount: imagesToSend.length,
        hasImages: imagesToSend.length > 0,
      });

      const res = await generateContext({
        description,
        severity,
        duration,
        environmentalFactors: aiContext?.environmentalFactors || [],
        category,
        symptoms: aiContext?.symptoms || [],
        images: imagesToSend,
      });

      const cleanedContext = cleanGeminiResponse(res.context);
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
      if (displayPhotos.length > 0 && aiContext) {
        console.log(`📸 Processing ${displayPhotos.length} images in background...`);
        try {
          base64Images = await convertImagesToBase64(displayPhotos);
          console.log(`✅ Successfully converted ${base64Images.length} images to base64`);
          aiContext.uploadedPhotos = base64Images;
        } catch (error) {
          console.error("❌ Error converting images:", error);
          aiContext.uploadedPhotos = [];
        }
      }
      // Trigger Gemini request after images are ready (or immediately if no images)
      fetchAIAssessment(base64Images);
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

  const handleCall911 = () => Linking.openURL("tel:911");
  const handleCall811 = () => Linking.openURL("tel:811");
  const handleNewAssessment = () => router.replace("/(tabs)/ai-assess");
  const handleReturnHome = () => router.replace("/(tabs)/dashboard");

  const getUrgencyColor = (severity: number) => {
    if (severity >= 9) return "#DC3545";
    if (severity >= 7) return "#FF6B35";
    if (severity >= 4) return "#FFC107";
    return "#28A745";
  };

  const getUrgencyText = (severity: number) => {
    if (severity >= 9) return "Critical Emergency";
    if (severity >= 7) return "Severe - Urgent Care";
    if (severity >= 4) return "Moderate - Prompt Care";
    return "Mild - Self Care";
  };

  const getUrgencyIcon = (severity: number) => {
    if (severity >= 9) return "alert-circle";
    if (severity >= 7) return "warning";
    if (severity >= 4) return "information-circle";
    return "checkmark-circle";
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

  const EmergencyItem = ({ text }: { text: string }) => (
    <View style={styles.emergencyItem}>
      <Ionicons name="warning" size={16} color="#DC3545" />
      <Text
        style={[
          styles.emergencyText,
          { fontFamily: FONTS.BarlowSemiCondensed },
        ]}
      >
        {text}
      </Text>
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
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: FONTS.BarlowSemiCondensed },
                ]}
              >
                AI Health Assessment
              </Text>

              <View style={styles.urgencyContainer}>
                <View
                  style={[
                    styles.urgencyIndicator,
                    { backgroundColor: getUrgencyColor(actualSeverity) },
                  ]}
                >
                  <Ionicons
                    name={getUrgencyIcon(actualSeverity) as any}
                    size={24}
                    color="white"
                  />
                  <Text style={styles.urgencyText}>
                    {getUrgencyText(actualSeverity)}
                  </Text>
                  <Text style={styles.severityText}>
                    Severity Level: {actualSeverity}/10
                  </Text>
                </View>
              </View>

              {/* Medical Triage Assessment - Separated into Cards */}
              <Text
                style={[
                  styles.sectionSubtitle,
                  { fontFamily: FONTS.BarlowSemiCondensed, marginBottom: 16, marginTop: 8 },
                ]}
              >
                Medical Triage Assessment
              </Text>
              
              {isLoading ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator size="large" color="#2A7DE1" />
                  <Text
                    style={[
                      styles.loadingText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Analyzing your symptoms with AI assessment...
                  </Text>
                </View>
              ) : (
                <>
                  {renderAssessmentCards(symptomContext)}
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

              {/* Rest of your JSX remains the same */}
              {aiContext && (
                <ResultCard title="Symptom Summary" icon="document-text">
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Category
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        {aiContext.category}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Duration
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        {getDurationDisplay(params.duration as string)}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { fontFamily: FONTS.BarlowSemiCondensed },
                        ]}
                      >
                        Severity
                      </Text>
                      <Text
                        style={[
                          styles.summaryValue,
                          {
                            fontFamily: FONTS.BarlowSemiCondensed,
                            color: getUrgencyColor(actualSeverity),
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {actualSeverity}/10
                      </Text>
                    </View>
                    {aiContext.symptoms?.length > 0 && (
                      <View style={styles.summaryFullWidth}>
                        <Text
                          style={[
                            styles.summaryLabel,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          Key Symptoms
                        </Text>
                        <Text
                          style={[
                            styles.summaryValue,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          {aiContext.symptoms.slice(0, 5).join(", ")}
                          {aiContext.symptoms.length > 5 && "..."}
                        </Text>
                      </View>
                    )}
                  </View>
                </ResultCard>
              )}

              {displayPhotos.length > 0 && (
                <ResultCard title="Medical Photos" icon="camera">
                  <Text
                    style={[
                      styles.cardText,
                      {
                        fontFamily: FONTS.BarlowSemiCondensed,
                        marginBottom: 12,
                      },
                    ]}
                  >
                    {displayPhotos.length} photo(s) included in assessment
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {displayPhotos.map((photo: string, index: number) => (
                      <View key={index} style={styles.photoContainer}>
                        <Image
                          source={{ uri: photo }}
                          style={styles.assessmentPhoto}
                        />
                        <Text
                          style={[
                            styles.photoLabel,
                            { fontFamily: FONTS.BarlowSemiCondensed },
                          ]}
                        >
                          Photo {index + 1}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </ResultCard>
              )}

              <ResultCard title="Rural Alberta Considerations" icon="location">
                <View style={styles.recommendationList}>
                  <Text
                    style={[
                      styles.listItem,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    • Nearest hospital may be 30+ minutes away - plan travel
                    accordingly
                  </Text>
                  <Text
                    style={[
                      styles.listItem,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    • Weather conditions may impact road access to medical
                    facilities
                  </Text>
                  <Text
                    style={[
                      styles.listItem,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    • Keep emergency kit and communication devices charged and
                    ready
                  </Text>
                  <TouchableOpacity
                    style={styles.healthLinkButton}
                    onPress={handleCall811}
                  >
                    <Ionicons name="call" size={18} color="#2A7DE1" />
                    <Text
                      style={[
                        styles.healthLinkText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Health Link Alberta (811) - 24/7 Nursing Advice
                    </Text>
                  </TouchableOpacity>
                </View>
              </ResultCard>

              <ResultCard title="Emergency Red Flags" icon="warning">
                  <View style={styles.emergencyList}>
                    <EmergencyItem text="Severe difficulty breathing or chest pain" />
                    <EmergencyItem text="Signs of stroke (face drooping, arm weakness, speech difficulty)" />
                    <EmergencyItem text="Heavy bleeding that won't stop" />
                    <EmergencyItem text="Severe burns or traumatic injury" />
                    <EmergencyItem text="Loss of consciousness or confusion" />
                    <EmergencyItem text="Severe allergic reaction with swelling or breathing trouble" />
                  </View>
                  <TouchableOpacity
                    style={styles.emergencyButton}
                    onPress={handleCall911}
                  >
                    <Ionicons name="call" size={22} color="white" />
                    <Text
                      style={[
                        styles.emergencyButtonText,
                        { fontFamily: FONTS.BarlowSemiCondensed },
                      ]}
                    >
                      Call 911 Now
                    </Text>
                  </TouchableOpacity>
              </ResultCard>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.newAssessmentButton}
                  onPress={handleNewAssessment}
                >
                  <Ionicons name="document-text" size={20} color="white" />
                  <Text
                    style={[
                      styles.newAssessmentText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    New Assessment
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.trackerButton}
                  onPress={() => router.push("/(tabs)/tracker")}
                >
                  <Ionicons name="fitness" size={20} color="white" />
                  <Text
                    style={[
                      styles.trackerButtonText,
                      { fontFamily: FONTS.BarlowSemiCondensed },
                    ]}
                  >
                    Go to Health Tracker
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.homeButton}
                  onPress={handleReturnHome}
                >
                  <Ionicons name="home" size={20} color="#2A7DE1" />
                  <Text
                    style={[
                      styles.homeButtonText,
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
    padding: 24,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
    textAlign: "center",
  },
  urgencyContainer: {
    marginBottom: 20,
  },
  urgencyIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  urgencyText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
    marginRight: 12,
  },
  severityText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.9,
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryItem: {
    width: "48%",
    marginBottom: 12,
  },
  summaryFullWidth: {
    width: "100%",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
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
  recommendationList: {
    marginLeft: 8,
  },
  listItem: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 8,
    lineHeight: 20,
  },
  healthLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A7DE1",
  },
  healthLinkText: {
    fontSize: 14,
    color: "#2A7DE1",
    marginLeft: 8,
    fontWeight: "600",
  },
  emergencyList: {
    marginBottom: 16,
  },
  emergencyItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: "#DC3545",
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC3545",
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  emergencyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  actionButtons: {
    marginTop: 8,
  },
  newAssessmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2A7DE1",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  newAssessmentText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  trackerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28A745",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  trackerButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  homeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A7DE1",
  },
  homeButtonText: {
    color: "#2A7DE1",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
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
  bulletPoint: {
    fontSize: 16,
    color: "#1A1A1A",
    marginRight: 8,
    marginTop: 2,
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
});
