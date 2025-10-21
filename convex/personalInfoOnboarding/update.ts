import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { updatePersonalInfoModel } from "../model/userProfile";

export const withAgeRangeAndLocation = mutation({
  args: {
    age: v.string(),
    address1: v.optional(v.string()),
    address2: v.optional(v.string()),
    city: v.string(),
    province: v.string(),
    postalCode: v.optional(v.string()),
    location: v.string(),
    onboardingCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await updatePersonalInfoModel(ctx, userId, {
      age: args.age,
      address1: args.address1 || "",
      address2: args.address2 || "",
      city: args.city,
      province: args.province,
      postalCode: args.postalCode || "",
      location: args.location,
      onboardingCompleted: args.onboardingCompleted ?? false,
    });
  },
});
