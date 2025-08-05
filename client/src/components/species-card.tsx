import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Mountain, TreePine, AlertTriangle, ImageIcon } from "lucide-react";
import type { MushroomSpecies } from "@shared/schema";

interface SpeciesCardProps {
  species: MushroomSpecies;
  detailed?: boolean;
}

// Mushroom emoji mapping based on species type
const getMushroomEmoji = (species: MushroomSpecies): string => {
  const name = species.name.toLowerCase();
  const scientificName = species.scientificName.toLowerCase();
  
  if (name.includes('porcini') || scientificName.includes('boletus')) return '🍄‍🟫';
  if (name.includes('chanterelle') || scientificName.includes('cantharellus')) return '🟡';
  if (name.includes('morel') || scientificName.includes('morchella')) return '🍄‍🟫';
  if (name.includes('oyster') || scientificName.includes('pleurotus')) return '🦪';
  if (name.includes('amanita muscaria')) return '🍄';
  if (name.includes('amanita phalloides')) return '☠️';
  if (name.includes('russula')) return '🔴';
  if (name.includes('lactarius')) return '🧡';
  if (name.includes('suillus')) return '🟤';
  if (name.includes('hydnum')) return '🦔';
  if (name.includes('craterellus')) return '⚫';
  if (name.includes('leccinum')) return '🟫';
  if (name.includes('armillaria')) return '🟨';
  if (name.includes('fomes')) return '🪵';
  if (name.includes('trametes')) return '🤍';
  
  // Default mushroom emoji
  return '🍄';
};

// Get color scheme based on mushroom type
const getColorScheme = (species: MushroomSpecies) => {
  const name = species.name.toLowerCase();
  
  if (name.includes('chanterelle')) return 'from-yellow-100 to-orange-200';
  if (name.includes('porcini')) return 'from-amber-100 to-brown-200';
  if (name.includes('morel')) return 'from-gray-100 to-stone-200';
  if (name.includes('oyster')) return 'from-gray-100 to-slate-200';
  if (name.includes('amanita muscaria')) return 'from-red-100 to-red-200';
  if (name.includes('amanita phalloides')) return 'from-gray-100 to-gray-300';
  if (name.includes('russula')) return 'from-red-100 to-pink-200';
  if (name.includes('lactarius')) return 'from-orange-100 to-yellow-200';
  
  return 'from-forest-100 to-forest-200';
};

