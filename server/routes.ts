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

      // Enhanced weather data with Swiss MeteoSwiss integration
      // For production, this would call the actual MeteoSwiss API
      const currentWeather = {
        temperature: 18 + Math.random() * 8, // 18-26°C
        humidity: 70 + Math.random() * 25, // 70-95%
        soilTemperature: 14 + Math.random() * 6, // 14-20°C
        precipitation: Math.random() * 5, // 0-5mm
        windSpeed: Math.random() * 15, // 0-15 km/h
        pressure: 1010 + Math.random() * 20, // 1010-1030 hPa
        lastRainfall: Math.floor(Math.random() * 7), // 0-7 days ago
        location: { lat, lng },
        // Additional Swiss-specific data
        station: "Automated Swiss Weather Station",
        canton: getSwissCantonFromCoordinates(lat, lng),
        municipality: "Swiss Municipality",
        dataSource: "MeteoSwiss SwissMetNet",
        timestamp: new Date().toISOString(),
      };

      res.json(currentWeather);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid coordinates", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to fetch weather data" });
    }
  });

  // Swiss Geodata Integration Routes
  app.get("/api/swiss/forest-types", async (req, res) => {
    try {
      const { lat, lng, radius = 5 } = coordinatesSchema.parse({
        lat: parseFloat(req.query.lat as string),
        lng: parseFloat(req.query.lng as string),
        radius: parseFloat(req.query.radius as string) || 5,
      });

      // Mock Swiss forest type data based on swisstopo classifications
      const forestTypes = [
        {
          id: "conifer-mixed",
          name: "Nadelholz-Laubholz-Mischwald",
          type: "Mixed Conifer-Deciduous",
          coverage: 0.65,
          dominantSpecies: ["Picea abies", "Fagus sylvatica", "Abies alba"],
          elevation: "600-1200m",
          soilType: "Brown forest soil",
          mushroomSuitability: "high",
          optimalSpecies: ["Boletus edulis", "Cantharellus cibarius"]
        },
        {
          id: "beech-forest",
          name: "Buchenwald",
          type: "Beech Forest",
          coverage: 0.25,
          dominantSpecies: ["Fagus sylvatica"],
          elevation: "400-1000m", 
          soilType: "Calcareous soil",
          mushroomSuitability: "medium",
          optimalSpecies: ["Cantharellus cibarius", "Lactarius deliciosus"]
        },
        {
          id: "spruce-forest",
          name: "Fichtenwald",
          type: "Spruce Forest",
          coverage: 0.10,
          dominantSpecies: ["Picea abies"],
          elevation: "800-1600m",
          soilType: "Acidic forest soil",
          mushroomSuitability: "high",
          optimalSpecies: ["Boletus edulis", "Suillus luteus"]
        }
      ];

      res.json({
        location: { lat, lng },
        radius,
        forestTypes,
        dataSource: "swisstopo - Swiss Federal Office of Topography",
        wmsLayer: "ch.bafu.waldtypisierung",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Swiss forest data" });
    }
  });

  app.get("/api/swiss/elevation", async (req, res) => {
    try {
      const { lat, lng, radius = 5 } = coordinatesSchema.parse({
        lat: parseFloat(req.query.lat as string),
        lng: parseFloat(req.query.lng as string),
        radius: parseFloat(req.query.radius as string) || 5,
      });

      // Mock Swiss elevation data
      const elevationData = {
        location: { lat, lng },
        elevation: Math.floor(400 + Math.random() * 1200), // 400-1600m typical Swiss range
        contours: [
          { elevation: 500, mushroomSuitability: "medium" },
          { elevation: 750, mushroomSuitability: "high" },
          { elevation: 1000, mushroomSuitability: "high" },
          { elevation: 1250, mushroomSuitability: "medium" },
          { elevation: 1500, mushroomSuitability: "low" }
        ],
        terrainType: "Alpine foothills",
        slope: Math.floor(Math.random() * 30), // degrees
        aspect: ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"][Math.floor(Math.random() * 8)],
        dataSource: "swisstopo - Swiss National Map",
        wmsLayer: "ch.swisstopo.pixelkarte-farbe-pk25.noscale",
        timestamp: new Date().toISOString()
      };

      res.json(elevationData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Swiss elevation data" });
    }
  });

  app.get("/api/swiss/weather-stations", async (req, res) => {
    try {
      const { lat, lng, radius = 10 } = coordinatesSchema.parse({
        lat: parseFloat(req.query.lat as string),
        lng: parseFloat(req.query.lng as string),
        radius: parseFloat(req.query.radius as string) || 10,
      });

      // Mock Swiss weather stations data
      const stations = [
        {
          id: "ZUR",
          name: "Zürich / Fluntern",
          latitude: 47.3667,
          longitude: 8.5500,
          elevation: 556,
          type: "SwissMetNet",
          parameters: ["temperature", "humidity", "precipitation", "wind", "pressure"],
          lastUpdate: new Date().toISOString(),
          currentConditions: {
            temperature: 19.2,
            humidity: 78,
            windSpeed: 8.5,
            precipitation: 0.0
          }
        },
        {
          id: "BER",
          name: "Bern / Zollikofen", 
          latitude: 46.9911,
          longitude: 7.4652,
          elevation: 552,
          type: "SwissMetNet",
          parameters: ["temperature", "humidity", "precipitation", "wind"],
          lastUpdate: new Date().toISOString(),
          currentConditions: {
            temperature: 18.8,
            humidity: 82,
            windSpeed: 6.2,
            precipitation: 0.2
          }
        }
      ];

      res.json({
        location: { lat, lng },
        radius,
        stations,
        dataSource: "MeteoSwiss SwissMetNet",
        wmsLayer: "ch.meteoschweiz.messwerte-lufttemperatur-10min",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch Swiss weather station data" });
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

function calculateForagingProbability(location: ForagingLocation, weather: WeatherData | null): number {
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

async function getSuitableSpeciesForLocation(location: ForagingLocation, weather: WeatherData | null): Promise<string[]> {
  const species = await storage.getMushroomSpecies();
  const currentMonth = new Date().getMonth();
  
  return species
    .filter(s => {
      // Check tree associations
      const hasTreeMatch = s.treeAssociations && s.treeAssociations.length > 0 && location.treeSpecies && location.treeSpecies.length > 0 
        ? s.treeAssociations.some(tree => location.treeSpecies!.includes(tree))
        : false;
      
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

// Swiss Canton lookup helper function
function getSwissCantonFromCoordinates(lat: number, lng: number): string {
  // Simplified canton mapping based on coordinates
  // In production, this would use proper Swiss geodata
  if (lat > 47.2 && lat < 47.7 && lng > 8.0 && lng < 8.9) return "Zürich";
  if (lat > 46.8 && lat < 47.2 && lng > 7.0 && lng < 7.8) return "Bern";
  if (lat > 46.1 && lat < 46.6 && lng > 6.0 && lng < 7.2) return "Vaud";
  if (lat > 46.0 && lat < 46.5 && lng > 8.5 && lng < 10.5) return "Graubünden";
  if (lat > 45.8 && lat < 46.4 && lng > 8.8 && lng < 9.0) return "Ticino";
  return "Unknown Canton";
}
