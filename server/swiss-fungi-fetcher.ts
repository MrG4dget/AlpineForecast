import axios from 'axios';
import * as cheerio from 'cheerio';
import { InsertMushroomSpecies } from '@shared/schema';

export interface SwissFungiSpecies {
  scientificName: string;
  commonName?: string;
  germanName?: string;
  frenchName?: string;
  italianName?: string;
  family?: string;
  genus?: string;
  species?: string;
  conservationStatus?: string;
  redListStatus?: string;
  substrates: string[];
  habitats: string[];
  elevationRange: {
    min?: number;
    max?: number;
  };
  locations: SwissFungiLocation[];
  phenology: {
    months: number[];
    peakMonths: number[];
  };
  frequency: string;
  threatLevel?: string;
  distribution: {
    regions: string[];
    coordinates: Array<{
      lat: number;
      lng: number;
      year?: number;
      verified: boolean;
    }>;
  };
}

export interface SwissFungiLocation {
  coordinates: {
    lat: number;
    lng: number;
  };
  municipality?: string;
  canton?: string;
  elevation?: number;
  habitat?: string;
  substrate?: string;
  year?: number;
  verified: boolean;
  findingDetails?: {
    quantity?: string;
    notes?: string;
    collector?: string;
  };
}

export class SwissFungiFetcher {
  private baseUrl = 'https://www.wsl.ch/map_fungi';
  private apiUrl = 'https://swissfungi.wsl.ch';
  private userAgent = 'Mozilla/5.0 (compatible; MushroomForagingApp/1.0)';

  constructor() {
    // Configure axios with reasonable defaults
    axios.defaults.timeout = 30000;
    axios.defaults.headers.common['User-Agent'] = this.userAgent;
  }

