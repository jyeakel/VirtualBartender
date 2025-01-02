import { Home, Info, History, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "History", href: "/history", icon: History },
  { name: "About", href: "/about", icon: Info },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <div className="h-full border-r bg-sidebar p-4 flex flex-col">
      <div className="flex items-center gap-2 px-2 py-4">
        <span className="text-2xl">🍸</span>
        <h1 className="text-lg font-semibold">Virtual Bartender</h1>
      </div>

      <nav className="space-y-1 mt-4 flex-1">
        {navigation.map((item) => (
          <Button
            key={item.name}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2",
              item.href === "/" && "bg-sidebar-accent"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Button>
        ))}
      </nav>

      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground text-center">
          Virtual Bartender v1.0
        </p>
      </div>
    </div>
  );
}
