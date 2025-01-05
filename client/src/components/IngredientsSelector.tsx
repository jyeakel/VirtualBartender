
import { useState } from "react";
import { Check, X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface IngredientsSelectorProps {
  onClose: () => void;
  onSubmit: (ingredients: string[]) => void;
  initialIngredients?: string[];
}

const INGREDIENTS = [
  "Vodka", "Gin", "Rum", "Tequila", "Whiskey", "Triple Sec", "Lime Juice",
  "Lemon Juice", "Orange Juice", "Cranberry Juice", "Tonic Water", "Club Soda",
  "Cola", "Simple Syrup", "Vermouth", "Bitters", "Mint", "Sugar"
]; // This list should be expanded with your complete ingredients

export function IngredientsSelector({ onClose, onSubmit, initialIngredients }: IngredientsSelectorProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(initialIngredients || []);

  const filteredIngredients = INGREDIENTS.filter(i => 
    i.toLowerCase().includes(search.toLowerCase())
  );

  const toggleIngredient = (ingredient: string) => {
    setSelected(prev => 
      prev.includes(ingredient) 
        ? prev.filter(i => i !== ingredient)
        : [...prev, ingredient]
    );
  };

  const handleSubmit = () => {
    onSubmit(selected);
    onClose();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Select Your Ingredients</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4">
        <Input
          placeholder="Search ingredients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="p-4 border-b">
        <div className="flex flex-wrap gap-2">
          {selected.map(ingredient => (
            <Badge
              key={ingredient}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleIngredient(ingredient)}
            >
              {ingredient}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {filteredIngredients.map(ingredient => (
            <div
              key={ingredient}
              onClick={() => toggleIngredient(ingredient)}
              className={`
                flex items-center gap-2 p-2 rounded-md cursor-pointer
                ${selected.includes(ingredient) ? 'bg-primary/10' : 'hover:bg-secondary/80'}
              `}
            >
              <div className={`
                w-4 h-4 rounded border flex items-center justify-center
                ${selected.includes(ingredient) ? 'bg-primary border-primary' : 'border-gray-300'}
              `}>
                {selected.includes(ingredient) && <Check className="h-3 w-3 text-white" />}
              </div>
              {ingredient}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button className="w-full" onClick={handleSubmit}>
          Submit ({selected.length} selected)
        </Button>
      </div>
    </div>
  );
}
