import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatMessageProps = {
  message: {
    role: "user" | "assistant";
    content: string;
    options?: string[];
  };
  onOptionSelect: (option: string) => void;
};

export default function ChatMessage({ message, onOptionSelect }: ChatMessageProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 max-w-[80%]",
        isAssistant ? "self-start" : "self-end ml-auto"
      )}
    >
      {isAssistant && (
        <Avatar className="h-8 w-8">
          <span className="text-xs">🍸</span>
        </Avatar>
      )}
      
      <div className="space-y-2">
        <div
          className={cn(
            "rounded-lg p-3",
            isAssistant
              ? "bg-secondary text-secondary-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          {message.content}
        </div>

        {isAssistant && message.options && (
          <div className="flex flex-wrap gap-2">
            {message.options.map((option) => (
              <Button
                key={option}
                variant="outline"
                size="sm"
                onClick={() => onOptionSelect(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
