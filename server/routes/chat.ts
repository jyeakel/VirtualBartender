import { Router } from 'express';
import { startConversation, generateResponse } from '../lib/openai';
import { getWeather, getLocationFromIP } from '../lib/weather';
import { db } from '@db';
import { chatSessions } from '@db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/start', async (req, res) => {
  try {
    console.log('Starting new chat session...');
    const sessionId = uuidv4();

    // Start chat session
    const response = await startConversation();
    console.log('OpenAI response:', response);

    // Store session
    await db.insert(chatSessions).values({
      sessionId,
      createdAt: new Date(),
      location: null,
      weather: null
    });

    res.json({
      sessionId,
      message: response.message,
      options: [
        "Let me know what you have on hand",
        "What cocktail should I make?",
        "What's your favorite cocktail?",
        "I'm in the mood for something refreshing"
      ]
    });
  } catch (error) {
    console.error('Error starting chat:', error);
    res.status(500).json({ message: 'Failed to start chat session' });
  }
});

router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ message: 'Session ID and message are required' });
    }

    // Get session context
    const session = await db.query.chatSessions.findFirst({
      where: eq(chatSessions.sessionId, sessionId)
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Get weather and location data
    const clientIp = req.ip || req.socket.remoteAddress || '';
    // TESTING ONLY - MUST REMOVE
    //const clientIp = '67.245.228.183'
    const location = await getLocationFromIP(clientIp);
    let weatherInfo = '';
    
    if (location) {
      weatherInfo = await getWeather(location.lat, location.lon); // Using city as latitude since that's what our current implementation returns
    }

    // Generate response
    const context = {
      time: new Date().toLocaleTimeString(),
      weather: weatherInfo,
      location: location ? `${location.city}, ${location.regionname}` : undefined
    };

    const response = await generateResponse([
      { role: 'user', content: message }
    ], context);

    // Update session if drinks were recommended
    if (response.drinkSuggestions?.length) {
      const firstDrink = response.drinkSuggestions[0];
      await db.update(chatSessions)
        .set({ selectedDrinkId: firstDrink.id })
        .where(eq(chatSessions.sessionId, sessionId));
    }

    res.json(response);
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ message: 'Failed to process message' });
  }
});

export default router;