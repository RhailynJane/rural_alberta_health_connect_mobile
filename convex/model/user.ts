import { getAuthUserId } from "@convex-dev/auth/server";
import { getOneFrom } from "convex-helpers/server/relationships";
import type { QueryCtx } from "../_generated/server";

export async function getCurrentUserWithProfile(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");

  const profile = await getOneFrom(ctx.db, "userProfiles", "byUserId", userId, "userId");

  return {
    user,
    profile,
  };
}