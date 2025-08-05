import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Thermometer, 
  Droplets, 
  Sprout, 
  CloudRain, 
  Wind,
  Gauge,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";

interface WeatherData {
  temperature: number;
  humidity: number;
  soilTemperature?: number;
  precipitation?: number;
  windSpeed?: number;
  pressure?: number;
  lastRainfall: number;
  location: {
    lat: number;
    lng: number;
  };
}

interface EnvironmentalConditionsProps {
  weather: WeatherData;
}

export default function EnvironmentalConditions({ weather }: EnvironmentalConditionsProps) {
  
  const getConditionStatus = () => {
    let score = 0;
    let factors = [];

    // Temperature assessment (optimal range 15-22°C)
    if (weather.temperature >= 15 && weather.temperature <= 22) {
      score += 25;
      factors.push("Optimal temperature");
    } else if (weather.temperature >= 10 && weather.temperature <= 25) {
      score += 15;
      factors.push("Good temperature");
    } else {
      factors.push("Temperature outside optimal range");
    }

    // Humidity assessment (optimal 80%+)
    if (weather.humidity >= 80) {
      score += 25;
      factors.push("Excellent humidity");
    } else if (weather.humidity >= 70) {
      score += 15;
      factors.push("Good humidity");
    } else {
      factors.push("Low humidity");
    }

    // Recent rainfall assessment
    if (weather.lastRainfall <= 3) {
      score += 25;
      factors.push("Recent rainfall ideal");
    } else if (weather.lastRainfall <= 7) {
      score += 15;
      factors.push("Adequate soil moisture");
    } else {
      factors.push("Dry conditions");
    }

    // Soil temperature assessment
    if (weather.soilTemperature && weather.soilTemperature >= 12) {
      score += 25;
      factors.push("Warm soil temperature");
    } else if (weather.soilTemperature && weather.soilTemperature >= 6) {
      score += 15;
      factors.push("Adequate soil temperature");
    } else {
      factors.push("Cool soil temperature");
    }

    return {
      score: Math.min(score, 100),
      factors,
      level: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
    };
  };

  const conditions = getConditionStatus();

  const getAlertStyle = () => {
    switch (conditions.level) {
      case 'excellent':
        return {
          className: "bg-green-50 border-green-200",
          icon: CheckCircle,
          iconColor: "text-green-600",
          textColor: "text-green-800",
          title: "Excellent Foraging Conditions"
        };
      case 'good':
        return {
          className: "bg-blue-50 border-blue-200",
          icon: Info,
          iconColor: "text-blue-600",
          textColor: "text-blue-800",
          title: "Good Foraging Conditions"
        };
      case 'fair':
        return {
          className: "bg-yellow-50 border-yellow-200",
          icon: AlertTriangle,
          iconColor: "text-yellow-600",
          textColor: "text-yellow-800",
          title: "Fair Foraging Conditions"
        };
      default:
        return {
          className: "bg-red-50 border-red-200",
          icon: AlertTriangle,
          iconColor: "text-red-600",
          textColor: "text-red-800",
          title: "Poor Foraging Conditions"
        };
    }
  };

  const alertStyle = getAlertStyle();
  const AlertIcon = alertStyle.icon;

  return (
    <div className="bg-white border-b border-forest-200">
      <div className="p-4">
        <CardHeader className="px-0 pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
            <Thermometer className="h-5 w-5 text-forest-600 mr-2" />
            Current Conditions
          </CardTitle>
        </CardHeader>
        
        {/* Weather Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card className="bg-forest-50 border-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Temperature</span>
                <Thermometer className="h-4 w-4 text-forest-600" />
              </div>
              <p className="text-xl font-bold text-gray-900" data-testid="current-temperature">
                {Math.round(weather.temperature)}°C
              </p>
              <p className="text-xs text-forest-600">
                {weather.temperature >= 15 && weather.temperature <= 22 
                  ? "Optimal for mushrooms" 
                  : weather.temperature >= 10 && weather.temperature <= 25
                  ? "Good conditions"
                  : "Outside optimal range"}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-forest-50 border-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Humidity</span>
                <Droplets className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xl font-bold text-gray-900" data-testid="current-humidity">
                {Math.round(weather.humidity)}%
              </p>
              <p className="text-xs text-forest-600">
                {weather.humidity >= 80 
                  ? "Excellent conditions" 
                  : weather.humidity >= 70
                  ? "Good conditions"
                  : "Low humidity"}
              </p>
            </CardContent>
          </Card>
          
          {weather.soilTemperature && (
            <Card className="bg-forest-50 border-none">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Soil Temp</span>
                  <Sprout className="h-4 w-4 text-earth-600" />
                </div>
                <p className="text-xl font-bold text-gray-900" data-testid="soil-temperature">
                  {Math.round(weather.soilTemperature)}°C
                </p>
                <p className="text-xs text-forest-600">
                  {weather.soilTemperature >= 12 
                    ? "Above threshold" 
                    : weather.soilTemperature >= 6
                    ? "Adequate warmth"
                    : "Too cool"}
                </p>
              </CardContent>
            </Card>
          )}
          
          <Card className="bg-forest-50 border-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Last Rain</span>
                <CloudRain className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-xl font-bold text-gray-900" data-testid="last-rainfall">
                {weather.lastRainfall} {weather.lastRainfall === 1 ? 'day' : 'days'}
              </p>
              <p className="text-xs text-forest-600">
                {weather.lastRainfall <= 3 
                  ? "Perfect timing" 
                  : weather.lastRainfall <= 7
                  ? "Good moisture"
                  : "Getting dry"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Weather Info */}
        {(weather.windSpeed || weather.pressure || weather.precipitation) && (
          <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
            {weather.windSpeed && (
              <div className="flex items-center space-x-1 text-gray-600">
                <Wind className="h-3 w-3" />
                <span data-testid="wind-speed">{Math.round(weather.windSpeed)} km/h</span>
              </div>
            )}
            {weather.pressure && (
              <div className="flex items-center space-x-1 text-gray-600">
                <Gauge className="h-3 w-3" />
                <span data-testid="pressure">{Math.round(weather.pressure)} hPa</span>
              </div>
            )}
            {weather.precipitation !== undefined && (
              <div className="flex items-center space-x-1 text-gray-600">
                <CloudRain className="h-3 w-3" />
                <span data-testid="precipitation">{weather.precipitation.toFixed(1)} mm</span>
              </div>
            )}
          </div>
        )}
        
        {/* Environmental Alert */}
        <Alert className={alertStyle.className}>
          <AlertIcon className={`h-4 w-4 ${alertStyle.iconColor}`} />
          <AlertDescription className={alertStyle.textColor}>
            <div>
              <p className="font-medium mb-1" data-testid="conditions-title">
                {alertStyle.title} ({conditions.score}% optimal)
              </p>
              <p className="text-sm" data-testid="conditions-description">
                {conditions.factors.slice(0, 2).join(", ")}.
                {conditions.level === 'excellent' && " Ideal time for mushroom foraging!"}
                {conditions.level === 'good' && " Good opportunity for finding mushrooms."}
                {conditions.level === 'fair' && " Some species may still be found."}
                {conditions.level === 'poor' && " Consider waiting for better conditions."}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
