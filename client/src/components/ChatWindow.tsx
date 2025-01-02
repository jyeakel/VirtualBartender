import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { DrinkCard } from "./DrinkCard";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
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
    setMessages(prev => [...prev, { role: "user", content: option }]);
    await sendMessage(option);
  };

  const handleDrinkSelect = (drinkId: number) => {
    setSelectedDrinkId(drinkId);
    if (onDrinkSelect) {
      onDrinkSelect(drinkId);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, i) => (
            <div
              key={i}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                
                {message.options && (
                  <div className="mt-2 space-x-2">
                    {message.options.map((option, j) => (
                      <Button
                        key={j}
                        variant="secondary"
                        size="sm"
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
                        description={drink.description}
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
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
          />
          <Button type="submit">Send</Button>
        </div>
      </form>
    </Card>
  );
}
