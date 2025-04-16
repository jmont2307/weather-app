import dotenv from 'dotenv';
import dayjs from 'dayjs';
dotenv.config();

// Define an interface for the Coordinates object
interface Coordinates {
  lat: number;
  lon: number;
  name: string;
}

// Define a class for the Weather object
interface Weather {
  city: string;
  date: string;
  icon: string;
  iconDescription: string;
  tempF: number;
  windSpeed: number;
  humidity: number;
}

// Complete the WeatherService class
class WeatherService {
  private readonly apiKey: string;
  private readonly geocodeBaseUrl: string = 'https://api.openweathermap.org/geo/1.0/direct';
  private readonly weatherBaseUrl: string = 'https://api.openweathermap.org/data/2.5/forecast';
  // private cityName: string = '';

  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY || '';
    if (!this.apiKey) {
      console.error('OpenWeather API key is required. Please add WEATHER_API_KEY to your .env file.');
    } else {
      console.log('API Key found in .env file. Note: New API keys may take up to 2 hours to activate.');
      console.log(`API Key (first 4 chars): ${this.apiKey.substring(0, 4)}...`);
    }
  }

  // Create fetchLocationData method
  private async fetchLocationData(query: string): Promise<any> {
    const url = `${this.geocodeBaseUrl}?q=${encodeURIComponent(query)}&limit=1&appid=${this.apiKey}`;
    
    try {
      console.log(`Fetching location data for: ${query}`);
      console.log(`URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Error response: ${response.status} ${response.statusText}`);
        throw new Error(`Error fetching location data: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Geocoding API response:', data);
      
      if (!data.length) {
        throw new Error(`No location found for: ${query}`);
      }
      
      return data[0];
    } catch (error) {
      console.error('Error in fetchLocationData:', error);
      throw error;
    }
  }

  // Create destructureLocationData method
  private destructureLocationData(locationData: any): Coordinates {
    const { lat, lon, name } = locationData;
    return { lat, lon, name };
  }

  /* 
  // Create buildGeocodeQuery method
  // Method not currently used, but keeping for future extensibility
  private buildGeocodeQuery(city: string): string {
    return `${this.geocodeBaseUrl}?q=${encodeURIComponent(city)}&limit=1&appid=${this.apiKey}`;
  }
  */

  // Create buildWeatherQuery method
  private buildWeatherQuery(coordinates: Coordinates): string {
    const { lat, lon } = coordinates;
    return `${this.weatherBaseUrl}?lat=${lat}&lon=${lon}&units=imperial&appid=${this.apiKey}`;
  }

  // Create fetchAndDestructureLocationData method
  private async fetchAndDestructureLocationData(city: string): Promise<Coordinates> {
    const locationData = await this.fetchLocationData(city);
    return this.destructureLocationData(locationData);
  }

  // Create fetchWeatherData method
  private async fetchWeatherData(coordinates: Coordinates): Promise<any> {
    const url = this.buildWeatherQuery(coordinates);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error fetching weather data: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error in fetchWeatherData:', error);
      throw error;
    }
  }

  // Build parseCurrentWeather method
  private parseCurrentWeather(response: any, cityName: string): Weather {
    const { main, weather, wind } = response.list[0];
    
    return {
      city: cityName,
      date: dayjs().format('MM/DD/YYYY'),
      icon: weather[0].icon,
      iconDescription: weather[0].description,
      tempF: Math.round(main.temp),
      windSpeed: Math.round(wind.speed),
      humidity: main.humidity
    };
  }

  // Complete buildForecastArray method
  private buildForecastArray(weatherData: any, cityName: string): Weather[] {
    const forecastArray: Weather[] = [];
    
    // Add current weather as first item
    const currentWeather = this.parseCurrentWeather(weatherData, cityName);
    forecastArray.push(currentWeather);
    
    // Get noon forecast for next 5 days
    const today = dayjs().format('YYYY-MM-DD');
    const uniqueDays = new Set<string>();
    
    // Skip today
    uniqueDays.add(today);
    
    // Build 5-day forecast
    for (let i = 0; i < weatherData.list.length && forecastArray.length < 6; i++) {
      const forecast = weatherData.list[i];
      const forecastDate = dayjs(forecast.dt * 1000).format('YYYY-MM-DD');
      const forecastHour = dayjs(forecast.dt * 1000).hour();
      
      // Only add forecasts for new days at noon (closest to noon)
      if (!uniqueDays.has(forecastDate) && forecastHour >= 11 && forecastHour <= 13) {
        uniqueDays.add(forecastDate);
        
        forecastArray.push({
          city: cityName,
          date: dayjs(forecast.dt * 1000).format('MM/DD/YYYY'),
          icon: forecast.weather[0].icon,
          iconDescription: forecast.weather[0].description,
          tempF: Math.round(forecast.main.temp),
          windSpeed: Math.round(forecast.wind.speed),
          humidity: forecast.main.humidity
        });
      }
    }
    
    return forecastArray;
  }

  // Generate mock weather data for testing when API key is not active
  private generateMockWeatherData(city: string): Weather[] {
    console.log(`Generating mock data for ${city} because API key is not active yet`);
    
    const mockWeather: Weather[] = [];
    
    // Current weather
    mockWeather.push({
      city: city,
      date: dayjs().format('MM/DD/YYYY'),
      icon: '01d',
      iconDescription: 'clear sky',
      tempF: 72,
      windSpeed: 5,
      humidity: 45
    });
    
    // Forecast for next 5 days
    for (let i = 1; i <= 5; i++) {
      mockWeather.push({
        city: city,
        date: dayjs().add(i, 'day').format('MM/DD/YYYY'),
        icon: '01d',
        iconDescription: 'clear sky',
        tempF: 70 + Math.floor(Math.random() * 10),
        windSpeed: Math.floor(Math.random() * 10) + 2,
        humidity: Math.floor(Math.random() * 30) + 30
      });
    }
    
    return mockWeather;
  }

  // Complete getWeatherForCity method
  async getWeatherForCity(city: string): Promise<Weather[]> {
    try {
      // this.cityName = city;
      try {
        const coordinates = await this.fetchAndDestructureLocationData(city);
        const weatherData = await this.fetchWeatherData(coordinates);
        return this.buildForecastArray(weatherData, coordinates.name);
      } catch (error: any) {
        // Check if it's an API key issue
        if (error.message && error.message.includes('Unauthorized')) {
          console.warn('Using mock data due to API key not being active yet');
          return this.generateMockWeatherData(city);
        }
        throw error;
      }
    } catch (error) {
      console.error('Error in getWeatherForCity:', error);
      throw error;
    }
  }
}

export default new WeatherService();
