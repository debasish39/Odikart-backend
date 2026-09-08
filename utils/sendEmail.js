// utils/sendEmail.js

import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.RESEND_API_KEY_EMAIL;

if (!apiKey) {
  console.error("❌ RESEND_API_KEY_EMAIL is missing");
}

const resend = apiKey ? new Resend(apiKey) : null;

export const sendEmail = async (to, subject, html) => {
  try {
    if (!resend) {
      throw new Error("RESEND_API_KEY_EMAIL is not configured");
    }

    if (!to) {
      throw new Error("Recipient email is missing");
    }

    console.log("📩 Sending email...");
    console.log("   To:", to);
    console.log("   Subject:", subject);

    const { data, error } = await resend.emails.send({
      from: "Odikart <noreply@odikart.in>",
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("❌ Resend Error:", error);
      throw new Error(error.message || "Resend email failed");
    }

    console.log("✅ Email sent successfully");
    console.log("📨 Resend ID:", data?.id);

    return data;
  } catch (error) {
    console.error("❌ Email error:", error);
    throw error;
  }
};