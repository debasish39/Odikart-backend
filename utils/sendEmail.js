
// utils/sendEmail.js
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY_EMAIL);

export const sendEmail = async (to, subject, html) => {
  try {
    // console.log("📩 Sending email to:", to);

    if (!process.env.RESEND_API_KEY_EMAIL) {
      // console.error("❌ RESEND_API_KEY missing");
      return;
    }

    const { data, error } = await resend.emails.send({
      from: "Odikart <noreply@odikart.in>",
      to,
      subject,
      html,
    });

    if (error) {
      // console.error("❌ Resend Error:", error);
      return;
    }

    // console.log("✅ Email sent:", data);

  } catch (error) {
    console.error("❌ Email error:", error.message);
  }
};

