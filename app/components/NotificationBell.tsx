import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NotificationBellEvent } from '../_utils/NotificationBellEvent';
import { checkAndUpdateReminderDue, getAllScheduledNotifications, getSymptomReminderDetails, isBellUnread, markBellRead, ReminderSettings } from '../_utils/notifications';
import { COLORS, FONTS } from '../constants/constants';

interface NotificationBellProps {
  reminderEnabled?: boolean;
  reminderSettings?: ReminderSettings | null;
}

export default function NotificationBell({ reminderEnabled = false, reminderSettings = null }: NotificationBellProps) {
  const [showModal, setShowModal] = useState(false);
  const [reminderInfo, setReminderInfo] = useState<{
    scheduled: boolean;
    enabled: boolean;
    frequency?: string;
    time?: string;
    dayOfWeek?: string;
    allNotifications: any[];
    isDue: boolean;
  } | null>(null);
  const [unread, setUnread] = useState(false);

  const loadReminderDetails = async () => {
    try {
      const details = await getSymptomReminderDetails();
      const allNotifs = await getAllScheduledNotifications();
      const isDue = await checkAndUpdateReminderDue(reminderSettings);
      
      setReminderInfo({
        scheduled: details?.scheduled || false,
        enabled: reminderEnabled,
        allNotifications: allNotifs,
        isDue,
        time: reminderSettings?.time,
        frequency: reminderSettings?.frequency,
        dayOfWeek: reminderSettings?.dayOfWeek,
      });
    } catch (e) {
      console.error('Error loading reminder details:', e);
      setReminderInfo({
        scheduled: false,
        enabled: reminderEnabled,
        allNotifications: [],
        isDue: false,
      });
    }
  };

  const handlePress = async () => {
    await loadReminderDetails();
    // Mark as read to clear the dot
    await markBellRead();
    setUnread(false);
    NotificationBellEvent.emit('read'); // Notify all tabs to clear unread
    setShowModal(true);
  };

  useEffect(() => {
    // Check if reminder is due and update unread flag
    const checkReminder = async () => {
      // If no reminder settings or not enabled, clear unread
      if (!reminderSettings || !reminderEnabled) {
        console.log('[NotificationBell] No reminder settings or not enabled, clearing unread');
        setUnread(false);
        await markBellRead();
        return;
      }

      console.log('[NotificationBell] Checking reminder due status...', reminderSettings);
      // Check if it's time for the reminder (updates unread flag if due)
      await checkAndUpdateReminderDue(reminderSettings);
      
      // Get the current unread status
      const currentUnread = await isBellUnread();
      console.log('[NotificationBell] Current unread status:', currentUnread);
      setUnread(currentUnread);
    };

    checkReminder();

    // Listen for 'read' event to clear unread instantly on all tabs
    const off = NotificationBellEvent.on('read', async () => {
      console.log('[NotificationBell] Received read event, clearing unread');
      setUnread(false);
      await markBellRead();
    });

    // Poll every minute to check if it's reminder time
    const interval = setInterval(checkReminder, 60000);

    return () => {
      clearInterval(interval);
      off();
    };
  }, [reminderEnabled, reminderSettings]);

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.bellContainer}
      >
        <Icon 
          name={unread ? "notifications-active" : "notifications-none"} 
          size={28} 
          color={COLORS.darkText} 
        />
        {unread && (
          <View style={styles.badge} />
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="notifications" size={24} color={COLORS.primary} />
              <Text style={styles.modalTitle}>Scheduled Reminders</Text>
            </View>
            
            <ScrollView style={styles.scrollView}>
              {reminderInfo?.enabled ? (
                <>
                  <View style={styles.enabledBanner}>
                    <Icon name="check-circle" size={20} color={COLORS.success} />
                    <Text style={styles.enabledText}>Reminders are enabled</Text>
                  </View>
                  
                  {/* Show pending notification if due */}
                  {reminderInfo.isDue && (
                    <View style={styles.pendingNotificationCard}>
                      <View style={styles.notificationHeader}>
                        <Icon name="notification-important" size={18} color={COLORS.error} />
                        <Text style={styles.pendingNotificationTitle}>
                          Time to take Symptom Assessment
                        </Text>
                      </View>
                      <Text style={styles.notificationBody}>
                        Complete your {reminderInfo.frequency === 'daily' ? 'daily' : 'weekly'} symptoms check now.
                      </Text>
                      <View style={styles.notificationTimeInfo}>
                        <Icon name="access-time" size={14} color={COLORS.primary} />
                        <Text style={styles.notificationTimeText}>
                          Scheduled for {reminderInfo.time || ''}
                        </Text>
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>Unread</Text>
                        </View>
                      </View>
                    </View>
                  )}
                  
                  {reminderInfo.allNotifications.length > 0 ? (
                    <>
                      <Text style={styles.sectionTitle}>
                        Scheduled Notifications ({reminderInfo.allNotifications.length})
                      </Text>
                      {reminderInfo.allNotifications.map((notif: any, idx: number) => (
                        <View key={idx} style={styles.notificationCard}>
                          <View style={styles.notificationHeader}>
                            <Icon name="notification-important" size={18} color={COLORS.primary} />
                            <Text style={styles.notificationTitle}>
                              {notif.content?.title || 'Notification'}
                            </Text>
                          </View>
                          {notif.content?.body && (
                            <Text style={styles.notificationBody}>
                              {notif.content.body}
                            </Text>
                          )}
                          {notif.trigger && (
                            <View style={styles.triggerInfo}>
                              <Text style={styles.triggerText}>
                                {notif.trigger.type === 'calendar' && notif.trigger.repeats ? 
                                  `Repeats ${notif.trigger.weekday ? 'weekly' : 'daily'} at ${String(notif.trigger.hour).padStart(2, '0')}:${String(notif.trigger.minute).padStart(2, '0')}` :
                                  'One-time notification'
                                }
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </>
                  ) : (
                    <View style={styles.infoState}>
                      <Icon name="info-outline" size={40} color={COLORS.primary} />
                      <Text style={styles.infoText}>Reminder is enabled</Text>
                      <Text style={styles.infoSubtext}>
                        Notifications may require a development build to work properly. Expo Go has limited notification support.
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="notifications-off" size={48} color={COLORS.lightGray} />
                  <Text style={styles.emptyStateText}>No reminders enabled</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Enable reminders in your Profile settings to get started
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
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
