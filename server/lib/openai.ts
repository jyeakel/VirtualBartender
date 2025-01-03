import OpenAI from "openai";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";

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

IMPORTANT: Always respond in valid JSON format with this structure:
{
  "message": "your conversational response",
  "options": ["option1", "option2"],
  "drinkSuggestions": []
}`;

export async function startConversation(): Promise<ChatResponse> {
  try {
    console.log('Starting OpenAI conversation...');
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: "Hi, I'd like a drink recommendation" }
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    try {
      console.log('Parsing OpenAI response:', content);
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse OpenAI response as JSON:", content);
      return {
        message: "I'm having trouble understanding right now. Could you please try again?",
        options: ["Start Over", "Try Different Approach"]
      };
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

export async function generateResponse(
  messages: ChatCompletionMessageParam[],
  context: {
    weather?: string;
    time?: string;
    location?: string;
  }
): Promise<ChatResponse> {
  const contextPrompt = `Current context: ${context.time || 'unknown time'}, Weather: ${context.weather || 'unknown weather'}, Location: ${context.location || 'unknown location'}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: contextPrompt },
        ...messages
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }

    try {
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse OpenAI response as JSON:", content);
      return {
        message: "I'm having trouble processing that. Could you please rephrase or try again?",
        options: ["Start Over", "Try Different Approach"]
      };
    }
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}