import { Router } from 'express';
import { startConversation, config, graph} from '../lib/openai';
import { Command} from "@langchain/langgraph";
import { getWeather, getLocationFromIP, CustomLocation } from '../lib/weather';
import { db } from '@db';
import { chatSessions, ingredients } from '@db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { HumanMessage } from '@langchain/core/messages';

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
    console.log('Starting new chat session...');
    const sessionId = uuidv4();

    // get user location + weather
    // const clientIp = req.ip || req.socket.remoteAddress || '';
    const clientIp = '67.245.228.183' // Example IP
    const locationInfo: CustomLocation | null = await getLocationFromIP(clientIp);
    let weatherInfo = '';
    if (locationInfo) {
      weatherInfo = await getWeather(locationInfo.lat, locationInfo.lon);
    }

    // Store session in DB
    await db.insert(chatSessions).values({
      sessionId,
      createdAt: new Date(),
      location: locationInfo,      // or JSON.stringify(location)
      weather: weatherInfo
    });

    // Start the conversation in openai.ts
    const response = await startConversation(sessionId, weatherInfo, locationInfo);

    // Send initial welcome message
    res.json({
      sessionId,
      // Return the last message in the chain
      message: response.messages[response.messages.length - 1].content,
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
    res.json({
      message: lastMessage.content,
      options: (lastMessage as any).options || []
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