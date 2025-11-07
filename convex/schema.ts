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
    age: v.optional(v.string()),
    ageRange: v.optional(v.string()), // Deprecated: kept for backward compatibility
    address1: v.optional(v.string()),
    address2: v.optional(v.string()),
    city: v.optional(v.string()),
    province: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    location: v.optional(v.string()),
    emergencyContactName: v.optional(v.string()),
    emergencyContactPhone: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    currentMedications: v.optional(v.string()),
    allergies: v.optional(v.string()),
    locationServicesEnabled: v.optional(v.boolean()), 
    // Symptom assessment reminder settings (legacy single reminder)
    symptomReminderEnabled: v.optional(v.boolean()),
    symptomReminderFrequency: v.optional(v.string()), // e.g., "daily" | "weekly"
    symptomReminderTime: v.optional(v.string()), // HH:mm (24h)
    symptomReminderDayOfWeek: v.optional(v.string()), // e.g., Mon, Tue, ... if weekly
    // Multiple reminders support (stored as JSON string array)
    reminders: v.optional(v.string()), // JSON array of ReminderItem[]
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
    type: v.optional(v.string()), // todo: update to union, do not if broke things
    // Soft delete and edit tracking
    isDeleted: v.optional(v.boolean()),
    lastEditedAt: v.optional(v.number()),
    editCount: v.optional(v.number()),

  })
    .index("byUserId", ["userId"])
    .index("byDate", ["date"])
    .index("byTimestamp", ["timestamp"])
    .index("by_user_date", ["userId", "date"]),

  passwordResetCodes: defineTable({
    userId: v.id("users"),
    email: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    used: v.boolean(),
  })
    .index("by_email", ["email"])
    .index("by_email_code", ["email", "code"])
    .index("by_expiry", ["expiresAt"]),

  // Notifications table
  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    type: v.string(), // "reminder", "appointment", "assessment", "journal", etc.
    read: v.boolean(),
    data: v.optional(v.any()), // Additional metadata
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"])
    .index("by_user_created", ["userId", "createdAt"]),

  // Push tokens for push notifications
  pushTokens: defineTable({
    userId: v.id("users"),
    token: v.string(),
    platform: v.string(), // "ios", "android", "web"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),

});