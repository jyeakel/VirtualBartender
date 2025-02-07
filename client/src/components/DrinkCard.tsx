
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DrinkCardProps {
  name: string;
  ingredients: string;
  tags: string;
  moods?: string[];
  preferences?: string[];
  selected?: boolean;
  onSelect: () => void;
}

export function DrinkCard({ 
  name,
  ingredients,
  tags,
  moods,
  preferences,
  selected,
  onSelect 
}: DrinkCardProps) {
  const [rationale, setRationale] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selected) {
      getRationale();
    }
  }, [selected]);

  const getRationale = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/drinks/rationale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          ingredients,
          tags,
          moods,
          preferences
        }),
      });
      const data = await response.json();
      setRationale(data.rationale);
    } catch (error) {
      console.error("Failed to get drink rationale:", error);
      setRationale("This drink perfectly matches your preferences!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`transition-all duration-200 ${selected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-900">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        {selected ? (
          loading ? (
            <p className="text-sm text-gray-600 mb-4">Getting personalized recommendation...</p>
          ) : (
            <p className="text-sm text-gray-600 mb-4">{rationale}</p>
          )
        ) : (
          <p className="text-sm text-gray-600 mb-4">Select this drink to see why it's perfect for you.</p>
        )}
        <Button 
          onClick={onSelect}
          variant={selected ? "secondary" : "default"}
          className="w-full"
          size="sm"
        >
          {selected ? "Selected" : "Choose This Drink"}
        </Button>
      </CardContent>
    </Card>
  );
}
