import { query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
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
      return null;
    }

    return await getUserProfile(ctx, userId);
  },
});