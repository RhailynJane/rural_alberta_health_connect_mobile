import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { updateEmergencyContact } from "../model/userProfile";

export const updateContact = mutation({
  args: {
    emergencyContactName: v.string(),
    emergencyContactPhone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await updateEmergencyContact(ctx, userId, {
      name: args.emergencyContactName,
      phone: args.emergencyContactPhone,
    });
  },
});