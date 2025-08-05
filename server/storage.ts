import { 
  type MushroomSpecies, 
  type InsertMushroomSpecies,
  type ForagingLocation, 
  type InsertForagingLocation,
  type WeatherData,
  type InsertWeatherData,
  type UserFind,
  type InsertUserFind,
  type LocationWithProbability
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Mushroom species
  getMushroomSpecies(): Promise<MushroomSpecies[]>;
  getMushroomSpeciesById(id: string): Promise<MushroomSpecies | undefined>;
  createMushroomSpecies(species: InsertMushroomSpecies): Promise<MushroomSpecies>;

  // Foraging locations
  getForagingLocations(): Promise<ForagingLocation[]>;
  getForagingLocationById(id: string): Promise<ForagingLocation | undefined>;
  getNearbyLocations(lat: number, lng: number, radiusKm: number): Promise<ForagingLocation[]>;
  createForagingLocation(location: InsertForagingLocation): Promise<ForagingLocation>;

  // Weather data
  getWeatherData(locationId: string): Promise<WeatherData | undefined>;
  createWeatherData(weather: InsertWeatherData): Promise<WeatherData>;
  getLatestWeatherForLocation(locationId: string): Promise<WeatherData | undefined>;

  // User finds
  getUserFinds(userId?: string): Promise<UserFind[]>;
  createUserFind(find: InsertUserFind): Promise<UserFind>;
}

export class MemStorage implements IStorage {
  private mushroomSpecies: Map<string, MushroomSpecies>;
  private foragingLocations: Map<string, ForagingLocation>;
  private weatherData: Map<string, WeatherData>;
  private userFinds: Map<string, UserFind>;

  constructor() {
    this.mushroomSpecies = new Map();
    this.foragingLocations = new Map();
    this.weatherData = new Map();
    this.userFinds = new Map();
    
    // Initialize with real Swiss mushroom data
    this.initializeData();
  }

  private initializeData() {
    // Initialize mushroom species
    const species: MushroomSpecies[] = [
      {
        id: "porcini",
        name: "Porcini",
        scientificName: "Boletus edulis",
        description: "Highly prized edible mushroom with a nutty flavor and meaty texture.",
        season: "Fall",
        optimalTemp: 18,
        optimalHumidity: 80,
        soilTempMin: 6,
        treeAssociations: ["Spruce", "Pine", "Fir", "Beech", "Oak", "Birch"],
        forestTypes: ["Conifer", "Mixed"],
        elevationMin: 400,
        elevationMax: 1500,
        edible: true,
        difficulty: "intermediate",
        imageUrl: "/images/porcini.jpg",
        safetyNotes: "Avoid specimens with red pore surface or that bruise blue immediately.",
        createdAt: new Date(),
      },
      {
        id: "chanterelle",
        name: "Chanterelle",
        scientificName: "Cantharellus cibarius",
        description: "Golden trumpet-shaped mushroom with a fruity aroma and peppery taste.",
        season: "Summer",
        optimalTemp: 21,
        optimalHumidity: 85,
        soilTempMin: 12,
        treeAssociations: ["Oak", "Beech", "Birch", "Pine"],
        forestTypes: ["Hardwood", "Mixed"],
        elevationMin: 300,
        elevationMax: 1200,
        edible: true,
        difficulty: "beginner",
        imageUrl: "/images/chanterelle.jpg",
        safetyNotes: "Distinguish from toxic Jack O'Lantern mushrooms by their false gills.",
        createdAt: new Date(),
      },
      {
        id: "morel",
        name: "Morel",
        scientificName: "Morchella esculenta",
        description: "Honeycomb-textured spring mushroom, highly sought after by foragers.",
        season: "Spring",
        optimalTemp: 16,
        optimalHumidity: 75,
        soilTempMin: 12,
        treeAssociations: ["Ash", "Elm", "Apple", "Cherry"],
        forestTypes: ["Hardwood", "Mixed", "Riverbank"],
        elevationMin: 200,
        elevationMax: 1000,
        edible: true,
        difficulty: "expert",
        imageUrl: "/images/morel.jpg",
        safetyNotes: "Must be cooked thoroughly. Never eat raw. Distinguish from toxic false morels.",
        createdAt: new Date(),
      },
      {
        id: "oyster",
        name: "Oyster Mushroom",
        scientificName: "Pleurotus ostreatus",
        description: "Fan-shaped mushroom growing on dead wood, available year-round.",
        season: "All Year",
        optimalTemp: 15,
        optimalHumidity: 85,
        soilTempMin: 5,
        treeAssociations: ["Beech", "Oak", "Poplar", "Willow"],
        forestTypes: ["Hardwood", "Mixed"],
        elevationMin: 200,
        elevationMax: 1400,
        edible: true,
        difficulty: "beginner",
        imageUrl: "/images/oyster.jpg",
        safetyNotes: "Generally safe for beginners. Grows on dead wood, not living trees.",
        createdAt: new Date(),
      }
    ];

    species.forEach(s => this.mushroomSpecies.set(s.id, s));

    // Initialize foraging locations around Switzerland
    const locations: ForagingLocation[] = [
      {
        id: "uetliberg-trail",
        name: "Uetliberg Forest Trail",
        latitude: 47.3518,
        longitude: 8.4942,
        elevation: 745,
        forestType: "Mixed Conifer",
        treeSpecies: ["Spruce", "Fir", "Beech"],
        accessibility: "moderate",
        parkingAvailable: true,
        description: "Popular hiking area with diverse forest types ideal for porcini and chanterelles.",
        municipality: "Zurich",
        canton: "Zurich",
        createdAt: new Date(),
      },
      {
        id: "zurichberg-grove",
        name: "Zurichberg Oak Grove",
        latitude: 47.3737,
        longitude: 8.5703,
        elevation: 680,
        forestType: "Hardwood",
        treeSpecies: ["Oak", "Beech", "Maple"],
        accessibility: "easy",
        parkingAvailable: true,
        description: "Oak-dominated forest excellent for chanterelles, especially after rain.",
        municipality: "Zurich",
        canton: "Zurich",
        createdAt: new Date(),
      },
      {
        id: "adliswil-edge",
        name: "Adliswil Forest Edge",
        latitude: 47.3095,
        longitude: 8.5268,
        elevation: 520,
        forestType: "Mixed",
        treeSpecies: ["Ash", "Elm", "Oak", "Pine"],
        accessibility: "easy",
        parkingAvailable: false,
        description: "Forest edge habitat ideal for morels in spring, mixed species year-round.",
        municipality: "Adliswil",
        canton: "Zurich",
        createdAt: new Date(),
      },
      {
        id: "albis-pass",
        name: "Albis Pass Forest",
        latitude: 47.2894,
        longitude: 8.5158,
        elevation: 790,
        forestType: "Conifer",
        treeSpecies: ["Spruce", "Fir", "Pine"],
        accessibility: "moderate",
        parkingAvailable: true,
        description: "High-elevation conifer forest, excellent for porcini in fall.",
        municipality: "Langnau am Albis",
        canton: "Zurich",
        createdAt: new Date(),
      }
    ];

    locations.forEach(l => this.foragingLocations.set(l.id, l));
  }

