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
    date: v.string(),
    timestamp: v.number(),
    symptoms: v.string(),
    severity: v.number(),
    category: v.optional(v.string()),
    duration: v.optional(v.string()),
    aiContext: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    createdBy: v.string(),
    type: v.optional(v.string()),
  })
    .index("byUserId", ["userId"])
    .index("byDate", ["date"])
    .index("byTimestamp", ["timestamp"])
    .index("by_user_date", ["userId", "date"]),

});