import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { query } from "../_generated/server";
import { checkOnboardingStatus, getUserProfile } from "../model/userProfile";

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
      throw new ConvexError("User not authenticated");
    }
    return await getUserProfile(ctx, userId);
  },
});
