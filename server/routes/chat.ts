import { Router } from 'express';
import { startConversation, generateResponse } from '../lib/openai';
import { db } from '@db';
import { chatSessions } from '@db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/start', async (req, res) => {
  try {
    const sessionId = uuidv4();

    // Start chat session
    const response = await startConversation();

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
      options: response.options
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

    // Generate response
    const context = {
      time: new Date().toLocaleTimeString()
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