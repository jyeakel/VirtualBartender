
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectChatSession, SelectDrink } from "@db/schema";

interface Location {
  city: string;
  regionname: string;
}

interface SessionWithDrink extends SelectChatSession {
  selectedDrink: SelectDrink | null;
  location: Location | null;
}

export default function History() {
  const { data: sessions, isLoading } = useQuery<SessionWithDrink[]>({
    queryKey: ['/api/chat/history'],
    queryFn: async () => {
      const response = await fetch('/api/chat/history');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)]">
      <h1 className="text-2xl font-bold mb-4">Recent Recommendations</h1>
      <ScrollArea className="h-[calc(100%-3rem)]">
        <div className="grid gap-4 pr-4">
        {sessions?.map((session) => (
          <Card key={session.id} className="p-4">
            <div className="grid gap-2">
              <div className="flex justify-between">
                <span className="font-medium">
                    {new Date(session.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit' })} 
                </span>
              </div>
              <div className="text-sm text-gray-500">
                <p>Location: {session.location ? `${session.location.city}, ${session.location.regionname}` : 'Not available'}</p>
                <p>Weather: {session.weather ? `${session.weather}` : 'Not available'}</p>
                <p>Drink: {session.selectedDrink?.name || 'None selected'}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      </ScrollArea>
    </div>
  );
}