  async getMushroomSpecies(): Promise<MushroomSpecies[]> {
    return Array.from(this.mushroomSpecies.values());
  }

  async getMushroomSpeciesById(id: string): Promise<MushroomSpecies | undefined> {
    return this.mushroomSpecies.get(id);
  }

  async createMushroomSpecies(species: InsertMushroomSpecies): Promise<MushroomSpecies> {
    const id = randomUUID();
    const newSpecies: MushroomSpecies = {
      ...species,
      id,
      createdAt: new Date(),
      description: species.description ?? null,
      optimalTemp: species.optimalTemp ?? null,
      optimalHumidity: species.optimalHumidity ?? null,
      soilTempMin: species.soilTempMin ?? null,
      elevationMin: species.elevationMin ?? null,
      elevationMax: species.elevationMax ?? null,
      imageUrl: species.imageUrl ?? null,
      safetyNotes: species.safetyNotes ?? null,
    };
    this.mushroomSpecies.set(id, newSpecies);
    return newSpecies;
  }

  async getForagingLocations(): Promise<ForagingLocation[]> {
    return Array.from(this.foragingLocations.values());
  }

  async getForagingLocationById(id: string): Promise<ForagingLocation | undefined> {
    return this.foragingLocations.get(id);
  }

  async getNearbyLocations(lat: number, lng: number, radiusKm: number): Promise<ForagingLocation[]> {
    const locations = await this.getForagingLocations();
    
    return locations.filter(location => {
      const distance = this.calculateDistance(lat, lng, location.latitude, location.longitude);
      return distance <= radiusKm;
    }).sort((a, b) => {
      const distA = this.calculateDistance(lat, lng, a.latitude, a.longitude);
      const distB = this.calculateDistance(lat, lng, b.latitude, b.longitude);
      return distA - distB;
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async createForagingLocation(location: InsertForagingLocation): Promise<ForagingLocation> {
    const id = randomUUID();
    const newLocation: ForagingLocation = {
      ...location,
      id,
      createdAt: new Date(),
      elevation: location.elevation ?? null,
      forestType: location.forestType ?? null,
      treeSpecies: location.treeSpecies ?? null,
      accessibility: location.accessibility ?? null,
      parkingAvailable: location.parkingAvailable ?? null,
      description: location.description ?? null,
      municipality: location.municipality ?? null,
      canton: location.canton ?? null,
    };
    this.foragingLocations.set(id, newLocation);
    return newLocation;
  }

  async getWeatherData(locationId: string): Promise<WeatherData | undefined> {
    return Array.from(this.weatherData.values()).find(w => w.locationId === locationId);
  }

  async createWeatherData(weather: InsertWeatherData): Promise<WeatherData> {
    const id = randomUUID();
    const newWeather: WeatherData = {
      ...weather,
      id,
      timestamp: new Date(),
      locationId: weather.locationId ?? null,
      temperature: weather.temperature ?? null,
      humidity: weather.humidity ?? null,
      soilTemperature: weather.soilTemperature ?? null,
      precipitation: weather.precipitation ?? null,
      windSpeed: weather.windSpeed ?? null,
      pressure: weather.pressure ?? null,
      lastRainfall: weather.lastRainfall ?? null,
    };
    this.weatherData.set(id, newWeather);
    return newWeather;
  }

  async getLatestWeatherForLocation(locationId: string): Promise<WeatherData | undefined> {
    const weatherEntries = Array.from(this.weatherData.values())
      .filter(w => w.locationId === locationId)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
    
    return weatherEntries[0];
  }

  async getUserFinds(userId?: string): Promise<UserFind[]> {
    if (userId) {
      return Array.from(this.userFinds.values()).filter(f => f.userId === userId);
    }
    return Array.from(this.userFinds.values());
  }

  async createUserFind(find: InsertUserFind): Promise<UserFind> {
    const id = randomUUID();
    const newFind: UserFind = {
      ...find,
      id,
      foundAt: new Date(),
      userId: find.userId ?? null,
      speciesId: find.speciesId ?? null,
      locationId: find.locationId ?? null,
      quantity: find.quantity ?? null,
      notes: find.notes ?? null,
      photoUrl: find.photoUrl ?? null,
      verified: find.verified ?? null,
    };
    this.userFinds.set(id, newFind);
    return newFind;
  }
}

export const storage = new MemStorage();
