import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { NotificationBellEvent } from '../_utils/NotificationBellEvent';
import { checkAndUpdateAnyReminderDue, getReminders, markBellRead } from '../_utils/notifications';
import { NotificationBanner } from './NotificationBanner';

/**
 * Renders a transient notification banner whenever any reminder is due.
 * Uses local reminder storage only, so it works fully offline.
 */
export default function DueReminderBanner({ topOffset = 120 }: { topOffset?: number }) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    try {
      const list = await getReminders();
      const due = await checkAndUpdateAnyReminderDue(list);
      setShow(due);
    } catch {
      setShow(false);
    }
  };

  useEffect(() => {
    // Initial check
    refresh();

    // Poll every 60s similar to NotificationBell
    pollingRef.current = setInterval(refresh, 60_000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleDismiss = async () => {
    try { await markBellRead(); } catch {}
    NotificationBellEvent.emit('read');
    setShow(false);
  };

  const handlePress = async () => {
    await handleDismiss();
    // Navigate user to AI assessment flow
    router.push('/(tabs)/ai-assess');
  };

  if (!show) return null;

  return (
    <NotificationBanner
      title="Time to take Symptom Assessment"
      body="Complete your symptoms check now. Tap to start."
      onPress={handlePress}
      onDismiss={handleDismiss}
      duration={7000}
      topOffset={topOffset}
    />
  );
}
