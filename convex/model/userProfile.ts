import { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { safeString } from "../utils/sanitize";

/**
 * Updates personal information for a user
 */
export async function updatePersonalInfoModel(
  ctx: MutationCtx,
  userId: Id<"users">,
  data: { 
    age: string; 
    address1: string;
    address2: string;
    city: string;
    province: string;
    postalCode: string;
    location: string; 
    onboardingCompleted?: boolean 
  }
) {
  // Validate required fields - only age is strictly required
  // city and province can be empty strings during initial onboarding
  if (!data.age) {
    throw new Error("Age is required for personal info");
  }

  // Check if profile already exists
  const existingProfile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  if (existingProfile) {
    // Update existing profile
    await ctx.db.patch(existingProfile._id, {
      age: safeString(data.age),
      address1: safeString(data.address1),
      address2: safeString(data.address2),
      city: safeString(data.city),
      province: safeString(data.province),
      postalCode: safeString(data.postalCode),
      location: safeString(data.location),
      onboardingCompleted: typeof data.onboardingCompleted === "boolean" ? data.onboardingCompleted : existingProfile.onboardingCompleted,
      updatedAt: Date.now(),
    });
    return existingProfile._id;
  } else {
    // Create new profile
    return await ctx.db.insert("userProfiles", {
      userId,
      age: safeString(data.age),
      address1: safeString(data.address1),
      address2: safeString(data.address2),
      city: safeString(data.city),
      province: safeString(data.province),
      postalCode: safeString(data.postalCode),
      location: safeString(data.location),
      onboardingCompleted: typeof data.onboardingCompleted === "boolean" ? data.onboardingCompleted : false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

/**
 * Updates emergency contact information for a user
 */
export async function updateEmergencyContact(
  ctx: MutationCtx,
  userId: Id<"users">,
  data: { name: string; phone: string }
) {
  // Validate required fields
  if (!data.name || !data.phone) {
    throw new Error("Emergency contact name and phone are required");
  }

  // Check if profile already exists
  const existingProfile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  if (existingProfile) {
    // Update existing profile
    await ctx.db.patch(existingProfile._id, {
      emergencyContactName: safeString(data.name),
      emergencyContactPhone: safeString(data.phone),
      updatedAt: Date.now(),
    });
    return existingProfile._id;
  } else {
    // Create new profile if it doesn't exist
    return await ctx.db.insert("userProfiles", {
      userId,
      emergencyContactName: safeString(data.name),
      emergencyContactPhone: safeString(data.phone),
      onboardingCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

/**
 * Updates medical history for a user
 */
export async function updateMedicalHistory(
  ctx: MutationCtx,
  userId: Id<"users">,
  data: {
    conditions?: string;
    medications?: string;
    allergies?: string;
  }
) {
  // Check if profile already exists
  const existingProfile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  if (existingProfile) {
    // Update existing profile
    await ctx.db.patch(existingProfile._id, {
      medicalConditions: safeString(data.conditions),
      currentMedications: safeString(data.medications),
      allergies: safeString(data.allergies),
      updatedAt: Date.now(),
    });
    return existingProfile._id;
  } else {
    // Create new profile if it doesn't exist
    return await ctx.db.insert("userProfiles", {
      userId,
      medicalConditions: safeString(data.conditions),
      currentMedications: safeString(data.medications),
      allergies: safeString(data.allergies),
      onboardingCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

/**
 * Completes the onboarding process for a user
 */
export async function completeOnboarding(
  ctx: MutationCtx,
  userId: Id<"users">
) {
  // Check if profile exists
  const existingProfile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  if (!existingProfile) {
    throw new Error("User profile not found. Cannot complete onboarding.");
  }

  // Mark onboarding as completed in userProfile
  await ctx.db.patch(existingProfile._id, {
    onboardingCompleted: true,
    updatedAt: Date.now(),
  });

  // Also update the user's hasCompletedOnboarding field
  await ctx.db.patch(userId, {
    hasCompletedOnboarding: true,
  });

  return existingProfile._id;
}

/**
 * Gets the user profile
 */
export async function getUserProfile(ctx: QueryCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  if (!profile) return null;
  return {
    _id: profile._id,
    age: profile.age,
    address1: profile.address1,
    address2: profile.address2,
    city: profile.city,
    province: profile.province,
    postalCode: profile.postalCode,
    location: profile.location,
    allergies: profile.allergies,
    currentMedications: profile.currentMedications,
    emergencyContactName: profile.emergencyContactName,
    emergencyContactPhone: profile.emergencyContactPhone,
    medicalConditions: profile.medicalConditions,
  };
}

/**
 * Checks the onboarding status for a user
 */
export async function checkOnboardingStatus(
  ctx: QueryCtx,
  userId: Id<"users">
) {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("byUserId", (q) => q.eq("userId", userId))
    .unique();

  return {
    isCompleted: profile?.onboardingCompleted ?? false,
    profile: profile ?? null,
  };
}
