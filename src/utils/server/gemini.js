import OpenAI from "openai";

const ai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const MODEL = "llama-3.1-8b-instant";

export async function generateWithGemini(prompt) {
  try {
    const response = await ai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = response?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("Empty response from Groq");
    }

    return { success: true, text };
  } catch (error) {


    if (
      error?.status === 429 ||
      error?.message?.toLowerCase().includes("rate") ||
      error?.message?.toLowerCase().includes("quota")
    ) {
      return {
        success: false,
        quota_exhausted: true,
        message: "AI summary quota exhausted. Please try again later.",
      };
    }

    return {
      success: false,
      quota_exhausted: false,
      message: "AI summary generation failed. Please try again later.",
    };
  }
}
