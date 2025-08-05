import type { ForagingLocation, MushroomSpecies, WeatherData } from "@shared/schema";

export interface ProbabilityFactors {
  temperature: number;
  humidity: number;
  soilTemperature: number;
  recentRainfall: number;
  elevation: number;
  forestType: number;
  treeSpecies: number;
  season: number;
  totalScore: number;
}

export class ProbabilityCalculator {
  /**
   * Calculate mushroom foraging probability for a specific location and species
   */
  static calculateSpeciesProbability(
    species: MushroomSpecies,
    location: ForagingLocation,
    weather?: WeatherData | null
  ): { probability: number; factors: ProbabilityFactors } {
    let factors: ProbabilityFactors = {
      temperature: 0,
      humidity: 0,
      soilTemperature: 0,
      recentRainfall: 0,
      elevation: 0,
      forestType: 0,
      treeSpecies: 0,
      season: 0,
      totalScore: 0,
    };

    // Temperature factor (0-25 points)
    if (weather?.temperature && species.optimalTemp) {
      const tempDiff = Math.abs(weather.temperature - species.optimalTemp);
      if (tempDiff <= 2) factors.temperature = 25;
      else if (tempDiff <= 5) factors.temperature = 20;
      else if (tempDiff <= 8) factors.temperature = 15;
      else if (tempDiff <= 12) factors.temperature = 10;
      else factors.temperature = 0;
    } else {
      // Default moderate score if no weather data
      factors.temperature = 15;
    }

    // Humidity factor (0-20 points)
    if (weather?.humidity && species.optimalHumidity) {
      const humidityDiff = Math.abs(weather.humidity - species.optimalHumidity);
      if (humidityDiff <= 5) factors.humidity = 20;
      else if (humidityDiff <= 10) factors.humidity = 15;
      else if (humidityDiff <= 15) factors.humidity = 10;
      else factors.humidity = 5;
    } else if (weather?.humidity) {
      // General humidity assessment
      if (weather.humidity >= 80) factors.humidity = 20;
      else if (weather.humidity >= 70) factors.humidity = 15;
      else if (weather.humidity >= 60) factors.humidity = 10;
      else factors.humidity = 5;
    } else {
      factors.humidity = 12;
    }

    // Soil temperature factor (0-15 points)
    if (weather?.soilTemperature && species.soilTempMin) {
      if (weather.soilTemperature >= species.soilTempMin + 6) factors.soilTemperature = 15;
      else if (weather.soilTemperature >= species.soilTempMin + 3) factors.soilTemperature = 12;
      else if (weather.soilTemperature >= species.soilTempMin) factors.soilTemperature = 10;
      else if (weather.soilTemperature >= species.soilTempMin - 3) factors.soilTemperature = 5;
      else factors.soilTemperature = 0;
    } else {
      factors.soilTemperature = 8;
    }

    // Recent rainfall factor (0-15 points)
    if (weather?.lastRainfall !== undefined) {
      if (weather.lastRainfall <= 2) factors.recentRainfall = 15;
      else if (weather.lastRainfall <= 4) factors.recentRainfall = 12;
      else if (weather.lastRainfall <= 7) factors.recentRainfall = 8;
      else if (weather.lastRainfall <= 14) factors.recentRainfall = 4;
      else factors.recentRainfall = 0;
    } else {
      factors.recentRainfall = 8;
    }

    // Elevation factor (0-10 points)
    if (location.elevation && species.elevationMin && species.elevationMax) {
      if (location.elevation >= species.elevationMin && location.elevation <= species.elevationMax) {
        factors.elevation = 10;
      } else {
        const minDiff = Math.abs(location.elevation - species.elevationMin);
        const maxDiff = Math.abs(location.elevation - species.elevationMax);
        const closestDiff = Math.min(minDiff, maxDiff);
        
        if (closestDiff <= 100) factors.elevation = 8;
        else if (closestDiff <= 200) factors.elevation = 6;
        else if (closestDiff <= 400) factors.elevation = 4;
        else factors.elevation = 2;
      }
    } else {
      factors.elevation = 6;
    }

    // Forest type factor (0-10 points)
    if (location.forestType && species.forestTypes) {
      const forestMatch = species.forestTypes.some(type => 
        location.forestType?.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(location.forestType?.toLowerCase() || "")
      );
      factors.forestType = forestMatch ? 10 : 3;
    } else {
      factors.forestType = 5;
    }

    // Tree species factor (0-15 points)
    if (location.treeSpecies && species.treeAssociations) {
      const matchingTrees = location.treeSpecies.filter(tree =>
        species.treeAssociations.some(assoc =>
          tree.toLowerCase().includes(assoc.toLowerCase()) ||
          assoc.toLowerCase().includes(tree.toLowerCase())
        )
      );
      
      const matchRatio = matchingTrees.length / Math.max(location.treeSpecies.length, 1);
      if (matchRatio >= 0.5) factors.treeSpecies = 15;
      else if (matchRatio >= 0.3) factors.treeSpecies = 12;
      else if (matchRatio >= 0.1) factors.treeSpecies = 8;
      else factors.treeSpecies = 3;
    } else {
      factors.treeSpecies = 8;
    }

    // Season factor (0-10 points)
    factors.season = this.getSeasonalScore(species.season);

    // Calculate total score
    factors.totalScore = Math.min(
      factors.temperature +
      factors.humidity +
      factors.soilTemperature +
      factors.recentRainfall +
      factors.elevation +
      factors.forestType +
      factors.treeSpecies +
      factors.season,
      100
    );

    return {
      probability: factors.totalScore,
      factors,
    };
  }

