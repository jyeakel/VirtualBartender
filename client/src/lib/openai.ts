import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateChatResponse(
  messages: { role: string; content: string }[],
  context: {
    weather?: string;
    preferences?: any;
    recommendations?: any[];
  }
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a friendly and knowledgeable virtual bartender. You help users discover drink recommendations based on their preferences, mood, and current weather conditions. Maintain a casual, friendly tone while being professional.

Current context:
Weather: ${context.weather || 'unknown'}
User preferences: ${JSON.stringify(context.preferences || {})}
${context.recommendations ? `Current recommendations: ${JSON.stringify(context.recommendations)}` : ''}`,
        },
        ...messages,
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate response");
  }
}
