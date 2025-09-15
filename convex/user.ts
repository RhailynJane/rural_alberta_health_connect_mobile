import { query } from "./_generated/server";
import { getCurrentUserWithProfile } from "./model/user";
import { getAuthUserId } from "@convex-dev/auth/server";

export const dashboardUser = query({
  args: {},
  handler: getCurrentUserWithProfile,
});

export const debugUserData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { error: "Not authenticated" };

    const user = await ctx.db.get(userId);
    const allUsers = await ctx.db.query("users").collect();
    const allSessions = await ctx.db.query("authSessions").collect();
    
    return {
      currentUserId: userId,
      currentUser: user,
      allUsersCount: allUsers.length,
      allUsers: allUsers.map(u => ({ 
        id: u._id, 
        email: u.email
      })),
      authSessionsCount: allSessions.length
    };
  },
});

