import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ChatResponse {
  message: string;
  options?: string[];
  drinkSuggestions?: {
    id: number;
    name: string;
    description: string;
    reasoning: string;
  }[];
}

const SYSTEM_PROMPT = `You are a friendly and knowledgeable virtual bartender who helps users find the perfect drink based on their preferences and current context. Your responses should be conversational and engaging, while gathering necessary information to make personalized recommendations.

Key behaviors:
1. Start with a warm greeting and light bartender-style small talk
2. Gather information about preferences through natural conversation
3. Consider weather, time of day, and mood when making recommendations
4. Provide options for users to select when gathering information
5. Make personalized drink recommendations with reasoning

Respond in JSON format with:
{
  "message": "your conversational response",
  "options": ["option1", "option2"] // optional selection choices
  "drinkSuggestions": [] // drink recommendations when ready
}`;

export async function startConversation(): Promise<ChatResponse> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: "Hi, I'd like a drink recommendation" }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

export async function generateResponse(
  messages: { role: string; content: string }[],
  context: {
    weather?: string;
    time?: string;
    location?: string;
  }
): Promise<ChatResponse> {
  const contextPrompt = `Current context: ${context.time || ''}, Weather: ${context.weather || ''}, Location: ${context.location || ''}`;
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: contextPrompt },
      ...messages
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}
