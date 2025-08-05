import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Mountain, TreePine, AlertTriangle } from "lucide-react";
import type { MushroomSpecies } from "@shared/schema";

interface SpeciesCardProps {
  species: MushroomSpecies;
  detailed?: boolean;
}

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

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
      data-testid={`species-card-${species.id}`}
    >
      {/* Species Image */}
      <div className="h-32 bg-gradient-to-br from-forest-100 to-forest-200 flex items-center justify-center">
        <div className="text-4xl">🍄</div>
      </div>
      
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Name and Scientific Name */}
          <div>
            <h4 className="font-medium text-gray-900" data-testid={`text-species-name-${species.id}`}>
              {species.name}
            </h4>
            <p className="text-xs text-gray-600 italic" data-testid={`text-scientific-name-${species.id}`}>
              {species.scientificName}
            </p>
          </div>
          
          {/* Season Badge */}
          <div className="flex items-center justify-between">
            <Badge 
              className={`text-xs px-2 py-1 ${getSeasonColor(species.season)}`}
              data-testid={`badge-season-${species.id}`}
            >
              {getSeasonStatus(species.season)}
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
                <p className="text-xs text-gray-700" data-testid={`text-description-${species.id}`}>
                  {species.description}
                </p>
              )}
              
              {/* Environmental Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {species.optimalTemp && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 text-gray-500" />
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
              </div>
              
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
              
              {/* Difficulty */}
              <div className="flex items-center justify-between">
                <Badge 
                  className={`text-xs px-2 py-1 ${getDifficultyColor(species.difficulty)}`}
                  data-testid={`badge-difficulty-${species.id}`}
                >
                  {species.difficulty.charAt(0).toUpperCase() + species.difficulty.slice(1)}
                </Badge>
                
                {!species.edible && (
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-xs text-red-600">Not Edible</span>
                  </div>
                )}
              </div>
              
              {/* Safety Notes */}
              {species.safetyNotes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                  <div className="flex items-start space-x-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-yellow-800" data-testid={`text-safety-${species.id}`}>
                      {species.safetyNotes}
                    </p>
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
