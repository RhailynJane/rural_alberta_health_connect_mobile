import { query } from "./_generated/server";
import { getCurrentUserWithProfile } from "./model/user";

export const dashboardUser = query({
  args: {},
  handler: getCurrentUserWithProfile,
});