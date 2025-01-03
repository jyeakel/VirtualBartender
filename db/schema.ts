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
  categoryId: integer("category_id").references(() => drinkCategories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Drink Categories table
export const drinkCategories = pgTable("drink_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Ingredients table
export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  description: text("description"),
  alcoholContent: integer("alcohol_content"),
  isCommon: boolean("is_common").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  isOptional: boolean("is_optional").default(false),
  notes: text("notes"),
});

// Drink Recipes table (for detailed preparation steps)
export const drinkRecipes = pgTable("drink_recipes", {
  id: serial("id").primaryKey(),
  drinkId: integer("drink_id")
    .notNull()
    .references(() => drinks.id),
  stepNumber: integer("step_number").notNull(),
  instruction: text("instruction").notNull(),
  duration: integer("duration"), // in seconds
  notes: text("notes"),
});

// Drink Ratings table
export const drinkRatings = pgTable("drink_ratings", {
  id: serial("id").primaryKey(),
  drinkId: integer("drink_id")
    .notNull()
    .references(() => drinks.id),
  sessionId: text("session_id")
    .notNull()
    .references(() => chatSessions.sessionId),
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const drinksRelations = relations(drinks, ({ one, many }) => ({
  category: one(drinkCategories, {
    fields: [drinks.categoryId],
    references: [drinkCategories.id],
  }),
  ingredients: many(drinkIngredients),
  recipes: many(drinkRecipes),
  ratings: many(drinkRatings),
}));

export const drinkCategoriesRelations = relations(drinkCategories, ({ many }) => ({
  drinks: many(drinks),
}));

export const ingredientsRelations = relations(ingredients, ({ many }) => ({
  drinks: many(drinkIngredients),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  selectedDrink: one(drinks, {
    fields: [chatSessions.selectedDrinkId],
    references: [drinks.id],
  }),
  ratings: many(drinkRatings),
}));

// Export schemas
export const insertDrinkSchema = createInsertSchema(drinks);
export const selectDrinkSchema = createSelectSchema(drinks);
export const insertIngredientSchema = createInsertSchema(ingredients);
export const selectIngredientSchema = createSelectSchema(ingredients);
export const insertChatSessionSchema = createInsertSchema(chatSessions);
export const selectChatSessionSchema = createSelectSchema(chatSessions);
export const insertDrinkCategorySchema = createInsertSchema(drinkCategories);
export const selectDrinkCategorySchema = createSelectSchema(drinkCategories);
export const insertDrinkRatingSchema = createInsertSchema(drinkRatings);
export const selectDrinkRatingSchema = createSelectSchema(drinkRatings);

// Export types
export type InsertDrink = typeof drinks.$inferInsert;
export type SelectDrink = typeof drinks.$inferSelect;
export type InsertIngredient = typeof ingredients.$inferInsert;
export type SelectIngredient = typeof ingredients.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;
export type SelectChatSession = typeof chatSessions.$inferSelect;
export type InsertDrinkCategory = typeof drinkCategories.$inferInsert;
export type SelectDrinkCategory = typeof drinkCategories.$inferSelect;
export type InsertDrinkRating = typeof drinkRatings.$inferInsert;
export type SelectDrinkRating = typeof drinkRatings.$inferSelect;