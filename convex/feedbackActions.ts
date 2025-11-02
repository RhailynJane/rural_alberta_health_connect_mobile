import { v } from "convex/values";
import { action } from "./_generated/server";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_API_KEY = process.env.AUTH_BREVO_KEY;

export const sendFeedbackEmail = action({
  args: {
    userEmail: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const emailPayload = {
      sender: {
        name: "RAHC App Feedback",
        email: "ruralalbertahealthconnect@gmail.com",
      },
      to: [
        { email: "ruralalbertahealthconnect@gmail.com" },
      ],
      subject: `RAHC App Feedback from ${args.userEmail}`,
      htmlContent: `<div style='font-family: Arial, sans-serif;'><h2>Feedback from ${args.userEmail}</h2><p>${args.message.replace(/\n/g, '<br/>')}</p></div>`,
      textContent: `Feedback from ${args.userEmail}\n${args.message}`,
    };
    try {
      const response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": BREVO_API_KEY ?? "",
          "content-type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to send feedback via Brevo:", errorData);
        throw new Error("Could not send feedback email");
      }
      const result = await response.json();
      console.log("✅ Feedback email sent via Brevo:", result.messageId);
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to send feedback via Brevo:", error);
      throw new Error("Could not send feedback email");
    }
  },
});

export const reportIssueEmail = action({
  args: {
    userEmail: v.string(),
    title: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const emailPayload = {
      sender: {
        name: "RAHC App Issue Report",
        email: "ruralalbertahealthconnect@gmail.com",
      },
      to: [
        { email: "ruralalbertahealthconnect@gmail.com" },
      ],
      subject: `RAHC Issue Report: ${args.title} (${args.userEmail})`,
      htmlContent: `<div style='font-family: Arial, sans-serif;'><h2>Issue Report from ${args.userEmail}</h2><h3>${args.title}</h3><p>${args.description.replace(/\n/g, '<br/>')}</p></div>`,
      textContent: `Issue Report from ${args.userEmail}\nTitle: ${args.title}\n${args.description}`,
    };
    try {
      const response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": BREVO_API_KEY ?? "",
          "content-type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to send issue report via Brevo:", errorData);
        throw new Error("Could not send issue report email");
      }
      const result = await response.json();
      console.log("✅ Issue report email sent via Brevo:", result.messageId);
      return { success: true };
    } catch (error) {
      console.error("❌ Failed to send issue report via Brevo:", error);
      throw new Error("Could not send issue report email");
    }
  },
});
