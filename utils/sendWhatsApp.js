import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();
const client = twilio(

  process.env.TWILIO_ACCOUNT_SID,

  process.env.TWILIO_AUTH_TOKEN

);

/* =====================================
   SEND WHATSAPP
===================================== */

export const sendWhatsApp = async (

  phone,

  message

) => {

  try {

    /* =====================================
       CLEAN PHONE NUMBER
    ===================================== */

    const cleanPhone =

      String(phone)

        .replace(/\s+/g, "")

        .replace(/-/g, "")

        .trim();

    // console.log(
    //   "PHONE:",
    //   cleanPhone
    // );

    /* =====================================
       SEND MESSAGE
    ===================================== */

    const response =
      await client.messages.create({

        body: message,

        from:
          process.env.TWILIO_WHATSAPP_NUMBER,

        to:
          `whatsapp:${cleanPhone}`,

      });

    // console.log(

    //   "WhatsApp Sent:",

    //   response.sid

    // );

  } catch (error) {

    console.error(

      "WhatsApp Error:",

      error.message

    );

  }

};