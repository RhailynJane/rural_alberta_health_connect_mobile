import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";

// Store verification codes with expiration
const VERIFICATION_CODE_EXPIRY = 2 * 60 * 1000; // 2 minutes

/**
 * Generate a random 6-digit verification code
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send a password reset verification code to the user's email
 * In a real app, this would send an actual email
 */
export const sendPasswordResetCode = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    // Check if user exists
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      // For security, don't reveal if email exists
      // Return success but don't actually send anything
      console.log(`Password reset requested for non-existent email: ${email}`);
      return { success: true };
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = Date.now() + VERIFICATION_CODE_EXPIRY;

    // Store the verification code
    await ctx.db.insert("passwordResetCodes", {
      userId: user._id,
      email,
      code,
      expiresAt,
      used: false,
    });

    // TODO: In production, send actual email here
    // For now, log it to console (FOR DEVELOPMENT ONLY)
    console.log(`🔐 Password reset code for ${email}: ${code}`);
    console.log(`📧 Code expires in 2 minutes`);

    return { success: true };
  },
});

/**
 * Complete password reset with new password (ACTION - can use async operations)
 */
export const resetPasswordWithCode = action({
  args: {
    email: v.string(),
    code: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { email, code, newPassword }) => {
    try {
      // Verify the code first (using internal mutation)
      const verification = await ctx.runMutation(internal.passwordReset.verifyAndMarkCodeUsed, {
        email,
        code,
      });

      if (!verification.success) {
        throw new Error("INVALID_CODE");
      }

      // Delete the old password auth account
      await ctx.runMutation(internal.passwordReset.deleteOldAuthAccount, {
        userId: verification.userId,
      });

      // Create new auth account with Convex Auth's Password provider
      // This uses the same hashing mechanism as sign-up
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await ctx.runMutation(internal.passwordReset.createNewAuthAccount, {
        userId: verification.userId,
        email,
        hashedPassword,
      });

      console.log(`✅ Password successfully reset for ${email}`);

      return { 
        success: true,
        message: "Password has been reset successfully. You can now sign in with your new password."
      };
    } catch (error) {
      // Return generic error messages to hide internal details
      if (error instanceof Error) {
        if (error.message === "INVALID_CODE") {
          throw new Error("Invalid verification code. Please check and try again.");
        } else if (error.message === "CODE_EXPIRED") {
          throw new Error("Verification code has expired. Please request a new one.");
        } else if (error.message === "CODE_USED") {
          throw new Error("Verification code has already been used. Please request a new one.");
        }
      }
      throw new Error("Unable to reset password. Please try again.");
    }
  },
});

/**
 * Internal mutation to verify code and mark as used
 */
export const verifyAndMarkCodeUsed = internalMutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, { email, code }) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new Error("INVALID_CODE");
    }

    // Find valid verification code
    const resetCode = await ctx.db
      .query("passwordResetCodes")
      .withIndex("by_email_code", (q) => q.eq("email", email).eq("code", code))
      .first();

    if (!resetCode) {
      throw new Error("INVALID_CODE");
    }

    // Check if code is expired
    if (resetCode.expiresAt < Date.now()) {
      throw new Error("CODE_EXPIRED");
    }

    // Check if code has been used
    if (resetCode.used) {
      throw new Error("CODE_USED");
    }

    // Mark code as used
    await ctx.db.patch(resetCode._id, { used: true });

    return {
      success: true,
      userId: user._id,
    };
  },
});

/**
 * Internal mutation to delete old auth account
 */
export const deleteOldAuthAccount = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const oldAuthAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => 
        q.eq("userId", userId).eq("provider", "password")
      )
      .first();

    if (oldAuthAccount) {
      await ctx.db.delete(oldAuthAccount._id);
    }
  },
});

/**
 * Internal mutation to create new auth account
 */
export const createNewAuthAccount = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    hashedPassword: v.string(),
  },
  handler: async (ctx, { userId, email, hashedPassword }) => {
    await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: email,
      secret: hashedPassword,
    });
  },
});

/**
 * Get a verification code for testing (development only)
 */
export const getLatestResetCode = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const recentCode = await ctx.db
      .query("passwordResetCodes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .first();

    if (!recentCode || recentCode.used || recentCode.expiresAt < Date.now()) {
      return null;
    }

    return {
      code: recentCode.code,
      expiresAt: recentCode.expiresAt,
      timeRemaining: Math.max(0, Math.floor((recentCode.expiresAt - Date.now()) / 1000)),
    };
  },
});

/**
 * Clean up expired verification codes
 */
export const cleanupExpiredCodes = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expiredCodes = await ctx.db
      .query("passwordResetCodes")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const code of expiredCodes) {
      await ctx.db.delete(code._id);
    }

    return { deleted: expiredCodes.length };
  },
});
