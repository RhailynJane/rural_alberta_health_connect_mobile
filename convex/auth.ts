import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import type { DataModel } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { safeString } from "./utils/sanitize";

const PasswordProvider = Password<DataModel>({
  profile(params) {
    return {
      email: params.email as string,
      ageRange: params.ageRange as string | undefined,
      location: params.location as string | undefined,
      emergencyContactName: params.emergencyContactName as string | undefined,
      emergencyContactPhone: params.emergencyContactPhone as string | undefined,
      medicalConditions: params.medicalConditions as string | undefined,
      currentMedications: params.currentMedications as string | undefined,
      allergies: params.allergies as string | undefined,
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [PasswordProvider],
  callbacks: {
    async afterUserCreatedOrUpdated(
      ctx: MutationCtx,
      { userId, existingUserId, profile }
    ) {
      if (!existingUserId) {
        // Only create profile for new users
        const existingProfile = await ctx.db
          .query("userProfiles")
          .withIndex("byUserId", (q) => q.eq("userId", userId))
          .unique();

        if (!existingProfile) {
          // Use profile data passed from Password provider
          await ctx.db.insert("userProfiles", {
            userId,
            ageRange: safeString(profile.ageRange),
            location: safeString(profile.location),
            emergencyContactName: safeString(profile.emergencyContactName),
            emergencyContactPhone: safeString(profile.emergencyContactPhone),
            medicalConditions: safeString(profile.medicalConditions),
            currentMedications: safeString(profile.currentMedications),
            allergies: safeString(profile.allergies),
            onboardingCompleted: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }
    },
  },
});
