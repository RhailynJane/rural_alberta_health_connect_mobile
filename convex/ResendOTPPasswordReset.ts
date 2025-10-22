import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";

export const ResendOTPPasswordReset = Resend({
  id: "resend-otp-reset",
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
    // Generate a random 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "Alberta Health Connect <rhailynjane.cona@edu.sait.ca>",
      to: [email],
      subject: `Reset your password - Alberta Health Connect`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2A7DE1;">Password Reset Request</h2>
          <p>You requested to reset your password for Alberta Health Connect.</p>
          <p>Your password reset code is:</p>
          <div style="background-color: #f0f8ff; border: 2px solid #2A7DE1; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #2A7DE1; letter-spacing: 4px;">${token}</span>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
          <p style="color: #666; font-size: 12px;">Alberta Health Connect</p>
        </div>
      `,
      text: `Your password reset code is ${token}. This code will expire in 10 minutes. If you didn't request this password reset, please ignore this email.`,
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      throw new Error("Could not send password reset email");
    }
  },
});
