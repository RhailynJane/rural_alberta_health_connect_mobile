/**
 * Notification helpers for creating in-app notifications and sending push notifications
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Firebase Admin SDK initialization
let firebaseAdmin: any = null;
let firebaseInitialized = false;

async function initializeFirebaseAdmin() {
  if (firebaseInitialized) {
    return firebaseAdmin;
  }

  try {
    const adminSDKKey = process.env.FIREBASE_ADMIN_SDK_KEY;
    if (!adminSDKKey) {
      console.warn("⚠️ FIREBASE_ADMIN_SDK_KEY not set - FCM push notifications disabled");
      firebaseInitialized = true;
      return null;
    }

    // Dynamic import to avoid bundling issues
    const admin = await import("firebase-admin");
    
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(adminSDKKey))
      });
      console.log("✅ Firebase Admin SDK initialized");
    }
    
    firebaseAdmin = admin;
    firebaseInitialized = true;
    return admin;
  } catch (error) {
    console.error("❌ Firebase Admin SDK initialization failed:", error);
    firebaseInitialized = true;
    return null;
  }
}

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
 * Send push notification to all of a user's devices via Expo Push Service
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
    priority: "high",
    channelId: "default",
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
      const errorText = await response.text();
      console.error("Expo push notification failed:", errorText);
    } else {
      const result = await response.json();
      console.log(`✅ Sent Expo push to ${tokens.length} device(s):`, result);
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
 * Send push notification via Firebase Cloud Messaging (FCM)
 * Public mutation for sending push notifications to users
 */
export const sendPushNotificationFCM = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    try {
      // Initialize Firebase Admin if needed
      const admin = await initializeFirebaseAdmin();
      if (!admin) {
        console.log("⚠️ Firebase Admin not available - falling back to Expo push");
        // Fallback to Expo push
        await sendPushToUser(ctx, args.userId, args.title, args.body, args.data);
        return { success: true, method: 'expo' };
      }

      // Get user's push tokens
      const tokens = await ctx.db
        .query("pushTokens")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect();

      if (tokens.length === 0) {
        console.log(`No push tokens found for user ${args.userId}`);
        return { success: false, message: "No tokens found" };
      }

      // Prepare FCM message
      const message: any = {
        notification: {
          title: args.title,
          body: args.body,
        },
        data: args.data || {},
        android: {
          priority: "high" as const,
          notification: {
            channelId: "reminders-high",
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
      };

      // Send to all tokens
      const results = await Promise.allSettled(
        tokens.map((token) =>
          admin.messaging().send({
            ...message,
            token: token.token,
          })
        )
      );

      const successCount = results.filter((r) => r.status === "fulfilled").length;
      const failCount = results.filter((r) => r.status === "rejected").length;

      console.log(`✅ Sent FCM notifications: ${successCount} succeeded, ${failCount} failed`);
      
      return { 
        success: true, 
        method: 'fcm',
        tokenCount: tokens.length,
        successCount,
        failCount,
      };
    } catch (error: any) {
      console.error("❌ Error sending FCM notification:", error);
      return { success: false, error: error.message };
    }
  },
});
