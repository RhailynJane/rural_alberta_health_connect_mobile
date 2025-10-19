import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { updatePersonalInfoModel } from "../model/userProfile";

export const withAgeRangeAndLocation = mutation({
  args: {
    ageRange: v.string(),
    location: v.string(),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await updatePersonalInfoModel(ctx, userId, {
      ageRange: args.ageRange,
      location: args.location,
      onboardingCompleted: args.onboardingCompleted ?? false,
    });
  },
});