  /**
   * Fetch all available species from Swiss Fungi database
   */
  async fetchAllSpecies(): Promise<SwissFungiSpecies[]> {
    try {
      console.log('Fetching species list from Swiss Fungi database...');
      
      // First, get the species list page
      const response = await axios.get(`${this.apiUrl}/en/distribution-data/`, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });

      const $ = cheerio.load(response.data);
      const speciesList: SwissFungiSpecies[] = [];

      // Look for species information in the page
      // The Swiss Fungi site mentions 11,244 species currently available
      const speciesCount = this.extractSpeciesCount($);
      console.log(`Found ${speciesCount} species in Swiss Fungi database`);

      // Get recently found species from the homepage
      const recentSpecies = this.extractRecentSpecies($);
      console.log(`Extracted ${recentSpecies.length} recently found species`);

      // For each recent species, fetch detailed information
      for (const speciesName of recentSpecies) {
        try {
          const speciesData = await this.fetchSpeciesDetails(speciesName);
          if (speciesData) {
            speciesList.push(speciesData);
          }
          // Add delay to be respectful to the server
          await this.delay(1000);
        } catch (error) {
          console.warn(`Failed to fetch details for ${speciesName}:`, error);
        }
      }

      return speciesList;
    } catch (error) {
      console.error('Error fetching species from Swiss Fungi:', error);
      throw new Error('Failed to fetch species data from Swiss Fungi database');
    }
  }

  /**
   * Fetch detailed information for a specific species
   */
  async fetchSpeciesDetails(scientificName: string): Promise<SwissFungiSpecies | null> {
    try {
      console.log(`Fetching details for ${scientificName}...`);

      // Try to access the distribution map for this species
      const searchUrl = `${this.baseUrl}/search`;
      const searchResponse = await axios.get(searchUrl, {
        params: {
          taxon: scientificName,
          lang: 'en'
        }
      });

      // Parse the species page
      const $ = cheerio.load(searchResponse.data);
      
      const species: SwissFungiSpecies = {
        scientificName,
        substrates: [],
        habitats: [],
        elevationRange: {},
        locations: [],
        phenology: {
          months: [],
          peakMonths: []
        },
        frequency: 'unknown',
        distribution: {
          regions: [],
          coordinates: []
        }
      };

      // Extract basic information
      species.commonName = this.extractCommonName($);
      species.family = this.extractFamily($);
      species.genus = scientificName.split(' ')[0];
      species.species = scientificName.split(' ').slice(1).join(' ');

      // Extract conservation status
      species.conservationStatus = this.extractConservationStatus($);
      species.redListStatus = this.extractRedListStatus($);

      // Extract substrates and habitats
      species.substrates = this.extractSubstrates($);
      species.habitats = this.extractHabitats($);

      // Extract elevation range
      species.elevationRange = this.extractElevationRange($);

      // Extract phenology (seasonal occurrence)
      species.phenology = this.extractPhenology($);

      // Extract frequency information
      species.frequency = this.extractFrequency($);

      // Extract distribution data
      species.distribution = await this.extractDistributionData($, scientificName);

      return species;
    } catch (error) {
      console.error(`Error fetching details for ${scientificName}:`, error);
      return null;
    }
  }

  /**
   * Convert Swiss Fungi species to our internal format
   */
  convertToInternalFormat(swissSpecies: SwissFungiSpecies): InsertMushroomSpecies {
    // Determine edibility based on known patterns
    const isEdible = this.determineEdibility(swissSpecies);
    
    // Determine difficulty based on various factors
    const difficulty = this.determineDifficulty(swissSpecies);
    
    // Determine season based on phenology
    const season = this.determineSeason(swissSpecies.phenology);

    // Extract tree associations from substrates
    const treeAssociations = this.extractTreeAssociations(swissSpecies.substrates);

    // Determine forest types from habitats
    const forestTypes = this.determineForestTypes(swissSpecies.habitats);

    return {
      name: swissSpecies.commonName || swissSpecies.scientificName.split(' ').slice(1).join(' '),
      scientificName: swissSpecies.scientificName,
      description: this.generateDescription(swissSpecies),
      season,
      optimalTemp: this.estimateOptimalTemp(swissSpecies),
      optimalHumidity: this.estimateOptimalHumidity(swissSpecies),
      soilTempMin: this.estimateSoilTempMin(swissSpecies),
      treeAssociations,
      forestTypes,
      elevationMin: swissSpecies.elevationRange.min || 0,
      elevationMax: swissSpecies.elevationRange.max || 3000,
      edible: isEdible,
      difficulty,
      safetyNotes: this.generateSafetyNotes(swissSpecies)
    };
  }

  private extractSpeciesCount($: cheerio.CheerioAPI): number {
    // Look for the species count in the database news section
    const dbNews = $('.database-news, .datenbank-news').text();
    const match = dbNews.match(/(\d{1,3}[',.]?\d{3})\s*Pilzarten/i) || 
                  dbNews.match(/(\d{1,3}[',.]?\d{3})\s*species/i);
    
    if (match) {
      return parseInt(match[1].replace(/[',.]/, ''));
    }
    return 11244; // Default based on known count
  }

  private extractRecentSpecies($: cheerio.CheerioAPI): string[] {
    const species: string[] = [];
    
    // Extract from "recently found species" section
    const recentSection = $('*:contains("Pilzarten in diesem Jahr das erste Mal gefunden"), *:contains("species found for the first time this year")').parent();
    
    if (recentSection.length) {
      const speciesText = recentSection.text();
      // Extract scientific names (typically in italics or specific format)
      const matches = speciesText.match(/[A-Z][a-z]+ [a-z]+/g);
      if (matches) {
        species.push(...matches.slice(0, 50)); // Limit to first 50 for testing
      }
    }

    // Also extract from recent finds
    const recentFinds = $('*:contains("letzten") *:contains("Pilzfunde"), *:contains("latest") *:contains("finds")').parent();
    if (recentFinds.length) {
      const findsText = recentFinds.text();
      const matches = findsText.match(/[A-Z][a-z]+ [a-z]+/g);
      if (matches) {
        species.push(...matches.slice(0, 10));
      }
    }

    // Remove duplicates and return
    return [...new Set(species)];
  }

  private extractCommonName($: cheerio.CheerioAPI): string | undefined {
    // Look for common name in various locations
    const commonName = $('.common-name, .vernacular-name, h1, h2').first().text().trim();
    return commonName || undefined;
  }

  private extractFamily($: cheerio.CheerioAPI): string | undefined {
    const family = $('*:contains("Family:"), *:contains("Familie:")').next().text().trim();
    return family || undefined;
  }

  private extractConservationStatus($: cheerio.CheerioAPI): string | undefined {
    const status = $('*:contains("Conservation"), *:contains("Schutzstatus")').next().text().trim();
    return status || undefined;
  }

  private extractRedListStatus($: cheerio.CheerioAPI): string | undefined {
    const redList = $('*:contains("Red List"), *:contains("Rote Liste")').next().text().trim();
    return redList || undefined;
  }

  private extractSubstrates($: cheerio.CheerioAPI): string[] {
    const substrates: string[] = [];
    const substrateSection = $('*:contains("Substrate"), *:contains("Substrat")').parent();
    
    if (substrateSection.length) {
      const substrateText = substrateSection.text();
      // Common substrate patterns
      const patterns = [
        /wood|holz|bois/gi,
        /soil|boden|sol/gi,
        /leaf|blatt|feuille/gi,
        /bark|rinde|écorce/gi,
        /root|wurzel|racine/gi,
        /dung|mist|fumier/gi
      ];
      
      patterns.forEach(pattern => {
        if (pattern.test(substrateText)) {
          substrates.push(pattern.source.split('|')[0]);
        }
      });
    }
    
    return substrates;
  }

  private extractHabitats($: cheerio.CheerioAPI): string[] {
    const habitats: string[] = [];
    const habitatSection = $('*:contains("Habitat"), *:contains("Lebensraum")').parent();
    
    if (habitatSection.length) {
      const habitatText = habitatSection.text();
      // Common habitat patterns
      const patterns = [
        /forest|wald|forêt/gi,
        /meadow|wiese|prairie/gi,
        /mountain|berg|montagne/gi,
        /deciduous|laubwald|feuillus/gi,
        /coniferous|nadelwald|conifères/gi,
        /mixed|mischwald|mixte/gi
      ];
      
      patterns.forEach(pattern => {
        if (pattern.test(habitatText)) {
          habitats.push(pattern.source.split('|')[0]);
        }
      });
    }
    
    return habitats;
  }

  private extractElevationRange($: cheerio.CheerioAPI): { min?: number; max?: number } {
    const elevationText = $('*:contains("Elevation"), *:contains("Höhe"), *:contains("Altitude")').parent().text();
    const range: { min?: number; max?: number } = {};
    
    // Look for elevation patterns like "400-1500m" or "up to 2000m"
    const rangeMatch = elevationText.match(/(\d+)\s*[-–]\s*(\d+)\s*m/);
    const maxMatch = elevationText.match(/up to (\d+)m|bis (\d+)m/);
    
    if (rangeMatch) {
      range.min = parseInt(rangeMatch[1]);
      range.max = parseInt(rangeMatch[2]);
    } else if (maxMatch) {
      range.max = parseInt(maxMatch[1] || maxMatch[2]);
    }
    
    return range;
  }

  private extractPhenology($: cheerio.CheerioAPI): { months: number[]; peakMonths: number[] } {
    const phenologyText = $('*:contains("Phenology"), *:contains("Phänologie"), *:contains("Season")').parent().text();
    const months: number[] = [];
    const peakMonths: number[] = [];
    
    // Map month names to numbers
    const monthMap: { [key: string]: number } = {
      'january': 1, 'januar': 1, 'janvier': 1,
      'february': 2, 'februar': 2, 'février': 2,
      'march': 3, 'märz': 3, 'mars': 3,
      'april': 4, 'avril': 4,
      'may': 5, 'mai': 5,
      'june': 6, 'juni': 6, 'juin': 6,
      'july': 7, 'juli': 7, 'juillet': 7,
      'august': 8, 'août': 8,
      'september': 9, 'septembre': 9,
      'october': 10, 'oktober': 10, 'octobre': 10,
      'november': 11, 'novembre': 11,
      'december': 12, 'dezember': 12, 'décembre': 12
    };
    
    Object.entries(monthMap).forEach(([monthName, monthNum]) => {
      if (new RegExp(monthName, 'i').test(phenologyText)) {
        months.push(monthNum);
      }
    });
    
    return { months, peakMonths };
  }

  private extractFrequency($: cheerio.CheerioAPI): string {
    const frequencyText = $('*:contains("Frequency"), *:contains("Häufigkeit")').parent().text().toLowerCase();
    
    if (frequencyText.includes('common') || frequencyText.includes('häufig')) return 'common';
    if (frequencyText.includes('rare') || frequencyText.includes('selten')) return 'rare';
    if (frequencyText.includes('occasional') || frequencyText.includes('gelegentlich')) return 'occasional';
    
    return 'unknown';
  }

  private async extractDistributionData($: cheerio.CheerioAPI, scientificName: string): Promise<{
    regions: string[];
    coordinates: Array<{ lat: number; lng: number; year?: number; verified: boolean }>;
  }> {
    // This would require more complex parsing of map data
    // For now, return basic structure
    return {
      regions: [],
      coordinates: []
    };
  }

  private determineEdibility(species: SwissFungiSpecies): boolean {
    // Conservative approach - only mark as edible if we have clear indicators
    const name = species.scientificName.toLowerCase();
    const commonName = (species.commonName || '').toLowerCase();
    
    // Known edible genera/species patterns
    const ediblePatterns = [
      /boletus edulis/,
      /cantharellus/,
      /morchella/,
      /pleurotus/,
      /agaricus/,
      /lactarius deliciosus/
    ];
    
    // Known toxic patterns
    const toxicPatterns = [
      /amanita phalloides/,
      /amanita ocreata/,
      /cortinarius/,
      /galerina/,
      /conocybe/
    ];
    
    // Check for toxic patterns first
    if (toxicPatterns.some(pattern => pattern.test(name))) {
      return false;
    }
    
    // Check for edible patterns
    return ediblePatterns.some(pattern => pattern.test(name));
  }

  private determineDifficulty(species: SwissFungiSpecies): 'beginner' | 'intermediate' | 'expert' {
    const name = species.scientificName.toLowerCase();
    
    // Beginner-friendly species
    if (/pleurotus|cantharellus/.test(name)) {
      return 'beginner';
    }
    
    // Expert-level species (toxic look-alikes, rare species)
    if (/amanita|cortinarius|morchella/.test(name) || species.frequency === 'rare') {
      return 'expert';
    }
    
    return 'intermediate';
  }

  private determineSeason(phenology: { months: number[]; peakMonths: number[] }): string {
    const months = phenology.months;
    if (months.length === 0) return 'All Year';
    
    const springMonths = [3, 4, 5];
    const summerMonths = [6, 7, 8];
    const fallMonths = [9, 10, 11];
    const winterMonths = [12, 1, 2];
    
    const seasons = [];
    if (months.some(m => springMonths.includes(m))) seasons.push('Spring');
    if (months.some(m => summerMonths.includes(m))) seasons.push('Summer');
    if (months.some(m => fallMonths.includes(m))) seasons.push('Fall');
    if (months.some(m => winterMonths.includes(m))) seasons.push('Winter');
    
    if (seasons.length >= 3) return 'All Year';
    return seasons.join(', ') || 'All Year';
  }

  private extractTreeAssociations(substrates: string[]): string[] {
    const treeMap: { [key: string]: string[] } = {
      'oak': ['Oak'],
      'beech': ['Beech'],
      'pine': ['Pine'],
      'spruce': ['Spruce'],
      'fir': ['Fir'],
      'birch': ['Birch'],
      'maple': ['Maple'],
      'ash': ['Ash'],
      'elm': ['Elm']
    };
    
    const associations: string[] = [];
    substrates.forEach(substrate => {
      Object.entries(treeMap).forEach(([key, trees]) => {
        if (substrate.toLowerCase().includes(key)) {
          associations.push(...trees);
        }
      });
    });
    
    return [...new Set(associations)];
  }

  private determineForestTypes(habitats: string[]): string[] {
    const forestTypes: string[] = [];
    
    habitats.forEach(habitat => {
      const h = habitat.toLowerCase();
      if (h.includes('deciduous') || h.includes('hardwood')) forestTypes.push('Hardwood');
      if (h.includes('coniferous') || h.includes('softwood')) forestTypes.push('Conifer');
      if (h.includes('mixed')) forestTypes.push('Mixed');
    });
    
    return [...new Set(forestTypes)];
  }

  private generateDescription(species: SwissFungiSpecies): string {
    let description = `${species.scientificName}`;
    
    if (species.family) {
      description += ` belongs to the ${species.family} family`;
    }
    
    if (species.habitats.length > 0) {
      description += ` and is typically found in ${species.habitats.join(', ')} habitats`;
    }
    
    if (species.substrates.length > 0) {
      description += ` growing on ${species.substrates.join(', ')}`;
    }
    
    description += '.';
    
    if (species.conservationStatus) {
      description += ` Conservation status: ${species.conservationStatus}.`;
    }
    
    return description;
  }

  private estimateOptimalTemp(species: SwissFungiSpecies): number | undefined {
    // Estimate based on elevation and season
    const elevation = species.elevationRange.min || 500;
    const baseTemp = 20 - (elevation / 200); // Rough temperature lapse rate
    return Math.max(5, Math.min(25, baseTemp));
  }

  private estimateOptimalHumidity(species: SwissFungiSpecies): number | undefined {
    // Most fungi prefer high humidity
    return 80;
  }

  private estimateSoilTempMin(species: SwissFungiSpecies): number | undefined {
    // Estimate minimum soil temperature
    const elevation = species.elevationRange.min || 500;
    return Math.max(2, 15 - (elevation / 300));
  }

  private generateSafetyNotes(species: SwissFungiSpecies): string | undefined {
    const name = species.scientificName.toLowerCase();
    
    if (/amanita/.test(name)) {
      return 'EXTREMELY DANGEROUS - Many Amanita species are deadly poisonous. Only for expert identification.';
    }
    
    if (/cortinarius/.test(name)) {
      return 'WARNING - Some Cortinarius species are highly toxic. Expert identification required.';
    }
    
    if (species.redListStatus && species.redListStatus.toLowerCase().includes('endangered')) {
      return 'Protected species - Do not harvest. Observation only.';
    }
    
    return 'Always verify identification with multiple sources before consumption.';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const swissFungiFetcher = new SwissFungiFetcher();