import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import { NotificationBellEvent } from "../_utils/NotificationBellEvent";
import { checkAndUpdateAnyReminderDue, getReminders, isBellUnread, markBellRead } from "../_utils/notifications";
import BottomNavigation from "../components/bottomNavigation";
import CurvedBackground from "../components/curvedBackground";
import CurvedHeader from "../components/curvedHeader";
import { COLORS, FONTS } from "../constants/constants";

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [localDue, setLocalDue] = useState(false);
  const unreadCount = useQuery(api.notifications.getUnreadCount) || 0;
  const list = useQuery(api.notifications.getNotifications, { limit: 50 }) || [] as any[];
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const markOneAsRead = useMutation(api.notifications.markAsRead);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // useQuery will refetch automatically; just delay the spinner a bit
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const computedUnread = useMemo(() => unreadCount, [unreadCount]);

  // Compute local due state on mount and when events fire
  React.useEffect(() => {
    let mounted = true;
    const compute = async () => {
      const list = await getReminders();
      await checkAndUpdateAnyReminderDue(list);
      const unread = await isBellUnread();
      if (mounted) setLocalDue(unread);
    };
    compute();
    const offDue = NotificationBellEvent.on('due', () => setLocalDue(true));
    const offCleared = NotificationBellEvent.on('cleared', () => setLocalDue(false));
    const offRead = NotificationBellEvent.on('read', () => setLocalDue(false));
    const interval = setInterval(compute, 60000);
    return () => { mounted = false; offDue(); offCleared(); offRead(); clearInterval(interval); };
  }, []);

  return (
    <CurvedBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        >
          {(computedUnread > 0 || localDue) && (
            <View style={[styles.headerActions]}> 
              {computedUnread > 0 && (
                <Text style={styles.unreadText}>
                  {computedUnread} {computedUnread === 1 ? "unread notification" : "unread notifications"}
                </Text>
              )}
              <TouchableOpacity
                onPress={async () => {
                  try { await markAllAsRead({}); } catch {}
                  try { await markBellRead(); } catch {}
                  NotificationBellEvent.emit('read');
                }}
                style={styles.markAllBtn}
              >
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            </View>
          )}

          {localDue && (
            <View style={[styles.item, styles.itemUnread]}> 
              <View style={styles.row}>
                <Icon name="notifications-active" size={22} color={COLORS.primary} />
                <Text style={styles.title} numberOfLines={2}>Symptom reminder due now</Text>
              </View>
              <Text style={styles.body}>It’s time to complete your symptoms check.</Text>
              <View style={styles.footerRow}>
                <Text style={styles.time}>{new Date().toLocaleString()}</Text>
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={async () => {
                    try { await markBellRead(); } catch {}
                    NotificationBellEvent.emit('read');
                    setLocalDue(false);
                  }}
                >
                  <Text style={styles.smallBtnText}>Mark done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {list.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="notifications-none" size={48} color={COLORS.darkGray} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>You&apos;ll see important updates here</Text>
            </View>
          ) : (
            list.map((n: any) => (
              <View key={String(n._id)} style={[styles.item, !n.read && styles.itemUnread]}>
                <View style={styles.row}>
                  <Icon name={n.read ? "notifications-none" : "notifications-active"} size={22} color={n.read ? COLORS.darkGray : COLORS.primary} />
                  <Text style={styles.title} numberOfLines={2}>{n.title}</Text>
                </View>
                {!!n.body && <Text style={styles.body}>{n.body}</Text>}
                <View style={styles.footerRow}>
                  <Text style={styles.time}>{new Date(n.createdAt).toLocaleString()}</Text>
                  {!n.read && (
                    <TouchableOpacity
                      style={styles.smallBtn}
                      onPress={async () => {
                        try { await markOneAsRead({ notificationId: n._id }); } catch {}
                      }}
                    >
                      <Text style={styles.smallBtnText}>Mark read</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
      <BottomNavigation />
    </CurvedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 12,
  },
  unreadText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
  },
  markAllBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  markAllText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
  },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyTitle: { fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 18, color: COLORS.darkText, marginTop: 12 },
  emptySub: { fontFamily: FONTS.BarlowSemiCondensed, fontSize: 14, color: COLORS.darkGray, marginTop: 4 },
  item: { backgroundColor: COLORS.white, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.lightGray },
  itemUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 15, color: COLORS.darkText },
  body: { fontFamily: FONTS.BarlowSemiCondensed, fontSize: 13, color: COLORS.darkGray, marginTop: 4 },
  footerRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { fontFamily: FONTS.BarlowSemiCondensed, fontSize: 12, color: COLORS.darkGray },
  smallBtn: { backgroundColor: COLORS.primary, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnText: { color: COLORS.white, fontFamily: FONTS.BarlowSemiCondensedBold, fontSize: 12 },
});