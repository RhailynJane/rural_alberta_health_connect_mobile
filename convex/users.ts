import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log("📊 getCurrentUser: User not authenticated, returning null");
      return null; 
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };
  },
});

/**
 * Updates the currently authenticated user's phone number
 * Stores the value in a normalized E.164 format where possible
 */
export const updatePhone = mutation({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Normalize to digits and attempt E.164 for NANP (+1XXXXXXXXXX)
    const digits = args.phone.replace(/\D+/g, "");
    let normalized = args.phone.trim();
    if (digits.length === 10) {
      normalized = "+1" + digits;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      normalized = "+" + digits;
    }

    await ctx.db.patch(userId, { phone: normalized });
    return { success: true };
  },
});