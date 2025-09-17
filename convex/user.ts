import { query } from "./_generated/server";
import { getCurrentUserWithProfile } from "./model/user";
import { getAuthUserId } from "@convex-dev/auth/server";

export const dashboardUser = query({
  args: {},
  handler: getCurrentUserWithProfile,
});