  /**
   * Calculate overall foraging probability for a location (all species combined)
   */
  static calculateLocationProbability(
    location: ForagingLocation,
    allSpecies: MushroomSpecies[],
    weather?: WeatherData | null
  ): { probability: number; suitableSpecies: string[]; topSpecies: MushroomSpecies[] } {
    if (!allSpecies || allSpecies.length === 0) {
      return { probability: 0, suitableSpecies: [], topSpecies: [] };
    }

    const speciesProbabilities = allSpecies.map(species => {
      const result = this.calculateSpeciesProbability(species, location, weather);
      return {
        species,
        probability: result.probability,
        factors: result.factors,
      };
    });

    // Sort by probability
    speciesProbabilities.sort((a, b) => b.probability - a.probability);

    // Get species with decent probability (>40)
    const suitableSpecies = speciesProbabilities
      .filter(sp => sp.probability >= 40)
      .map(sp => sp.species.name);

    // Get top 3 species for this location
    const topSpecies = speciesProbabilities
      .slice(0, 3)
      .map(sp => sp.species);

    // Calculate overall probability as weighted average of top species
    const topProbabilities = speciesProbabilities.slice(0, 3).map(sp => sp.probability);
    const overallProbability = topProbabilities.length > 0
      ? Math.round(topProbabilities.reduce((sum, prob, index) => {
          const weight = index === 0 ? 0.5 : index === 1 ? 0.3 : 0.2;
          return sum + (prob * weight);
        }, 0))
      : 0;

    return {
      probability: Math.min(overallProbability, 100),
      suitableSpecies,
      topSpecies,
    };
  }

  /**
   * Get seasonal scoring based on current date
   */
  private static getSeasonalScore(mushroomSeason: string): number {
    const currentMonth = new Date().getMonth(); // 0-11
    
    if (mushroomSeason === "All Year") return 10;
    
    let isInSeason = false;
    
    switch (mushroomSeason) {
      case "Spring":
        isInSeason = currentMonth >= 2 && currentMonth <= 5; // Mar-Jun
        break;
      case "Summer":
        isInSeason = currentMonth >= 5 && currentMonth <= 8; // Jun-Sep
        break;
      case "Fall":
        isInSeason = currentMonth >= 8 && currentMonth <= 11; // Sep-Dec
        break;
      case "Winter":
        isInSeason = currentMonth >= 11 || currentMonth <= 2; // Dec-Mar
        break;
    }
    
    if (isInSeason) return 10;
    
    // Adjacent seasons get partial credit
    const adjacentSeasons: { [key: string]: number[] } = {
      "Spring": [1, 2, 5, 6], // Feb, Mar, Jun, Jul
      "Summer": [4, 5, 8, 9], // May, Jun, Sep, Oct
      "Fall": [7, 8, 11, 0], // Aug, Sep, Dec, Jan
      "Winter": [10, 11, 2, 3], // Nov, Dec, Mar, Apr
    };
    
    if (adjacentSeasons[mushroomSeason]?.includes(currentMonth)) {
      return 6;
    }
    
    return 2; // Out of season
  }

  /**
   * Get textual explanation of probability factors
   */
  static getProbabilityExplanation(factors: ProbabilityFactors): string[] {
    const explanations: string[] = [];
    
    if (factors.temperature >= 20) explanations.push("Optimal temperature conditions");
    else if (factors.temperature >= 15) explanations.push("Good temperature");
    else if (factors.temperature >= 10) explanations.push("Adequate temperature");
    else explanations.push("Temperature not ideal");
    
    if (factors.humidity >= 15) explanations.push("Excellent humidity levels");
    else if (factors.humidity >= 10) explanations.push("Good humidity");
    else explanations.push("Low humidity conditions");
    
    if (factors.recentRainfall >= 12) explanations.push("Perfect recent rainfall");
    else if (factors.recentRainfall >= 8) explanations.push("Good soil moisture");
    else if (factors.recentRainfall >= 4) explanations.push("Some soil moisture");
    else explanations.push("Dry conditions");
    
    if (factors.treeSpecies >= 12) explanations.push("Excellent tree species match");
    else if (factors.treeSpecies >= 8) explanations.push("Good tree compatibility");
    else explanations.push("Limited tree species match");
    
    if (factors.season >= 8) explanations.push("Peak season for mushrooms");
    else if (factors.season >= 6) explanations.push("Good seasonal timing");
    else explanations.push("Outside optimal season");
    
    return explanations;
  }
}

// Export default instance
export const probabilityCalculator = ProbabilityCalculator;
