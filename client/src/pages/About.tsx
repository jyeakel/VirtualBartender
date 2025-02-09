
import { Card, CardContent } from "@/components/ui/card";

export default function About() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">About Virtual Bartender</h1>
          <p className="text-gray-600 mb-4">
            Virtual Bartender is your AI-powered drink recommendation system. Get personalized cocktail suggestions based on your preferences and mood.
          </p>
          <p className="text-gray-600">
            Built with modern web technologies and an extensive drinks database to ensure you get the perfect drink recommendation every time.
          </p>
          <p className="text-gray-600">
            See the repository for Virtual Bartender on <a href="https://github.com/jyeakel/VirtualBartender/">GitHub</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
