import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { drinks, sessions } from "@db/schema";
import { generateChatResponse } from "../client/src/lib/openai";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Chat endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, sessionId } = req.body;
      
      let session = await db.query.sessions.findFirst({
        where: eq(sessions.sessionId, sessionId)
      });

      if (!session && message === "start") {
        session = await db.insert(sessions).values({
          sessionId: Math.random().toString(36).slice(2),
          createdAt: new Date().toISOString(),
        }).returning();
      }

      const chatResponse = await generateChatResponse(
        [{ role: "user", content: message }],
        {
          weather: session?.location?.weather,
          preferences: session?.preferences,
          recommendations: session?.recommendations,
        }
      );

      res.json(chatResponse);
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Weather endpoint
  app.get("/api/weather/:zipCode", async (req, res) => {
    try {
      const { zipCode } = req.params;
      // In a real implementation, this would call a weather API
      // For now, return mock data
      res.json({
        temperature: 72,
        condition: "sunny",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  // Drinks endpoints
  app.get("/api/drinks", async (req, res) => {
    try {
      const allDrinks = await db.select().from(drinks);
      res.json(allDrinks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch drinks" });
    }
  });

  app.get("/api/drinks/:id", async (req, res) => {
    try {
      const drink = await db.query.drinks.findFirst({
        where: eq(drinks.id, parseInt(req.params.id))
      });
      if (!drink) return res.status(404).json({ error: "Drink not found" });
      res.json(drink);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch drink" });
    }
  });

  return httpServer;
}
