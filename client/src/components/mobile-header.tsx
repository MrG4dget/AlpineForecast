import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wifi, WifiOff, MapPin, CloudRain } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";

export default function MobileHeader() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { location, accuracy } = useGeolocation();

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch current weather for location
  const { data: weather } = useQuery({
    queryKey: ["/api/weather/current", location?.latitude, location?.longitude],
    enabled: !!location && isOnline,
  });

  return (
    <header className="bg-forest-700 text-white shadow-lg sticky top-0 z-50 safe-area-inset-top">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🍄</div>
          <h1 className="text-xl font-bold outdoor-contrast" data-testid="app-title">
            Pilztastic
          </h1>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* GPS Status */}
          <div className="flex items-center space-x-1 bg-forest-600 px-2 py-1 rounded-full text-xs">
            <MapPin className="h-3 w-3 text-green-400" />
            <span data-testid="gps-accuracy">
              {accuracy ? `±${Math.round(accuracy)}m` : "---"}
            </span>
          </div>
          
          {/* Weather Info */}
          {weather && (
            <div className="flex items-center space-x-1 bg-forest-600 px-2 py-1 rounded-full text-xs">
              <CloudRain className="h-3 w-3 text-blue-300" />
              <span data-testid="current-temperature">
                {Math.round(weather.temperature)}°C
              </span>
            </div>
          )}
          
          {/* Connection Status */}
          <div className="flex items-center" data-testid="connection-status">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <div className="offline-indicator">
                <WifiOff className="h-4 w-4 text-red-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
