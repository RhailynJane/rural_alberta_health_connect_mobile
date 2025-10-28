import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NotificationBellEvent } from '../_utils/NotificationBellEvent';
import { checkAndUpdateAnyReminderDue, getReminders, isBellUnread } from '../_utils/notifications';
import { COLORS, FONTS } from '../constants/constants';

interface DueReminderBannerProps {
  topOffset?: number;
}

export default function DueReminderBanner({ topOffset = 0 }: DueReminderBannerProps) {
  const [visible, setVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const checkReminder = async () => {
      const list = await getReminders();
      await checkAndUpdateAnyReminderDue(list);
      const isUnread = await isBellUnread();
      setVisible(isUnread);
    };

    checkReminder();

    // Listen for events - no need to recompute, just update state
    const onDue = NotificationBellEvent.on('due', () => setVisible(true));
    const onRead = NotificationBellEvent.on('read', () => setVisible(false));
    const onCleared = NotificationBellEvent.on('cleared', () => setVisible(false));

    // Reduced interval - check every 2 minutes instead of 15 seconds
    const interval = setInterval(checkReminder, 120000);

    return () => {
      clearInterval(interval);
      onDue();
      onRead();
      onCleared();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  const handleDismiss = async () => {
    // Do NOT mark as read automatically. Navigate to Notifications screen
    // so the user can manually mark the specific item as read.
    try {
      router.push('/notifications' as any);
    } catch (error) {
      console.error('Error navigating to notifications:', error);
    }
  };

  if (!visible) return null;

  // Position the banner just below the phone's notch/safe area.
  const computedTop = insets.top + 1;

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          top: computedTop,
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0], // Slide down animation
              }),
            },
          ],
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.banner}
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        <Icon 
          name="notifications-active" 
          size={24} 
          color={COLORS.white} 
        />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Symptom Check Reminder</Text>
          <Text style={styles.body}>Time to log your symptoms</Text>
        </View>
        <Icon name="close" size={20} color={COLORS.white} style={styles.closeIcon} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  banner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontFamily: FONTS.BarlowSemiCondensedBold,
    fontSize: 16,
    color: COLORS.white,
    marginBottom: 2,
  },
  body: {
    fontFamily: FONTS.BarlowSemiCondensed,
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  closeIcon: {
    marginLeft: 8,
  },
});
