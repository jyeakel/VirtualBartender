type WeatherResponse = {
  temperature: number;
  condition: string;
};

export async function getWeatherByZip(zipCode: string): Promise<WeatherResponse> {
  try {
    const response = await fetch(`/api/weather/${zipCode}`);
    if (!response.ok) throw new Error("Failed to fetch weather");
    return response.json();
  } catch (error) {
    console.error("Weather API error:", error);
    throw error;
  }
}
