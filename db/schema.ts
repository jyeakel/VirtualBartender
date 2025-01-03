import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Drinks table
export const drinks = pgTable("drinks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  recipeUrl: text("recipe_url"), // External recipe URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Ingredients table
export const Ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  drinkId: integer("drink_id")
    .notNull()
    .references(() => drinks.id),
  name: text("name").notNull(),
});

// Tags table
export const Tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  tagId: integer("drink_id")
    .notNull()
    .references(() => drinks.id),
  name: text("name").notNull(),
});

// Chat sessions table
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  preferences: jsonb("preferences"),
  selectedDrinkId: integer("selected_drink_id").references(() => drinks.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  location: jsonb("location"),
  weather: jsonb("weather"),
});

// Define relations
export const drinksRelations = relations(drinks, ({ many }) => ({
  ingredients: many(drinkIngredients),
  tags: many(drinkTags),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one }) => ({
  selectedDrink: one(drinks, {
    fields: [chatSessions.selectedDrinkId],
    references: [drinks.id],
  }),
}));

// Export schemas
export const insertDrinkSchema = createInsertSchema(drinks);
export const selectDrinkSchema = createSelectSchema(drinks);
export const insertChatSessionSchema = createInsertSchema(chatSessions);
export const selectChatSessionSchema = createSelectSchema(chatSessions);

// Export types
export type InsertDrink = typeof drinks.$inferInsert;
export type SelectDrink = typeof drinks.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;
export type SelectChatSession = typeof chatSessions.$inferSelect;
