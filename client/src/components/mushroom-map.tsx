import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Layers, Navigation } from "lucide-react";
import type { LocationWithProbability } from "@shared/schema";

interface MushroomMapProps {
  center: {
    latitude: number;
    longitude: number;
  };
  locations: LocationWithProbability[];
  radius: number;
}

export default function MushroomMap({ center, locations, radius }: MushroomMapProps) {
  const [zoom, setZoom] = useState(12);
  const [showLayers, setShowLayers] = useState(false);

  // Mock map tiles for demonstration
  const mapStyle = {
    backgroundImage: `url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 90) return "bg-forest-600";
    if (probability >= 70) return "bg-yellow-500";
    if (probability >= 50) return "bg-earth-600";
    return "bg-gray-500";
  };

  const getProbabilityLabel = (probability: number) => {
    if (probability >= 90) return "Excellent";
    if (probability >= 70) return "Good";
    if (probability >= 50) return "Fair";
    return "Poor";
  };

  return (
    <div className="relative h-96 bg-forest-100" data-testid="mushroom-map">
      {/* Map Container */}
      <div className="absolute inset-0 overflow-hidden" style={mapStyle}>
        {/* Map Overlay */}
        <div className="absolute inset-0 bg-forest-900 bg-opacity-20">
          {/* Location Markers */}
          {locations.map((location, index) => {
            // Simple positioning based on relative coordinates
            const x = 20 + (index * 25) % 60;
            const y = 20 + Math.floor(index / 3) * 30;
            
            return (
              <div
                key={location.id}
                className={`absolute marker-pulse`}
                style={{ 
                  left: `${x}%`, 
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                data-testid={`marker-${location.id}`}
              >
                <div className={`${getProbabilityColor(location.probability)} text-white rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg`}>
                  {Math.round(location.probability)}
                </div>
                <div className="bg-white text-gray-700 text-xs px-2 py-1 rounded mt-1 shadow-md font-medium max-w-20 text-center truncate">
                  {location.suitableSpecies[0] || "Mixed"}
                </div>
              </div>
            );
          })}
          
          {/* User Location */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" data-testid="user-location">
            <div className="bg-blue-600 rounded-full w-4 h-4 flex items-center justify-center relative">
              <div className="bg-white rounded-full w-2 h-2"></div>
              <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30"></div>
            </div>
          </div>
          
          {/* Search Radius Circle */}
          <div 
            className="absolute border-2 border-blue-400 border-opacity-50 rounded-full pointer-events-none"
            style={{
              width: `${radius * 20}px`,
              height: `${radius * 20}px`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            data-testid="search-radius"
          />
        </div>
      </div>
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <Button
          size="icon"
          variant="secondary"
          className="bg-white shadow-lg hover:bg-gray-50"
          onClick={() => setZoom(Math.min(zoom + 1, 18))}
          data-testid="button-zoom-in"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white shadow-lg hover:bg-gray-50"
          onClick={() => setZoom(Math.max(zoom - 1, 8))}
          data-testid="button-zoom-out"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="bg-white shadow-lg hover:bg-gray-50"
          onClick={() => setShowLayers(!showLayers)}
          data-testid="button-toggle-layers"
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs" data-testid="map-legend">
        <h4 className="font-medium text-gray-900 mb-2">Probability Score</h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-forest-600 rounded-full"></div>
            <span>90-100% Excellent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>70-89% Good</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-earth-600 rounded-full"></div>
            <span>50-69% Fair</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span>Your Location</span>
          </div>
        </div>
      </div>

      {/* Layers Panel */}
      {showLayers && (
        <Card className="absolute top-4 left-4 p-3 shadow-lg" data-testid="layers-panel">
          <h4 className="font-medium text-gray-900 mb-2 text-sm">Map Layers</h4>
          <div className="space-y-2 text-xs">
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Foraging Locations</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Forest Types</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Elevation Contours</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" className="rounded" />
              <span>Weather Overlay</span>
            </label>
          </div>
        </Card>
      )}
    </div>
  );
}
