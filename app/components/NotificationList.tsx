import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { markReminderHistoryItemRead } from "../_utils/notifications";
import { COLORS, FONTS } from "../constants/constants";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useNotifications } from "./NotificationContext";

interface NotificationListProps {
  maxItems?: number;
  showEmpty?: boolean;
}

export function NotificationList({ maxItems = 5, showEmpty = true }: NotificationListProps) {
  const { isOnline } = useNetworkStatus();
  const { notificationList, refreshNotifications } = useNotifications();
  const markOneAsRead = useMutation(api.notifications.markAsRead);

  // Limit the number of notifications shown
  const displayedNotifications = maxItems ? notificationList.slice(0, maxItems) : notificationList;

  if (displayedNotifications.length === 0 && !showEmpty) {
    return null;
  }

  if (displayedNotifications.length === 0 && showEmpty) {
    return (
      <View style={styles.emptyState}>
        <Icon name="notifications-none" size={32} color={COLORS.darkGray} />
        <Text style={styles.emptyText}>No notifications</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {displayedNotifications.map((n: any) => (
        <View key={String(n._id)} style={[styles.item, !n.read && styles.itemUnread]}>
          <View style={styles.row}>
            <Icon 
              name={n.read ? "notifications-none" : "notifications-active"} 
              size={20} 
              color={n.read ? COLORS.darkGray : COLORS.primary} 
            />
            <Text style={styles.title} numberOfLines={2}>{n.title}</Text>
            {n.read && (
              <View style={styles.readBadge}>
                <Text style={styles.readBadgeText}>Read</Text>
              </View>
            )}
          </View>
          {!!n.body && <Text style={styles.body} numberOfLines={2}>{n.body}</Text>}
          <View style={styles.footerRow}>
            <Text style={styles.time}>{new Date(n.createdAt).toLocaleString()}</Text>
            {!n.read && (
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={async () => {
                  if (n._local) {
                    try { 
                      await markReminderHistoryItemRead(n.localId || String(n._id).replace(/^local-/, '')); 
                      await refreshNotifications(); 
                    } catch {}
                  } else if (isOnline) {
                    try { await markOneAsRead({ notificationId: n._id }); } catch {}
                  }
                }}
              >
                <Text style={styles.smallBtnText}>Mark read</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 8,
  },
  item: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  itemUnread: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
    color: COLORS.darkText,
  },
  readBadge: {
    backgroundColor: COLORS.darkGray,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  readBadgeText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 9,
    color: COLORS.white,
  },
  body: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 4,
  },
  footerRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 11,
    color: COLORS.darkGray,
  },
  smallBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 11,
  },
});
