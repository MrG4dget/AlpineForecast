import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMushroomSpeciesSchema, insertForagingLocationSchema, insertWeatherDataSchema, insertUserFindSchema } from "@shared/schema";
import { z } from "zod";

const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius: z.number().min(0.1).max(50).default(10), // km
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Mushroom species routes
  app.get("/api/species", async (req, res) => {
    try {
      const species = await storage.getMushroomSpecies();
      res.json(species);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mushroom species" });
    }
  });

  app.get("/api/species/:id", async (req, res) => {
    try {
      const species = await storage.getMushroomSpeciesById(req.params.id);
      if (!species) {
        return res.status(404).json({ message: "Species not found" });
      }
      res.json(species);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch species" });
    }
  });

  app.post("/api/species", async (req, res) => {
    try {
      const validatedData = insertMushroomSpeciesSchema.parse(req.body);
      const species = await storage.createMushroomSpecies(validatedData);
      res.status(201).json(species);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid species data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create species" });
    }
  });

  // Foraging locations routes
  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await storage.getForagingLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get("/api/locations/nearby", async (req, res) => {
    try {
      const { lat, lng, radius } = coordinatesSchema.parse({
        lat: parseFloat(req.query.lat as string),
        lng: parseFloat(req.query.lng as string),
        radius: req.query.radius ? parseFloat(req.query.radius as string) : 10,
      });

      const locations = await storage.getNearbyLocations(lat, lng, radius);
      
      // Calculate distances and add probability scores
      const locationsWithDetails = await Promise.all(locations.map(async (location) => {
        const distance = calculateDistance(lat, lng, location.latitude, location.longitude);
        const weather = await storage.getLatestWeatherForLocation(location.id);
        const probability = calculateForagingProbability(location, weather);
        const suitableSpecies = await getSuitableSpeciesForLocation(location, weather);
        
        return {
          ...location,
          distance: Math.round(distance * 100) / 100,
          probability,
          suitableSpecies,
          currentConditions: weather || undefined,
        };
      }));

      // Sort by probability descending
      locationsWithDetails.sort((a, b) => b.probability - a.probability);
      
      res.json(locationsWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid coordinates", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to fetch nearby locations" });
    }
  });

  app.get("/api/locations/:id", async (req, res) => {
    try {
      const location = await storage.getForagingLocationById(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      const weather = await storage.getLatestWeatherForLocation(location.id);
      const probability = calculateForagingProbability(location, weather);
      const suitableSpecies = await getSuitableSpeciesForLocation(location, weather);
      
      res.json({
        ...location,
        probability,
        suitableSpecies,
        currentConditions: weather || undefined,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch location" });
    }
  });

  // Weather data routes
  app.post("/api/weather", async (req, res) => {
    try {
      const validatedData = insertWeatherDataSchema.parse(req.body);
      const weather = await storage.createWeatherData(validatedData);
      res.status(201).json(weather);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid weather data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create weather data" });
    }
  });

  app.get("/api/weather/current", async (req, res) => {
    try {
      const { lat, lng } = coordinatesSchema.parse({
        lat: parseFloat(req.query.lat as string),
        lng: parseFloat(req.query.lng as string),
        radius: 1,
      });

      // For demo purposes, return mock current weather
      // In production, this would call MeteoSwiss API
      const currentWeather = {
        temperature: 18 + Math.random() * 8, // 18-26°C
        humidity: 70 + Math.random() * 25, // 70-95%
        soilTemperature: 14 + Math.random() * 6, // 14-20°C
        precipitation: Math.random() * 5, // 0-5mm
        windSpeed: Math.random() * 15, // 0-15 km/h
        pressure: 1010 + Math.random() * 20, // 1010-1030 hPa
        lastRainfall: Math.floor(Math.random() * 7), // 0-7 days ago
        location: { lat, lng },
      };

      res.json(currentWeather);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid coordinates", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to fetch weather data" });
    }
  });

  // User finds routes
  app.get("/api/finds", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const finds = await storage.getUserFinds(userId);
      res.json(finds);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch finds" });
    }
  });

  app.post("/api/finds", async (req, res) => {
    try {
      const validatedData = insertUserFindSchema.parse(req.body);
      const find = await storage.createUserFind(validatedData);
      res.status(201).json(find);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid find data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create find" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calculateForagingProbability(location: any, weather: any): number {
  let probability = 50; // Base probability

  // Elevation factor
  if (location.elevation >= 400 && location.elevation <= 1200) {
    probability += 15;
  }

  // Forest type factor
  if (location.forestType === "Mixed") {
    probability += 10;
  } else if (location.forestType === "Conifer" || location.forestType === "Hardwood") {
    probability += 5;
  }

  // Weather factors
  if (weather) {
    // Temperature
    if (weather.temperature >= 15 && weather.temperature <= 22) {
      probability += 15;
    } else if (weather.temperature >= 10 && weather.temperature <= 25) {
      probability += 5;
    }

    // Humidity
    if (weather.humidity >= 80) {
      probability += 10;
    } else if (weather.humidity >= 70) {
      probability += 5;
    }

    // Recent rainfall
    if (weather.lastRainfall <= 3) {
      probability += 10;
    } else if (weather.lastRainfall <= 7) {
      probability += 5;
    }

    // Soil temperature
    if (weather.soilTemperature >= 12) {
      probability += 10;
    }
  }

  return Math.min(Math.max(probability, 0), 100);
}

async function getSuitableSpeciesForLocation(location: any, weather: any): Promise<string[]> {
  const species = await storage.getMushroomSpecies();
  const currentMonth = new Date().getMonth();
  
  return species
    .filter(s => {
      // Check tree associations
      const hasTreeMatch = s.treeAssociations.some(tree => 
        location.treeSpecies.includes(tree)
      );
      
      // Check elevation
      const elevationOk = location.elevation >= (s.elevationMin || 0) && 
                         location.elevation <= (s.elevationMax || 2000);
      
      // Check season (simplified)
      let seasonOk = true;
      if (s.season === "Spring" && (currentMonth < 2 || currentMonth > 5)) seasonOk = false;
      if (s.season === "Summer" && (currentMonth < 5 || currentMonth > 8)) seasonOk = false;
      if (s.season === "Fall" && (currentMonth < 8 || currentMonth > 11)) seasonOk = false;
      
      // Check temperature if weather available
      if (weather && s.optimalTemp) {
        const tempDiff = Math.abs(weather.temperature - s.optimalTemp);
        if (tempDiff > 8) seasonOk = false;
      }
      
      return hasTreeMatch && elevationOk && seasonOk;
    })
    .map(s => s.name);
}
