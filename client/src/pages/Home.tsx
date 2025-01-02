import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, ChatWindow } from "@/components/ChatWindow";
import { DrinkCard } from "@/components/DrinkCard";
import type { SelectDrink } from "@db/schema";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>();
  const { toast } = useToast();

  const { data: selectedDrink } = useQuery<SelectDrink>({
    queryKey: ['/api/drinks', sessionId],
    enabled: !!sessionId,
  });

  const startChat = async () => {
    try {
      const response = await fetch("/api/chat/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to start chat");
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setMessages([
        {
          role: "assistant",
          content: data.message,
          options: data.options,
        },
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start chat session",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left sidebar */}
      <div className="w-64 bg-muted p-4">
        <h2 className="text-lg font-semibold mb-4">Virtual Bartender</h2>
        <nav className="space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start"
            onClick={startChat}
          >
            New Chat
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            About
          </Button>
        </nav>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4">
          {messages.length > 0 ? (
            <ChatWindow 
              messages={messages} 
              setMessages={setMessages}
              sessionId={sessionId!}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">
                  Welcome to Virtual Bartender
                </h1>
                <p className="text-muted-foreground mb-6">
                  Start a new chat to get personalized drink recommendations
                </p>
                <Button onClick={startChat}>Start Chat</Button>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* Right sidebar for selected drink */}
      <div className="w-80 bg-muted p-4">
        <h2 className="text-lg font-semibold mb-4">Selected Drink</h2>
        <ScrollArea className="h-full">
          {selectedDrink && (
            <DrinkCard
              name={selectedDrink.name}
              description={selectedDrink.description}
              reasoning="Selected drink"
              selected
              onSelect={() => {}}
            />
          )}
        </ScrollArea>
      </div>
    </div>
  );
}