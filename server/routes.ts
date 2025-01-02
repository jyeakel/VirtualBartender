import type { Express } from "express";
import { createServer, type Server } from "http";
import chatRouter from './routes/chat';

export function registerRoutes(app: Express): Server {
  // Chat routes
  app.use('/api/chat', chatRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}
