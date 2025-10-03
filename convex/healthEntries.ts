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
    photos: v.optional(v.array(v.string())), 
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
      photos: args.photos || [], 
    });

    return entryId;
  },
});

export const getTodaysEntries = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get today's date in local timezone (same as frontend)
    const now = new Date();
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
      .toISOString()
      .split('T')[0];
    
    console.log("🔍 Querying for today (local):", today, "user:", args.userId);
    
    const allUserEntries = await ctx.db
      .query("healthEntries")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .collect();

    const todaysEntries = allUserEntries.filter(entry => entry.date === today);
    
    console.log("📊 Found entries:", {
      totalUserEntries: allUserEntries.length,
      todaysEntries: todaysEntries.length,
      todayDate: today,
      allEntries: allUserEntries.map(e => ({ date: e.date, type: e.type }))
    });
    
    return todaysEntries;
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

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const storeUploadedPhoto = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    // Get the image URL from storage
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    return imageUrl || "";
  },
});

export const getEntryById = query({
  args: { entryId: v.id("healthEntries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.entryId);
  },
});