import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send } from "lucide-react";
import { DrinkCard } from "./DrinkCard";
import { IngredientsSelector } from "./IngredientsSelector";

export interface Message {
  role: "user" | "assistant";
  content: string;
  options?: string[];
  drinkSuggestions?: {
    id: number;
    name: string;
    description: string;
    reasoning: string;
  }[];
}

interface ChatWindowProps {
  sessionId: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onDrinkSelect?: (drinkId: number) => void;
}

export function ChatWindow({ 
  sessionId, 
  messages, 
  setMessages,
  onDrinkSelect 
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [selectedDrinkId, setSelectedDrinkId] = useState<number>();
  const [showIngredients, setShowIngredients] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    setIsLoading(true); // Set loading state to true before sending message
    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: content,
          sessionId 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.message,
        options: data.options,
        drinkSuggestions: data.drinkSuggestions
      }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Reset loading state after the request completes
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: "user", content: input }]);
    setInput("");
    await sendMessage(input);
  };

  const handleOptionClick = async (option: string) => {
    if (option === "Let me know what you have on hand") {
      setShowIngredients(true);
    } else {
      setMessages(prev => [...prev, { role: "user", content: option }]);
      await sendMessage(option);
    }
  };

  const handleDrinkSelect = (drinkId: number) => {
    setSelectedDrinkId(drinkId);
    if (onDrinkSelect) {
      onDrinkSelect(drinkId);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6rem)]">
      <div className={`flex-1 flex flex-col transition-all duration-200 ${showIngredients ? 'mr-4' : ''}`}>
        <Card className="flex-1 flex flex-col bg-white shadow-sm overflow-hidden">
          <ScrollArea className="flex-1 overflow-auto p-6" ref={scrollRef}>
            <div className="space-y-6">
              {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-4"
                    : "bg-gray-50 text-gray-900 mr-4"
                }`}
              >
                <p className="whitespace-pre-wgit rap text-sm leading-relaxed font-medium">{message.content}</p>

                {message.options && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.options.map((option, j) => (
                      <Button
                        key={j}
                        variant="secondary"
                        size="sm"
                        className="bg-white hover:bg-gray-50 text-gray-900 font-medium"
                        onClick={() => handleOptionClick(option)}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                )}

                {message.drinkSuggestions && (
                  <div className="mt-4 space-y-4">
                    {message.drinkSuggestions.map((drink) => (
                      <DrinkCard
                        key={drink.id}
                        name={drink.name}
                        reasoning={drink.reasoning}
                        selected={drink.id === selectedDrinkId}
                        onSelect={() => handleDrinkSelect(drink.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] space-y-2 bg-gray-50 rounded-2xl p-4">
                    <div className="space-y-2">
                      <div className="h-4 w-[200px] bg-gray-200 rounded animate-pulse" />
                      <div className="h-4 w-[160px] bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              {selectedIngredients.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowIngredients(true)}
                >
                  {selectedIngredients.length} {selectedIngredients.length === 1 ? "Ingredient" : "Ingredients"}
                </Button>
              )}
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
      {showIngredients && (
        <div className="w-80 bg-white border rounded-lg shadow-sm overflow-hidden">
          <IngredientsSelector
            initialIngredients={selectedIngredients}
            onClose={() => setShowIngredients(false)}
            onSubmit={async (ingredients: string[]) => {
              setSelectedIngredients(ingredients);
              setMessages(prev => [...prev, { 
                role: "user", 
                content: `I have these ingredients: ${ingredients.join(", ")}` 
              }]);
              await sendMessage(`I have these ingredients: ${ingredients.join(", ")}`);
            }}
          />
        </div>
      )}
    </div>
  );
}