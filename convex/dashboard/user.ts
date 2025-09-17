import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { getCurrentUserWithProfile } from "../model/user";

export const getUserWithProfile = query({
  args: {},
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await getCurrentUserWithProfile(ctx, userId);
  },
});
