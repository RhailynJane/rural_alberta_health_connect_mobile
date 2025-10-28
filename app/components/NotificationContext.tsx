import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { NotificationBellEvent } from "../_utils/NotificationBellEvent";
import { getReminderHistory } from "../_utils/notifications";

interface NotificationItem {
  _id: string;
  localId?: string;
  title: string;
  body?: string;
  createdAt: number;
  read: boolean;
  _local?: boolean;
}

interface NotificationContextType {
  notificationList: NotificationItem[];
  refreshNotifications: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notificationList, setNotificationList] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      // Load reminder history (local notifications) - this is the source of truth for local reminders
      const reminderHistory = await getReminderHistory();
      console.log('📋 [NotificationContext] Loading notifications:', {
        reminderCount: reminderHistory.length,
        reminders: reminderHistory.map(r => ({ id: r.id, title: r.title, read: r.read, createdAt: new Date(r.createdAt).toLocaleTimeString() }))
      });
      
      const mappedReminders = reminderHistory.map((r) => ({
        _id: `local-${r.id}`,
        localId: r.id,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
        read: r.read,
        _local: true,
      }));

      // Load cached server notifications (but filter out any local reminders that might have been cached)
      let cachedNotifications: NotificationItem[] = [];
      try {
        const cached = await AsyncStorage.getItem('notifications_cache');
        if (cached) {
          const { data } = JSON.parse(cached);
          // Filter out any notifications with _local flag or that start with 'occ-'
          // These should only come from reminder history, not server cache
          cachedNotifications = (data || []).filter((n: NotificationItem) => 
            !n._local && !String(n._id).includes('occ-')
          );
        }
      } catch {
        cachedNotifications = [];
      }

      // Combine and deduplicate
      const combined = [...mappedReminders, ...cachedNotifications];
      const seen = new Set<string>();
      const deduped = combined.filter((item) => {
        // Deduplicate by _id only - don't group by time as this causes issues
        // where different notifications at similar times get merged
        const id = String(item._id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });

      // Sort by timestamp descending (newest first)
      const sorted = deduped.sort((a, b) => {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        return timeB - timeA;
      });

      console.log('📋 [NotificationContext] Final notification list:', {
        count: sorted.length,
        notifications: sorted.map(n => ({ id: n._id, title: n.title, read: n.read, createdAt: new Date(n.createdAt).toLocaleTimeString() }))
      });

      setNotificationList(sorted);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotificationList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    await loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    // Initial load
    loadNotifications();

    // Listen to notification events to refresh the list
    const offDue = NotificationBellEvent.on('due', loadNotifications);
    const offCleared = NotificationBellEvent.on('cleared', loadNotifications);
    const offRead = NotificationBellEvent.on('read', loadNotifications);

    // Refresh periodically (every 30 seconds to match bell check interval)
    const interval = setInterval(loadNotifications, 30000);

    return () => {
      offDue();
      offCleared();
      offRead();
      clearInterval(interval);
    };
  }, [loadNotifications]);

  return (
    <NotificationContext.Provider value={{ notificationList, refreshNotifications, isLoading }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
