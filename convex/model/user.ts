import { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function getCurrentUserWithProfile(
  ctx: QueryCtx,
  userId: Id<"users">
) {
  const user = await ctx.db.get(userId);

  if (!user) {
    return null;
  }

  const userProfile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .first();

  return {
    ...userProfile,
    userEmail: user.email,
    userName: user.name,
  };
}
