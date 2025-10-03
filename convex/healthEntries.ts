import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const logAIAssessment = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    timestamp: v.number(),
    symptoms: v.string(),
    severity: v.number(),
    category: v.string(),
    duration: v.string(),
    aiContext: v.string(),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const entryId = await ctx.db.insert("healthEntries", {
      userId: args.userId,
      date: args.date,
      timestamp: args.timestamp,
      symptoms: args.symptoms,
      severity: args.severity,
      category: args.category,
      duration: args.duration,
      aiContext: args.aiContext,
      photos: args.photos || [],
      notes: args.notes || "",
      createdBy: "System AI",
      type: "ai_assessment",
    });

    return entryId;
  },
});

export const logManualEntry = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    timestamp: v.number(),
    symptoms: v.string(),
    severity: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.string(),
  },
  handler: async (ctx, args) => {
    const entryId = await ctx.db.insert("healthEntries", {
      userId: args.userId,
      date: args.date,
      timestamp: args.timestamp,
      symptoms: args.symptoms,
      severity: args.severity,
      notes: args.notes || "",
      createdBy: args.createdBy,
      type: "manual_entry",
    });

    return entryId;
  },
});

export const getTodaysEntries = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const entries = await ctx.db
      .query("healthEntries")
      .withIndex("byDate", (q) => 
        q.eq("userId", args.userId).eq("date", today)
      )
      .order("desc")
      .collect();

    return entries;
  },
});

export const getEntriesByDateRange = query({
  args: { 
    userId: v.id("users"),
    startDate: v.string(),
    endDate: v.string()
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("healthEntries")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("date"), args.startDate),
          q.lte(q.field("date"), args.endDate)
        )
      )
      .order("desc")
      .collect();

    return entries;
  },
});

export const getAllUserEntries = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("healthEntries")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return entries;
  },
});