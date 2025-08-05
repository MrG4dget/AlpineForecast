import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMushroomSpeciesSchema, insertForagingLocationSchema, insertWeatherDataSchema, insertUserFindSchema } from "@shared/schema";
import { z } from "zod";
import { swissFungiSync } from "./swiss-fungi-sync";

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

  // Swiss Fungi integration routes
  app.get("/api/swiss-fungi/status", async (req, res) => {
    try {
      const status = swissFungiSync.getSyncStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get sync status" });
    }
  });

  app.get("/api/swiss-fungi/comparison", async (req, res) => {
    try {
      const comparison = await swissFungiSync.getSpeciesComparisonReport();
      res.json(comparison);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate comparison report" });
    }
  });

  app.post("/api/swiss-fungi/sync", async (req, res) => {
    try {
      const options = {
        maxSpecies: req.body.maxSpecies ? parseInt(req.body.maxSpecies) : undefined,
        updateExisting: req.body.updateExisting === true,
        addMissing: req.body.addMissing === true
      };

      const report = await swissFungiSync.syncWithSwissFungi(options);
      res.json(report);
    } catch (error) {
      if (error instanceof Error && error.message === 'Sync already in progress') {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to sync with Swiss Fungi database" });
    }
  });

  app.post("/api/swiss-fungi/add-curated", async (req, res) => {
    try {
      const report = await swissFungiSync.addCuratedSwissSpecies();
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to add curated Swiss species" });
    }
  });

  // Enhanced species search with Swiss Fungi data
  app.get("/api/species/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Query must be at least 2 characters long" });
      }

      const species = await storage.getMushroomSpecies();
      const filtered = species.filter(s => 
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.scientificName.toLowerCase().includes(query.toLowerCase())
      );

      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to search species" });
    }
  });

  // Enhanced probability analysis endpoint
  app.get("/api/locations/:id/probability-analysis", async (req, res) => {
    try {
      const location = await storage.getForagingLocationById(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      const weather = await storage.getLatestWeatherForLocation(req.params.id);
      const species = await storage.getMushroomSpecies();

      // Calculate detailed probability for each species
      const speciesAnalysis = species.map(species => {
        let factors = {
          elevation: 0,
          forestType: 0,
          treeSpecies: 0,
          season: 0,
          temperature: 0,
          humidity: 0,
          rainfall: 0,
          soilTemp: 0,
          total: 0
        };

        // Elevation factor
        if (location.elevation && species.elevationMin && species.elevationMax) {
          if (location.elevation >= species.elevationMin && location.elevation <= species.elevationMax) {
            factors.elevation = 20;
          } else {
            const minDiff = Math.abs(location.elevation - species.elevationMin);
            const maxDiff = Math.abs(location.elevation - species.elevationMax);
            const closestDiff = Math.min(minDiff, maxDiff);
            if (closestDiff <= 100) factors.elevation = 15;
            else if (closestDiff <= 200) factors.elevation = 10;
            else if (closestDiff <= 400) factors.elevation = 5;
          }
        } else {
          factors.elevation = 10;
        }

        // Forest type factor
        if (location.forestType && species.forestTypes && species.forestTypes.length > 0) {
          const forestMatch = species.forestTypes.some(type => {
            const locationType = location.forestType?.toLowerCase() || "";
            const speciesType = type.toLowerCase();
            return locationType.includes(speciesType) || speciesType.includes(locationType);
          });
          factors.forestType = forestMatch ? 15 : 5;
        } else {
          factors.forestType = 8;
        }

        // Tree species factor
        if (location.treeSpecies && species.treeAssociations && species.treeAssociations.length > 0) {
          const matchingTrees = location.treeSpecies.filter(tree =>
            species.treeAssociations!.some(assoc =>
              tree.toLowerCase().includes(assoc.toLowerCase()) ||
              assoc.toLowerCase().includes(tree.toLowerCase())
            )
          );
          const matchRatio = matchingTrees.length / Math.max(location.treeSpecies.length, 1);
          if (matchRatio >= 0.5) factors.treeSpecies = 15;
          else if (matchRatio >= 0.3) factors.treeSpecies = 10;
          else if (matchRatio >= 0.1) factors.treeSpecies = 5;
          else factors.treeSpecies = 2;
        } else {
          factors.treeSpecies = 8;
        }

        // Season factor
        const currentMonth = new Date().getMonth();
        factors.season = getSeasonScore(species.season, currentMonth);

        // Weather factors
        if (weather) {
          // Temperature
          if (species.optimalTemp && weather.temperature) {
            const tempDiff = Math.abs(weather.temperature - species.optimalTemp);
            if (tempDiff <= 3) factors.temperature = 15;
            else if (tempDiff <= 6) factors.temperature = 10;
            else if (tempDiff <= 10) factors.temperature = 5;
            else factors.temperature = 2;
          } else if (weather.temperature) {
            if (weather.temperature >= 15 && weather.temperature <= 22) factors.temperature = 12;
            else if (weather.temperature >= 10 && weather.temperature <= 25) factors.temperature = 8;
            else factors.temperature = 4;
          } else {
            factors.temperature = 8;
          }

          // Humidity
          if (species.optimalHumidity && weather.humidity) {
            const humidityDiff = Math.abs(weather.humidity - species.optimalHumidity);
            if (humidityDiff <= 5) factors.humidity = 10;
            else if (humidityDiff <= 15) factors.humidity = 6;
            else factors.humidity = 3;
          } else if (weather.humidity) {
            if (weather.humidity >= 80) factors.humidity = 8;
            else if (weather.humidity >= 70) factors.humidity = 6;
            else factors.humidity = 3;
          } else {
            factors.humidity = 5;
          }

          // Rainfall
          if (weather.lastRainfall !== undefined && weather.lastRainfall !== null) {
            if (weather.lastRainfall <= 3) factors.rainfall = 10;
            else if (weather.lastRainfall <= 7) factors.rainfall = 6;
            else if (weather.lastRainfall <= 14) factors.rainfall = 3;
            else factors.rainfall = 1;
          } else {
            factors.rainfall = 5;
          }

          // Soil temperature
          if (species.soilTempMin && weather.soilTemperature) {
            if (weather.soilTemperature >= species.soilTempMin + 3) factors.soilTemp = 10;
            else if (weather.soilTemperature >= species.soilTempMin) factors.soilTemp = 6;
            else if (weather.soilTemperature >= species.soilTempMin - 3) factors.soilTemp = 3;
            else factors.soilTemp = 1;
          } else if (weather.soilTemperature) {
            if (weather.soilTemperature >= 12) factors.soilTemp = 8;
            else if (weather.soilTemperature >= 8) factors.soilTemp = 5;
            else factors.soilTemp = 2;
          } else {
            factors.soilTemp = 5;
          }
        } else {
          factors.temperature = 8;
          factors.humidity = 5;
          factors.rainfall = 5;
          factors.soilTemp = 5;
        }

        factors.total = Math.min(
          factors.elevation + factors.forestType + factors.treeSpecies + 
          factors.season + factors.temperature + factors.humidity + 
          factors.rainfall + factors.soilTemp,
          100
        );

        return {
          species: {
            id: species.id,
            name: species.name,
            scientificName: species.scientificName,
            edible: species.edible,
            difficulty: species.difficulty,
            season: species.season
          },
          probability: factors.total,
          factors,
          explanation: generateProbabilityExplanation(factors, species, location, weather)
        };
      });

      // Sort by probability
      speciesAnalysis.sort((a, b) => b.probability - a.probability);

      // Overall location probability
      const overallProbability = calculateForagingProbability(location, weather);
      const suitableSpecies = await getSuitableSpeciesForLocation(location, weather);

      res.json({
        location: {
          id: location.id,
          name: location.name,
          elevation: location.elevation,
          forestType: location.forestType,
          treeSpecies: location.treeSpecies
        },
        weather: weather ? {
          temperature: weather.temperature,
          humidity: weather.humidity,
          soilTemperature: weather.soilTemperature,
          lastRainfall: weather.lastRainfall,
          timestamp: weather.timestamp
        } : null,
        overallProbability,
        suitableSpecies,
        speciesAnalysis: speciesAnalysis.slice(0, 10), // Top 10 species
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate probability analysis" });
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

  // Enhanced elevation factor for Swiss conditions
  if (location.elevation) {
    if (location.elevation >= 400 && location.elevation <= 1200) {
      probability += 15; // Optimal Swiss mushroom zone
    } else if (location.elevation >= 200 && location.elevation <= 1600) {
      probability += 10; // Good zone
    } else if (location.elevation >= 100 && location.elevation <= 2000) {
      probability += 5; // Fair zone
    }
    // Penalty for extreme elevations
    if (location.elevation > 2500 || location.elevation < 100) {
      probability -= 10;
    }
  }

  // Enhanced forest type factor
  if (location.forestType) {
    const forestType = location.forestType.toLowerCase();
    if (forestType.includes("mixed")) {
      probability += 12; // Mixed forests are excellent for diversity
    } else if (forestType.includes("conifer") || forestType.includes("hardwood")) {
      probability += 8; // Single-type forests are still good
    } else if (forestType.includes("deciduous")) {
      probability += 8; // Deciduous = hardwood
    }
  }

  // Tree species factor - bonus for diverse tree species
  if (location.treeSpecies && location.treeSpecies.length > 0) {
    if (location.treeSpecies.length >= 4) {
      probability += 8; // High diversity
    } else if (location.treeSpecies.length >= 2) {
      probability += 5; // Good diversity
    }
    
    // Bonus for specific valuable tree associations
    const valuableTrees = ['Oak', 'Beech', 'Birch', 'Pine', 'Spruce', 'Fir'];
    const hasValuableTrees = location.treeSpecies.some(tree => 
      valuableTrees.some(valuable => 
        tree.toLowerCase().includes(valuable.toLowerCase())
      )
    );
    if (hasValuableTrees) {
      probability += 5;
    }
  }

  // Enhanced weather factors
  if (weather) {
    // Temperature factor - more nuanced
    if (weather.temperature >= 15 && weather.temperature <= 22) {
      probability += 15; // Perfect range
    } else if (weather.temperature >= 12 && weather.temperature <= 25) {
      probability += 10; // Good range
    } else if (weather.temperature >= 8 && weather.temperature <= 28) {
      probability += 5; // Fair range
    } else if (weather.temperature < 5 || weather.temperature > 35) {
      probability -= 10; // Too extreme
    }

    // Humidity factor - mushrooms love moisture
    if (weather.humidity >= 85) {
      probability += 12; // Excellent
    } else if (weather.humidity >= 75) {
      probability += 10; // Very good
    } else if (weather.humidity >= 65) {
      probability += 6; // Good
    } else if (weather.humidity >= 55) {
      probability += 3; // Fair
    } else {
      probability -= 5; // Too dry
    }

    // Recent rainfall factor - crucial for mushroom growth
    if (weather.lastRainfall !== undefined && weather.lastRainfall !== null) {
      if (weather.lastRainfall <= 2) {
        probability += 15; // Perfect - recent rain
      } else if (weather.lastRainfall <= 4) {
        probability += 12; // Excellent
      } else if (weather.lastRainfall <= 7) {
        probability += 8; // Good
      } else if (weather.lastRainfall <= 14) {
        probability += 4; // Fair
      } else if (weather.lastRainfall <= 21) {
        probability += 1; // Poor
      } else {
        probability -= 5; // Too dry
      }
    }

    // Soil temperature factor - enhanced
    if (weather.soilTemperature !== undefined && weather.soilTemperature !== null) {
      if (weather.soilTemperature >= 12 && weather.soilTemperature <= 20) {
        probability += 12; // Optimal
      } else if (weather.soilTemperature >= 8 && weather.soilTemperature <= 25) {
        probability += 8; // Good
      } else if (weather.soilTemperature >= 5 && weather.soilTemperature <= 30) {
        probability += 4; // Fair
      } else {
        probability -= 5; // Too extreme
      }
    }

    // Pressure factor - stable weather is good
    if (weather.pressure) {
      if (weather.pressure >= 1010 && weather.pressure <= 1025) {
        probability += 3; // Stable conditions
      } else if (weather.pressure < 995 || weather.pressure > 1035) {
        probability -= 3; // Unstable weather
      }
    }

    // Wind factor - calm conditions are better
    if (weather.windSpeed !== undefined) {
      if (weather.windSpeed <= 10) {
        probability += 2; // Calm conditions
      } else if (weather.windSpeed > 25) {
        probability -= 3; // Too windy
      }
    }
  }

  // Seasonal factor based on current month
  const currentMonth = new Date().getMonth(); // 0-11
  if (currentMonth >= 8 && currentMonth <= 10) { // Sep-Nov (Fall)
    probability += 8; // Peak mushroom season
  } else if (currentMonth >= 5 && currentMonth <= 7) { // Jun-Aug (Summer)
    probability += 6; // Good season
  } else if (currentMonth >= 2 && currentMonth <= 4) { // Mar-May (Spring)
    probability += 4; // Fair season
  } else { // Winter months
    probability += 1; // Limited season
  }

  // Accessibility bonus - easier access means more likely to find mushrooms
  if (location.accessibility) {
    if (location.accessibility === "easy") {
      probability += 3;
    } else if (location.accessibility === "moderate") {
      probability += 1;
    }
    // Difficult access gets no bonus but no penalty
  }

  return Math.min(Math.max(probability, 0), 100);
}

async function getSuitableSpeciesForLocation(location: ForagingLocation, weather: WeatherData | null): Promise<string[]> {
  const species = await storage.getMushroomSpecies();
  const currentMonth = new Date().getMonth();
  
  const suitableSpecies = species.filter(species => {
    let score = 0;
    
    // Elevation check
    if (location.elevation && species.elevationMin && species.elevationMax) {
      if (location.elevation >= species.elevationMin && location.elevation <= species.elevationMax) {
        score += 20;
      } else {
        const minDiff = Math.abs(location.elevation - species.elevationMin);
        const maxDiff = Math.abs(location.elevation - species.elevationMax);
        const closestDiff = Math.min(minDiff, maxDiff);
        if (closestDiff <= 200) score += 10;
        else if (closestDiff <= 500) score += 5;
      }
    } else {
      score += 10; // Default score if no elevation data
    }
    
    // Forest type check
    if (location.forestType && species.forestTypes && species.forestTypes.length > 0) {
      const forestMatch = species.forestTypes.some(type => {
        const locationType = location.forestType?.toLowerCase() || "";
        const speciesType = type.toLowerCase();
        
        if (locationType === speciesType) return true;
        if (locationType.includes("mixed") && speciesType.includes("mixed")) return true;
        if (locationType.includes("conifer") && speciesType.includes("conifer")) return true;
        if (locationType.includes("hardwood") && speciesType.includes("hardwood")) return true;
        if (locationType.includes("deciduous") && speciesType.includes("hardwood")) return true;
        
        return false;
      });
      
      if (forestMatch) score += 15;
      else score += 5;
    } else {
      score += 8;
    }
    
    // Tree species check
    if (location.treeSpecies && species.treeAssociations && species.treeAssociations.length > 0) {
      const matchingTrees = location.treeSpecies.filter(tree =>
        species.treeAssociations!.some(assoc =>
          tree.toLowerCase().includes(assoc.toLowerCase()) ||
          assoc.toLowerCase().includes(tree.toLowerCase())
        )
      );
      
      const matchRatio = matchingTrees.length / Math.max(location.treeSpecies.length, 1);
      if (matchRatio >= 0.5) score += 15;
      else if (matchRatio >= 0.3) score += 10;
      else if (matchRatio >= 0.1) score += 5;
    } else {
      score += 8;
    }
    
    // Season check - improved logic
    const seasonScore = getSeasonScore(species.season, currentMonth);
    score += seasonScore;
    
    // Weather compatibility
    if (weather) {
      if (species.optimalTemp && weather.temperature) {
        const tempDiff = Math.abs(weather.temperature - species.optimalTemp);
        if (tempDiff <= 5) score += 10;
        else if (tempDiff <= 10) score += 5;
      }
      
      if (species.optimalHumidity && weather.humidity) {
        const humidityDiff = Math.abs(weather.humidity - species.optimalHumidity);
        if (humidityDiff <= 10) score += 10;
        else if (humidityDiff <= 20) score += 5;
      }
    }
    
    return score >= 40; // Threshold for "suitable"
  });
  
  return suitableSpecies.map(s => s.name);
}

function getSeasonScore(mushroomSeason: string, currentMonth: number): number {
  if (mushroomSeason === "All Year") return 15;
  
  // Handle multi-season species
  const seasons = mushroomSeason.split(',').map(s => s.trim());
  let maxScore = 0;
  
  for (const season of seasons) {
    let seasonScore = getSingleSeasonScore(season, currentMonth);
    maxScore = Math.max(maxScore, seasonScore);
  }
  
  return maxScore || getSingleSeasonScore(mushroomSeason, currentMonth);
}

function getSingleSeasonScore(season: string, currentMonth: number): number {
  let isInSeason = false;
  let isAdjacentSeason = false;
  
  switch (season) {
    case "Spring":
      isInSeason = currentMonth >= 2 && currentMonth <= 4; // Mar-May
      isAdjacentSeason = currentMonth === 1 || currentMonth === 5; // Feb, Jun
      break;
    case "Summer":
      isInSeason = currentMonth >= 5 && currentMonth <= 7; // Jun-Aug
      isAdjacentSeason = currentMonth === 4 || currentMonth === 8; // May, Sep
      break;
    case "Fall":
      isInSeason = currentMonth >= 8 && currentMonth <= 10; // Sep-Nov
      isAdjacentSeason = currentMonth === 7 || currentMonth === 11; // Aug, Dec
      break;
    case "Winter":
      isInSeason = currentMonth === 11 || currentMonth <= 1; // Dec-Feb
      isAdjacentSeason = currentMonth === 2 || currentMonth === 10; // Mar, Nov
      break;
  }
  
  if (isInSeason) return 15;
  if (isAdjacentSeason) return 8;
  return 3; // Out of season
}

function generateProbabilityExplanation(factors: any, species: any, location: any, weather: any): string[] {
  const explanations: string[] = [];
  
  // Elevation explanation
  if (factors.elevation >= 15) {
    explanations.push(`Perfect elevation (${location.elevation}m) for ${species.name}`);
  } else if (factors.elevation >= 10) {
    explanations.push(`Good elevation range for this species`);
  } else if (factors.elevation >= 5) {
    explanations.push(`Fair elevation, some distance from optimal range`);
  } else {
    explanations.push(`Elevation not ideal for this species`);
  }
  
  // Forest type explanation
  if (factors.forestType >= 12) {
    explanations.push(`Excellent forest type match (${location.forestType})`);
  } else if (factors.forestType >= 8) {
    explanations.push(`Good forest compatibility`);
  } else {
    explanations.push(`Limited forest type compatibility`);
  }
  
  // Tree species explanation
  if (factors.treeSpecies >= 12) {
    explanations.push(`Excellent tree species associations`);
  } else if (factors.treeSpecies >= 8) {
    explanations.push(`Good tree compatibility`);
  } else if (factors.treeSpecies >= 5) {
    explanations.push(`Some tree species match`);
  } else {
    explanations.push(`Limited tree species compatibility`);
  }
  
  // Season explanation
  if (factors.season >= 12) {
    explanations.push(`Peak season for ${species.name}`);
  } else if (factors.season >= 8) {
    explanations.push(`Good seasonal timing`);
  } else if (factors.season >= 5) {
    explanations.push(`Fair seasonal conditions`);
  } else {
    explanations.push(`Outside optimal season`);
  }
  
  // Weather explanations
  if (weather) {
    if (factors.temperature >= 12) {
      explanations.push(`Optimal temperature conditions (${weather.temperature}°C)`);
    } else if (factors.temperature >= 8) {
      explanations.push(`Good temperature for mushroom growth`);
    } else if (factors.temperature >= 4) {
      explanations.push(`Fair temperature conditions`);
    } else {
      explanations.push(`Temperature not ideal for mushrooms`);
    }
    
    if (factors.humidity >= 8) {
      explanations.push(`Excellent humidity levels (${weather.humidity}%)`);
    } else if (factors.humidity >= 5) {
      explanations.push(`Good humidity for mushroom development`);
    } else {
      explanations.push(`Low humidity conditions`);
    }
    
    if (factors.rainfall >= 8) {
      explanations.push(`Perfect soil moisture from recent rain (${weather.lastRainfall} days ago)`);
    } else if (factors.rainfall >= 5) {
      explanations.push(`Good soil moisture conditions`);
    } else if (factors.rainfall >= 3) {
      explanations.push(`Some soil moisture available`);
    } else {
      explanations.push(`Dry soil conditions`);
    }
    
    if (factors.soilTemp >= 8) {
      explanations.push(`Optimal soil temperature (${weather.soilTemperature}°C)`);
    } else if (factors.soilTemp >= 5) {
      explanations.push(`Good soil temperature for growth`);
    } else {
      explanations.push(`Soil temperature not optimal`);
    }
  }
  
  // Safety note for dangerous species
  if (!species.edible) {
    if (species.safetyNotes?.includes('DEADLY') || species.safetyNotes?.includes('DANGEROUS')) {
      explanations.push(`⚠️ WARNING: ${species.name} is highly toxic - never consume!`);
    } else {
      explanations.push(`ℹ️ Note: ${species.name} is not edible`);
    }
  }
  
  return explanations;
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
