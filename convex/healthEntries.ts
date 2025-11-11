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
    // Idempotency guard: prevent duplicates on reconnection/resubmission
    const existing = await ctx.db
      .query("healthEntries")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("timestamp"), args.timestamp),
          q.eq(q.field("date"), args.date),
          q.eq(q.field("type"), "ai_assessment")
        )
      )
      .first();
    if (existing) {
      return existing._id;
    }

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
    type: v.optional(v.string()), // allow client override but we'll still default
  },
  handler: async (ctx, args) => {
    // Idempotency guard: if an entry already exists for this user and timestamp (and date), return it
    const existing = await ctx.db
      .query("healthEntries")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("timestamp"), args.timestamp),
          q.eq(q.field("date"), args.date)
        )
      )
      .first();
    if (existing) {
      return existing._id;
    }

    const entryId = await ctx.db.insert("healthEntries", {
      userId: args.userId,
      date: args.date,
      timestamp: args.timestamp,
      symptoms: args.symptoms,
      severity: args.severity,
      notes: args.notes || "",
      createdBy: args.createdBy,
      // Explicit server-side default: if client omitted or sent blank, coalesce to manual_entry
      type: (args.type && args.type.trim()) ? args.type : "manual_entry",
      photos: args.photos || [], 
    });

    return entryId;
  },
});

export const getTodaysEntries = query({
  args: {
    userId: v.id("users"),
    localDate: v.string(), // Frontend passes the local date string
  },
  handler: async (ctx, args) => {
    // Use the local date provided by the frontend (already formatted as YYYY-MM-DD)
    const today = args.localDate;

    console.log("🔍 Querying for today (from frontend):", today, "user:", args.userId);

    const allUserEntries = await ctx.db
      .query("healthEntries")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter for today's entries and exclude deleted ones
    const todaysEntries = allUserEntries.filter(
      entry => entry.date === today && !entry.isDeleted
    );

    console.log("📊 Found entries:", {
      totalUserEntries: allUserEntries.length,
      todaysEntries: todaysEntries.length,
      todayDate: today,
      allEntries: allUserEntries.map(e => ({ date: e.date, type: e.type, isDeleted: e.isDeleted }))
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
          q.lte(q.field("date"), args.endDate),
          q.neq(q.field("isDeleted"), true)
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
      .filter((q) => q.neq(q.field("isDeleted"), true))
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
    // Note: This returns deleted entries as well, for audit purposes
    // The UI should check isDeleted field and handle accordingly
    return await ctx.db.get(args.entryId);
  },
});

export const updateHealthEntry = mutation({
  args: {
    entryId: v.id("healthEntries"),
    userId: v.id("users"),
    symptoms: v.optional(v.string()),
    severity: v.optional(v.number()),
    notes: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    type: v.optional(v.string()), // allow updating the type explicitly if needed
  },
  handler: async (ctx, args) => {
    // Get the entry to verify ownership and type
    const entry = await ctx.db.get(args.entryId);

    if (!entry) {
      throw new Error("Health entry not found");
    }

    // Prevent editing AI assessments
    if (entry.type === "ai_assessment") {
      throw new Error("AI assessments cannot be edited");
    }

    // Prevent editing deleted entries
    if (entry.isDeleted) {
      throw new Error("Cannot edit deleted entry");
    }

    // Build update object - only update provided fields
    const updates: any = {
      lastEditedAt: Date.now(),
      editCount: (entry.editCount || 0) + 1,
    };
    // Optional type update, but maintain default if blank
    if (args.type !== undefined) {
      updates.type = (args.type && args.type.trim()) ? args.type : (entry.type || "manual_entry");
    } else if (!entry.type) {
      // Ensure legacy rows always get a default when first edited
      updates.type = "manual_entry";
    }

    if (args.symptoms !== undefined) {
      updates.symptoms = args.symptoms;
    }

    if (args.severity !== undefined) {
      // Validate severity range
      if (args.severity < 0 || args.severity > 10) {
        throw new Error("Severity must be between 0 and 10");
      }
      updates.severity = args.severity;
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes;
    }

    if (args.photos !== undefined) {
      updates.photos = args.photos;
    }


  // Update the entry (patch only if we have at least one actual field change in addition to edit metadata)
  await ctx.db.patch(args.entryId, updates);

    return args.entryId;
  },
});

export const deleteHealthEntry = mutation({ 
  args: {
    entryId: v.id("healthEntries"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the entry to verify ownership
    const entry = await ctx.db.get(args.entryId);

    if (!entry) {
      throw new Error("Health entry not found");
    }

    // Critical security check: verify user owns this entry
    if (entry.userId !== args.userId) {
      throw new Error("Unauthorized: You can only delete your own entries");
    }

    // Prevent deleting AI assessments (optional policy decision)
    if (entry.type === "ai_assessment") {
      throw new Error("AI assessments cannot be deleted");
    }

    // Soft delete - just mark as deleted
    // todo: Decide really delete after data rentention period. 
    // or just leave it here
    await ctx.db.patch(args.entryId, {
      isDeleted: true,
      lastEditedAt: Date.now(),
    });

    return { success: true, message: "Entry deleted successfully" };
  },
});

export const getDeletedEntries = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    // Query for deleted entries - useful for audit trail or restore feature
    const deletedEntries = await ctx.db
      .query("healthEntries")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isDeleted"), true))
      .order("desc")
      .collect();

    return deletedEntries;
  },
});

export const restoreHealthEntry = mutation({
  args: {
    entryId: v.id("healthEntries"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the entry to verify ownership
    const entry = await ctx.db.get(args.entryId);

    if (!entry) {
      throw new Error("Health entry not found");
    }

    // Critical security check: verify user owns this entry
    if (entry.userId !== args.userId) {
      throw new Error("Unauthorized: You can only restore your own entries");
    }

    // Check if entry is actually deleted
    if (!entry.isDeleted) {
      throw new Error("Entry is not deleted");
    }

    // Restore the entry
    await ctx.db.patch(args.entryId, {
      isDeleted: false,
      lastEditedAt: Date.now(),
    });

    return { success: true, message: "Entry restored successfully" };
  },
});



// One-time migration to fix incorrect dates caused by UTC/local timezone mismatch
export const fixIncorrectDates = mutation({
  args: {
    userId: v.id("users"),
    wrongDate: v.string(),
    correctDate: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`🔧 Starting date fix: ${args.wrongDate} -> ${args.correctDate}`);
    
    // Find all entries with the wrong date
    const allEntries = await ctx.db
      .query("healthEntries")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .collect();
    
    const entriesToFix = allEntries.filter(entry => entry.date === args.wrongDate);
    
    console.log(`📝 Found ${entriesToFix.length} entries to fix`);
    
    // Update each entry
    let fixed = 0;
    for (const entry of entriesToFix) {
      await ctx.db.patch(entry._id, {
        date: args.correctDate,
      });
      fixed++;
    }
    
    console.log(`✅ Fixed ${fixed} entries`);
    
    return {
      success: true,
      entriesFixed: fixed,
      message: `Updated ${fixed} entries from ${args.wrongDate} to ${args.correctDate}`,
    };
  },
});
