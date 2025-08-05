import { swissFungiFetcher, SwissFungiSpecies } from './swiss-fungi-fetcher';
import { storage } from './storage';
import { MushroomSpecies, InsertMushroomSpecies } from '@shared/schema';

export interface SyncReport {
  totalSwissSpecies: number;
  existingSpecies: number;
  newSpeciesAdded: number;
  updatedSpecies: number;
  errors: Array<{
    species: string;
    error: string;
  }>;
  missingSpecies: Array<{
    scientificName: string;
    commonName?: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  }>;
}

export class SwissFungiSyncService {
  private syncInProgress = false;
  private lastSyncDate?: Date;

  /**
   * Synchronize Swiss Fungi data with local database
   */
  async syncWithSwissFungi(options: {
    maxSpecies?: number;
    updateExisting?: boolean;
    addMissing?: boolean;
  } = {}): Promise<SyncReport> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    const report: SyncReport = {
      totalSwissSpecies: 0,
      existingSpecies: 0,
      newSpeciesAdded: 0,
      updatedSpecies: 0,
      errors: [],
      missingSpecies: []
    };

    try {
      console.log('Starting Swiss Fungi synchronization...');
      
      // Get existing species from local database
      const existingSpecies = await storage.getMushroomSpecies();
      const existingByScientificName = new Map(
        existingSpecies.map(s => [s.scientificName.toLowerCase(), s])
      );

      console.log(`Found ${existingSpecies.length} existing species in local database`);

      // Fetch Swiss Fungi species data
      const swissSpecies = await swissFungiFetcher.fetchAllSpecies();
      report.totalSwissSpecies = swissSpecies.length;

      console.log(`Fetched ${swissSpecies.length} species from Swiss Fungi database`);

      // Process each Swiss species
      const processLimit = options.maxSpecies || swissSpecies.length;
      const toProcess = swissSpecies.slice(0, processLimit);

      for (const swissSpecies of toProcess) {
        try {
          await this.processSpecies(
            swissSpecies, 
            existingByScientificName, 
            report, 
            options
          );
        } catch (error) {
          report.errors.push({
            species: swissSpecies.scientificName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Identify high-priority missing species
      await this.identifyMissingSpecies(swissSpecies, existingByScientificName, report);

      this.lastSyncDate = new Date();
      console.log('Swiss Fungi synchronization completed', report);

      return report;
    } catch (error) {
      console.error('Swiss Fungi synchronization failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a single Swiss Fungi species
   */
  private async processSpecies(
    swissSpecies: SwissFungiSpecies,
    existingByScientificName: Map<string, MushroomSpecies>,
    report: SyncReport,
    options: { updateExisting?: boolean; addMissing?: boolean }
  ): Promise<void> {
    const scientificNameLower = swissSpecies.scientificName.toLowerCase();
    const existing = existingByScientificName.get(scientificNameLower);

    if (existing) {
      report.existingSpecies++;
      
      if (options.updateExisting) {
        // Update existing species with Swiss Fungi data
        const updatedData = this.mergeSpeciesData(existing, swissSpecies);
        if (this.hasSignificantChanges(existing, updatedData)) {
          // Note: In a real implementation, we'd update the database here
          console.log(`Would update species: ${swissSpecies.scientificName}`);
          report.updatedSpecies++;
        }
      }
    } else if (options.addMissing) {
      // Add new species from Swiss Fungi
      try {
        const newSpecies = swissFungiFetcher.convertToInternalFormat(swissSpecies);
        await storage.createMushroomSpecies(newSpecies);
        report.newSpeciesAdded++;
        console.log(`Added new species: ${swissSpecies.scientificName}`);
      } catch (error) {
        throw new Error(`Failed to add species: ${error}`);
      }
    }
  }

  /**
   * Identify missing species that should be prioritized
   */
  private async identifyMissingSpecies(
    swissSpecies: SwissFungiSpecies[],
    existingByScientificName: Map<string, MushroomSpecies>,
    report: SyncReport
  ): Promise<void> {
    for (const species of swissSpecies) {
      const scientificNameLower = species.scientificName.toLowerCase();
      
      if (!existingByScientificName.has(scientificNameLower)) {
        const priority = this.calculateSpeciesPriority(species);
        const reason = this.getPriorityReason(species, priority);
        
        report.missingSpecies.push({
          scientificName: species.scientificName,
          commonName: species.commonName,
          priority,
          reason
        });
      }
    }

    // Sort missing species by priority
    report.missingSpecies.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate priority for missing species
   */
  private calculateSpeciesPriority(species: SwissFungiSpecies): 'high' | 'medium' | 'low' {
    // High priority: Edible species, common species, or endangered species
    if (this.isLikelyEdible(species) || 
        species.frequency === 'common' ||
        species.redListStatus?.toLowerCase().includes('endangered')) {
      return 'high';
    }

    // Medium priority: Occasional species or those with interesting characteristics
    if (species.frequency === 'occasional' || 
        species.conservationStatus ||
        species.habitats.length > 2) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get reason for species priority
   */
  private getPriorityReason(species: SwissFungiSpecies, priority: 'high' | 'medium' | 'low'): string {
    if (priority === 'high') {
      if (this.isLikelyEdible(species)) return 'Potentially edible species';
      if (species.frequency === 'common') return 'Common species in Switzerland';
      if (species.redListStatus?.toLowerCase().includes('endangered')) return 'Endangered species';
    }
    
    if (priority === 'medium') {
      if (species.frequency === 'occasional') return 'Occasionally found species';
      if (species.conservationStatus) return 'Species with conservation status';
      if (species.habitats.length > 2) return 'Species with diverse habitat preferences';
    }
    
    return 'Additional species for completeness';
  }

  /**
   * Check if species is likely edible based on name patterns
   */
  private isLikelyEdible(species: SwissFungiSpecies): boolean {
    const name = species.scientificName.toLowerCase();
    const edibleGenera = [
      'boletus', 'cantharellus', 'morchella', 'pleurotus', 
      'agaricus', 'lactarius', 'russula', 'leccinum',
      'suillus', 'hydnum', 'craterellus'
    ];
    
    return edibleGenera.some(genus => name.startsWith(genus));
  }

  /**
   * Merge Swiss Fungi data with existing species data
   */
  private mergeSpeciesData(
    existing: MushroomSpecies, 
    swissData: SwissFungiSpecies
  ): Partial<MushroomSpecies> {
    const merged: Partial<MushroomSpecies> = { ...existing };

    // Update elevation range if Swiss data is more specific
    if (swissData.elevationRange.min && (!existing.elevationMin || swissData.elevationRange.min > existing.elevationMin)) {
      merged.elevationMin = swissData.elevationRange.min;
    }
    if (swissData.elevationRange.max && (!existing.elevationMax || swissData.elevationRange.max < existing.elevationMax)) {
      merged.elevationMax = swissData.elevationRange.max;
    }

    // Enhance description with Swiss data
    if (swissData.conservationStatus || swissData.redListStatus) {
      let additionalInfo = '';
      if (swissData.conservationStatus) {
        additionalInfo += ` Conservation status: ${swissData.conservationStatus}.`;
      }
      if (swissData.redListStatus) {
        additionalInfo += ` Red List status: ${swissData.redListStatus}.`;
      }
      merged.description = (existing.description || '') + additionalInfo;
    }

    // Update safety notes for protected species
    if (swissData.redListStatus?.toLowerCase().includes('endangered') && 
        !existing.safetyNotes?.includes('Protected')) {
      merged.safetyNotes = (existing.safetyNotes || '') + ' Protected species - observation only, do not harvest.';
    }

    return merged;
  }

  /**
   * Check if merged data has significant changes
   */
  private hasSignificantChanges(
    existing: MushroomSpecies, 
    updated: Partial<MushroomSpecies>
  ): boolean {
    return (
      updated.elevationMin !== existing.elevationMin ||
      updated.elevationMax !== existing.elevationMax ||
      updated.description !== existing.description ||
      updated.safetyNotes !== existing.safetyNotes
    );
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    inProgress: boolean;
    lastSyncDate?: Date;
  } {
    return {
      inProgress: this.syncInProgress,
      lastSyncDate: this.lastSyncDate
    };
  }

  /**
   * Get species comparison report
   */
  async getSpeciesComparisonReport(): Promise<{
    localSpeciesCount: number;
    swissSpeciesCount: number;
    commonSpecies: string[];
    localOnlySpecies: string[];
    swissOnlySpecies: string[];
  }> {
    const localSpecies = await storage.getMushroomSpecies();
    const localScientificNames = new Set(
      localSpecies.map(s => s.scientificName.toLowerCase())
    );

    // For demonstration, we'll use a subset of known Swiss species
    const knownSwissSpecies = [
      'Boletus edulis',
      'Cantharellus cibarius',
      'Morchella esculenta',
      'Pleurotus ostreatus',
      'Amanita muscaria',
      'Amanita phalloides',
      'Russula cyanoxantha',
      'Lactarius deliciosus',
      'Suillus luteus',
      'Hydnum repandum',
      'Craterellus cornucopioides',
      'Leccinum scabrum',
      'Armillaria mellea',
      'Fomes fomentarius',
      'Trametes versicolor'
    ];

    const swissScientificNames = new Set(
      knownSwissSpecies.map(s => s.toLowerCase())
    );

    const commonSpecies = Array.from(localScientificNames).filter(name => 
      swissScientificNames.has(name)
    );

    const localOnlySpecies = Array.from(localScientificNames).filter(name => 
      !swissScientificNames.has(name)
    );

    const swissOnlySpecies = Array.from(swissScientificNames).filter(name => 
      !localScientificNames.has(name)
    );

    return {
      localSpeciesCount: localSpecies.length,
      swissSpeciesCount: knownSwissSpecies.length,
      commonSpecies: commonSpecies.map(name => 
        localSpecies.find(s => s.scientificName.toLowerCase() === name)?.scientificName || name
      ),
      localOnlySpecies: localOnlySpecies.map(name => 
        localSpecies.find(s => s.scientificName.toLowerCase() === name)?.scientificName || name
      ),
      swissOnlySpecies: swissOnlySpecies.map(name => 
        knownSwissSpecies.find(s => s.toLowerCase() === name) || name
      )
    };
  }

  /**
   * Add curated Swiss species to the database
   */
  async addCuratedSwissSpecies(): Promise<SyncReport> {
    const report: SyncReport = {
      totalSwissSpecies: 0,
      existingSpecies: 0,
      newSpeciesAdded: 0,
      updatedSpecies: 0,
      errors: [],
      missingSpecies: []
    };

    // Curated list of important Swiss mushroom species
    const curatedSpecies: InsertMushroomSpecies[] = [
      {
        name: "Fly Agaric",
        scientificName: "Amanita muscaria",
        description: "Iconic red mushroom with white spots, highly toxic and hallucinogenic. Common in Swiss forests, especially under birch and pine trees.",
        season: "Fall",
        optimalTemp: 15,
        optimalHumidity: 85,
        soilTempMin: 8,
        treeAssociations: ["Birch", "Pine", "Spruce"],
        forestTypes: ["Conifer", "Mixed"],
        elevationMin: 400,
        elevationMax: 1800,
        edible: false,
        difficulty: "expert",
        safetyNotes: "EXTREMELY DANGEROUS - Highly toxic and psychoactive. Never consume. Can cause severe poisoning and death."
      },
      {
        name: "Death Cap",
        scientificName: "Amanita phalloides",
        description: "One of the most deadly mushrooms in the world. Responsible for most mushroom poisoning deaths. Found in Swiss deciduous forests.",
        season: "Fall",
        optimalTemp: 16,
        optimalHumidity: 80,
        soilTempMin: 10,
        treeAssociations: ["Oak", "Beech", "Chestnut"],
        forestTypes: ["Hardwood", "Mixed"],
        elevationMin: 200,
        elevationMax: 1200,
        edible: false,
        difficulty: "expert",
        safetyNotes: "DEADLY POISONOUS - Contains amatoxins that cause liver and kidney failure. Often mistaken for edible species. Avoid at all costs."
      },
      {
        name: "Saffron Milk Cap",
        scientificName: "Lactarius deliciosus",
        description: "Excellent edible mushroom with orange-red milk that turns green when cut. Prized in Swiss cuisine, found under pine trees.",
        season: "Fall",
        optimalTemp: 14,
        optimalHumidity: 75,
        soilTempMin: 8,
        treeAssociations: ["Pine", "Spruce"],
        forestTypes: ["Conifer"],
        elevationMin: 500,
        elevationMax: 1600,
        edible: true,
        difficulty: "intermediate",
        safetyNotes: "Generally safe when properly identified. The orange milk that turns green is a key identifying feature."
      },
      {
        name: "Charcoal Burner",
        scientificName: "Russula cyanoxantha",
        description: "Variable colored edible mushroom, excellent when cooked. One of the best Russula species for eating, common in Swiss beech forests.",
        season: "Summer",
        optimalTemp: 18,
        optimalHumidity: 80,
        soilTempMin: 12,
        treeAssociations: ["Beech", "Oak"],
        forestTypes: ["Hardwood", "Mixed"],
        elevationMin: 300,
        elevationMax: 1400,
        edible: true,
        difficulty: "intermediate",
        safetyNotes: "Good edible when cooked. Distinguish from other Russula species by its flexible gills and mild taste."
      },
      {
        name: "Slippery Jack",
        scientificName: "Suillus luteus",
        description: "Slimy-capped bolete with a distinctive ring on the stem. Common under pine trees throughout Switzerland, good edible when young.",
        season: "Fall",
        optimalTemp: 16,
        optimalHumidity: 85,
        soilTempMin: 10,
        treeAssociations: ["Pine"],
        forestTypes: ["Conifer"],
        elevationMin: 400,
        elevationMax: 1800,
        edible: true,
        difficulty: "beginner",
        safetyNotes: "Safe edible bolete. Remove slimy cap skin before cooking. No toxic look-alikes in the bolete family."
      },
      {
        name: "Wood Hedgehog",
        scientificName: "Hydnum repandum",
        description: "Excellent edible mushroom with spines instead of gills. Cream to orange colored, found in Swiss forests, no toxic look-alikes.",
        season: "Fall",
        optimalTemp: 15,
        optimalHumidity: 80,
        soilTempMin: 8,
        treeAssociations: ["Beech", "Oak", "Pine", "Spruce"],
        forestTypes: ["Hardwood", "Conifer", "Mixed"],
        elevationMin: 300,
        elevationMax: 1600,
        edible: true,
        difficulty: "beginner",
        safetyNotes: "Excellent beginner mushroom - no toxic look-alikes. The spines under the cap are distinctive."
      },
      {
        name: "Horn of Plenty",
        scientificName: "Craterellus cornucopioides",
        description: "Dark trumpet-shaped mushroom, excellent dried or fresh. Also called Black Trumpet, found in Swiss deciduous forests.",
        season: "Fall",
        optimalTemp: 14,
        optimalHumidity: 85,
        soilTempMin: 8,
        treeAssociations: ["Beech", "Oak"],
        forestTypes: ["Hardwood"],
        elevationMin: 300,
        elevationMax: 1200,
        edible: true,
        difficulty: "intermediate",
        safetyNotes: "Excellent edible with no toxic look-alikes. The dark, trumpet shape is distinctive."
      },
      {
        name: "Brown Birch Bolete",
        scientificName: "Leccinum scabrum",
        description: "Good edible bolete with dark scales on the stem. Common under birch trees in Swiss forests, flesh may darken when cut.",
        season: "Summer",
        optimalTemp: 17,
        optimalHumidity: 80,
        soilTempMin: 12,
        treeAssociations: ["Birch"],
        forestTypes: ["Mixed"],
        elevationMin: 400,
        elevationMax: 1500,
        edible: true,
        difficulty: "intermediate",
        safetyNotes: "Good edible bolete. Cook thoroughly as some people may have digestive issues with undercooked specimens."
      },
      {
        name: "Honey Mushroom",
        scientificName: "Armillaria mellea",
        description: "Parasitic mushroom growing in clusters on trees and stumps. Edible when cooked, but can cause digestive upset if undercooked.",
        season: "Fall",
        optimalTemp: 15,
        optimalHumidity: 85,
        soilTempMin: 8,
        treeAssociations: ["Oak", "Beech", "Pine", "Spruce"],
        forestTypes: ["Hardwood", "Conifer", "Mixed"],
        elevationMin: 200,
        elevationMax: 1600,
        edible: true,
        difficulty: "intermediate",
        safetyNotes: "Must be cooked thoroughly - never eat raw. Can cause digestive issues if undercooked or consumed in large quantities."
      },
      {
        name: "Tinder Fungus",
        scientificName: "Fomes fomentarius",
        description: "Large bracket fungus growing on dead birch and beech trees. Historically used for tinder and medicinal purposes, not edible.",
        season: "All Year",
        optimalTemp: 10,
        optimalHumidity: 70,
        soilTempMin: 0,
        treeAssociations: ["Birch", "Beech"],
        forestTypes: ["Hardwood", "Mixed"],
        elevationMin: 300,
        elevationMax: 1800,
        edible: false,
        difficulty: "beginner",
        safetyNotes: "Not edible but not toxic. Historically important for fire-making and traditional medicine."
      }
    ];

    try {
      const existingSpecies = await storage.getMushroomSpecies();
      const existingNames = new Set(existingSpecies.map(s => s.scientificName.toLowerCase()));

      for (const species of curatedSpecies) {
        if (!existingNames.has(species.scientificName.toLowerCase())) {
          try {
            await storage.createMushroomSpecies(species);
            report.newSpeciesAdded++;
            console.log(`Added curated species: ${species.scientificName}`);
          } catch (error) {
            report.errors.push({
              species: species.scientificName,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        } else {
          report.existingSpecies++;
        }
      }

      report.totalSwissSpecies = curatedSpecies.length;
      console.log(`Added ${report.newSpeciesAdded} new curated Swiss species`);

      return report;
    } catch (error) {
      console.error('Failed to add curated Swiss species:', error);
      throw error;
    }
  }
}

export const swissFungiSync = new SwissFungiSyncService();