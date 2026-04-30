// utils/sendEmail.js
import sgMail from "@sendgrid/mail";


export const sendEmail = async (to, subject, html) => {
  try {
    console.log("📩 Sending email to:", to);

    if (!process.env.SENDGRID_API_KEY) {
      console.error("❌ SENDGRID_API_KEY missing");
      return;
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to,
      from: "djproject963@gmail.com",
      subject,
      html,
    };

    const response = await sgMail.send(msg);

    console.log("✅ Email sent:", response[0].statusCode);

  } catch (error) {
    console.error("❌ Email error:", error);
    if (error.response) {
      console.error("❌ SendGrid BODY:", error.response.body);
    }
  }
};