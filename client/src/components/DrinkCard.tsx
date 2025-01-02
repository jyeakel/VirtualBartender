import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DrinkCardProps {
  name: string;
  description: string;
  reasoning: string;
  onSelect: () => void;
  selected?: boolean;
}

export function DrinkCard({ 
  name, 
  description, 
  reasoning,
  onSelect,
  selected 
}: DrinkCardProps) {
  return (
    <Card className={`transition-all duration-200 ${selected ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-gray-900">{name}</CardTitle>
        <CardDescription className="text-sm text-gray-500">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{reasoning}</p>
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