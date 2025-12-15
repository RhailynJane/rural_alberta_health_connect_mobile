import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

// ReminderItem type (matches app-side)
export interface ReminderItem {
  id: string;
  enabled: boolean;
  frequency: "hourly" | "daily" | "weekly";
  time?: string; // HH:mm (24h) - optional for hourly
  dayOfWeek?: string; // Mon..Sun when weekly
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
}

export const getReminderSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .unique();

    if (!profile) return null;

    return {
      enabled: profile.symptomReminderEnabled ?? false,
      frequency: profile.symptomReminderFrequency ?? "daily",
      time: profile.symptomReminderTime ?? "09:00",
      dayOfWeek: profile.symptomReminderDayOfWeek ?? "Mon",
    };
  },
});

export const updateReminderSettings = mutation({
  args: {
    enabled: v.boolean(),
    frequency: v.optional(v.string()), // "daily" | "weekly"
    time: v.optional(v.string()), // HH:mm (24h)
    dayOfWeek: v.optional(v.string()), // Mon..Sun when weekly
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("User not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .unique();

    // Build patch with only provided fields
    const patch: any = {
      symptomReminderEnabled: args.enabled,
      updatedAt: Date.now(),
    };

    // Only validate and set frequency/time if provided
    if (args.frequency !== undefined) {
      const freq = args.frequency === "weekly" ? "weekly" : "daily";
      patch.symptomReminderFrequency = freq;
      
      // If frequency provided, time should also be provided
      if (args.time === undefined) {
        throw new ConvexError("Time is required when updating frequency");
      }
      
      const timeOk = /^([01]\d|2[0-3]):([0-5]\d)$/.test(args.time);
      if (!timeOk) throw new ConvexError("Invalid time format. Use HH:mm 24h.");
      
      patch.symptomReminderTime = args.time;
      patch.symptomReminderDayOfWeek = freq === "weekly" ? (args.dayOfWeek || "Mon") : undefined;
    } else if (args.time !== undefined) {
      // Time provided without frequency is an error
      throw new ConvexError("Frequency is required when updating time");
    }

    if (profile) {
      await ctx.db.patch(profile._id, patch);
      return { success: true };
    }

    await ctx.db.insert("userProfiles", {
      userId,
      onboardingCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...patch,
    });
    return { success: true };
  },
});

// NEW: Get all reminders for the current user
export const getAllReminders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .unique();

    if (!profile || !profile.reminders) return [];

    try {
      const reminders = JSON.parse(profile.reminders) as ReminderItem[];
      return reminders;
    } catch (err) {
      console.error("Failed to parse reminders JSON:", err);
      return [];
    }
  },
});

// NEW: Save all reminders for the current user
export const saveAllReminders = mutation({
  args: {
    reminders: v.string(), // JSON stringified ReminderItem[]
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("User not authenticated");

    // Validate JSON
    let parsed: ReminderItem[];
    try {
      parsed = JSON.parse(args.reminders);
      if (!Array.isArray(parsed)) {
        throw new ConvexError("reminders must be an array");
      }
    } catch {
      throw new ConvexError("Invalid JSON for reminders");
    }

    // Validate each reminder item
    for (const r of parsed) {
      if (!r.id || typeof r.id !== "string") {
        throw new ConvexError("Each reminder must have a valid id");
      }
      if (typeof r.enabled !== "boolean") {
        throw new ConvexError("Each reminder must have an enabled boolean");
      }
      if (!["hourly", "daily", "weekly"].includes(r.frequency)) {
        throw new ConvexError("Invalid frequency. Must be hourly, daily, or weekly");
      }
      // Validate time for daily/weekly (hourly doesn't need time)
      if (r.frequency !== "hourly") {
        if (!r.time) {
          throw new ConvexError(`Time is required for ${r.frequency} reminders`);
        }
        const timeOk = /^([01]\d|2[0-3]):([0-5]\d)$/.test(r.time);
        if (!timeOk) {
          throw new ConvexError("Invalid time format. Use HH:mm 24h.");
        }
      }
      if (r.frequency === "weekly" && !r.dayOfWeek) {
        throw new ConvexError("dayOfWeek required for weekly reminders");
      }
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .unique();

    const patch = {
      reminders: args.reminders,
      updatedAt: Date.now(),
    };

    if (profile) {
      await ctx.db.patch(profile._id, patch);
      return { success: true, count: parsed.length };
    }

    await ctx.db.insert("userProfiles", {
      userId,
      onboardingCompleted: false,
      createdAt: Date.now(),
      ...patch,
    });
    return { success: true, count: parsed.length };
  },
});
