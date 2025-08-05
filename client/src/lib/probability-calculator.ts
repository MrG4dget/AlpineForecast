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
      else factors.temperature = 5;
    } else if (weather?.temperature) {
      // General temperature assessment for Swiss conditions
      if (weather.temperature >= 15 && weather.temperature <= 22) factors.temperature = 20;
      else if (weather.temperature >= 10 && weather.temperature <= 25) factors.temperature = 15;
      else if (weather.temperature >= 5 && weather.temperature <= 30) factors.temperature = 10;
      else factors.temperature = 5;
    } else {
      // Default moderate score if no weather data
      factors.temperature = 15;
    }

    // Humidity factor (0-20 points)
    if (weather?.humidity && species.optimalHumidity) {
      const humidityDiff = Math.abs(weather.humidity - species.optimalHumidity);
      if (humidityDiff <= 5) factors.humidity = 20;
      else if (humidityDiff <= 10) factors.humidity = 15;
      else if (humidityDiff <= 15) factors.humidity = 12;
      else if (humidityDiff <= 20) factors.humidity = 8;
      else factors.humidity = 5;
    } else if (weather?.humidity) {
      // General humidity assessment - mushrooms prefer high humidity
      if (weather.humidity >= 80) factors.humidity = 20;
      else if (weather.humidity >= 70) factors.humidity = 15;
      else if (weather.humidity >= 60) factors.humidity = 10;
      else if (weather.humidity >= 50) factors.humidity = 5;
      else factors.humidity = 2;
    } else {
      factors.humidity = 12;
    }

    // Soil temperature factor (0-15 points)
    if (weather?.soilTemperature && species.soilTempMin) {
      if (weather.soilTemperature >= species.soilTempMin + 8) factors.soilTemperature = 15;
      else if (weather.soilTemperature >= species.soilTempMin + 5) factors.soilTemperature = 12;
      else if (weather.soilTemperature >= species.soilTempMin + 2) factors.soilTemperature = 10;
      else if (weather.soilTemperature >= species.soilTempMin) factors.soilTemperature = 8;
      else if (weather.soilTemperature >= species.soilTempMin - 3) factors.soilTemperature = 5;
      else factors.soilTemperature = 2;
    } else if (weather?.soilTemperature) {
      // General soil temperature assessment
      if (weather.soilTemperature >= 12) factors.soilTemperature = 12;
      else if (weather.soilTemperature >= 8) factors.soilTemperature = 10;
      else if (weather.soilTemperature >= 5) factors.soilTemperature = 6;
      else factors.soilTemperature = 3;
    } else {
      factors.soilTemperature = 8;
    }

    // Recent rainfall factor (0-15 points) - Fixed logic
    if (weather?.lastRainfall !== undefined && weather.lastRainfall !== null) {
      if (weather.lastRainfall <= 2) factors.recentRainfall = 15; // Perfect
      else if (weather.lastRainfall <= 4) factors.recentRainfall = 12; // Excellent
      else if (weather.lastRainfall <= 7) factors.recentRainfall = 10; // Good
      else if (weather.lastRainfall <= 14) factors.recentRainfall = 6; // Fair
      else if (weather.lastRainfall <= 21) factors.recentRainfall = 3; // Poor
      else factors.recentRainfall = 1; // Very dry
    } else {
      factors.recentRainfall = 8;
    }

    // Elevation factor (0-10 points) - Enhanced for Swiss conditions
    if (location.elevation && species.elevationMin && species.elevationMax) {
      if (location.elevation >= species.elevationMin && location.elevation <= species.elevationMax) {
        // Perfect elevation range
        factors.elevation = 10;
      } else {
        const minDiff = Math.abs(location.elevation - species.elevationMin);
        const maxDiff = Math.abs(location.elevation - species.elevationMax);
        const closestDiff = Math.min(minDiff, maxDiff);
        
        if (closestDiff <= 50) factors.elevation = 9;
        else if (closestDiff <= 100) factors.elevation = 8;
        else if (closestDiff <= 200) factors.elevation = 6;
        else if (closestDiff <= 400) factors.elevation = 4;
        else if (closestDiff <= 600) factors.elevation = 2;
        else factors.elevation = 1;
      }
    } else if (location.elevation) {
      // General Swiss elevation assessment
      if (location.elevation >= 400 && location.elevation <= 1200) factors.elevation = 8; // Optimal zone
      else if (location.elevation >= 200 && location.elevation <= 1600) factors.elevation = 6; // Good zone
      else if (location.elevation >= 100 && location.elevation <= 2000) factors.elevation = 4; // Fair zone
      else factors.elevation = 2;
    } else {
      factors.elevation = 6;
    }

    // Forest type factor (0-10 points) - Enhanced matching
    if (location.forestType && species.forestTypes && species.forestTypes.length > 0) {
      const forestMatch = species.forestTypes.some(type => {
        const locationType = location.forestType?.toLowerCase() || "";
        const speciesType = type.toLowerCase();
        
        // Exact match
        if (locationType === speciesType) return true;
        
        // Partial matches for Swiss forest types
        if (locationType.includes("mixed") && speciesType.includes("mixed")) return true;
        if (locationType.includes("conifer") && (speciesType.includes("conifer") || speciesType.includes("softwood"))) return true;
        if (locationType.includes("hardwood") && (speciesType.includes("hardwood") || speciesType.includes("deciduous"))) return true;
        if (locationType.includes("deciduous") && speciesType.includes("hardwood")) return true;
        
        return false;
      });
      
      factors.forestType = forestMatch ? 10 : 3;
    } else if (location.forestType) {
      // Default scoring for common forest types
      const forestType = location.forestType.toLowerCase();
      if (forestType.includes("mixed")) factors.forestType = 8; // Mixed forests are generally good
      else if (forestType.includes("conifer") || forestType.includes("hardwood")) factors.forestType = 6;
      else factors.forestType = 4;
    } else {
      factors.forestType = 5;
    }

    // Tree species factor (0-15 points) - Enhanced Swiss tree matching
    if (location.treeSpecies && species.treeAssociations && species.treeAssociations.length > 0) {
      const matchingTrees = location.treeSpecies.filter(tree => {
        return species.treeAssociations!.some(assoc => {
          const treeStr = tree.toLowerCase();
          const assocStr = assoc.toLowerCase();
          
          // Exact matches
          if (treeStr === assocStr) return true;
          
          // Swiss-specific tree name variations
          if ((treeStr.includes("spruce") || treeStr.includes("fichte")) && 
              (assocStr.includes("spruce") || assocStr.includes("picea"))) return true;
          if ((treeStr.includes("beech") || treeStr.includes("buche")) && 
              (assocStr.includes("beech") || assocStr.includes("fagus"))) return true;
          if ((treeStr.includes("fir") || treeStr.includes("tanne")) && 
              (assocStr.includes("fir") || assocStr.includes("abies"))) return true;
          if ((treeStr.includes("pine") || treeStr.includes("kiefer")) && 
              (assocStr.includes("pine") || assocStr.includes("pinus"))) return true;
          if ((treeStr.includes("oak") || treeStr.includes("eiche")) && 
              (assocStr.includes("oak") || assocStr.includes("quercus"))) return true;
          if ((treeStr.includes("birch") || treeStr.includes("birke")) && 
              (assocStr.includes("birch") || assocStr.includes("betula"))) return true;
          
          // Partial matches
          return treeStr.includes(assocStr) || assocStr.includes(treeStr);
        });
      });
      
      const matchRatio = matchingTrees.length / Math.max(location.treeSpecies.length, 1);
      if (matchRatio >= 0.7) factors.treeSpecies = 15; // Excellent match
      else if (matchRatio >= 0.5) factors.treeSpecies = 12; // Good match
      else if (matchRatio >= 0.3) factors.treeSpecies = 10; // Fair match
      else if (matchRatio >= 0.1) factors.treeSpecies = 6; // Some match
      else factors.treeSpecies = 3; // Poor match
    } else {
      factors.treeSpecies = 8;
    }

    // Season factor (0-10 points) - Fixed seasonal logic
    factors.season = this.getSeasonalScore(species.season);

    // Calculate total score with proper weighting
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

    // Get species with decent probability (>=40 for good species, >=30 for fair)
    const suitableSpecies = speciesProbabilities
      .filter(sp => sp.probability >= 35)
      .map(sp => sp.species.name);

    // Get top 5 species for this location (increased from 3)
    const topSpecies = speciesProbabilities
      .slice(0, 5)
      .map(sp => sp.species);

    // Calculate overall probability as weighted average of top species
    const topProbabilities = speciesProbabilities.slice(0, 3).map(sp => sp.probability);
    const overallProbability = topProbabilities.length > 0
      ? Math.round(topProbabilities.reduce((sum, prob, index) => {
          // More balanced weighting
          const weight = index === 0 ? 0.4 : index === 1 ? 0.35 : 0.25;
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
   * Get seasonal scoring based on current date - FIXED LOGIC
   */
  private static getSeasonalScore(mushroomSeason: string): number {
    const currentMonth = new Date().getMonth(); // 0-11 (Jan=0, Dec=11)
    
    if (mushroomSeason === "All Year") return 10;
    
    // Handle multi-season species (e.g., "Summer, Fall")
    const seasons = mushroomSeason.split(',').map(s => s.trim());
    let maxScore = 0;
    
    for (const season of seasons) {
      let seasonScore = this.getSingleSeasonScore(season, currentMonth);
      maxScore = Math.max(maxScore, seasonScore);
    }
    
    return maxScore || this.getSingleSeasonScore(mushroomSeason, currentMonth);
  }

  /**
   * Get score for a single season - FIXED month ranges
   */
  private static getSingleSeasonScore(season: string, currentMonth: number): number {
    let isInSeason = false;
    let isAdjacentSeason = false;
    
    switch (season) {
      case "Spring":
        isInSeason = currentMonth >= 2 && currentMonth <= 4; // Mar-May (2-4)
        isAdjacentSeason = currentMonth === 1 || currentMonth === 5; // Feb, Jun
        break;
      case "Summer":
        isInSeason = currentMonth >= 5 && currentMonth <= 7; // Jun-Aug (5-7)
        isAdjacentSeason = currentMonth === 4 || currentMonth === 8; // May, Sep
        break;
      case "Fall":
        isInSeason = currentMonth >= 8 && currentMonth <= 10; // Sep-Nov (8-10)
        isAdjacentSeason = currentMonth === 7 || currentMonth === 11; // Aug, Dec
        break;
      case "Winter":
        isInSeason = currentMonth === 11 || currentMonth <= 1; // Dec-Feb (11, 0, 1)
        isAdjacentSeason = currentMonth === 2 || currentMonth === 10; // Mar, Nov
        break;
    }
    
    if (isInSeason) return 10;
    if (isAdjacentSeason) return 6;
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
    else if (factors.humidity >= 5) explanations.push("Fair humidity");
    else explanations.push("Low humidity conditions");
    
    if (factors.recentRainfall >= 12) explanations.push("Perfect recent rainfall");
    else if (factors.recentRainfall >= 8) explanations.push("Good soil moisture");
    else if (factors.recentRainfall >= 4) explanations.push("Some soil moisture");
    else explanations.push("Dry conditions");
    
    if (factors.treeSpecies >= 12) explanations.push("Excellent tree species match");
    else if (factors.treeSpecies >= 8) explanations.push("Good tree compatibility");
    else if (factors.treeSpecies >= 5) explanations.push("Fair tree match");
    else explanations.push("Limited tree species match");
    
    if (factors.season >= 8) explanations.push("Peak season for mushrooms");
    else if (factors.season >= 6) explanations.push("Good seasonal timing");
    else if (factors.season >= 4) explanations.push("Fair seasonal timing");
    else explanations.push("Outside optimal season");

    if (factors.elevation >= 8) explanations.push("Optimal elevation zone");
    else if (factors.elevation >= 6) explanations.push("Good elevation");
    else if (factors.elevation >= 4) explanations.push("Fair elevation");
    else explanations.push("Elevation not ideal");
    
    return explanations;
  }

  /**
   * Calculate server-compatible probability (matches server logic)
   */
  static calculateServerCompatibleProbability(
    location: ForagingLocation, 
    weather: WeatherData | null
  ): number {
    let probability = 50; // Base probability

    // Elevation factor - matches server logic
    if (location.elevation && location.elevation >= 400 && location.elevation <= 1200) {
      probability += 15;
    }

    // Forest type factor - matches server logic
    if (location.forestType === "Mixed") {
      probability += 10;
    } else if (location.forestType === "Conifer" || location.forestType === "Hardwood") {
      probability += 5;
    }

    // Weather factors - matches server logic
    if (weather) {
      // Temperature
      if (weather.temperature !== null && weather.temperature >= 15 && weather.temperature <= 22) {
        probability += 15;
      } else if (weather.temperature !== null && weather.temperature >= 10 && weather.temperature <= 25) {
        probability += 5;
      }

      // Humidity
      if (weather.humidity !== null && weather.humidity >= 80) {
        probability += 10;
      } else if (weather.humidity !== null && weather.humidity >= 70) {
        probability += 5;
      }

      // Recent rainfall
      if (weather.lastRainfall !== null && weather.lastRainfall <= 3) {
        probability += 10;
      } else if (weather.lastRainfall !== null && weather.lastRainfall <= 7) {
        probability += 5;
      }

      // Soil temperature
      if (weather.soilTemperature !== null && weather.soilTemperature >= 12) {
        probability += 10;
      }
    }

    return Math.min(Math.max(probability, 0), 100);
  }
}

// Export default instance
export const probabilityCalculator = ProbabilityCalculator;
