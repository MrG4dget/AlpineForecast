import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const mushroomSpecies = pgTable("mushroom_species", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  scientificName: text("scientific_name").notNull(),
  description: text("description"),
  season: text("season").notNull(), // Spring, Summer, Fall, Winter
  optimalTemp: real("optimal_temp"), // Celsius
  optimalHumidity: real("optimal_humidity"), // Percentage
  soilTempMin: real("soil_temp_min"), // Celsius
  treeAssociations: jsonb("tree_associations").$type<string[]>().default([]),
  forestTypes: jsonb("forest_types").$type<string[]>().default([]),
  elevationMin: integer("elevation_min"), // meters
  elevationMax: integer("elevation_max"), // meters
  edible: boolean("edible").default(true),
  difficulty: text("difficulty").notNull(), // beginner, intermediate, expert
  imageUrl: text("image_url"),
  safetyNotes: text("safety_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const foragingLocations = pgTable("foraging_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  elevation: integer("elevation"), // meters
  forestType: text("forest_type"),
  treeSpecies: jsonb("tree_species").$type<string[]>().default([]),
  accessibility: text("accessibility"), // easy, moderate, difficult
  parkingAvailable: boolean("parking_available").default(false),
  description: text("description"),
  municipality: text("municipality"),
  canton: text("canton"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const weatherData = pgTable("weather_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").references(() => foragingLocations.id),
  timestamp: timestamp("timestamp").defaultNow(),
  temperature: real("temperature"), // Celsius
  humidity: real("humidity"), // Percentage
  soilTemperature: real("soil_temperature"), // Celsius
  precipitation: real("precipitation"), // mm
  windSpeed: real("wind_speed"), // km/h
  pressure: real("pressure"), // hPa
  lastRainfall: integer("last_rainfall"), // days ago
});

export const userFinds = pgTable("user_finds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Would reference users table in full implementation
  speciesId: varchar("species_id").references(() => mushroomSpecies.id),
  locationId: varchar("location_id").references(() => foragingLocations.id),
  foundAt: timestamp("found_at").defaultNow(),
  quantity: integer("quantity"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  verified: boolean("verified").default(false),
});

// Zod schemas for validation
export const insertMushroomSpeciesSchema = createInsertSchema(mushroomSpecies).omit({
  id: true,
  createdAt: true,
});

export const insertForagingLocationSchema = createInsertSchema(foragingLocations).omit({
  id: true,
  createdAt: true,
});

export const insertWeatherDataSchema = createInsertSchema(weatherData).omit({
  id: true,
  timestamp: true,
});

export const insertUserFindSchema = createInsertSchema(userFinds).omit({
  id: true,
  foundAt: true,
});

// Types
export type MushroomSpecies = typeof mushroomSpecies.$inferSelect;
export type InsertMushroomSpecies = z.infer<typeof insertMushroomSpeciesSchema>;

export type ForagingLocation = typeof foragingLocations.$inferSelect;
export type InsertForagingLocation = z.infer<typeof insertForagingLocationSchema>;

export type WeatherData = typeof weatherData.$inferSelect;
export type InsertWeatherData = z.infer<typeof insertWeatherDataSchema>;

export type UserFind = typeof userFinds.$inferSelect;
export type InsertUserFind = z.infer<typeof insertUserFindSchema>;

// Additional types for API responses
export type LocationWithProbability = ForagingLocation & {
  probability: number;
  distance: number;
  suitableSpecies: string[];
  currentConditions?: WeatherData;
};

export type SpeciesWithConditions = MushroomSpecies & {
  currentSuitability: number;
  nearbyLocations: number;
};
