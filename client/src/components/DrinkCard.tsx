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
    <Card className={`mb-4 ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{reasoning}</p>
        <Button 
          onClick={onSelect}
          variant={selected ? "secondary" : "default"}
          className="w-full"
        >
          {selected ? "Selected" : "Choose This Drink"}
        </Button>
      </CardContent>
    </Card>
  );
}
