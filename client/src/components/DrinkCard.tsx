import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DrinkCardProps {
  name: string;
  ingredients: string;
  tags: string;
  reference: string | null;
  moods?: string[] | string;
  preferences?: string[] | string;
  selected?: boolean;
}

export function DrinkCard({ 
  name,
  ingredients,
  tags,
  reference,
  moods,
  preferences,
  selected 
}: DrinkCardProps) {
  const [rationale, setRationale] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRationale();
  }, [name, ingredients, tags, JSON.stringify(moods), JSON.stringify(preferences)]);

  const getRationale = async () => {
    setLoading(true);
    try {
      // Ensure arrays are properly handled
      const parsedMoods = Array.isArray(moods) ? moods : 
        (typeof moods === 'string' ? (moods as string).split(',').filter(Boolean) : []);
      const parsedPrefs = Array.isArray(preferences) ? preferences :
        (typeof preferences === 'string' ? (preferences as string).split(',').filter(Boolean) : []);

      const payload = {
        name,
        ingredients,
        tags,
        moods: parsedMoods,
        preferences: parsedPrefs
      };
      console.log("Sending rationale request with payload:", payload);
      const response = await fetch("/api/drinks/rationale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setRationale(data.rationale || "This drink perfectly matches your preferences!"); // Handle missing rationale
    } catch (error) {
      console.error("Failed to get drink rationale:", error);
      setRationale("This drink perfectly matches your preferences!"); // fallback
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className={`transition-all duration-200 ${selected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-900">
          {name}
          {reference && (
            <a 
              href={reference}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:text-blue-700 block mt-1"
            >
              View Recipe →
            </a>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
          </div>
        ) : (
          <p className="text-sm text-gray-600">{rationale}</p>
        )}
      </CardContent>
    </Card>
  );
}