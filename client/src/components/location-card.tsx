import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Mountain, Clock, Navigation, Car, TreePine } from "lucide-react";
import type { LocationWithProbability } from "@shared/schema";

interface LocationCardProps {
  location: LocationWithProbability;
}

export default function LocationCard({ location }: LocationCardProps) {
  const getProbabilityColor = (probability: number) => {
    if (probability >= 90) return "bg-forest-600 text-white";
    if (probability >= 70) return "bg-yellow-500 text-white";
    if (probability >= 50) return "bg-earth-600 text-white";
    return "bg-gray-500 text-white";
  };

  const getProbabilityLabel = (probability: number) => {
    if (probability >= 90) return "Excellent";
    if (probability >= 70) return "Good";
    if (probability >= 50) return "Fair";
    return "Poor";
  };

  const getWalkTime = (distance: number) => {
    // Assume 4 km/h walking speed
    const hours = distance / 4;
    const minutes = Math.round(hours * 60);
    return minutes;
  };

  const getAccessibilityColor = (accessibility: string) => {
    switch (accessibility) {
      case "easy": return "bg-green-100 text-green-700";
      case "moderate": return "bg-yellow-100 text-yellow-700";
      case "difficult": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      data-testid={`location-card-${location.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Name and Probability */}
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="font-medium text-gray-900" data-testid={`text-location-name-${location.id}`}>
                {location.name}
              </h4>
              <Badge 
                className={`text-xs px-2 py-1 font-bold ${getProbabilityColor(location.probability)}`}
                data-testid={`badge-probability-${location.id}`}
              >
                {Math.round(location.probability)}%
              </Badge>
            </div>
            
            {/* Location Details */}
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center">
                <MapPin className="h-3 w-3 text-forest-600 mr-1" />
                <span data-testid={`text-distance-${location.id}`}>
                  {location.distance} km
                </span>
              </span>
              
              {location.elevation && (
                <span className="flex items-center">
                  <Mountain className="h-3 w-3 text-earth-600 mr-1" />
                  <span data-testid={`text-elevation-${location.id}`}>
                    {location.elevation}m
                  </span>
                </span>
              )}
              
              <span className="flex items-center">
                <Clock className="h-3 w-3 text-gray-500 mr-1" />
                <span data-testid={`text-walk-time-${location.id}`}>
                  {getWalkTime(location.distance)} min
                </span>
              </span>
            </div>
            
            {/* Species and Features */}
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              {/* Suitable Species */}
              {location.suitableSpecies.slice(0, 2).map((species, index) => (
                <Badge 
                  key={index}
                  variant="outline"
                  className="text-xs px-2 py-1"
                  data-testid={`badge-species-${location.id}-${index}`}
                >
                  {species}
                </Badge>
              ))}
              
              {/* Forest Type */}
              {location.forestType && (
                <Badge 
                  variant="outline" 
                  className="text-xs px-2 py-1"
                  data-testid={`badge-forest-type-${location.id}`}
                >
                  <TreePine className="h-3 w-3 mr-1" />
                  {location.forestType}
                </Badge>
              )}
              
              {/* Accessibility */}
              {location.accessibility && (
                <Badge 
                  className={`text-xs px-2 py-1 ${getAccessibilityColor(location.accessibility)}`}
                  data-testid={`badge-accessibility-${location.id}`}
                >
                  {location.accessibility.charAt(0).toUpperCase() + location.accessibility.slice(1)}
                </Badge>
              )}
              
              {/* Parking */}
              {location.parkingAvailable && (
                <Badge 
                  variant="outline" 
                  className="text-xs px-2 py-1"
                  data-testid={`badge-parking-${location.id}`}
                >
                  <Car className="h-3 w-3 mr-1" />
                  Parking
                </Badge>
              )}
            </div>
            
            {/* Description */}
            {location.description && (
              <p className="text-sm text-gray-700 mt-2" data-testid={`text-description-${location.id}`}>
                {location.description}
              </p>
            )}
            
            {/* Current Conditions */}
            {location.currentConditions && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Current: </span>
                {location.currentConditions.temperature && (
                  <span data-testid={`text-current-temp-${location.id}`}>
                    {Math.round(location.currentConditions.temperature)}°C, 
                  </span>
                )}
                {location.currentConditions.humidity && (
                  <span data-testid={`text-current-humidity-${location.id}`}>
                    {Math.round(location.currentConditions.humidity)}% humidity
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Navigation Button */}
          <Button 
            size="icon"
            className="ml-3 bg-forest-600 hover:bg-forest-700 text-white rounded-full"
            data-testid={`button-navigate-${location.id}`}
          >
            <Navigation className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
