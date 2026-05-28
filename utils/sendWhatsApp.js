import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();
const client = twilio(

  process.env.TWILIO_ACCOUNT_SID,

  process.env.TWILIO_AUTH_TOKEN

);
console.log("Twilio Client Initialized:", process.env.TWILIO_ACCOUNT_SID);
console.log("WhatsApp Number:", process.env.TWILIO_WHATSAPP_NUMBER);
console.log("Twilio Client Initialized:", process.env.TWILIO_AUTH_TOKEN);

/* =====================================
   SEND WHATSAPP MESSAGE
===================================== */

export const sendWhatsApp = async (

  phone,

  message

) => {

  try {

    await client.messages.create({

      body: message,

      from:
        process.env.TWILIO_WHATSAPP_NUMBER,

      to:
        `whatsapp:+91${phone}`,

    });

    console.log(
      "WhatsApp Message Sent"
    );

  } catch (error) {

    console.error(
      "WhatsApp Error:",
      error.message
    );

  }

};