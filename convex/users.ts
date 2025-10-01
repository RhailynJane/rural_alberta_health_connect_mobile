import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

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
      hasCompletedOnboarding: user.hasCompletedOnboarding,
    };
  },
});