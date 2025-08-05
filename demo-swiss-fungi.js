#!/usr/bin/env node

/**
 * Swiss Fungi Integration Demo Script
 * 
 * This script demonstrates the Swiss Fungi integration capabilities:
 * 1. Adding curated Swiss mushroom species
 * 2. Comparing local database with Swiss Fungi data
 * 3. Fetching species information from Swiss Fungi database
 */

import { swissFungiSync } from './server/swiss-fungi-sync.ts';
import { storage } from './server/storage.ts';

async function runDemo() {
  console.log('🍄 Swiss Fungi Integration Demo\n');
  console.log('This demo showcases integration with the Swiss Fungi database (https://swissfungi.wsl.ch)\n');

  try {
    // Step 1: Show current species count
    console.log('📊 Current Database Status:');
    const currentSpecies = await storage.getMushroomSpecies();
    console.log(`   • Local species count: ${currentSpecies.length}`);
    
    // Step 2: Get comparison report
    console.log('\n🔍 Generating Species Comparison Report...');
    const comparison = await swissFungiSync.getSpeciesComparisonReport();
    console.log(`   • Local species: ${comparison.localSpeciesCount}`);
    console.log(`   • Known Swiss species: ${comparison.swissSpeciesCount}`);
    console.log(`   • Common species: ${comparison.commonSpecies.length}`);
    console.log(`   • Missing Swiss species: ${comparison.swissOnlySpecies.length}`);
    
    if (comparison.swissOnlySpecies.length > 0) {
      console.log('\n   Missing Swiss species:');
      comparison.swissOnlySpecies.slice(0, 5).forEach(species => {
        console.log(`     - ${species}`);
      });
      if (comparison.swissOnlySpecies.length > 5) {
        console.log(`     ... and ${comparison.swissOnlySpecies.length - 5} more`);
      }
    }

    // Step 3: Add curated Swiss species
    console.log('\n📥 Adding Curated Swiss Species...');
    const curatedReport = await swissFungiSync.addCuratedSwissSpecies();
    console.log(`   • Total curated species: ${curatedReport.totalSwissSpecies}`);
    console.log(`   • New species added: ${curatedReport.newSpeciesAdded}`);
    console.log(`   • Already existing: ${curatedReport.existingSpecies}`);
    
    if (curatedReport.errors.length > 0) {
      console.log(`   • Errors: ${curatedReport.errors.length}`);
      curatedReport.errors.forEach(error => {
        console.log(`     - ${error.species}: ${error.error}`);
      });
    }

    // Step 4: Show updated species count
    console.log('\n📊 Updated Database Status:');
    const updatedSpecies = await storage.getMushroomSpecies();
    console.log(`   • Local species count: ${updatedSpecies.length}`);
    console.log(`   • Species added: ${updatedSpecies.length - currentSpecies.length}`);

    // Step 5: Show some of the newly added species
    if (curatedReport.newSpeciesAdded > 0) {
      console.log('\n🆕 Recently Added Swiss Species:');
      const recentlyAdded = updatedSpecies.slice(-curatedReport.newSpeciesAdded);
      recentlyAdded.forEach(species => {
        console.log(`   • ${species.name} (${species.scientificName})`);
        console.log(`     - Season: ${species.season}`);
        console.log(`     - Edible: ${species.edible ? 'Yes' : 'No'}`);
        console.log(`     - Difficulty: ${species.difficulty}`);
        if (species.elevationMin && species.elevationMax) {
          console.log(`     - Elevation: ${species.elevationMin}-${species.elevationMax}m`);
        }
        console.log('');
      });
    }

    // Step 6: Demonstrate Swiss Fungi data structure
    console.log('🔬 Swiss Fungi Data Features:');
    console.log('   • Species locations and distribution maps');
    console.log('   • Substrate preferences (wood, soil, dung, etc.)');
    console.log('   • Habitat conditions (forest types, elevation ranges)');
    console.log('   • Seasonal occurrence patterns (phenology)');
    console.log('   • Conservation status and Red List information');
    console.log('   • Sighting records with coordinates and dates');
    console.log('   • Over 11,000 species documented in Switzerland');

    // Step 7: Show API endpoints
    console.log('\n🌐 Available API Endpoints:');
    console.log('   • GET  /api/swiss-fungi/status - Get sync status');
    console.log('   • GET  /api/swiss-fungi/comparison - Compare local vs Swiss species');
    console.log('   • POST /api/swiss-fungi/sync - Sync with Swiss Fungi database');
    console.log('   • POST /api/swiss-fungi/add-curated - Add curated Swiss species');
    console.log('   • GET  /api/species/search?q=<query> - Search species');

    // Step 8: Show safety and conservation notes
    console.log('\n⚠️  Safety & Conservation Notes:');
    const dangerousSpecies = updatedSpecies.filter(s => 
      s.safetyNotes?.includes('DANGEROUS') || s.safetyNotes?.includes('DEADLY')
    );
    if (dangerousSpecies.length > 0) {
      console.log(`   • ${dangerousSpecies.length} dangerous/toxic species identified`);
      dangerousSpecies.slice(0, 3).forEach(species => {
        console.log(`     - ${species.name}: ${species.safetyNotes?.split('.')[0]}`);
      });
    }

    const protectedSpecies = updatedSpecies.filter(s => 
      s.safetyNotes?.includes('Protected')
    );
    if (protectedSpecies.length > 0) {
      console.log(`   • ${protectedSpecies.length} protected species (observation only)`);
    }

    console.log('\n✅ Swiss Fungi integration demo completed successfully!');
    console.log('\nTo start the application and see the Swiss Fungi panel:');
    console.log('   npm run dev');
    console.log('\nThen visit the application and look for the Swiss Fungi Integration panel.');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Run the demo
runDemo();