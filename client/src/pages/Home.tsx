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
    <div className="flex h-screen bg-gray-50">
      {/* Left sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Virtual Bartender</h2>
        <nav className="space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            onClick={startChat}
          >
            New Chat
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            About
          </Button>
        </nav>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
          {messages.length > 0 ? (
            <ChatWindow 
              messages={messages} 
              setMessages={setMessages}
              sessionId={sessionId!}
            />
          ) : (
            <Card className="h-full flex items-center justify-center bg-white">
              <div className="text-center px-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Virtual Bartender
                </h1>
                <p className="text-gray-500 text-lg mb-8 max-w-md">
                  Start a new chat to get personalized drink recommendations based on your preferences.
                </p>
                <Button 
                  onClick={startChat}
                  size="lg"
                  className="px-8"
                >
                  Start Chat
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* Right sidebar for selected drink */}
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Selected Drink</h2>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          {selectedDrink ? (
            <DrinkCard
              name={selectedDrink.name}
              description={selectedDrink.description}
              reasoning="Selected drink"
              selected
              onSelect={() => {}}
            />
          ) : (
            <div className="text-center text-gray-500 mt-8">
              No drink selected yet
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}