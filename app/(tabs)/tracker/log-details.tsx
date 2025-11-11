import Ionicons from "@expo/vector-icons/Ionicons";
import { Q } from "@nozbe/watermelondb";
import { useFocusEffect } from "@react-navigation/native";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useWatermelonDatabase } from "../../../watermelon/hooks/useDatabase";
import HealthEntry from "../../../watermelon/models/HealthEntry";
import { safeWrite } from "../../../watermelon/utils/safeWrite";
import { healthEntriesEvents } from "../../_context/HealthEntriesEvents";
import BottomNavigation from "../../components/bottomNavigation";
import CurvedBackground from "../../components/curvedBackground";
import CurvedHeader from "../../components/curvedHeader";
import DueReminderBanner from "../../components/DueReminderBanner";
import StatusModal from "../../components/StatusModal";
import { FONTS } from "../../constants/constants";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

// Renders AI assessment text into separate cards (mirrors assessment-results)
function renderAssessmentCards(text: string | null) {
  if (!text) return null;

  type SectionKey =
    | "CLINICAL ASSESSMENT"
    | "VISUAL FINDINGS"
    | "CLINICAL INTERPRETATION"
    | "BURN/WOUND GRADING"
    | "INFECTION RISK"
    | "EMERGENCY RED FLAGS"
    | "RURAL GUIDANCE"
    | "URGENCY ASSESSMENT"
    | "RECOMMENDATIONS"
    | "NEXT STEPS"
    | "OTHER";

  const wantedOrder: SectionKey[] = [
    "CLINICAL ASSESSMENT",
    "VISUAL FINDINGS",
    "CLINICAL INTERPRETATION",
    "BURN/WOUND GRADING",
    "INFECTION RISK",
    "EMERGENCY RED FLAGS",
    "RURAL GUIDANCE",
    "URGENCY ASSESSMENT",
    "RECOMMENDATIONS",
    "NEXT STEPS",
  ];

  const sections: Record<SectionKey, string[]> = {
    "CLINICAL ASSESSMENT": [],
    "VISUAL FINDINGS": [],
    "CLINICAL INTERPRETATION": [],
    "BURN/WOUND GRADING": [],
    "INFECTION RISK": [],
    "EMERGENCY RED FLAGS": [],
    "RURAL GUIDANCE": [],
    "URGENCY ASSESSMENT": [],
    "RECOMMENDATIONS": [],
    "NEXT STEPS": [],
    OTHER: [],
  };

  const isHeader = (l: string): SectionKey | null => {
    const lower = l.toLowerCase().trim();
    const cleaned = lower.replace(/\*\*/g, "").replace(/^\d+\.\s*/, "").trim();

    if (/^(clinical|patient|initial)\s+assessment\s*:?/i.test(cleaned)) return "CLINICAL ASSESSMENT";
    if (/^visual\s+findings?\s*(from\s+(medical\s+)?images?)?\s*:?/i.test(cleaned)) return "VISUAL FINDINGS";
    if (/^image\s+analysis\s*:?/i.test(cleaned)) return "VISUAL FINDINGS";
    if (/^clinical\s+interpretation\s*(and\s+differential\s+considerations?)?\s*:?/i.test(cleaned)) return "CLINICAL INTERPRETATION";
    if (/^differential\s+(diagnosis|considerations?)\s*:?/i.test(cleaned)) return "CLINICAL INTERPRETATION";
    if (/^interpretation\s*:?/i.test(cleaned)) return "CLINICAL INTERPRETATION";
    if (/^(burn|wound|injury)\s*[\/,]?\s*(wound|injury)?\s*[\/,]?\s*(injury)?\s*(grading|classification|severity)\s*:?/i.test(cleaned)) return "BURN/WOUND GRADING";
    if (/^severity\s+(grading|classification|level)\s*:?/i.test(cleaned)) return "BURN/WOUND GRADING";
    if (/^grading\s*:?/i.test(cleaned)) return "BURN/WOUND GRADING";
    if (/^infection\s+risk\s*(assessment)?\s*:?/i.test(cleaned)) return "INFECTION RISK";
    if (/^risk\s+of\s+infection\s*:?/i.test(cleaned)) return "INFECTION RISK";
    if (/^(specific\s+)?emergency\s+red\s+flags?\s*:?/i.test(cleaned)) return "EMERGENCY RED FLAGS";
    if (/^red\s+flags?\s*:?/i.test(cleaned)) return "EMERGENCY RED FLAGS";
    if (/^warning\s+signs?\s*:?/i.test(cleaned)) return "EMERGENCY RED FLAGS";
    if (/^rural[-\s]?specific\s+resource\s+guidance\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural[-\s]?specific\s+resource\s+guideline\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural\s+(specific\s+)?(resource\s+)?guidance\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^resource\s+guidance\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural\s+(considerations?|resources?)\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural\s+guidance\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural\s+resource\s+guidance\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^rural\s+resources?\s*:?$/i.test(cleaned)) return "RURAL GUIDANCE";
    if (/^urgency\s+(assessment|level)\s*:?/i.test(cleaned)) return "URGENCY ASSESSMENT";
    if (/^urgency\s*:?/i.test(cleaned)) return "URGENCY ASSESSMENT";
    if (/^recommendations?\s*:?/i.test(cleaned)) return "RECOMMENDATIONS";
    if (/^treatment\s+recommendations?\s*:?/i.test(cleaned)) return "RECOMMENDATIONS";
    if (/^time[-\s]?sensitive\s+treatment\s+recommendations?\s*:?/i.test(cleaned)) return "RECOMMENDATIONS";
    if (/^next\s+steps?\s*:?/i.test(cleaned)) return "NEXT STEPS";
    if (/^action\s+plan\s*:?/i.test(cleaned)) return "NEXT STEPS";
    return null;
  };

  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let current: SectionKey = "CLINICAL ASSESSMENT";
  for (const l of lines) {
    if (!l) continue;
    const hdr = isHeader(l);
    if (hdr) {
      current = hdr;
      continue;
    }
    const content = l.replace(/^[-•*]\s+/, "").replace(/^\d+\.\s+/, "");
    if (content) sections[current].push(content);
  }

  const Card = ({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) => (
    <View style={styles.assessmentCard}>
      <View style={styles.cardHeader}>
        {icon}
        <Text style={[styles.cardTitle, { fontFamily: FONTS.BarlowSemiCondensed }]}>{title}</Text>
      </View>
      {items.map((it, idx) => (
        <View key={idx} style={styles.cardItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={[styles.cardItemText, { fontFamily: FONTS.BarlowSemiCondensed }]}>{it}</Text>
        </View>
      ))}
    </View>
  );

  const icons: Record<SectionKey, { icon: React.ReactNode; color: string }> = {
    "CLINICAL ASSESSMENT": { icon: <Ionicons name="medical" size={20} color="#2A7DE1" />, color: "#2A7DE1" },
    "VISUAL FINDINGS": { icon: <Ionicons name="eye" size={20} color="#9B59B6" />, color: "#9B59B6" },
    "CLINICAL INTERPRETATION": { icon: <Ionicons name="clipboard" size={20} color="#3498DB" />, color: "#3498DB" },
    "BURN/WOUND GRADING": { icon: <Ionicons name="fitness" size={20} color="#E67E22" />, color: "#E67E22" },
    "INFECTION RISK": { icon: <Ionicons name="shield-checkmark" size={20} color="#E74C3C" />, color: "#E74C3C" },
    "EMERGENCY RED FLAGS": { icon: <Ionicons name="warning" size={20} color="#DC3545" />, color: "#DC3545" },
    "RURAL GUIDANCE": { icon: <Ionicons name="location" size={20} color="#16A085" />, color: "#16A085" },
    "URGENCY ASSESSMENT": { icon: <Ionicons name="speedometer" size={20} color="#FF6B35" />, color: "#FF6B35" },
    "RECOMMENDATIONS": { icon: <Ionicons name="checkmark-circle" size={20} color="#28A745" />, color: "#28A745" },
    "NEXT STEPS": { icon: <Ionicons name="arrow-forward-circle" size={20} color="#2A7DE1" />, color: "#2A7DE1" },
    OTHER: { icon: <Ionicons name="information-circle" size={20} color="#6C757D" />, color: "#6C757D" },
  };

  return (
    <View>
      {wantedOrder.map((key) =>
        sections[key] && sections[key].length > 0 ? (
          <Card key={key} title={key} items={sections[key]} icon={icons[key].icon} />
        ) : null
      )}
      {sections["OTHER"] && sections["OTHER"].length > 0 && (
        <Card title="OTHER" items={sections["OTHER"]} icon={icons["OTHER"].icon} />
      )}
    </View>
  );
}

export default function LogDetails() {
  const params = useLocalSearchParams();
  const entryId = params.entryId as string;
  const convexIdParam = (params.convexId as string) || undefined;
  const database = useWatermelonDatabase();
  const { isOnline } = useNetworkStatus();
  const { isAuthenticated } = useConvexAuth();
  const [offlineEntry, setOfflineEntry] = useState<any>(null);
  const [offlineTried, setOfflineTried] = useState(false);

  // Metadata state to track both IDs explicitly
  const [entryMetadata, setEntryMetadata] = useState<{
    watermelonId: string | null;
    convexId: string | null;
  }>({ watermelonId: null, convexId: null });

  // Convert string to Convex ID type - but only if it looks like a Convex ID
  // Convex IDs start with 'k' or 'j' and are longer than 20 chars
  const isConvexId = entryId && entryId.length > 20 && /^[kj]/.test(entryId);
  const convexEntryId = isConvexId ? (entryId as Id<"healthEntries">) : undefined;

  // Convex hooks - use "skip" to prevent network calls when offline
  // This prevents errors when offline while still following React hook rules
  const currentUser = useQuery(api.users.getCurrentUser,
    isOnline && isAuthenticated ? {} : "skip"
  );

  // Delete mutation - safe to call, but only use when online
  const deleteHealthEntry = useMutation(api.healthEntries.deleteHealthEntry);

  // Online query - only run if we have a valid Convex ID
  const entryOnline = useQuery(api.healthEntries.getEntryById,
    convexEntryId && isOnline ? { entryId: convexEntryId } : "skip"
  );

  // Offline query from WatermelonDB (always attempt so we can fallback or show deleted state)
  const loadOfflineEntry = React.useCallback(async () => {
    if (!(entryId || convexIdParam)) return;
    try {
      const healthCollection = database.get('health_entries');
      let localEntry: any = null;

      // Try by WatermelonDB id first (when entryId is a local id)
      if (entryId && !isConvexId) {
        try {
          localEntry = await healthCollection.find(entryId);
        } catch {}
      }

      // Fallback: lookup by convexId field
      if (!localEntry) {
        const convexLookup = convexIdParam || (isConvexId ? entryId : undefined);
        if (convexLookup) {
          const results = await healthCollection.query(Q.where('convexId', convexLookup)).fetch();
          if (results.length > 0) {
            // Choose best candidate if multiple (higher tuple wins lexicographically)
            const score = (x: any) => [x.isDeleted ? 0 : 1, x.lastEditedAt || 0, x.editCount || 0, x.timestamp || 0];
            const best = results.reduce((picked: any, cur: any) => {
              const sa = score(picked), sb = score(cur);
              for (let i = 0; i < sa.length; i++) {
                if (sa[i] === sb[i]) continue;
                return sb[i] > sa[i] ? cur : picked; // prefer larger value
              }
              return picked;
            }, results[0]);
            localEntry = best;
          }
        }
      }

      // Even if we found localEntry directly by id, we may have newer duplicates for same convexId.
      // Re-evaluate group to pick freshest version so edits made via duplicate strategy show instantly.
      const groupConvexId = (localEntry?.convexId) || convexIdParam || (isConvexId ? entryId : undefined);
      if (groupConvexId) {
        try {
          const group = await healthCollection.query(Q.where('convexId', groupConvexId)).fetch();
          if (group.length > 0) {
            const score = (x: any) => [x.isDeleted ? 0 : 1, x.lastEditedAt || 0, x.editCount || 0, x.timestamp || 0];
            const freshest = group.reduce((picked: any, cur: any) => {
              const sa = score(picked), sb = score(cur);
              for (let i = 0; i < sa.length; i++) {
                if (sa[i] === sb[i]) continue;
                return sb[i] > sa[i] ? cur : picked;
              }
              return picked;
            }, group[0]);
            if (freshest && localEntry && freshest.id !== localEntry.id) {
              console.log('🔄 [LOG-DETAILS] Replacing localEntry with fresher duplicate', { prev: localEntry.id, next: freshest.id });
              localEntry = freshest;
            }
          }
        } catch (e) {
          console.warn('⚠️ [LOG-DETAILS] Failed duplicate group re-eval', e);
        }
      }

      if (!localEntry) {
        console.warn(`🔎 [LOG-DETAILS] No local record found for localId=${entryId || 'n/a'} convexId=${convexIdParam || (isConvexId ? entryId : 'n/a')}`);
        setOfflineEntry(null);
        return;
      }

      // Map WatermelonDB entry to a Convex-like shape (include dedupe metadata)
      const entryData = localEntry as any;
      let photos: string[] = [];
      try {
        if (entryData.photos) {
          photos = Array.isArray(entryData.photos) ? entryData.photos : JSON.parse(entryData.photos);
        }
      } catch {
        photos = [];
      }

      setOfflineEntry({
        _id: localEntry.id,
        _creationTime: entryData.createdAt || Date.now(),
        userId: entryData.userId,
        timestamp: entryData.timestamp,
        severity: entryData.severity,
        type: entryData.type,
        symptoms: entryData.symptoms || '',
        category: entryData.category || '',
        notes: entryData.notes || '',
        photos,
        aiContext: entryData.aiContext || null,
        convexId: entryData.convexId || null,
        createdBy: entryData.createdBy || 'User',
        date: entryData.date || '',
        isDeleted: entryData.isDeleted === true,
        lastEditedAt: entryData.lastEditedAt || 0,
        editCount: entryData.editCount || 0,
      });

      setEntryMetadata({
        watermelonId: localEntry.id,
        convexId: entryData.convexId || null,
      });
    } catch (error) {
      console.error('Failed to load offline entry:', error);
      setOfflineEntry(null);
    } finally {
      setOfflineTried(true);
    }
  }, [entryId, convexIdParam, isConvexId, database]);

  useEffect(() => {
    loadOfflineEntry();
  }, [loadOfflineEntry]);

  // Subscribe to edit/delete events for this entry (always active, not just when focused)
  useEffect(() => {
    const unsub = healthEntriesEvents.subscribe((p) => {
      if (!p) return;
      const matchByConvex = (p.convexId && (p.convexId === (convexIdParam || (isConvexId ? entryId : undefined))));
      const matchByLocal = (p.watermelonId && (p.watermelonId === entryId));
      if (matchByConvex || matchByLocal) {
        console.log('🔔 [LOG-DETAILS] Received event for this entry:', p.type, { convexId: p.convexId, watermelonId: p.watermelonId });
        loadOfflineEntry();
      }
    });
    return () => {
      unsub();
    };
  }, [entryId, convexIdParam, isConvexId, loadOfflineEntry]);

  // Refresh when screen regains focus
  useFocusEffect(
    React.useCallback(() => {
      loadOfflineEntry();
    }, [loadOfflineEntry])
  );

  // Populate metadata when online entry is loaded
  useEffect(() => {
    if (entryOnline && isOnline && isConvexId) {
      // Find the corresponding WatermelonDB record
      const findWatermelonId = async () => {
        try {
          const healthCollection = database.get('health_entries');
          const results = await healthCollection
            .query(Q.where('convexId', entryOnline._id))
            .fetch();

          if (results.length > 0) {
            setEntryMetadata({
              watermelonId: results[0].id,
              convexId: entryOnline._id
            });
          } else {
            // Online-only entry, no local copy
            setEntryMetadata({
              watermelonId: null,
              convexId: entryOnline._id
            });
          }
        } catch (error) {
          console.error("Failed to find WatermelonDB record:", error);
        }
      };
      findWatermelonId();
    }
  }, [entryOnline, isOnline, isConvexId, database]);

  // Prefer online entry when available, but fallback to offline if missing
  // Choose between online and offline variants: prefer the freshest (higher lastEditedAt/editCount) or deletion state.
  let resolvedEntry: any = offlineEntry;
  if (entryOnline) {
    if (!offlineEntry) {
      resolvedEntry = entryOnline;
    } else if (offlineEntry.convexId && offlineEntry.convexId === entryOnline._id) {
      const onlineLastEdited = (entryOnline as any).lastEditedAt || 0;
      const onlineEditCount = (entryOnline as any).editCount || 0;
      const offlineLastEdited = offlineEntry.lastEditedAt || 0;
      const offlineEditCount = offlineEntry.editCount || 0;
      const offlineDeleted = offlineEntry.isDeleted === true;
      // Prefer offline if it reflects a deletion not yet synced, or has more recent edits.
      if (offlineDeleted || offlineLastEdited > onlineLastEdited || offlineEditCount > onlineEditCount) {
        resolvedEntry = offlineEntry;
      } else {
        resolvedEntry = entryOnline;
      }
    } else {
      // Different convex linkage; default to online if available.
      resolvedEntry = entryOnline;
    }
  }
  const isDeletedEntry = resolvedEntry?.isDeleted === true;
  const isLoadingOnline = isOnline && isConvexId && typeof entryOnline === 'undefined';
  const stillLoading = isLoadingOnline || (!offlineTried && offlineEntry === null);

  const getSeverityColor = (severity: number) => {
    if (severity >= 9) return "#DC3545";
    if (severity >= 7) return "#FF6B35";
    if (severity >= 4) return "#FFC107";
    return "#28A745";
  };

  const getSeverityText = (severity: number) => {
    if (severity >= 9) return "Critical";
    if (severity >= 7) return "Severe";
    if (severity >= 4) return "Moderate";
    return "Mild";
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      full: date.toLocaleString()
    };
  };

  // Modal state for delete confirmation & status
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const confirmDelete = () => {
    setDeleteError(null);
    setDeleteSuccess(false);
    setDeleteModalVisible(true);
  };

  const performDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
  const { watermelonId, convexId } = entryMetadata;

      if (!isOnline) {
        // OFFLINE MODE: Mark for deletion using rescue duplicate strategy
        const idToUse = watermelonId || resolvedEntry?._id;
        if (!idToUse) {
          throw new Error('Unable to identify entry for deletion');
        }
        await safeWrite(
          database,
          async () => {
            const healthCollection = database.get('health_entries');
            const localEntry = await healthCollection.find(idToUse) as HealthEntry;
            try {
              await localEntry.update((e: any) => {
                e.isDeleted = true;
                e.isSynced = false;
                e.lastEditedAt = Date.now();
              });
              console.log('📴 Entry soft-deleted offline');
            } catch (primaryErr) {
              console.warn('⚠️ [OFFLINE DELETE] Primary soft-delete failed, using rescue duplicate strategy:', primaryErr);
              const now = Date.now();
              const deletedDuplicate = await healthCollection.create((newRec: any) => {
                newRec.userId = localEntry.userId;
                newRec.convexId = localEntry.convexId;
                newRec.date = localEntry.date;
                newRec.timestamp = now;
                newRec.symptoms = localEntry.symptoms;
                newRec.severity = localEntry.severity;
                newRec.notes = localEntry.notes || '';
                newRec.photos = localEntry.photos;
                newRec.type = localEntry.type || 'manual_entry';
                newRec.isSynced = false;
                newRec.createdBy = localEntry.createdBy;
                newRec.lastEditedAt = now;
                newRec.editCount = (localEntry.editCount || 0) + 1;
                newRec.isDeleted = true;
              });
              console.log('🛟 [OFFLINE DELETE] Created deletion duplicate with ID:', deletedDuplicate.id);
            }

            // Also mark all other local duplicates with the same convexId as deleted
            const now2 = Date.now();
            const cvx = localEntry.convexId || entryMetadata.convexId;
            if (cvx) {
              const dupes = await healthCollection.query(Q.where('convexId', cvx)).fetch();
              let updated = 0;
              for (const rec of dupes) {
                const healthRec = rec as HealthEntry;
                if (healthRec.id === localEntry.id) continue;
                try {
                  await healthRec.update((e2: any) => {
                    e2.isDeleted = true;
                    e2.isSynced = false;
                    e2.lastEditedAt = now2;
                  });
                  updated++;
                } catch (e) {
                  console.warn('⚠️ [OFFLINE DELETE] Failed to soft-delete duplicate', healthRec.id, e);
                }
              }
              if (updated > 0) console.log(`📴 [OFFLINE DELETE] Also marked ${updated} duplicate(s) deleted for convexId=${cvx}`);
            }
          },
          10000,
          'deleteHealthEntryOffline'
        );
        console.log('📴 Entry marked for deletion (will sync when online)');
      } else {
        // ONLINE MODE
        if (convexId && currentUser) {
          try {
            await deleteHealthEntry({
              entryId: convexId as Id<'healthEntries'>,
              userId: currentUser._id,
            });
            console.log('✅ Deleted from Convex:', convexId);
          } catch (error) {
            throw new Error('Failed to delete entry from server. Please try again.');
          }
        }

        // Clean up ALL local duplicates for this entry (same convexId)
        await safeWrite(
          database,
          async () => {
            const healthCollection = database.get('health_entries');
            if (convexId) {
              const dupes = await healthCollection.query(Q.where('convexId', convexId)).fetch();
              console.log(`🧽 [ONLINE DELETE] Removing ${dupes.length} local duplicates for convexId=${convexId}`);
              for (const rec of dupes as any[]) {
                try {
                  await (rec as any).destroyPermanently();
                } catch (e) {
                  console.warn('⚠️ [ONLINE DELETE] Failed to destroy duplicate, trying soft-delete', (rec as any)?.id, e);
                  await (rec as any).update((e2: any) => {
                    e2.isDeleted = true;
                    e2.isSynced = true; // matches server state
                    e2.lastEditedAt = Date.now();
                  });
                }
              }
            } else if (watermelonId) {
              // Fallback: remove the current local record
              const localEntry = await healthCollection.find(watermelonId);
              await localEntry.destroyPermanently();
              console.log('✅ Deleted from WatermelonDB (single):', watermelonId);
            }
          },
          15000,
          'deleteHealthEntryOnlineCleanup'
        );
      }
      setDeleteSuccess(true);
      // Emit delete event before navigating back
      healthEntriesEvents.emit({ type: 'delete', convexId: entryMetadata.convexId, watermelonId: entryMetadata.watermelonId, timestamp: Date.now() });
      setTimeout(() => {
        setDeleteModalVisible(false);
        router.back();
      }, 600);
    } catch (err: any) {
      console.error('❌ Delete failed:', err);
      setDeleteError(err?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  if (!resolvedEntry) {
    if (stillLoading) {
      return (
        <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
          <CurvedBackground style={{ flex: 1 }}>
            <DueReminderBanner topOffset={120} />
            <CurvedHeader
              title="Tracker - Entry Details"
              height={150}
              showLogo={true}
              screenType="signin"
              bottomSpacing={0}
              showNotificationBell={true}
            />
            <View style={styles.contentArea}>
              <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading entry details...</Text>
                </View>
              </ScrollView>
            </View>
          </CurvedBackground>
          <BottomNavigation />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
        <CurvedBackground style={{ flex: 1 }}>
          <DueReminderBanner topOffset={120} />
          <CurvedHeader
            title="Tracker - Entry Details"
            height={150}
            showLogo={true}
            screenType="signin"
            bottomSpacing={0}
            showNotificationBell={true}
          />
          <View style={styles.contentArea}>
            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle" size={20} color="#DC3545" />
                <Text style={[styles.loadingText, { marginTop: 8 }]}>Entry not found or was deleted.</Text>
                <TouchableOpacity style={[{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#2A7DE1' }]} onPress={() => router.back()}>
                  <Text style={{ color: 'white', fontFamily: FONTS.BarlowSemiCondensed }}>Go Back</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </CurvedBackground>
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  const dateTime = formatDateTime(resolvedEntry.timestamp);

  return (
    <SafeAreaView style={styles.safeArea} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
      <CurvedBackground style={{ flex: 1 }}>
        {/* Fixed Header (not scrollable) */}
        <DueReminderBanner topOffset={120} />
        <CurvedHeader
          title="Tracker - Entry Details"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={true}
        />

        {/* Scrollable content below header */}
        <View style={styles.contentArea}>
          <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.contentSection}>
              {/* Back Button */}
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={20} color="#2A7DE1" />
                <Text style={styles.backButtonText}>Back to Log</Text>
              </TouchableOpacity>

              {/* Entry Header */}
              <View style={styles.headerCard}>
                <View style={styles.headerRow}>
                  <View>
                    <Text style={styles.dateText}>{dateTime.date}</Text>
                    <Text style={styles.timeText}>{dateTime.time}</Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(resolvedEntry.severity) }]}>
                    <Text style={styles.severityBadgeText}>
                      {getSeverityText(resolvedEntry.severity)} ({resolvedEntry.severity}/10)
                    </Text>
                  </View>
                </View>

                <View style={styles.typeContainer}>
                  <Ionicons
                    name={resolvedEntry.type === "ai_assessment" ? "hardware-chip-outline" : "person-outline"}
                    size={16}
                    color="#666"
                  />
                  <Text style={styles.typeText}>
                    {resolvedEntry.type === "ai_assessment" ? "AI Assessment" : "Manual Entry"} • {resolvedEntry.createdBy}
                  </Text>
                </View>

                {isDeletedEntry && (
                  <View style={[styles.detailCard, { backgroundColor: '#FFF5F5', borderColor: '#F3C7C7' }] }>
                    <View style={styles.cardHeader}>
                      <Ionicons name="trash" size={20} color="#DC3545" />
                      <Text style={[styles.cardTitle, { color: '#DC3545' }]}>This entry was deleted</Text>
                    </View>
                    <Text style={styles.cardContent}>This entry has been marked as deleted and is kept locally for sync. You can go back to the list.</Text>
                  </View>
                )}

                {/* Edit/Delete Actions - Only for Manual Entries */}
                {!isDeletedEntry && resolvedEntry.type !== "ai_assessment" && (
                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        router.push({
                          pathname: '/(tabs)/tracker/add-health-entry',
                          params: {
                            mode: 'edit',
                            // Pass both local and convex identifiers so the editor can resolve correctly
                            entryId: entryMetadata.watermelonId || resolvedEntry._id,
                            convexId: entryMetadata.convexId || resolvedEntry.convexId || resolvedEntry._id,
                          }
                        });
                      }}
                    >
                      <Ionicons name="pencil" size={18} color="#2A7DE1" />
                      <Text style={styles.editButtonText}>Edit Entry</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={confirmDelete}
                      disabled={deleting}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC3545" />
                      <Text style={styles.deleteButtonText}>{deleting ? 'Deleting...' : 'Delete'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Symptoms */}
              <View style={styles.detailCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="medical" size={20} color="#2A7DE1" />
                  <Text style={styles.cardTitle}>Symptoms & Description</Text>
                </View>
                <Text style={styles.cardContent}>{resolvedEntry.symptoms}</Text>
              </View>

              {/* Category */}
              {resolvedEntry.category && (
                <View style={styles.detailCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="pricetag" size={20} color="#2A7DE1" />
                    <Text style={styles.cardTitle}>Category</Text>
                  </View>
                  <Text style={styles.cardContent}>{resolvedEntry.category}</Text>
                </View>
              )}

              {/* Duration */}
              {resolvedEntry.duration && (
                <View style={styles.detailCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="time" size={20} color="#2A7DE1" />
                    <Text style={styles.cardTitle}>Duration</Text>
                  </View>
                  <Text style={styles.cardContent}>{resolvedEntry.duration}</Text>
                </View>
              )}

              {/* AI Assessment - split into cards like assessment-results */}
              {resolvedEntry.aiContext && (
                <View>
                  <Text style={[styles.sectionSubtitle, { fontFamily: FONTS.BarlowSemiCondensed, marginBottom: 12 }]}>Medical Triage Assessment</Text>
                  {renderAssessmentCards(resolvedEntry.aiContext)}
                </View>
              )}

              {/* Notes */}
              {resolvedEntry.notes && (
                <View style={styles.detailCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="document-text" size={20} color="#2A7DE1" />
                    <Text style={styles.cardTitle}>Additional Notes</Text>
                  </View>
                  <Text style={styles.cardContent}>{resolvedEntry.notes}</Text>
                </View>
              )}

              {/* Photos */}
              {resolvedEntry.photos && resolvedEntry.photos.length > 0 && (
                <View style={styles.detailCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="camera" size={20} color="#2A7DE1" />
                    <Text style={styles.cardTitle}>Photos ({resolvedEntry.photos.length})</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.photosContainer}>
                      {resolvedEntry.photos.map((photo: string, index: number) => (
                        <View key={index} style={styles.photoItem}>
                          <Image source={{ uri: photo }} style={styles.photo} />
                          <Text style={styles.photoLabel}>Photo {index + 1}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* Technical Details */}
              <View style={styles.detailCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="information-circle" size={20} color="#2A7DE1" />
                  <Text style={styles.cardTitle}>Technical Details</Text>
                </View>
                <View style={styles.techDetails}>
                  <View style={styles.techRow}>
                    <Text style={styles.techLabel}>Entry ID:</Text>
                    <Text style={styles.techValue}>{resolvedEntry._id}</Text>
                  </View>
                  <View style={styles.techRow}>
                    <Text style={styles.techLabel}>Timestamp:</Text>
                    <Text style={styles.techValue}>{resolvedEntry.timestamp}</Text>
                  </View>
                  <View style={styles.techRow}>
                    <Text style={styles.techLabel}>Date Key:</Text>
                    <Text style={styles.techValue}>{resolvedEntry.date}</Text>
                  </View>
                  <View style={styles.techRow}>
                    <Text style={styles.techLabel}>Entry Type:</Text>
                    <Text style={styles.techValue}>{resolvedEntry.type || "manual_entry"}</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </CurvedBackground>
      <BottomNavigation />

      {/* Delete Confirmation Modal - replaces Alert.alert */}
      <StatusModal
        visible={deleteModalVisible}
        type={deleteError ? 'error' : deleteSuccess ? 'success' : 'confirm'}
        title={
          deleteError
            ? 'Delete Failed'
            : deleteSuccess
            ? 'Entry Deleted'
            : 'Delete Entry'
        }
        message={
          deleteError
            ? deleteError
            : deleteSuccess
            ? 'The entry has been deleted.'
            : 'Are you sure you want to delete this health entry? This action cannot be undone.'
        }
        onClose={() => setDeleteModalVisible(false)}
        buttons={
          deleteError
            ? [
                {
                  label: 'Close',
                  onPress: () => setDeleteModalVisible(false),
                  variant: 'primary',
                },
              ]
            : deleteSuccess
            ? [
                {
                  label: 'Continue',
                  onPress: () => {
                    setDeleteModalVisible(false);
                    router.back();
                  },
                  variant: 'primary',
                },
              ]
            : [
                {
                  label: 'Cancel',
                  onPress: () => setDeleteModalVisible(false),
                  variant: 'secondary',
                },
                {
                  label: deleting ? 'Deleting…' : 'Delete',
                  onPress: performDelete,
                  variant: 'destructive',
                },
              ]
        }
      />
    </SafeAreaView>
  );
}

// ... keep your existing styles the same
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
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A7DE1",
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#2A7DE1",
    fontWeight: "600",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  headerCard: {
    backgroundColor: "white",
    padding: 20,
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  timeText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  severityBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  typeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F0F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A7DE1",
    gap: 8,
  },
  editButtonText: {
    fontSize: 15,
    color: "#2A7DE1",
    fontWeight: "600",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DC3545",
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    color: "#DC3545",
    fontWeight: "600",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  detailCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginLeft: 8,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  cardContent: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 20,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  // Assessment card styles (match assessment-results)
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
  photosContainer: {
    flexDirection: "row",
    gap: 12,
  },
  photoItem: {
    alignItems: "center",
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  photoLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  techDetails: {
    marginTop: 8,
  },
  techRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  techLabel: {
    fontSize: 12,
    color: "#666",
    fontFamily: FONTS.BarlowSemiCondensed,
  },
  techValue: {
    fontSize: 12,
    color: "#1A1A1A",
    fontFamily: FONTS.BarlowSemiCondensed,
    fontWeight: "500",
  },
});