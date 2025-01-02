import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DrinkCardProps = {
  drink: {
    id: number;
    name: string;
    description: string;
    ingredients: { name: string; amount: string }[];
    imageUrl?: string;
  };
  onSelect?: () => void;
};

export default function DrinkCard({ drink, onSelect }: DrinkCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{drink.name}</CardTitle>
        <CardDescription>{drink.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <h4 className="font-semibold">Ingredients:</h4>
          <ul className="list-disc list-inside space-y-1">
            {drink.ingredients.map((ing, idx) => (
              <li key={idx}>
                {ing.amount} {ing.name}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onSelect} className="w-full">
          Select This Drink
        </Button>
      </CardFooter>
    </Card>
  );
}
