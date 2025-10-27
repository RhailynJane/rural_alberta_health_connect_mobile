/**
 * Example integrations for creating notifications across the app
 * 
 * These are example mutations that show how to integrate notifications
 * into various features like appointments, reminders, journaling, etc.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { createAndPushNotification } from "./notifications";

/**
 * Example: Create a health entry and notify user
 */
export const createHealthEntryWithNotification = mutation({
  args: {
    date: v.string(),
    symptoms: v.string(),
    severity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Create health entry
    const entryId = await ctx.db.insert("healthEntries", {
      userId,
      date: args.date,
      timestamp: Date.now(),
      symptoms: args.symptoms,
      severity: args.severity,
      notes: args.notes,
      createdBy: "user",
      category: "symptoms",
    });

    // Send notification
    await createAndPushNotification(ctx, {
      userId,
      title: "Health entry saved",
      body: "Your symptoms have been recorded successfully.",
      type: "health_entry",
      data: { entryId },
      sendPush: false, // Don't push for user-initiated actions
    });

    return entryId;
  },
});

/**
 * Example: Reminder notification (scheduled from backend job)
 */
export const sendReminderNotification = mutation({
  args: {
    userId: v.id("users"),
    reminderType: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await createAndPushNotification(ctx, {
      userId: args.userId,
      title: `${args.reminderType} Reminder`,
      body: args.message,
      type: "reminder",
      data: { reminderType: args.reminderType },
      sendPush: true, // Do push for scheduled reminders
    });
  },
});

/**
 * Example: Appointment notification
 */
export const sendAppointmentNotification = mutation({
  args: {
    userId: v.id("users"),
    appointmentDate: v.string(),
    appointmentTime: v.string(),
    clinicName: v.string(),
  },
  handler: async (ctx, args) => {
    await createAndPushNotification(ctx, {
      userId: args.userId,
      title: "Appointment Reminder",
      body: `Your appointment at ${args.clinicName} is scheduled for ${args.appointmentDate} at ${args.appointmentTime}`,
      type: "appointment",
      data: {
        date: args.appointmentDate,
        time: args.appointmentTime,
        clinic: args.clinicName,
      },
      sendPush: true,
    });
  },
});

/**
 * Example: Assessment completion notification
 */
export const sendAssessmentCompletionNotification = mutation({
  args: {
    userId: v.id("users"),
    assessmentType: v.string(),
    score: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scoreText = args.score ? ` Your score: ${args.score}` : "";
    
    await createAndPushNotification(ctx, {
      userId: args.userId,
      title: "Assessment Completed",
      body: `You've completed your ${args.assessmentType} assessment.${scoreText}`,
      type: "assessment",
      data: {
        assessmentType: args.assessmentType,
        score: args.score,
      },
      sendPush: false, // User just completed it, no need to push
    });
  },
});

/**
 * Example: Journal entry reminder
 */
export const sendJournalReminderNotification = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await createAndPushNotification(ctx, {
      userId: args.userId,
      title: "Time to Journal",
      body: "Take a moment to record your thoughts and feelings today.",
      type: "journal_reminder",
      data: {},
      sendPush: true,
    });
  },
});

/**
 * Example: Medication reminder
 */
export const sendMedicationReminderNotification = mutation({
  args: {
    userId: v.id("users"),
    medicationName: v.string(),
    dosage: v.string(),
  },
  handler: async (ctx, args) => {
    await createAndPushNotification(ctx, {
      userId: args.userId,
      title: "Medication Reminder",
      body: `Time to take ${args.medicationName} (${args.dosage})`,
      type: "medication",
      data: {
        medication: args.medicationName,
        dosage: args.dosage,
      },
      sendPush: true,
    });
  },
});
