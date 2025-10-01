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
