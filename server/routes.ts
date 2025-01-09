import type { Express } from "express";
import { createServer, type Server } from "http";
import {router as chatRouter} from './routes/chat';

export function registerRoutes(app: Express): Server {
  // Chat routes
  app.use('/api/chat', chatRouter);
  app.use('/api', chatRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}
