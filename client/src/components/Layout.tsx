
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Martini, Settings, Info, History, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          <Link href="/">
            <Button 
              variant="ghost" 
              className={`w-full justify-${sidebarCollapsed ? 'center' : 'start'} gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium`}
            >
              <Martini className="h-4 w-4" />
              {!sidebarCollapsed && "Step to the bar"}
            </Button>
          </Link>
          <Link href="/history">
            <Button 
              variant="ghost" 
              className={`w-full justify-${sidebarCollapsed ? 'center' : 'start'} gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium`}
            >
              <History className="h-4 w-4" />
              {!sidebarCollapsed && "Chat History"}
            </Button>
          </Link>
          <Link href="/settings">
            <Button 
              variant="ghost" 
              className={`w-full justify-${sidebarCollapsed ? 'center' : 'start'} gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium`}
            >
              <Settings className="h-4 w-4" />
              {!sidebarCollapsed && "Settings"}
            </Button>
          </Link>
          <Link href="/about">
            <Button 
              variant="ghost" 
              className={`w-full justify-${sidebarCollapsed ? 'center' : 'start'} gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium`}
            >
              <Info className="h-4 w-4" />
              {!sidebarCollapsed && "About"}
            </Button>
          </Link>
        </nav>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
