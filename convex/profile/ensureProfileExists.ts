import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, MutationCtx } from "../_generated/server";

export const ensureProfileExists = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log("❌ User not authenticated in ensureProfileExists");
      return null;
    }

    console.log("🔍 Checking for existing profile for user:", userId);
    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
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
  },
});
