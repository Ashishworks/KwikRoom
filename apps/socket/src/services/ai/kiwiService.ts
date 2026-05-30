import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini client using the environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Using the specific model you requested
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

export const generateKiwiResponse = async (prompt: string): Promise<string> => {
  try {
    // Strip the "@kiwi" tag out so the AI just reads the actual question
    const cleanPrompt = prompt.replace(/@kiwi/gi, "").trim();
    
    // Add a small system instruction context so Kiwi knows its identity
    const contextualPrompt = `You are Kiwi, a helpful, concise, and friendly AI assistant inside a real-time chat app called KwikRoom. Keep your answers brief and readable. Here is the user's prompt: ${cleanPrompt}`;

    const result = await model.generateContent(contextualPrompt);
    return result.response.text();
    
  } catch (error) {
    console.error("Kiwi AI Error:", error);
    return "Beep boop... My circuits are a little fried right now. Please try again later! 🥝";
  }
};