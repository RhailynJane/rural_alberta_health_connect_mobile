import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Cast identity.subject to proper user ID type
    const userId = identity.subject as Id<"users">;
    
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .unique();

    return profile;
  },
});

// Note: Profile creation now happens automatically during signup via auth callback
// No separate mutations needed - all data is collected in frontend and passed to signIn()