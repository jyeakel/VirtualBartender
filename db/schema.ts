import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Drinks table
export const drinks = pgTable("drinks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  instructions: text("instructions").notNull(),
  imageUrl: text("image_url"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ingredients table
export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  isCommon: boolean("is_common").default(false),
});

// DrinkIngredients junction table
export const drinkIngredients = pgTable("drink_ingredients", {
  id: serial("id").primaryKey(),
  drinkId: integer("drink_id")
    .notNull()
    .references(() => drinks.id),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id),
  amount: text("amount").notNull(),
  unit: text("unit").notNull(),
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
}));

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  drinks: many(drinkIngredients),
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
export const insertIngredientSchema = createInsertSchema(ingredients);
export const selectIngredientSchema = createSelectSchema(ingredients);
export const insertChatSessionSchema = createInsertSchema(chatSessions);
export const selectChatSessionSchema = createSelectSchema(chatSessions);

// Export types
export type InsertDrink = typeof drinks.$inferInsert;
export type SelectDrink = typeof drinks.$inferSelect;
export type InsertIngredient = typeof ingredients.$inferInsert;
export type SelectIngredient = typeof ingredients.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;
export type SelectChatSession = typeof chatSessions.$inferSelect;