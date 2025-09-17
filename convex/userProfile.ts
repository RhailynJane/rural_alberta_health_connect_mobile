import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { safeString } from "./utils/sanitize";

export const updateUserProfile = mutation({
  args: {
    ageRange: v.optional(v.string()),
    location: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    currentMedications: v.optional(v.string()),
    allergies: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .unique();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        ageRange: safeString(args.ageRange),
        location: safeString(args.location),
        emergencyContactName: safeString(args.emergencyContactName),
        emergencyContactPhone: safeString(args.emergencyContactPhone),
        medicalConditions: safeString(args.medicalConditions),
        currentMedications: safeString(args.currentMedications),
        allergies: safeString(args.allergies),
        updatedAt: Date.now(),
      });
      return existingProfile._id;
    } else {
      // Create new profile
      return await ctx.db.insert("userProfiles", {
        userId,
        ageRange: safeString(args.ageRange),
        location: safeString(args.location),
        emergencyContactName: safeString(args.emergencyContactName),
        emergencyContactPhone: safeString(args.emergencyContactPhone),
        medicalConditions: safeString(args.medicalConditions),
        currentMedications: safeString(args.currentMedications),
        allergies: safeString(args.allergies),
        onboardingCompleted: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .unique();

    return profile;
  },
});