import Resend from "@auth/core/providers/resend";

// Brevo (formerly Sendinblue) API integration for password reset emails
export const BrevoOTPPasswordReset = Resend({
  id: "brevo-otp-reset",
  apiKey: process.env.AUTH_BREVO_KEY,
  async generateVerificationToken() {
    // Generate a random 6-digit code
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    // Brevo API endpoint
    const brevoApiUrl = "https://api.brevo.com/v3/smtp/email";
    
    const emailPayload = {
      sender: {
        name: "Alberta Health Connect",
        email: "ruralalbertahealthconnect@gmail.com", 
      },
      to: [
        {
          email: email,
        },
      ],
      subject: "Reset your password - Alberta Health Connect",
      htmlContent: `
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
      textContent: `Your password reset code is ${token}. This code will expire in 10 minutes. If you didn't request this password reset, please ignore this email.`,
    };

    try {
      const response = await fetch(brevoApiUrl, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": provider.apiKey!,
          "content-type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to send password reset email via Brevo:", errorData);
        throw new Error("Could not send password reset email");
      }

      const result = await response.json();
      console.log("✅ Password reset email sent successfully via Brevo:", result.messageId);
    } catch (error) {
      console.error("❌ Failed to send password reset email via Brevo:", error);
      throw new Error("Could not send password reset email");
    }
  },
});
