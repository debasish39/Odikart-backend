
import { GoogleGenAI } from "@google/genai";

export const chatWithAI = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key is missing.",
      });
    }

    const { message } = req.body;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid message.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const interaction = await ai.interactions.create({
      model,
      input: message.trim(),
      system_instruction: `
        You are OdiKart's friendly shopping assistant.

        Help customers discover products available on OdiKart.

        Be friendly, concise and helpful.

        Never invent product names, prices, discounts,
        stock availability or delivery promises.

        If verified product information is unavailable,
        ask the customer to search the OdiKart catalogue.
      `,
    });

    return res.status(200).json({
      success: true,
      reply:
        interaction.output_text ||
        "Sorry, I couldn't generate a response.",
      interactionId: interaction.id,
    });

  } catch (error) {
    console.error(
      "OdiKart AI error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "AI assistant is temporarily unavailable.",
    });
  }
};
