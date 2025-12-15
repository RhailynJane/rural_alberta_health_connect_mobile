import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { markReminderHistoryItemRead } from "../_utils/notifications";
import { COLORS, FONTS } from "../constants/constants";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useNotifications } from "./NotificationContext";

type NotificationCategory = 'reminder' | 'alert' | 'info' | 'all';

interface NotificationListProps {
  maxItems?: number;
  showEmpty?: boolean;
  showFilters?: boolean;
}

export function NotificationList({ maxItems = 5, showEmpty = true, showFilters = false }: NotificationListProps) {
  const { isOnline } = useNetworkStatus();
  const { notificationList, refreshNotifications } = useNotifications();
  const markOneAsRead = useMutation(api.notifications.markAsRead);
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all');

  // Categorize notifications
  const categorizeNotification = (n: any): NotificationCategory => {
    if (n._local || n.title?.includes('Reminder') || n.title?.includes('reminder')) return 'reminder';
    if (n.title?.includes('Alert') || n.title?.includes('alert')) return 'alert';
    return 'info';
  };

  // Filter notifications by category
  const filteredByCategory = useMemo(() => {
    if (selectedCategory === 'all') return notificationList;
    return notificationList.filter(n => categorizeNotification(n) === selectedCategory);
  }, [notificationList, selectedCategory]);

  // Limit the number of notifications shown
  const displayedNotifications = maxItems ? filteredByCategory.slice(0, maxItems) : filteredByCategory;

  if (displayedNotifications.length === 0 && !showEmpty) {
    return null;
  }

  const getNotificationTypeIcon = (n: any) => {
    const category = categorizeNotification(n);
    switch (category) {
      case 'reminder':
        return { icon: 'schedule', color: COLORS.primary };
      case 'alert':
        return { icon: 'warning', color: COLORS.error };
      case 'info':
      default:
        return { icon: 'info', color: COLORS.primary };
    }
  };

  const getNotificationTypeColor = (n: any) => {
    const category = categorizeNotification(n);
    switch (category) {
      case 'reminder':
        return COLORS.primary;
      case 'alert':
        return COLORS.error;
      case 'info':
      default:
        return COLORS.primary;
    }
  };

  if (displayedNotifications.length === 0 && showEmpty) {
    return (
      <View>
        {showFilters && (
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedCategory === 'reminder' && styles.filterChipActive]}
              onPress={() => setSelectedCategory('reminder')}
            >
              <Text style={[styles.filterChipText, selectedCategory === 'reminder' && styles.filterChipTextActive]}>
                Reminders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, selectedCategory === 'alert' && styles.filterChipActive]}
              onPress={() => setSelectedCategory('alert')}
            >
              <Text style={[styles.filterChipText, selectedCategory === 'alert' && styles.filterChipTextActive]}>
                Alerts
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.emptyState}>
          <Icon name="notifications-none" size={48} color={COLORS.darkGray} />
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      {showFilters && (
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'all' && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'reminder' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('reminder')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'reminder' && styles.filterChipTextActive]}>
              Reminders
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'alert' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('alert')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'alert' && styles.filterChipTextActive]}>
              Alerts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === 'info' && styles.filterChipActive]}
            onPress={() => setSelectedCategory('info')}
          >
            <Text style={[styles.filterChipText, selectedCategory === 'info' && styles.filterChipTextActive]}>
              Info
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {displayedNotifications.map((n: any) => {
        const typeInfo = getNotificationTypeIcon(n);
        const typeColor = getNotificationTypeColor(n);
        return (
          <View key={String(n._id)} style={[
            styles.item,
            !n.read && styles.itemUnread,
            { borderLeftColor: typeColor }
          ]}>
            <View style={styles.headerRow}>
              <View style={[styles.typeIconContainer, { backgroundColor: typeColor + '15' }]}>
                <Icon name={typeInfo.icon} size={20} color={typeColor} />
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
            {!!n.body && <Text style={styles.body} numberOfLines={2}>{n.body}</Text>}
            <View style={styles.footerRow}>
              <Text style={styles.date}>{new Date(n.createdAt).toLocaleDateString()}</Text>
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
                  <Icon name="done" size={14} color={COLORS.white} />
                  <Text style={styles.smallBtnText}>Mark read</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 8,
    textAlign: 'center',
  },
  item: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  itemUnread: {
    backgroundColor: COLORS.primary + '08',
    borderLeftWidth: 4,
  },
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
  title: {
    flex: 1,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 13,
    color: COLORS.darkText,
    fontWeight: '600',
    lineHeight: 16,
  },
  time: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 10,
    color: COLORS.darkGray,
    marginTop: 1,
  },
  readBadge: {
    backgroundColor: COLORS.success + '15',
    borderRadius: 6,
    padding: 4,
  },
  body: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.darkGray,
    marginBottom: 6,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  date: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 10,
    color: COLORS.darkGray,
  },
  smallBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  smallBtnText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 10,
    fontWeight: '600',
  },
});
