import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const getOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isCompleted: false, profile: null };
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    return {
      isCompleted: profile?.onboardingCompleted ?? false,
      profile,
    };
  },
});

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new ConvexError("Profile not found");
    }

    return profile;
  },
});

export const updatePersonalInfo = mutation({
  args: { ageRange: v.string(), location: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      // Create a new profile if it doesn't exist
      await ctx.db.insert("userProfiles", {
        userId,
        ageRange: args.ageRange,
        location: args.location,
        onboardingCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true, message: "Profile created successfully" };
    }

    // Update existing profile
    await ctx.db.patch(profile._id, {
      ageRange: args.ageRange,
      location: args.location,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Profile updated successfully" };
  },
});

export const updateMedicalInfo = mutation({
  args: {
    allergies: v.optional(v.string()),
    currentMedications: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new ConvexError("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      allergies: args.allergies,
      currentMedications: args.currentMedications,
      medicalConditions: args.medicalConditions,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Medical information updated successfully" };
  },
});

export const updateEmergencyContact = mutation({
  args: {
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("User not authenticated");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new ConvexError("Profile not found");
    }

    await ctx.db.patch(profile._id, {
      emergencyContactName: args.emergencyContactName,
      emergencyContactPhone: args.emergencyContactPhone,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Emergency contact updated successfully" };
  },
});