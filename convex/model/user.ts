import { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function getCurrentUserWithProfile(
  ctx: QueryCtx,
  userId: Id<"users">
) {
  console.log("🔧 Backend Debug - getUserWithProfile called with userId:", userId);
  
  const user = await ctx.db.get(userId);
  console.log("👤 User from DB:", user);

  if (!user) {
    console.log("❌ No user found, returning null");
    return null;
  }

  const userProfile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .first();
    
  console.log("📝 UserProfile from DB:", userProfile);

  const result = {
    ...userProfile,
    userEmail: user.email,
    userName: user.firstName || user.name,
  };
  
  console.log("📤 Final result being returned:", result);
  return result;
}
