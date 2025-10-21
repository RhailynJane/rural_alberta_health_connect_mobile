import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

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
    frequency: v.string(), // "daily" | "weekly"
    time: v.string(), // HH:mm (24h)
    dayOfWeek: v.optional(v.string()), // Mon..Sun when weekly
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("User not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .unique();

    // Basic validation
    const freq = args.frequency === "weekly" ? "weekly" : "daily";
    const timeOk = /^([01]\d|2[0-3]):([0-5]\d)$/.test(args.time);
    if (!timeOk) throw new ConvexError("Invalid time format. Use HH:mm 24h.");

    const patch = {
      symptomReminderEnabled: args.enabled,
      symptomReminderFrequency: freq,
      symptomReminderTime: args.time,
      symptomReminderDayOfWeek: freq === "weekly" ? (args.dayOfWeek || "Mon") : undefined,
      updatedAt: Date.now(),
    } as any;

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
