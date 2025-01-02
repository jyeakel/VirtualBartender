import { z } from "zod";

const weatherResponseSchema = z.object({
  weather: z.array(z.object({
    main: z.string(),
    description: z.string()
  })),
  main: z.object({
    temp: z.number()
  })
});

export async function getWeather(lat: number, lon: number): Promise<string> {
  try {
    const API_KEY = process.env.WEATHER_API_KEY;
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Weather API request failed');
    }

    const data = await response.json();
    const parsed = weatherResponseSchema.parse(data);
    
    return `${parsed.weather[0].main}, ${Math.round(parsed.main.temp)}°C`;
  } catch (error) {
    console.error('Failed to fetch weather:', error);
    return '';
  }
}

export async function getLocationFromIP(ip: string): Promise<{ 
  lat: number;
  lon: number;
  city: string;
} | null> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        lat: data.lat,
        lon: data.lon,
        city: data.city
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get location from IP:', error);
    return null;
  }
}
