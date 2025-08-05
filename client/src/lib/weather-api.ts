// Weather API integration for MeteoSwiss and Open-Meteo
export interface WeatherData {
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

export interface ForecastData {
  datetime: string;
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  conditions: string;
}

// MeteoSwiss STAC API configuration
const METEOSWISS_API_BASE = "https://data.geo.admin.ch";
const OPEN_METEO_API_BASE = "https://api.open-meteo.com/v1";

// API key from environment variables
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;

export class WeatherAPI {
  /**
   * Get current weather conditions using Open-Meteo (free, no API key required)
   */
  static async getCurrentWeather(lat: number, lng: number): Promise<WeatherData> {
    try {
      const url = `${OPEN_METEO_API_BASE}/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m,surface_pressure&timezone=Europe/Zurich&forecast_days=1`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.current_weather) {
        throw new Error("No current weather data available");
      }

      // Calculate last rainfall from recent precipitation data
      const lastRainfall = this.calculateLastRainfall(data.hourly?.precipitation || []);
      
      // Estimate soil temperature (typically 2-5°C cooler than air temperature)
      const soilTemperature = Math.max(data.current_weather.temperature - 4, 0);
      
      return {
        temperature: data.current_weather.temperature,
        humidity: data.hourly?.relativehumidity_2m?.[0] || 75, // Current hour humidity
        soilTemperature,
        precipitation: data.hourly?.precipitation?.[0] || 0,
        windSpeed: data.current_weather.windspeed,
        pressure: data.hourly?.surface_pressure?.[0],
        lastRainfall,
        location: { lat, lng },
      };
    } catch (error) {
      console.error("Failed to fetch weather from Open-Meteo:", error);
      return this.getFallbackWeather(lat, lng);
    }
  }

  /**
   * Get weather forecast for the next 7 days
   */
  static async getWeatherForecast(lat: number, lng: number): Promise<ForecastData[]> {
    try {
      const url = `${OPEN_METEO_API_BASE}/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,relativehumidity_2m_max,precipitation_sum,windspeed_10m_max&timezone=Europe/Zurich&forecast_days=7`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Forecast API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.daily) {
        throw new Error("No forecast data available");
      }

      return data.daily.time.map((date: string, index: number) => ({
        datetime: date,
        temperature: data.daily.temperature_2m_max[index],
        humidity: data.daily.relativehumidity_2m_max[index],
        precipitation: data.daily.precipitation_sum[index],
        windSpeed: data.daily.windspeed_10m_max[index],
        conditions: this.getConditionsFromData(
          data.daily.precipitation_sum[index],
          data.daily.temperature_2m_max[index]
        ),
      }));
    } catch (error) {
      console.error("Failed to fetch forecast:", error);
      return [];
    }
  }

  /**
   * Try to get weather from MeteoSwiss STAC API (for Swiss locations)
   */
  static async getMeteoSwissWeather(lat: number, lng: number): Promise<WeatherData | null> {
    try {
      // Check if location is in Switzerland (approximate bounds)
      if (lat < 45.8 || lat > 47.8 || lng < 5.9 || lng > 10.5) {
        return null; // Outside Switzerland
      }

      const response = await fetch(`${METEOSWISS_API_BASE}/api/stac/v1/collections/ch.meteoschweiz.ogd-smn`);
      
      if (!response.ok) {
        throw new Error(`MeteoSwiss API error: ${response.status}`);
      }

      // For now, MeteoSwiss STAC API requires more complex querying
      // Fall back to Open-Meteo for simplicity
      return null;
    } catch (error) {
      console.error("Failed to fetch from MeteoSwiss:", error);
      return null;
    }
  }

  /**
   * Calculate days since last significant rainfall
   */
  private static calculateLastRainfall(precipitationHourly: number[]): number {
    if (!precipitationHourly || precipitationHourly.length === 0) {
      return 7; // Default to a week if no data
    }

    // Look for precipitation > 1mm in the last 7 days (168 hours)
    const significantRain = 1.0;
    
    for (let i = 0; i < Math.min(precipitationHourly.length, 168); i++) {
      if (precipitationHourly[i] >= significantRain) {
        return Math.floor(i / 24); // Convert hours to days
      }
    }
    
    return 7; // No significant rain in the last week
  }

  /**
   * Determine weather conditions from precipitation and temperature
   */
  private static getConditionsFromData(precipitation: number, temperature: number): string {
    if (precipitation > 10) return "Heavy Rain";
    if (precipitation > 2) return "Light Rain";
    if (precipitation > 0.1) return "Drizzle";
    if (temperature < 0) return "Freezing";
    if (temperature > 25) return "Hot";
    return "Clear";
  }

  /**
   * Fallback weather data when APIs fail
   */
  private static getFallbackWeather(lat: number, lng: number): WeatherData {
    // Generate reasonable fallback values based on season and location
    const now = new Date();
    const month = now.getMonth();
    
    // Seasonal temperature adjustments for Switzerland
    let baseTemp = 15;
    if (month >= 11 || month <= 2) baseTemp = 5;  // Winter
    else if (month >= 3 && month <= 5) baseTemp = 12; // Spring
    else if (month >= 6 && month <= 8) baseTemp = 20; // Summer
    else baseTemp = 15; // Fall
    
    // Add some randomness
    const temperature = baseTemp + (Math.random() - 0.5) * 8;
    const humidity = 70 + Math.random() * 25; // 70-95%
    const soilTemperature = Math.max(temperature - 4, 0);
    
    return {
      temperature,
      humidity,
      soilTemperature,
      precipitation: Math.random() * 2,
      windSpeed: Math.random() * 15,
      pressure: 1010 + Math.random() * 20,
      lastRainfall: Math.floor(Math.random() * 7),
      location: { lat, lng },
    };
  }
}

// Export default instance
export const weatherAPI = WeatherAPI;
