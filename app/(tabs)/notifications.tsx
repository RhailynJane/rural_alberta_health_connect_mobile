import { api } from "@/convex/_generated/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { NotificationBellEvent } from "../_utils/NotificationBellEvent";
import { checkAndUpdateAnyReminderDue, clearBellNotification, clearReminderHistory, dismissAllNotifications, getReminders, isBellReadNotCleared, isBellUnread, markBellRead, markReminderHistoryItemRead } from "../_utils/notifications";
import BottomNavigation from "../components/bottomNavigation";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { useNotifications } from "../components/NotificationContext";
import { COLORS, FONTS } from "../constants/constants";
import { useNetworkStatus } from "../hooks/useNetworkStatus";


export default function NotificationsScreen() {
  const { isOnline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [localDue, setLocalDue] = useState(false);
  const [isReminderRead, setIsReminderRead] = useState(false);
  
  // Use shared notification context instead of local state
  const { notificationList, refreshNotifications } = useNotifications();
  
  // Online queries (skip when offline)
  const unreadCount = useQuery(
    api.notifications.getUnreadCount,
    isOnline ? {} : "skip"
  ) || 0;
  const listRaw = useQuery(
    api.notifications.getNotifications,
    isOnline ? { limit: 50 } : "skip"
  );
  const list = useMemo(() => listRaw || [] as any[], [listRaw]);
  
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const markOneAsRead = useMutation(api.notifications.markAsRead);

  // Cache notifications when online
  useEffect(() => {
    if (isOnline && list && list.length > 0) {
      const cacheNotifications = async () => {
        try {
          await AsyncStorage.setItem(
            'notifications_cache',
            JSON.stringify({ data: list, unreadCount, timestamp: Date.now() })
          );
          // Refresh the shared notification context
          await refreshNotifications();
        } catch (error) {
          console.error('Failed to cache notifications:', error);
        }
      };
      cacheNotifications();
    }
  }, [isOnline, list, unreadCount, refreshNotifications]);

  // On screen focus, refresh the shared notification context
  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isOnline) {
      await refreshNotifications();
      setTimeout(() => setRefreshing(false), 600);
    } else {
      await refreshNotifications();
      setRefreshing(false);
    }
  }, [isOnline, refreshNotifications]);

  const computedUnread = useMemo(() => unreadCount, [unreadCount]);

  // Use the shared notification list directly (already merged and deduplicated)
  const displayList = useMemo(() => notificationList, [notificationList]);
  const hasUnreadLocal = useMemo(() => displayList.some(n => n._local && !n.read), [displayList]);

  // Filter displayList to exclude the current "due now" notification shown in banner
  const filteredDisplayList = useMemo(() => {
    if (!localDue || !hasUnreadLocal) return displayList;
    // If banner is showing, filter out the most recent unread reminder from the list
    return displayList.filter((item, index) => {
      if (index === 0 && item._local && !item.read && 
          (item.title?.includes('Symptom Assessment Reminder') || item.title?.includes('reminder'))) {
        return false; // Skip the first unread reminder (it's in the banner)
      }
      return true;
    });
  }, [displayList, localDue, hasUnreadLocal]);

  // Compute local due banner state
  React.useEffect(() => {
    let mounted = true;
    const compute = async () => {
      const list = await getReminders();
      await checkAndUpdateAnyReminderDue(list);
      const unread = await isBellUnread();
      const readNotCleared = await isBellReadNotCleared();
      if (mounted) {
        setLocalDue(unread || readNotCleared);
        setIsReminderRead(readNotCleared && !unread);
      }
    };
    compute();
    const offDue = NotificationBellEvent.on('due', async () => {
      // When a new notification arrives, only reset read state if there's actually a new unread notification
      const unread = await isBellUnread();
      setLocalDue(true);
      // Only reset to unread if the bell state is actually unread (meaning a truly new notification)
      if (unread) {
        setIsReminderRead(false);
      }
    });
    const offCleared = NotificationBellEvent.on('cleared', () => {
      setLocalDue(false);
      setIsReminderRead(false);
    });
    const offRead = NotificationBellEvent.on('read', () => {
      setIsReminderRead(true);
      setLocalDue(true);
    });
    const interval = setInterval(compute, 300000);
    return () => { mounted = false; offDue(); offCleared(); offRead(); clearInterval(interval); };
  }, []);

  return (
    <CurvedBackground>
      <SafeAreaView style={{ flex: 1 }} edges={isOnline ? ['top', 'bottom'] : ['bottom']}>
        <CurvedHeader
          title="Notifications"
          height={150}
          showLogo={true}
          screenType="signin"
          bottomSpacing={0}
          showNotificationBell={false}
        />
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {/* Show Clear all button whenever there are notifications */}
          {(computedUnread > 0 || localDue || filteredDisplayList.length > 0) && (
            <View style={[styles.headerActions]}>
              {computedUnread > 0 && (
                <Text style={styles.unreadText}>
                  {computedUnread} {computedUnread === 1 ? "unread notification" : "unread notifications"}
                </Text>
              )}
              <TouchableOpacity
                onPress={async () => {
                  // Mark server notifications as read when online
                  if (isOnline) {
                    try { await markAllAsRead({}); } catch {}
                  }
                  // Clear local bell and reminder history completely
                  try { await clearBellNotification(); } catch {}
                  try { await clearReminderHistory(); } catch {}
                  // Dismiss all system notifications so they don't get re-harvested
                  try { await dismissAllNotifications(); } catch {}
                  // Refresh the shared notification context
                  await refreshNotifications();
                  setLocalDue(false);
                  setIsReminderRead(false);
                  NotificationBellEvent.emit('cleared');
                }}
                style={styles.markAllBtn}
              >
                <Text style={styles.markAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}

          {localDue && hasUnreadLocal && (() => {
            // Get the most recent unread notification time, or use current time as fallback
            const latestNotif = displayList.find(n => n._local && !n.read);
            const notifTime = latestNotif?.createdAt || Date.now();
            const notifId = latestNotif ? (latestNotif.localId || String(latestNotif._id).replace(/^local-/, '')) : null;
            
            return (
              <View style={[styles.item, styles.itemPinned, !isReminderRead && styles.itemUnread]}>
                <View style={styles.pinnedBadge}>
                  <Icon name="schedule" size={14} color={COLORS.white} />
                  <Text style={styles.pinnedBadgeText}>Due Now</Text>
                </View>
                <View style={styles.row}>
                  <Icon
                    name={isReminderRead ? "notifications-none" : "notifications-active"}
                    size={22}
                    color={isReminderRead ? COLORS.darkGray : COLORS.primary}
                  />
                  <Text style={styles.title} numberOfLines={2}>
                    Symptom Assessment Reminder
                  </Text>
                  {isReminderRead && (
                    <View style={styles.readBadge}>
                      <Icon name="check-circle" size={16} color={COLORS.success} />
                    </View>
                  )}
                </View>
                <Text style={styles.body}>It&apos;s time to complete your symptoms check.</Text>
                <View style={styles.footerRow}>
                  <Text style={styles.time}>{new Date(notifTime).toLocaleString()}</Text>
                  {!isReminderRead && (
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={async () => {
                        try { await markBellRead(); } catch {}
                        // Mark the SPECIFIC notification shown in banner, not just "latest"
                        if (notifId) {
                          try { await markReminderHistoryItemRead(notifId); await refreshNotifications(); } catch {}
                        }
                        NotificationBellEvent.emit('read');
                        setIsReminderRead(true);
                      }}
                    >
                      <Icon name="done" size={14} color={COLORS.white} />
                      <Text style={styles.smallBtnText}>Mark read</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })()}

          {filteredDisplayList.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="notifications-none" size={48} color={COLORS.darkGray} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>You&apos;ll see important updates here</Text>
            </View>
          ) : (
            filteredDisplayList.map((n: any) => {
              const getTypeIcon = () => {
                if (n._local || n.title?.includes('Reminder')) return { icon: 'schedule', color: COLORS.primary };
                if (n.title?.includes('Alert')) return { icon: 'warning', color: COLORS.error };
                return { icon: 'info', color: COLORS.primary };
              };
              const typeInfo = getTypeIcon();
              return (
                <View key={String(n._id)} style={[styles.item, !n.read && styles.itemUnread, { borderLeftColor: typeInfo.color }]}>
                  <View style={styles.headerRow}>
                    <View style={[styles.typeIconContainer, { backgroundColor: typeInfo.color + '15' }]}>
                      <Icon name={typeInfo.icon} size={20} color={typeInfo.color} />
                    </View>
                    <View style={styles.headerContent}>
                      <Text style={styles.title} numberOfLines={2}>{n.title}</Text>
                      <Text style={styles.time}>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    {n.read && (
                      <View style={styles.readBadge}>
                        <Icon name="check-circle" size={16} color={COLORS.success} />
                      </View>
                    )}
                  </View>
                  {!!n.body && <Text style={styles.body}>{n.body}</Text>}
                  <View style={styles.footerRow}>
                    <Text style={styles.date}>{new Date(n.createdAt).toLocaleDateString()}</Text>
                    {!n.read && (
                      <TouchableOpacity
                        style={styles.smallBtn}
                        onPress={async () => {
                          if (n._local) {
                            try { await markReminderHistoryItemRead(n.localId || String(n._id).replace(/^local-/, '')); await refreshNotifications(); } catch {}
                          } else if (isOnline) {
                            try { await markOneAsRead({ notificationId: n._id }); } catch {}
                          }
                        }}
                      >
                        <Icon name="done" size={14} color={COLORS.white} />
                        <Text style={styles.smallBtnText}>Mark read</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
      <BottomNavigation floating={false} />
    </CurvedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 12 },
  scrollContent: { paddingBottom: 160 },
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 10,
  },
  unreadText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkText,
  },
  markAllBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  markAllText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 12,
  },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingBottom: 30 },
  emptyTitle: { fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 16, color: COLORS.darkText, marginTop: 10 },
  emptySub: { fontFamily: FONTS.BarlowSemiCondensed, fontSize: 12, color: COLORS.darkGray, marginTop: 3 },
  item: { 
    backgroundColor: COLORS.white, 
    borderRadius: 10, 
    padding: 10, 
    marginBottom: 8, 
    borderWidth: 1, 
    borderColor: COLORS.lightGray,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  itemUnread: { 
    backgroundColor: COLORS.primary + '08',
  },
  itemPinned: {
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    backgroundColor: COLORS.primary + '12',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  pinnedBadgeText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  title: { flex: 1, fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 13, color: COLORS.darkText, fontWeight: '600', lineHeight: 16 },
  readBadge: { 
    backgroundColor: COLORS.success + '15', 
    borderRadius: 5, 
    padding: 3 
  },
  readBadgeText: { fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 9, color: COLORS.white },
  body: { fontFamily: FONTS.BarlowSemiCondensed, fontSize: 12, color: COLORS.darkGray, marginTop: 4, marginBottom: 6, lineHeight: 16 },
  footerRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  time: { fontFamily: FONTS.BarlowSemiCondensed, fontSize: 10, color: COLORS.darkGray, marginTop: 1 },
  date: { fontFamily: FONTS.BarlowSemiCondensed, fontSize: 10, color: COLORS.darkGray },
  actionButtons: { flexDirection: 'row', gap: 8 },
  smallBtn: { 
    backgroundColor: COLORS.primary, 
    borderRadius: 5, 
    paddingHorizontal: 8, 
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clearBtn: { backgroundColor: COLORS.darkGray },
  smallBtnText: { color: COLORS.white, fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 10, fontWeight: '600' },
});

 