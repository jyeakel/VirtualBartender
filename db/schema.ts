import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  jsonb,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

// Drinks table
export const drinks = pgTable("drinks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  recipeUrl: text("recipe_url"),
  reference: text("reference"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tags table
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ingredients table
export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Junction table for drinks and ingredients
export const drinkIngredients = pgTable("drink_ingredients", {
  drinkId: integer("drink_id")
    .notNull()
    .references(() => drinks.id),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id),
}, (t) => ({
  pk: primaryKey(t.drinkId, t.ingredientId),
}));

// Junction table for drinks and tags
export const drinkTags = pgTable("drink_tags", {
  drinkId: integer("drink_id")
    .notNull()
    .references(() => drinks.id),
  tagId: integer("tag_id")
    .notNull()
    .references(() => tags.id),
}, (t) => ({
  pk: primaryKey(t.drinkId, t.tagId),
}));

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

export const tagsRelations = relations(tags, ({ many }) => ({
  drinks: many(drinkTags),
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
export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);
export const insertIngredientSchema = createInsertSchema(ingredients);
export const selectIngredientSchema = createSelectSchema(ingredients);
export const insertChatSessionSchema = createInsertSchema(chatSessions);
export const selectChatSessionSchema = createSelectSchema(chatSessions);

// Export types
export type InsertDrink = typeof drinks.$inferInsert;
export type SelectDrink = typeof drinks.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;
export type SelectTag = typeof tags.$inferSelect;
export type InsertIngredient = typeof ingredients.$inferInsert;
export type SelectIngredient = typeof ingredients.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;
export type SelectChatSession = typeof chatSessions.$inferSelect;