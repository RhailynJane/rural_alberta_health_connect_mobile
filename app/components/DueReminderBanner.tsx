import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NotificationBellEvent } from '../_utils/NotificationBellEvent';
import { checkAndUpdateAnyReminderDue, getReminders, isBellUnread, markBellRead } from '../_utils/notifications';
import { COLORS, FONTS } from '../constants/constants';

interface DueReminderBannerProps {
  topOffset?: number;
}

export default function DueReminderBanner({ topOffset = 0 }: DueReminderBannerProps) {
  const router = useRouter();
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

    // Listen for due event
  const onDue = NotificationBellEvent.on('due', checkReminder);
  const onRead = NotificationBellEvent.on('read', () => setVisible(false));
  const onCleared = NotificationBellEvent.on('cleared', () => setVisible(false));

  // Poll more frequently to reduce perceived delay
  const interval = setInterval(checkReminder, 15000);

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
    try {
      await markBellRead();
      NotificationBellEvent.emit('read');
      setVisible(false);
    } catch (error) {
      console.error('Error dismissing reminder:', error);
    }
  };

  const handlePress = () => {
    router.push('/(tabs)/tracker');
    handleDismiss();
  };

  if (!visible) return null;

  // Position the banner just below the phone's notch/safe area.
  // We prefer safe area top with a small margin to ensure visibility across devices.
  const computedTop = Math.max(insets.top + 1, 1);

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
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <Icon name="notifications-active" size={24} color={COLORS.white} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Symptom Check Reminder</Text>
          <Text style={styles.body}>Time to log your symptoms</Text>
        </View>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close" size={20} color={COLORS.white} />
        </TouchableOpacity>
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
  closeButton: {
    padding: 4,
  },
});
