import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, ChatWindow } from "@/components/ChatWindow";
import { DrinkCard } from "@/components/DrinkCard";
import { Martini, Settings, Info, History, ChevronLeft, ChevronRight } from "lucide-react";
import type { SelectDrink } from "@db/schema";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    <div className="flex h-screen bg-gray-50 font-sans antialiased">
      {/* Left sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transition-all duration-200`}>
        <div className="p-4 border-b border-gray-200">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
            {!sidebarCollapsed && (
              <h2 className="text-xl font-bold tracking-tight">Virtual Bartender</h2>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          <Button 
            variant="ghost" 
            className={`w-full justify-${sidebarCollapsed ? 'center' : 'start'} gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium`}
            onClick={startChat}
          >
            <Martini className="h-4 w-4" />
            {!sidebarCollapsed && "Step to the bar"}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full justify-${sidebarCollapsed ? 'center' : 'start'} gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium`}
          >
            <History className="h-4 w-4" />
            {!sidebarCollapsed && "Chat History"}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full justify-${sidebarCollapsed ? 'center' : 'start'} gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium`}
          >
            <Settings className="h-4 w-4" />
            {!sidebarCollapsed && "Settings"}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full justify-${sidebarCollapsed ? 'center' : 'start'} gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium`}
          >
            <Info className="h-4 w-4" />
            {!sidebarCollapsed && "About"}
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
                >
                  <Martini className="h-5 w-5 mr-2" />
                  Step to the bar
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* Right sidebar for selected drink - only shown when a drink is selected */}
      {selectedDrink && (
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <h2 className="text-xl font-bold tracking-tight mb-4 text-gray-800">Selected Drink</h2>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <DrinkCard
              name={selectedDrink.name}
              description={selectedDrink.description}
              reasoning="Selected drink"
              selected
              onSelect={() => {}}
            />
          </ScrollArea>
        </div>
      )}
    </div>
  );
}