import { Router } from 'express';
const router = Router();

import HistoryService from '../../service/historyService.js';
import WeatherService from '../../service/weatherService.js';

// POST Request with city name to retrieve weather data
router.post('/', async (req, res) => {
  try {
    const { cityName } = req.body;
    
    if (!cityName) {
      return res.status(400).json({ error: 'City name is required' });
    }
    
    console.log(`Received request to get weather for city: ${cityName}`);
    
    // Get weather data from city name
    try {
      const weatherData = await WeatherService.getWeatherForCity(cityName);
      
      // Save city to search history
      await HistoryService.addCity(weatherData[0].city);
      
      return res.json(weatherData);
    } catch (error: any) {
      console.error('Error in weather service:', error);
      
      // Check if it's an API key issue
      if (error.message && error.message.includes('Unauthorized')) {
        return res.status(401).json({ 
          error: 'API key is unauthorized. New API keys take up to 2 hours to activate.',
          message: 'Please wait for the API key to be activated or try with a different API key.'
        });
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error in POST /api/weather:', error);
    return res.status(500).json({ error: 'An error occurred while fetching weather data' });
  }
});

// GET search history
router.get('/history', async (_req, res) => {
  try {
    const cities = await HistoryService.getCities();
    return res.json(cities);
  } catch (error) {
    console.error('Error in GET /api/weather/history:', error);
    return res.status(500).json({ error: 'An error occurred while fetching search history' });
  }
});

// DELETE city from search history
router.delete('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'City ID is required' });
    }
    
    await HistoryService.removeCity(id);
    return res.json({ message: 'City removed from search history' });
  } catch (error) {
    console.error('Error in DELETE /api/weather/history/:id:', error);
    return res.status(500).json({ error: 'An error occurred while removing city from search history' });
  }
});

export default router;
