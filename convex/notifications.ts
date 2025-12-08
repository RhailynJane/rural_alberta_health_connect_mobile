/**
 * Notification helpers for creating in-app notifications and sending push notifications
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Helper to create a notification and optionally send push
 */
export async function createAndPushNotification(
  ctx: any,
  args: {
    userId: string;
    title: string;
    body: string;
    type: string;
    data?: any;
    sendPush?: boolean;
  }
) {
  const { userId, title, body, type, data, sendPush = true } = args;

  // Create in-app notification
  const notificationId = await ctx.db.insert("notifications", {
    userId,
    title,
    body,
    type,
    data: data || null,
    read: false,
    createdAt: Date.now(),
  });

  // Send push notification if requested
  if (sendPush) {
    try {
      await sendPushToUser(ctx, userId, title, body, data);
    } catch (error) {
      console.error("Failed to send push notification:", error);
      // Don't fail the whole operation if push fails
    }
  }

  return notificationId;
}

/**
 * Send push notification to all of a user's devices
 */
async function sendPushToUser(
  ctx: any,
  userId: string,
  title: string,
  body: string,
  data?: any
) {
  // Get all push tokens for this user
  const tokens = await ctx.db
    .query("pushTokens")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  if (tokens.length === 0) {
    console.log(`No push tokens found for user ${userId}`);
    return;
  }

  // Prepare Expo push messages
  const messages = tokens.map((token: any) => ({
    to: token.token,
    sound: "default",
    title,
    body,
    data: data || {},
  }));

  // Send to Expo push notification service
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error("Expo push notification failed:", await response.text());
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

/**
 * Register a push token for the current user
 */
export const registerPushToken = mutation({
  args: {
    token: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if token already exists
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (existing) {
      // Update timestamp
      await ctx.db.patch(existing._id, {
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new token
    return await ctx.db.insert("pushTokens", {
      userId,
      token: args.token,
      platform: args.platform,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get all notifications for the current user
 */
export const getNotifications = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const limit = args.limit || 50;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return notifications;
  },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return 0;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

    return unread.length;
  },
});

/**
 * Mark a notification as read
 */
export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.notificationId, {
      read: true,
    });
  },
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

    await Promise.all(
      unread.map((notification) =>
        ctx.db.patch(notification._id, {
          read: true,
        })
      )
    );

    return unread.length;
  },
});

/**
 * Delete a notification
 */
export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.notificationId);
  },
});

/**
 * Register Firebase Cloud Messaging (FCM) token
 * Similar to registerPushToken but specifically for Firebase
 */
export const registerFirebaseFCMToken = mutation({
  args: {
    fcmToken: v.string(),
    platform: v.string(), // "ios", "android", "web"
    deviceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if FCM token already exists for this user
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_token", (q) => q.eq("token", args.fcmToken))
      .first();

    if (existing) {
      // Update timestamp and device info
      await ctx.db.patch(existing._id, {
        updatedAt: Date.now(),
        ...(args.deviceName && { platform: `${args.platform}-firebase` }),
      });
      console.log("✅ Firebase FCM token updated for user:", userId);
      return existing._id;
    }

    // Create new FCM token entry
    const tokenId = await ctx.db.insert("pushTokens", {
      userId,
      token: args.fcmToken,
      platform: `${args.platform}-firebase`, // Distinguish Firebase from Expo
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("✅ Firebase FCM token registered for user:", userId);
    return tokenId;
  },
});

/**
 * Get user's push tokens (both Expo and Firebase)
 */
export const getUserPushTokens = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Send notification via Firebase Cloud Messaging
 * For server-side use only - should be called from backend
 */
export async function sendFirebaseNotification(
  ctx: any,
  args: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }
) {
  const { userId, title, body, data } = args;

  try {
    // Get user's Firebase tokens
    const tokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const fcmTokens = tokens.filter((t) => t.platform.includes("firebase"));

    if (fcmTokens.length === 0) {
      console.log("ℹ️ No Firebase tokens found for user:", userId);
      return;
    }

    // Send via Firebase Admin SDK
    // This requires firebase-admin setup on the backend
    // For now, we'll create a helper that can be called with the Admin SDK
    console.log(`📤 Firebase notification ready to send to ${fcmTokens.length} device(s):`, {
      title,
      body,
      tokens: fcmTokens.map((t) => t.token.substring(0, 20) + "..."),
    });

    // In production, call Firebase Admin SDK here:
    // await admin.messaging().sendMulticast({
    //   tokens: fcmTokens.map(t => t.token),
    //   notification: { title, body },
    //   data: data || {},
    // });
  } catch (error) {
    console.error("❌ Failed to send Firebase notification:", error);
  }
}
