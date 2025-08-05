import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Layers, Navigation, AlertTriangle, Loader2 } from "lucide-react";
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

// Base layer types
interface BaseLayerOption {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom?: number;
}

const BASE_LAYERS: BaseLayerOption[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  {
    id: 'osm-france',
    name: 'OpenStreetMap France',
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  {
    id: 'cartodb-positron',
    name: 'CartoDB Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  {
    id: 'cartodb-dark',
    name: 'CartoDB Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  {
    id: 'esri-satellite',
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  {
    id: 'esri-topo',
    name: 'Topographic',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
  }
];

// Overlay state interface
interface OverlayState {
  foragingLocations: boolean;
  forestTypes: boolean;
  elevationContours: boolean;
  weatherOverlay: boolean;
}

// Overlay loading state
interface OverlayLoadingState {
  forestTypes: boolean;
  elevationContours: boolean;
  weatherOverlay: boolean;
}

// Overlay error state
interface OverlayErrorState {
  forestTypes: boolean;
  elevationContours: boolean;
  weatherOverlay: boolean;
}

// Enhanced WMS Layer Component with error handling
function WMSLayer({ 
  url, 
  layers, 
  format = "image/png", 
  transparent = true, 
  opacity = 0.6,
  attribution = "",
  onLoad,
  onError
}: {
  url: string;
  layers: string;
  format?: string;
  transparent?: boolean;
  opacity?: number;
  attribution?: string;
  onLoad?: () => void;
  onError?: (error: any) => void;
}) {
  const map = useMap();

  useEffect(() => {
    let wmsLayer: L.TileLayer.WMS | null = null;
    
    try {
      wmsLayer = L.tileLayer.wms(url, {
        layers,
        format,
        transparent,
        opacity,
        attribution,
        // Add error handling
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 transparent pixel
      });

      // Handle tile load events
      wmsLayer.on('load', () => {
        onLoad?.();
      });

      wmsLayer.on('tileerror', (error) => {
        console.warn(`WMS tile error for layer ${layers}:`, error);
        onError?.(error);
      });

      map.addLayer(wmsLayer);
      onLoad?.();
    } catch (error) {
      console.error(`Error creating WMS layer ${layers}:`, error);
      onError?.(error);
    }

    return () => {
      if (wmsLayer) {
        try {
          map.removeLayer(wmsLayer);
        } catch (error) {
          console.warn('Error removing WMS layer:', error);
        }
      }
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
  const [selectedBaseLayer, setSelectedBaseLayer] = useState<string>('osm');
  const [overlays, setOverlays] = useState<OverlayState>({
    foragingLocations: true,
    forestTypes: false,
    elevationContours: false,
    weatherOverlay: false,
  });
  const [overlayLoading, setOverlayLoading] = useState<OverlayLoadingState>({
    forestTypes: false,
    elevationContours: false,
    weatherOverlay: false,
  });
  const [overlayErrors, setOverlayErrors] = useState<OverlayErrorState>({
    forestTypes: false,
    elevationContours: false,
    weatherOverlay: false,
  });
  const mapRef = useRef<L.Map | null>(null);

  // Handle overlay toggle
  const toggleOverlay = (overlayName: keyof OverlayState) => {
    setOverlays(prev => {
      const newState = {
        ...prev,
        [overlayName]: !prev[overlayName]
      };

      // Set loading state when enabling overlay
      if (!prev[overlayName] && overlayName !== 'foragingLocations') {
        setOverlayLoading(loadingPrev => ({
          ...loadingPrev,
          [overlayName]: true
        }));
        // Clear any previous errors
        setOverlayErrors(errorPrev => ({
          ...errorPrev,
          [overlayName]: false
        }));
      }

      return newState;
    });
  };

  // Handle overlay load success
  const handleOverlayLoad = useCallback((overlayName: keyof OverlayLoadingState) => {
    setOverlayLoading(prev => ({
      ...prev,
      [overlayName]: false
    }));
    setOverlayErrors(prev => ({
      ...prev,
      [overlayName]: false
    }));
  }, []);

  // Handle overlay load error
  const handleOverlayError = useCallback((overlayName: keyof OverlayErrorState, error: any) => {
    setOverlayLoading(prev => ({
      ...prev,
      [overlayName]: false
    }));
    setOverlayErrors(prev => ({
      ...prev,
      [overlayName]: true
    }));
    console.error(`Overlay ${overlayName} failed to load:`, error);
  }, []);

  // Get selected base layer configuration
  const currentBaseLayer = BASE_LAYERS.find(layer => layer.id === selectedBaseLayer) || BASE_LAYERS[0];

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
      {/* Map Container */}
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={zoom}
        className="h-full w-full z-0"
        zoomControl={false}
        ref={mapRef}
      >
        {/* Base Map Tiles */}
        <TileLayer
          url={currentBaseLayer.url}
          attribution={currentBaseLayer.attribution}
          maxZoom={currentBaseLayer.maxZoom || 18}
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
            onLoad={() => handleOverlayLoad('forestTypes')}
            onError={(error) => handleOverlayError('forestTypes', error)}
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
            onLoad={() => handleOverlayLoad('elevationContours')}
            onError={(error) => handleOverlayError('elevationContours', error)}
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
            onLoad={() => handleOverlayLoad('weatherOverlay')}
            onError={(error) => handleOverlayError('weatherOverlay', error)}
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
            {overlays.forestTypes && (
              <div className="flex items-center space-x-1">
                <span className="text-green-600">🌲 Forest Types</span>
                {overlayLoading.forestTypes && <Loader2 className="h-3 w-3 animate-spin" />}
                {overlayErrors.forestTypes && <AlertTriangle className="h-3 w-3 text-red-500" />}
              </div>
            )}
            {overlays.elevationContours && (
              <div className="flex items-center space-x-1">
                <span className="text-brown-600">⛰️ Elevation</span>
                {overlayLoading.elevationContours && <Loader2 className="h-3 w-3 animate-spin" />}
                {overlayErrors.elevationContours && <AlertTriangle className="h-3 w-3 text-red-500" />}
              </div>
            )}
            {overlays.weatherOverlay && (
              <div className="flex items-center space-x-1">
                <span className="text-blue-600">🌡️ Temperature</span>
                {overlayLoading.weatherOverlay && <Loader2 className="h-3 w-3 animate-spin" />}
                {overlayErrors.weatherOverlay && <AlertTriangle className="h-3 w-3 text-red-500" />}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Layers Panel with Base Layer Selection */}
      {showLayers && (
        <Card className="absolute top-4 left-4 p-4 shadow-lg max-w-xs" data-testid="layers-panel">
          <h4 className="font-medium text-gray-900 mb-3 text-sm">Map Settings</h4>
          
          {/* Base Layer Selection */}
          <div className="mb-4">
            <h5 className="font-medium text-gray-700 mb-2 text-xs">Base Layer</h5>
            <div className="space-y-1">
              {BASE_LAYERS.map((layer) => (
                <label key={layer.id} className="flex items-center space-x-2 cursor-pointer text-xs">
                  <input 
                    type="radio" 
                    name="baseLayer"
                    value={layer.id}
                    checked={selectedBaseLayer === layer.id}
                    onChange={(e) => setSelectedBaseLayer(e.target.value)}
                    className="rounded" 
                  />
                  <span>{layer.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Overlay Controls */}
          <div className="border-t border-gray-200 pt-3">
            <h5 className="font-medium text-gray-700 mb-2 text-xs">Overlays</h5>
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
                <span className="flex items-center space-x-1">
                  <span>Forest Types (Swiss)</span>
                  {overlayLoading.forestTypes && <Loader2 className="h-3 w-3 animate-spin" />}
                  {overlayErrors.forestTypes && <AlertTriangle className="h-3 w-3 text-red-500" title="Failed to load overlay" />}
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={overlays.elevationContours}
                  onChange={() => toggleOverlay('elevationContours')}
                  className="rounded" 
                />
                <span className="flex items-center space-x-1">
                  <span>Elevation Contours</span>
                  {overlayLoading.elevationContours && <Loader2 className="h-3 w-3 animate-spin" />}
                  {overlayErrors.elevationContours && <AlertTriangle className="h-3 w-3 text-red-500" title="Failed to load overlay" />}
                </span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={overlays.weatherOverlay}
                  onChange={() => toggleOverlay('weatherOverlay')}
                  className="rounded" 
                />
                <span className="flex items-center space-x-1">
                  <span>Weather Overlay</span>
                  {overlayLoading.weatherOverlay && <Loader2 className="h-3 w-3 animate-spin" />}
                  {overlayErrors.weatherOverlay && <AlertTriangle className="h-3 w-3 text-red-500" title="Failed to load overlay" />}
                </span>
              </label>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
            <p>Data sources:</p>
            <p>• swisstopo (geo.admin.ch)</p>
            <p>• MeteoSwiss</p>
            <p>• Swiss Federal Geodata</p>
            {(overlayErrors.forestTypes || overlayErrors.elevationContours || overlayErrors.weatherOverlay) && (
              <p className="text-red-500 mt-1">
                ⚠️ Some overlays failed to load due to CORS restrictions
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
