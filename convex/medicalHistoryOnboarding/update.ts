import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { completeOnboarding, updateMedicalHistory } from "../model/userProfile";

export const withAllConditions = mutation({
  args: {
    medicalConditions: v.optional(v.string()),
    currentMedications: v.optional(v.string()),
    allergies: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await updateMedicalHistory(ctx, userId, {
      conditions: args.medicalConditions,
      medications: args.currentMedications,
      allergies: args.allergies,
    });
  },
});

export const completeUserOnboarding = mutation({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await completeOnboarding(ctx, userId);
  },
});