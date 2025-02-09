import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, ChatWindow } from "@/components/ChatWindow";
import { DrinkCard } from "@/components/DrinkCard";
import { Martini, Settings, Info, History, ChevronLeft, ChevronRight } from "lucide-react";
import type { SelectDrink } from "@db/schema";

// Ensure SelectDrink has required properties
interface DrinkWithDetails extends SelectDrink {
  ingredients: string;
  tags: string;
  moods: string[];
  preferences: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const { data: selectedDrink } = useQuery<DrinkWithDetails>({
    queryKey: ['/api/drinks', sessionId],
    enabled: !!sessionId,
  });

  // Clear selected drink when session changes
  useEffect(() => {
    if (!sessionId) {
      queryClient.removeQueries({ queryKey: ['/api/drinks', sessionId] });
    }
  }, [sessionId, queryClient]);

  const startChat = async () => {
    setIsLoading(true);
    try {
      // Reset state before starting new chat
      setMessages([]);
      setSessionId(undefined);

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans antialiased">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
          {messages.length > 0 ? (
            <ChatWindow 
              messages={messages} 
              setMessages={setMessages}
              sessionId={sessionId!}
              setSessionId={setSessionId}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          ) : (
            <Card className="h-full flex items-center justify-center bg-white">
              <div className="text-center px-6">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">
                  Welcome to Virtual Bartender
                </h1>
                <p className="text-gray-500 text-lg mb-8 max-w-md leading-relaxed">
                  Start a new chat to get personalized drink recommendations based on your preferences.
                </p>
                <Button 
                  onClick={startChat}
                  size="lg"
                  className="px-8 font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Martini className="h-5 w-5 mr-2" />
                      Sidle Up
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}