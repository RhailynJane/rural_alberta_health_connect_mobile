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
      // Load reminder history (local notifications)
      const reminderHistory = await getReminderHistory();
      const mappedReminders = reminderHistory.map((r) => ({
        _id: `local-${r.id}`,
        localId: r.id,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
        read: r.read,
        _local: true,
      }));

      // Load cached server notifications
      let cachedNotifications: NotificationItem[] = [];
      try {
        const cached = await AsyncStorage.getItem('notifications_cache');
        if (cached) {
          const { data } = JSON.parse(cached);
          cachedNotifications = data || [];
        }
      } catch {
        cachedNotifications = [];
      }

      // Combine and deduplicate
      const combined = [...mappedReminders, ...cachedNotifications];
      const seen = new Set<string>();
      const deduped = combined.filter((item) => {
        // First check: deduplicate by _id
        if (seen.has(String(item._id))) return false;
        seen.add(String(item._id));
        
        // Second check: for reminder notifications, also group by rounded time (to nearest minute)
        if (item.title?.includes('Symptom Assessment Reminder') || item.title?.includes('reminder')) {
          const timestamp = item.createdAt || 0;
          const roundedTime = Math.floor(timestamp / 60000) * 60000; // Round to minute
          const timeKey = `time-${item.title}-${roundedTime}`;
          if (seen.has(timeKey)) return false;
          seen.add(timeKey);
        }
        return true;
      });

      // Sort by timestamp descending (newest first)
      const sorted = deduped.sort((a, b) => {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        return timeB - timeA;
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
