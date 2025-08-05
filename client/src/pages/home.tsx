import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MobileHeader from "@/components/mobile-header";
import BottomNavigation from "@/components/bottom-navigation";
import MushroomMap from "@/components/mushroom-map";
import EnvironmentalConditions from "@/components/environmental-conditions";
import LocationCard from "@/components/location-card";
import SpeciesCard from "@/components/species-card";
import { useGeolocation } from "@/hooks/use-geolocation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Navigation, Clock, AlertTriangle } from "lucide-react";
import type { LocationWithProbability, MushroomSpecies } from "@shared/schema";

export default function Home() {
  const [searchRadius, setSearchRadius] = useState(5); // km
  const { location, error: locationError, isLoading: locationLoading } = useGeolocation();

  // Fetch nearby locations
  const { data: nearbyLocations, isLoading: locationsLoading } = useQuery({
    queryKey: ["/api/locations/nearby", location?.latitude, location?.longitude, searchRadius],
    enabled: !!location,
  });

  // Fetch mushroom species
  const { data: species } = useQuery<MushroomSpecies[]>({
    queryKey: ["/api/species"],
  });

  // Fetch current weather
  const { data: currentWeather } = useQuery({
    queryKey: ["/api/weather/current", location?.latitude, location?.longitude],
    enabled: !!location,
  });

  const handleRadiusChange = (radius: number) => {
    setSearchRadius(radius);
  };

  if (locationError) {
    return (
      <div className="min-h-screen bg-forest-50">
        <MobileHeader />
        <div className="p-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Unable to access your location. Please enable GPS and refresh the page.
            </AlertDescription>
          </Alert>
        </div>
        <BottomNavigation currentPage="map" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-forest-50 pb-20">
      <MobileHeader />
      
      {/* Location Controls */}
      <div className="bg-white shadow-sm border-b border-forest-200">
        <div className="p-4 space-y-3">
          {/* Current Location Display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-forest-600" />
              <div>
                {locationLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                ) : location ? (
                  <>
                    <p className="text-sm font-medium text-gray-900" data-testid="current-location">
                      Current Location
                    </p>
                    <p className="text-xs text-gray-500" data-testid="coordinates">
                      {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Getting location...</p>
                )}
              </div>
            </div>
            <Button 
              size="sm" 
              className="bg-forest-600 hover:bg-forest-700" 
              data-testid="button-update-location"
            >
              <Navigation className="h-3 w-3 mr-1" />
              Update
            </Button>
          </div>
          
          {/* Search Radius Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search Radius</label>
            <div className="flex space-x-2">
              {[1, 5, 10].map((radius) => (
                <Button
                  key={radius}
                  variant={searchRadius === radius ? "default" : "outline"}
                  size="sm"
                  className={`flex-1 ${
                    searchRadius === radius 
                      ? "bg-forest-600 hover:bg-forest-700" 
                      : "border-forest-200 text-forest-700 hover:bg-forest-50"
                  }`}
                  onClick={() => handleRadiusChange(radius)}
                  data-testid={`button-radius-${radius}km`}
                >
                  {radius}km
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      {location && (
        <MushroomMap
          center={location}
          locations={nearbyLocations || []}
          radius={searchRadius}
        />
      )}

      {/* Environmental Conditions */}
      {currentWeather && <EnvironmentalConditions weather={currentWeather} />}

      {/* Nearby Locations */}
      <div className="bg-white">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Navigation className="h-5 w-5 text-forest-600 mr-2" />
              Nearby Locations
            </h3>
            <Button variant="ghost" size="sm" className="text-forest-600" data-testid="button-view-all-locations">
              View All
            </Button>
          </div>
          
          {locationsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="flex space-x-2">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : nearbyLocations && nearbyLocations.length > 0 ? (
            <div className="space-y-3">
              {nearbyLocations.slice(0, 3).map((location: LocationWithProbability) => (
                <LocationCard key={location.id} location={location} />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No foraging locations found in this area.</p>
              <p className="text-sm text-gray-500 mt-1">Try increasing your search radius.</p>
            </Card>
          )}
        </div>
      </div>

      {/* Species Guide Preview */}
      <div className="bg-gray-50">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 text-forest-600 mr-2" />
              Current Season Species
            </h3>
            <Button variant="ghost" size="sm" className="text-forest-600" data-testid="button-view-species-guide">
              View All
            </Button>
          </div>
          
          {species ? (
            <div className="grid grid-cols-2 gap-3">
              {species.slice(0, 4).map((specie) => (
                <SpeciesCard key={specie.id} species={specie} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="h-32 bg-gray-200"></div>
                    <div className="p-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Safety Alert */}
      <div className="bg-red-50 border-l-4 border-red-400 m-4 rounded-r-lg">
        <div className="p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-1 mr-3" />
            <div>
              <h4 className="text-red-800 font-medium text-sm mb-1">Foraging Safety Reminder</h4>
              <p className="text-red-700 text-xs mb-2">
                Always verify mushroom identification with multiple sources. When in doubt, don't consume. 
                Check local regulations and respect private property.
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-600 text-xs underline font-medium p-0 h-auto"
                data-testid="button-safety-guide"
              >
                Read Full Safety Guide
              </Button>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation currentPage="map" />
    </div>
  );
}
