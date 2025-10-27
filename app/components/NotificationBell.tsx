import { api } from '@/convex/_generated/api';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NotificationBellEvent } from '../_utils/NotificationBellEvent';
import { checkAndUpdateAnyReminderDue, getReminders, initializeNotificationsOnce, isBellUnread, ReminderSettings } from '../_utils/notifications';
import { COLORS, FONTS } from '../constants/constants';

interface NotificationBellProps {
  reminderEnabled?: boolean;
  reminderSettings?: ReminderSettings | null;
}

export default function NotificationBell({ reminderEnabled = false, reminderSettings = null }: NotificationBellProps) {
  const router = useRouter();
  const [unread, setUnread] = useState(false);
  
  // Get unread notification count from Convex
  const unreadCount = useQuery(api.notifications.getUnreadCount) || 0;
  // Full-screen screen handles listing and read actions
  
  // Show red only for local reminder due. Server unread count will not turn the bell red.
  const hasUnread = unread;
  // Local state just for showing due info; management moved to Profile page

  const loadReminderDue = async () => {
    try {
      const list = await getReminders();
      await checkAndUpdateAnyReminderDue(list);
    } catch (e) {
      console.error('Error checking reminder due:', e);
    }
  };

  const handlePress = async () => {
    await loadReminderDue();
    router.push('/(tabs)/notifications');
  };

  useEffect(() => {
    // Ensure notification subsystem is initialized (creates heads-up channel and runs migration if needed)
    initializeNotificationsOnce().catch(() => {});

    // Check if any reminder is due and update unread flag
    const checkReminder = async () => {
      // Load reminders from storage and compute due
      const list = await getReminders();
      await checkAndUpdateAnyReminderDue(list);

      // Get the current unread status for local reminder
      const currentUnread = await isBellUnread();
      console.log('[NotificationBell] Current unread status:', currentUnread);
      setUnread(currentUnread);
  // local reminder due is reflected by unread flag
    };

    checkReminder();

    // Listen for 'read' event to clear unread instantly on all tabs
    const off = NotificationBellEvent.on('read', async () => {
      console.log('[NotificationBell] Received read event, clearing unread');
      setUnread(false);
    });

    // Listen for 'due' event to set unread instantly across tabs
    const onDue = NotificationBellEvent.on('due', async () => {
      // Recompute to avoid false positives
      const list = await getReminders();
      await checkAndUpdateAnyReminderDue(list);
      const current = await isBellUnread();
      setUnread(current);
    });
    const onCleared = NotificationBellEvent.on('cleared', async () => {
      setUnread(false);
    });

    // Poll every minute to check if it's reminder time
    const interval = setInterval(checkReminder, 60000);

    return () => {
      clearInterval(interval);
      off();
      onDue();
      onCleared();
    };
  }, [reminderEnabled, reminderSettings]);

  // Refresh on focus (e.g., when returning to Profile) so the bell syncs immediately
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const list = await getReminders();
        await checkAndUpdateAnyReminderDue(list);
        const currentUnread = await isBellUnread();
        setUnread(currentUnread);
      })();
      return () => {};
    }, [])
  );

  // Management UI removed from bell

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.bellContainer}
      >
        <Icon 
          name={hasUnread ? "notifications-active" : "notifications-none"} 
          size={28} 
          color={COLORS.darkText} 
        />
        {hasUnread && (
          <View style={styles.badge}>
            {unreadCount > 0 && (
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Navigates to full-screen notifications; no modal here */}
    </>
  );
}

const styles = StyleSheet.create({
  bellContainer: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 20,
    color: COLORS.darkText,
    marginLeft: 8,
  },
  scrollView: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  notificationCard: {
    backgroundColor: COLORS.primary + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  pendingNotificationCard: {
    backgroundColor: COLORS.error + '10',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 15,
    color: COLORS.darkText,
    marginLeft: 6,
    flex: 1,
  },
  pendingNotificationTitle: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.error,
    marginLeft: 6,
    flex: 1,
  },
  notificationBody: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    color: COLORS.darkGray,
    marginBottom: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  addButtonText: {
    color: COLORS.white,
    marginLeft: 4,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 14,
  },
  smallActionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    padding: 6,
  },
  addForm: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  chip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.darkText,
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
  },
  chipTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
  },
  inputLabel: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 13,
    color: COLORS.darkGray,
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  inputValue: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.darkText,
  },
  notificationTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  notificationTimeText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 10,
    color: COLORS.white,
  },
  triggerInfo: {
    backgroundColor: COLORS.white,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  triggerText: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  enabledBanner: {
    backgroundColor: COLORS.success + '15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  enabledText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 15,
    color: COLORS.success,
    marginLeft: 8,
  },
  infoState: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  infoText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 12,
  },
  infoSubtext: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 13,
    color: COLORS.darkGray,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.darkGray,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.lightGray,
    marginTop: 4,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
  },
});
