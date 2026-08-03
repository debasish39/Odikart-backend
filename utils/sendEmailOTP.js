import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY_OTP);

const sendEmailOTP = async (to, otp) => {
  try {
    const response = await resend.emails.send({
      from: "Odikart <noreply@odikart.in>",

      to,

      subject: "Your OTP Code",

      html: ` <div style=" margin:0; padding:0; background:#f4f7fb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; "> <div style=" max-width:500px; margin:40px auto; background:#ffffff; border-radius:18px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08); border:1px solid #e5e7eb; "> <!-- HEADER --> <div style=" background:linear-gradient(135deg,#6366f1,#4f46e5); padding:35px 25px; text-align:center; color:white; "> <div style=" width:70px; height:70px; margin:0 auto 15px; background:rgba(255,255,255,0.15); border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:32px; "> 🔐 </div> <h1 style=" margin:0; font-size:28px; font-weight:700; color:white; "> OTP Verification </h1> <p style=" margin-top:10px; font-size:14px; opacity:0.9; line-height:1.6; "> Use the verification code below to continue securely. </p> </div> <!-- BODY --> <div style=" padding:35px 30px; text-align:center; "> <p style=" margin:0; color:#6b7280; font-size:15px; line-height:1.7; "> Your One-Time Password (OTP) </p> <!-- OTP BOX --> <div style=" margin:30px auto; background:#eef2ff; border:2px dashed #6366f1; border-radius:14px; padding:20px; max-width:260px; "> <div style=" font-size:38px; font-weight:700; letter-spacing:10px; color:#4338ca; font-family:monospace; "> ${otp} </div> </div> <!-- VALIDITY --> <div style=" background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:14px; margin-top:20px; font-size:14px; color:#374151; "> ⏳ This OTP is valid for <b>5 minutes</b>. </div> <!-- SECURITY NOTE --> <p style=" margin-top:28px; font-size:13px; color:#9ca3af; line-height:1.7; "> For your security, do not share this OTP with anyone. Odikart will never ask for your code. </p> </div> <!-- FOOTER --> <div style=" background:#f9fafb; border-top:1px solid #e5e7eb; padding:18px; text-align:center; font-size:12px; color:#9ca3af; "> © ${new Date().getFullYear()} Odikart. All rights reserved. </div> </div> </div> `,
    });

    return response;
  } catch (error) {
    console.log(error);

    throw new Error("Failed to send email");
  }
};

export default sendEmailOTP;
