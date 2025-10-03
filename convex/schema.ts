import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    onboardingCompleted: v.boolean(), 
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("byUserId", ["userId"]),

  healthEntries: defineTable({
  userId: v.id("users"),
  date: v.string(), // YYYY-MM-DD format
  timestamp: v.number(), // Unix timestamp for sorting
  symptoms: v.string(),
  severity: v.number(), // 1-10
  notes: v.optional(v.string()),
  category: v.optional(v.string()),
  duration: v.optional(v.string()),
  createdBy: v.string(), // "System AI" or username
  type: v.string(), // "ai_assessment" or "manual_entry"
  aiContext: v.optional(v.string()), // Store the full AI assessment context
  photos: v.optional(v.array(v.string())), // Store photo URIs if any
}).index("byUserId", ["userId"])
  .index("byDate", ["userId", "date"])
  .index("byTimestamp", ["userId", "timestamp"]),
});