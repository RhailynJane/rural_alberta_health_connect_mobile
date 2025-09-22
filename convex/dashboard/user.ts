import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { getCurrentUserWithProfile } from "../model/user";

export const getUserWithProfile = query({
  args: {},
  handler: async (ctx, args) => {
    console.log("🔥 getUserWithProfile API called!");
    console.log("🔍 Auth context:", ctx.auth);
    
    const userId = await getAuthUserId(ctx);
    console.log("🆔 User ID from auth:", userId);
    
    if (!userId) {
      console.log("❌ No user ID found, throwing error");
      throw new Error("Not authenticated");
    }

    console.log("✅ User authenticated, calling model function");
    return await getCurrentUserWithProfile(ctx, userId);
  },
});