export default function SpeciesCard({ species, detailed = false }: SpeciesCardProps) {
  const getSeasonColor = (season: string) => {
    switch (season) {
      case "Spring": return "bg-green-100 text-green-700";
      case "Summer": return "bg-yellow-100 text-yellow-700";
      case "Fall": return "bg-orange-100 text-orange-700";
      case "Winter": return "bg-blue-100 text-blue-700";
      case "All Year": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner": return "bg-green-100 text-green-700";
      case "intermediate": return "bg-yellow-100 text-yellow-700";
      case "expert": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getSeasonStatus = (season: string) => {
    const currentMonth = new Date().getMonth();
    
    if (season === "All Year") return "Available";
    
    let isInSeason = false;
    if (season === "Spring" && currentMonth >= 2 && currentMonth <= 5) isInSeason = true;
    if (season === "Summer" && currentMonth >= 5 && currentMonth <= 8) isInSeason = true;
    if (season === "Fall" && currentMonth >= 8 && currentMonth <= 11) isInSeason = true;
    if (season === "Winter" && (currentMonth >= 11 || currentMonth <= 2)) isInSeason = true;
    
    return isInSeason ? "Peak Season" : "Out of Season";
  };

  const mushroomEmoji = getMushroomEmoji(species);
  const colorScheme = getColorScheme(species);

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
      data-testid={`species-card-${species.id}`}
    >
      {/* Species Image/Visual */}
      <div className={`h-32 bg-gradient-to-br ${colorScheme} flex items-center justify-center relative`}>
        <div className="text-6xl filter drop-shadow-lg">{mushroomEmoji}</div>
        
        {/* Edible/Safety indicator */}
        <div className="absolute top-2 right-2">
          {!species.edible ? (
            <div className="bg-red-500 text-white rounded-full p-1" title="Not Edible">
              <AlertTriangle className="h-3 w-3" />
            </div>
          ) : species.difficulty === 'expert' ? (
            <div className="bg-orange-500 text-white rounded-full p-1" title="Expert Level - Caution Required">
              <AlertTriangle className="h-3 w-3" />
            </div>
          ) : (
            <div className="bg-green-500 text-white rounded-full p-1" title="Edible">
              <div className="w-3 h-3 rounded-full bg-white"></div>
            </div>
          )}
        </div>

        {/* Season indicator */}
        <div className="absolute bottom-2 left-2">
          <Badge 
            className={`text-xs px-2 py-1 ${getSeasonColor(species.season)} shadow-sm`}
            data-testid={`badge-season-${species.id}`}
          >
            {getSeasonStatus(species.season)}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Name and Scientific Name */}
          <div>
            <h4 className="font-medium text-gray-900 leading-tight" data-testid={`text-species-name-${species.id}`}>
              {species.name}
            </h4>
            <p className="text-xs text-gray-600 italic" data-testid={`text-scientific-name-${species.id}`}>
              {species.scientificName}
            </p>
          </div>
          
          {/* Quick Info Row */}
          <div className="flex items-center justify-between">
            <Badge 
              className={`text-xs px-2 py-1 ${getDifficultyColor(species.difficulty)}`}
              data-testid={`badge-difficulty-${species.id}`}
            >
              {species.difficulty.charAt(0).toUpperCase() + species.difficulty.slice(1)}
            </Badge>
            <span className="text-forest-600 text-xs font-medium" data-testid={`text-season-${species.id}`}>
              {species.season}
            </span>
          </div>

          {/* Detailed Information */}
          {detailed && (
            <div className="space-y-2 pt-2 border-t border-gray-100">
              {/* Description */}
              {species.description && (
                <p className="text-xs text-gray-700 leading-relaxed" data-testid={`text-description-${species.id}`}>
                  {species.description}
                </p>
              )}
              
              {/* Environmental Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {species.optimalTemp && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span data-testid={`text-temp-${species.id}`}>
                      {species.optimalTemp}°C
                    </span>
                  </div>
                )}
                
                {species.elevationMin && species.elevationMax && (
                  <div className="flex items-center space-x-1">
                    <Mountain className="h-3 w-3 text-gray-500" />
                    <span data-testid={`text-elevation-${species.id}`}>
                      {species.elevationMin}-{species.elevationMax}m
                    </span>
                  </div>
                )}

                {species.optimalHumidity && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    <span>
                      {species.optimalHumidity}% humidity
                    </span>
                  </div>
                )}

                {species.soilTempMin && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                    <span>
                      {species.soilTempMin}°C soil
                    </span>
                  </div>
                )}
              </div>
              
              {/* Forest Types */}
              {species.forestTypes && species.forestTypes.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1 mb-1">
                    <TreePine className="h-3 w-3 text-gray-500" />
                    <span className="text-xs font-medium text-gray-700">Forest Types:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {species.forestTypes.slice(0, 3).map((forest, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs px-1 py-0 text-green-700 border-green-300"
                        data-testid={`badge-forest-${species.id}-${index}`}
                      >
                        {forest}
                      </Badge>
                    ))}
                    {species.forestTypes.length > 3 && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        +{species.forestTypes.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Tree Associations */}
              {species.treeAssociations && species.treeAssociations.length > 0 && (
                <div>
                  <div className="flex items-center space-x-1 mb-1">
                    <TreePine className="h-3 w-3 text-gray-500" />
                    <span className="text-xs font-medium text-gray-700">Associated Trees:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {species.treeAssociations.slice(0, 3).map((tree, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="text-xs px-1 py-0"
                        data-testid={`badge-tree-${species.id}-${index}`}
                      >
                        {tree}
                      </Badge>
                    ))}
                    {species.treeAssociations.length > 3 && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        +{species.treeAssociations.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {/* Safety Notes */}
              {species.safetyNotes && (
                <div className={`${!species.edible ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border rounded p-2`}>
                  <div className="flex items-start space-x-1">
                    <AlertTriangle className={`h-3 w-3 ${!species.edible ? 'text-red-600' : 'text-yellow-600'} mt-0.5 flex-shrink-0`} />
                    <p className={`text-xs ${!species.edible ? 'text-red-800' : 'text-yellow-800'}`} data-testid={`text-safety-${species.id}`}>
                      {species.safetyNotes}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional warning for non-edible species */}
              {!species.edible && (
                <div className="bg-red-100 border border-red-300 rounded p-2">
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3 text-red-600" />
                    <span className="text-xs font-medium text-red-800">NOT EDIBLE - DO NOT CONSUME</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
