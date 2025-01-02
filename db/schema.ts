import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const drinks = pgTable("drinks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  instructions: text("instructions").notNull(),
  ingredients: jsonb("ingredients").$type<{name: string, amount: string}[]>().notNull(),
  tags: text("tags").array().notNull(),
  imageUrl: text("image_url"),
  recommendedTime: text("recommended_time").array(),
  recommendedWeather: text("recommended_weather").array(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").unique().notNull(),
  location: jsonb("location").$type<{
    zipCode: string,
    weather: string,
    temperature: number
  }>(),
  preferences: jsonb("preferences").$type<{
    ingredients: string[],
    restrictions: string[],
    mood: string
  }>(),
  recommendations: jsonb("recommendations").$type<{
    drinkIds: number[],
    selectedDrinkId: number | null
  }>(),
  createdAt: text("created_at").notNull(),
});

export const insertDrinkSchema = createInsertSchema(drinks);
export const selectDrinkSchema = createSelectSchema(drinks);
export type Drink = typeof drinks.$inferSelect;
export type InsertDrink = typeof drinks.$inferInsert;

export const insertSessionSchema = createInsertSchema(sessions);
export const selectSessionSchema = createSelectSchema(sessions);
export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
