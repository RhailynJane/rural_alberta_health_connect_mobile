import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// --- Reusable Type Validators ---
// This is a best practice for consistency and maintainability.

/**
 * Defines the main categories of injuries for the 'type' field.
 */
export const injuryType = v.union(
  v.literal("trauma"), // For cuts, bruises, abrasions
  v.literal("burn"),
  v.literal("frostbite")
);

/**
 * Defines the possible statuses for a trauma-type injury.
 */
export const traumaStatus = v.union(
  v.literal("active"),
  v.literal("healing"),
  v.literal("closed"),
  v.literal("infected")
);

/**
 * Defines the possible statuses/stages for a frostbite-type injury.
 */
export const frostbiteStatus = v.union(
  v.literal("frostnip"),
  v.literal("superficial"),
  v.literal("deep"),
  v.literal("resolved")
);

/**
 * Defines the possible statuses for a single triage background job.
 */
export const triageStatus = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed")
);

export default defineSchema({
  ...authTables,
  users: defineTable({
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    hasCompletedOnboarding: v.optional(v.boolean()),
  }).index("email", ["email"]),

  userProfiles: defineTable({
    userId: v.id("users"),
    ageRange: v.optional(v.string()),
    location: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    currentMedications: v.optional(v.string()),
    allergies: v.optional(v.string()),
    locationServicesEnabled: v.optional(v.boolean()),
    onboardingCompleted: v.boolean(), // this is lagacy code.
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("byUserId", ["userId"]),

  /**
   * PARENT TABLE: Stores universal information common to ALL injuries.
   */
  injuries: defineTable({
    userId: v.id("users"),
    name: v.string(), // e.g., "Cut on left hand"
    bodyPart: v.string(), // e.g., "Left Forearm"
    type: injuryType, // This field determines which child table holds specific details.
  }).index("by_userId", ["userId"]),

  /**
   * CHILD TABLE: Stores specific details ONLY for trauma-type injuries.
   */
  traumas: defineTable({
    injuryId: v.id("injuries"), // The required link back to the parent injury record.
    status: traumaStatus, // Uses the specific status validator for traumas.
  }).index("by_injuryId", ["injuryId"]),

  /**
   * CHILD TABLE: Stores specific details ONLY for frostbite-type injuries.
   */
  frostbites: defineTable({
    injuryId: v.id("injuries"), // The required link back to the parent injury record.
    status: frostbiteStatus, // Uses the specific status validator for frostbite.
  }).index("by_injuryId", ["injuryId"]),

  /**
   * EVENT LOG TABLE: A historical record of every check-up ("triage") for an injury.
   */
  triages: defineTable({
    injuryId: v.id("injuries"), // Links each check-up event to the parent injury.
    userId: v.id("users"),
    status: triageStatus, // The status of the background analysis job itself.
    imageUrl: v.optional(v.string()),
    analysisResult: v.optional(v.any()),
    userDescription: v.optional(v.string()),
    woundLengthCm: v.optional(v.number()),
    woundWidthCm: v.optional(v.number()),
  })
    // Indexes for efficient querying
    .index("by_injuryId", ["injuryId"])
    .index("by_userId", ["userId"]),
});
