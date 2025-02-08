import { Router } from 'express';
import { ChatOpenAI } from "@langchain/openai";
import { startConversation, config, graph} from '../lib/openai';
import { Command} from "@langchain/langgraph";
import { getWeather, getLocationFromIP, CustomLocation } from '../lib/weather';
import { db } from '@db';
import { chatSessions, ingredients } from '@db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export const router = Router();

/**
 * 1) /start
 *  - Initiates a new chat session
 *  - Gets user location info
 *  - Loads chain state from openai.ts
 *  - Appends user message, invokes chain once
 *  - Returns the assistant's new response
 */
router.post('/start', async (req, res) => {
  try {
    // Delete any existing sessions and reset all state
    await db.delete(chatSessions).where(sql`true`);

    // Reset the graph state before starting new conversation
    config.state = undefined;

    console.log('Starting new chat session...');
    const sessionId = uuidv4();

    // get user location + weather
    const clientIp = req.ip || req.socket.remoteAddress || '';
    console.log(clientIp)
    const locationInfo: CustomLocation | null = await getLocationFromIP(clientIp);
    let weatherInfo = '';
    if (locationInfo) {
      weatherInfo = await getWeather(locationInfo.lat, locationInfo.lon);
    }

    console.log(`Location Info: ${locationInfo}`)
    console.log(`Weather Info: ${weatherInfo}`)

    // Store session in DB
    await db.insert(chatSessions).values({
      sessionId,
      createdAt: new Date(),
      location: locationInfo,      // or JSON.stringify(location)
      weather: weatherInfo
    });

    // Start the conversation in openai.ts
    const response = await startConversation(sessionId, weatherInfo, locationInfo);

    // Send initial welcome message with options
    res.json({
      sessionId,
      message: response.messages[response.messages.length - 1].content,
      options: (response.messages[response.messages.length - 1] as any).options || []
    });
  } catch (error) {
    console.error('Error starting chat:', error);
    res.status(500).json({ message: 'Failed to start chat session' });
  }
});

/**
 * 2) /message
 *  - Receives user input + sessionId
 *  - Loads chain state from openai.ts
 *  - Appends user message, invokes chain once
 *  - Returns the assistant's new response
 */
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ message: 'Session ID and message are required' });
    }

    // Confirm the session exists in DB (just for your own tracking)
    const session = await db.query.chatSessions.findFirst({
      where: eq(chatSessions.sessionId, sessionId)
    });
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Create command to continue graph
    const command = new Command({
      resume: new HumanMessage(message)
    });
    const response = await graph.invoke(command, config);

    const lastMessage = response.messages[response.messages.length - 1];
    // Ensure drink suggestions maintain their full context
    // Define interface and ensure it matches the data structure
    interface DrinkRecommendation {
      id: number;
      name: string;
      description: string;
      reference: string | null;
      moods: string[];
      preferences: string[];
      reasoning?: string;
    }

    const drinkSuggestions = (response.drinkSuggestions as DrinkRecommendation[])?.map(drink => {
      console.log('Drink data from database:', drink);
      return {
        id: Number(drink.id),
        name: drink.name,
        description: drink.description,
        reference: drink.reference || null,
        moods: drink.moods,
        preferences: drink.preferences,
        reasoning: drink.reasoning || ''
      };
    }) || [];

    res.json({
      message: lastMessage.content,
      options: (lastMessage as any).options || [],
      drinkSuggestions
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ message: 'Failed to process message' });
  }
});
router.get('/ingredients', async (req, res) => {
  try {
    const query = req.query.search as string || '';

    const sqlQuery = query ? 
      sql`LOWER(name) LIKE LOWER(${'%' + query + '%'})` : 
      undefined;

    const ingredients = await db.query.ingredients.findMany({
      where: sqlQuery,
      limit: 50
    });

    res.json(ingredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    res.status(500).json({ message: 'Failed to fetch ingredients' });
  }
});

router.post('/drinks/rationale', async (req, res) => {
  try {
    const { name, ingredients, tags, moods = [], preferences = [] } = req.body;

    if (!moods.length || !preferences.length) {
      return res.status(400).json({ 
        rationale: "I need more information about your preferences to provide a personalized recommendation." 
      });
    }

    const prompt = `You are a knowledgeable bartender providing a personalized drink recommendation.

    THE DRINK:
    Name: ${name}
    Ingredients: ${ingredients}
    Characteristics/Tags: ${tags}

    THE PATRON:
    Current Mood/Vibe: ${moods?.join(', ')}
    Drink Preferences: ${preferences?.join(', ')}

    Based on the SPECIFIC details above, explain why this exact drink is perfect for this patron. This should be three sentences max.
    Reference their stated moods and preferences, and connect them to the drink's specific ingredients and characteristics.
    Keep it natural and conversational, but make sure to highlight the direct connections between their preferences and the drink's qualities.`;

    const model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.7
    });

    const response = await model.invoke([new SystemMessage(prompt)]);

    res.json({ rationale: response.content });
  } catch (error) {
    console.error('Error generating drink rationale:', error);
    res.status(500).json({ message: 'Failed to generate drink rationale' });
  }
});