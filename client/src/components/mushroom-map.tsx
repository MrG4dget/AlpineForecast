import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Layers, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LocationWithProbability } from "@shared/schema";

// Fix Leaflet default markers issue in webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface MushroomMapProps {
  center: {
    latitude: number;
    longitude: number;
  };
  locations: LocationWithProbability[];
  radius: number;
}

// Overlay state interface
interface OverlayState {
  foragingLocations: boolean;
  forestTypes: boolean;
  elevationContours: boolean;
  weatherOverlay: boolean;
}

// Custom WMS Layer Component
function WMSLayer({ 
  url, 
  layers, 
  format = "image/png", 
  transparent = true, 
  opacity = 0.6,
  attribution = ""
}: {
  url: string;
  layers: string;
  format?: string;
  transparent?: boolean;
  opacity?: number;
  attribution?: string;
}) {
  const map = useMap();

  useEffect(() => {
    const wmsLayer = L.tileLayer.wms(url, {
      layers,
      format,
      transparent,
      opacity,
      attribution,
    });

    map.addLayer(wmsLayer);

    return () => {
      map.removeLayer(wmsLayer);
    };
  }, [map, url, layers, format, transparent, opacity, attribution]);

  return null;
}

// Zoom Control Component
function ZoomControl({ onZoomIn, onZoomOut }: { onZoomIn: () => void; onZoomOut: () => void }) {
  return (
    <div className="absolute top-4 right-4 space-y-2 z-[1000]">
      <Button
        size="icon"
        variant="secondary"
        className="bg-white shadow-lg hover:bg-gray-50"
        onClick={onZoomIn}
        data-testid="button-zoom-in"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="bg-white shadow-lg hover:bg-gray-50"
        onClick={onZoomOut}
        data-testid="button-zoom-out"
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function MushroomMap({ center, locations, radius }: MushroomMapProps) {
  const [zoom, setZoom] = useState(12);
  const [showLayers, setShowLayers] = useState(false);
  const [overlays, setOverlays] = useState<OverlayState>({
    foragingLocations: true,
    forestTypes: false,
    elevationContours: false,
    weatherOverlay: false,
  });
  const mapRef = useRef<L.Map | null>(null);

  // Handle overlay toggle
  const toggleOverlay = (overlayName: keyof OverlayState) => {
    setOverlays(prev => ({
      ...prev,
      [overlayName]: !prev[overlayName]
    }));
  };

  // Create custom markers for different probability levels
  const createProbabilityIcon = (probability: number) => {
    const color = getProbabilityColor(probability);
    const htmlColor = color === "bg-forest-600" ? "#16a34a" : 
                     color === "bg-yellow-500" ? "#eab308" :
                     color === "bg-earth-600" ? "#a3665b" : "#6b7280";
    
    return L.divIcon({
      html: `<div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg" style="background-color: ${htmlColor}">${Math.round(probability)}</div>`,
      className: 'custom-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Create user location icon
  const userLocationIcon = L.divIcon({
    html: `<div class="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center relative">
             <div class="w-2 h-2 bg-white rounded-full"></div>
             <div class="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30"></div>
           </div>`,
    className: 'user-location-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

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

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(Math.min(mapRef.current.getZoom() + 1, 18));
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(Math.max(mapRef.current.getZoom() - 1, 8));
    }
  };

  return (
    <div className="relative h-96 bg-forest-100" data-testid="mushroom-map">
      {/* OpenStreetMap Container */}
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={zoom}
        className="h-full w-full z-0"
        zoomControl={false}
        ref={mapRef}
      >
        {/* Base Map Tiles */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Swiss Forest Types Overlay - Using swisstopo WMS */}
        {overlays.forestTypes && (
          <WMSLayer
            url="https://wms.geo.admin.ch/"
            layers="ch.bafu.waldtypisierung"
            format="image/png"
            transparent={true}
            opacity={0.6}
            attribution='&copy; <a href="https://www.geo.admin.ch/">swisstopo</a>'
          />
        )}

        {/* Swiss Elevation Contours - Using swisstopo WMS */}
        {overlays.elevationContours && (
          <WMSLayer
            url="https://wms.geo.admin.ch/"
            layers="ch.swisstopo.pixelkarte-farbe-pk25.noscale"
            format="image/png"
            transparent={true}
            opacity={0.4}
            attribution='&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>'
          />
        )}

        {/* Weather Overlay - Temperature visualization */}
        {overlays.weatherOverlay && (
          <WMSLayer
            url="https://wms.geo.admin.ch/"
            layers="ch.meteoschweiz.messwerte-lufttemperatur-10min"
            format="image/png"
            transparent={true}
            opacity={0.5}
            attribution='&copy; <a href="https://www.meteoschweiz.admin.ch/">MeteoSwiss</a>'
          />
        )}
        
        {/* User Location Marker */}
        <Marker 
          position={[center.latitude, center.longitude]} 
          icon={userLocationIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>Your Location</strong>
              <br />
              Searching within {radius} km radius
            </div>
          </Popup>
        </Marker>

        {/* Search Radius Circle */}
        <Circle
          center={[center.latitude, center.longitude]}
          radius={radius * 1000} // Convert km to meters
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
            opacity: 0.5,
          }}
        />

        {/* Foraging Location Markers - Conditionally rendered */}
        {overlays.foragingLocations && locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={createProbabilityIcon(location.probability)}
          >
            <Popup>
              <div className="text-sm">
                <strong>{location.name}</strong>
                <br />
                <span className="text-gray-600">Probability: {Math.round(location.probability)}% - {getProbabilityLabel(location.probability)}</span>
                <br />
                {location.elevation && <span className="text-gray-600">Elevation: {location.elevation}m</span>}
                <br />
                {location.forestType && <span className="text-gray-600">Forest: {location.forestType}</span>}
                <br />
                {location.suitableSpecies.length > 0 && (
                  <div className="mt-2">
                    <strong>Species found:</strong>
                    <br />
                    {location.suitableSpecies.slice(0, 3).join(", ")}
                    {location.suitableSpecies.length > 3 && "..."}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Map Controls */}
      <ZoomControl onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />
      
      {/* Layers Toggle */}
      <div className="absolute top-4 right-4 space-y-2 z-[1000] mt-20">
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
        {/* Overlay Legend */}
        {(overlays.forestTypes || overlays.elevationContours || overlays.weatherOverlay) && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <h5 className="font-medium text-gray-900 mb-1">Active Overlays</h5>
            {overlays.forestTypes && <div className="text-green-600">🌲 Forest Types</div>}
            {overlays.elevationContours && <div className="text-brown-600">⛰️ Elevation</div>}
            {overlays.weatherOverlay && <div className="text-blue-600">🌡️ Temperature</div>}
          </div>
        )}
      </div>

      {/* Enhanced Layers Panel with Working Controls */}
      {showLayers && (
        <Card className="absolute top-4 left-4 p-3 shadow-lg" data-testid="layers-panel">
          <h4 className="font-medium text-gray-900 mb-2 text-sm">Map Layers</h4>
          <div className="space-y-2 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={overlays.foragingLocations}
                onChange={() => toggleOverlay('foragingLocations')}
                className="rounded" 
              />
              <span>Foraging Locations</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={overlays.forestTypes}
                onChange={() => toggleOverlay('forestTypes')}
                className="rounded" 
              />
              <span>Forest Types (Swiss)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={overlays.elevationContours}
                onChange={() => toggleOverlay('elevationContours')}
                className="rounded" 
              />
              <span>Elevation Contours</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={overlays.weatherOverlay}
                onChange={() => toggleOverlay('weatherOverlay')}
                className="rounded" 
              />
              <span>Weather Overlay</span>
            </label>
          </div>
          <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
            <p>Data sources:</p>
            <p>• swisstopo (geo.admin.ch)</p>
            <p>• MeteoSwiss</p>
            <p>• Swiss Federal Geodata</p>
          </div>
        </Card>
      )}
    </div>
  );
}
