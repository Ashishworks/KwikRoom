import { GoogleGenerativeAI } from "@google/generative-ai"

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("CRITICAL: GEMINI_API_KEY is missing from apps/socket/.env!");
}

const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" })

// 👉 NEW: In-memory store for the last Kiwi reply per room
// Key = roomCode, Value = last response string
const kiwiMemory = new Map<string, string>();

// 👉 FIX: Added roomCode as a required parameter
export const generateKiwiResponse = async (prompt: string, roomCode: string): Promise<string> => {
  try {
    const cleanPrompt = prompt.replace(/@kiwi/gi, "").trim()
    
    // 👉 NEW: Retrieve the last reply for this specific room
    const lastReply = kiwiMemory.get(roomCode);

    // Build the base instruction
    let contextualPrompt = `You are Kiwi, a helpful, concise, and friendly AI assistant inside a real-time chat app called KwikRoom. Keep your answers brief, fun, and readable. Never use markdown formatting like ** or #.\n\n`
    
    // 👉 NEW: Inject the previous context if it exists
    if (lastReply) {
        contextualPrompt += `Here is what you just said previously: "${lastReply}"\n\n`
    }

    // Add the current user's prompt
    contextualPrompt += `Now, answer this new user prompt: "${cleanPrompt}"`

    // Fetch the response
    const result = await model.generateContent(contextualPrompt)
    const responseText = result.response.text()

    // 👉 NEW: Save this new response as the "last reply" for next time
    kiwiMemory.set(roomCode, responseText)

    return responseText
    
  } catch (error) {
    console.error("Kiwi AI Error:", error)
    return "Beep boop... My circuits are a little fried right now. Please try again later! 🥝"
  }
}