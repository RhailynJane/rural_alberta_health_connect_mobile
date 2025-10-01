import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  checkOnboardingStatus,
  getUserProfile,
  updatePersonalInfoModel,
} from "../model/userProfile";

export const getOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isCompleted: false, profile: null };
    }

    return await checkOnboardingStatus(ctx, userId);
  },
});

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log("📊 getProfile: User not authenticated, returning null");
      return null; // Return null instead of throwing error
    }
    
    const profile = await getUserProfile(ctx, userId);
    console.log("📊 getProfile query result:", profile); 
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
    return await updatePersonalInfoModel(ctx, userId, args);
  },

});

export const ensureProfileExists = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) {
        console.log("❌ User not authenticated in ensureProfileExists");
        return null;
      }

      console.log("🔍 Checking for existing profile for user:", userId);
      let profile = await ctx.db
        .query("userProfiles")
        .withIndex("byUserId", (q) => q.eq("userId", userId))
        .first();

      // Create profile if it doesn't exist
      if (!profile) {
        console.log("🔄 Creating new profile for user:", userId);
        const profileId = await ctx.db.insert("userProfiles", {
          userId,
          onboardingCompleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        profile = await ctx.db.get(profileId);
        console.log("✅ Profile created:", profileId);
      } else {
        console.log("✅ Profile already exists:", profile._id);
      }

      return profile;
    } catch (error) {
      console.error("❌ Error in ensureProfileExists:", error);
      return null;
    }
  },
});
