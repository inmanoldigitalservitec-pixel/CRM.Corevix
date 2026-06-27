import { useState } from "react";
import {
  Send,
  Paperclip,
  Smile,
  StickyNote,
  FileText,
  MoreHorizontal,
  Check,
  CheckCheck,
  Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  type: "text" | "image" | "document" | "template" | "note";
  body: string;
  senderName: string;
  status?: "sent" | "delivered" | "read" | "failed";
  createdAt: string;
  isInternalNote?: boolean;
}

interface MessageThreadProps {
  contactName: string;
  contactPhone: string;
  messages: Message[];
  onSendMessage: (text: string, isNote: boolean) => void;
  onSendTemplate: () => void;
}

const statusIcon: Record<string, React.ReactNode> = {
  sent: <Check className="h-3 w-3 text-muted-foreground/60" />,
  delivered: <CheckCheck className="h-3 w-3 text-muted-foreground/60" />,
  read: <CheckCheck className="h-3 w-3 text-blue-500" />,
  failed: <Clock className="h-3 w-3 text-destructive" />,
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const d = new Date(msg.createdAt).toLocaleDateString([], {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (d !== currentDate) {
      currentDate = d;
      groups.push({ date: d, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export function MessageThread({
  contactName,
  contactPhone,
  messages,
  onSendMessage,
  onSendTemplate,
}: MessageThreadProps) {
  const [text, setText] = useState("");
  const [isNoteMode, setIsNoteMode] = useState(false);

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim(), isNoteMode);
    setText("");
  };

  const groups = groupByDate(messages);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-semibold">
            {contactName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-tight">{contactName}</h3>
            <p className="text-[11px] text-muted-foreground">{contactPhone}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Mark as resolved</DropdownMenuItem>
            <DropdownMenuItem>Archive conversation</DropdownMenuItem>
            <DropdownMenuItem>Block contact</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-1 max-w-2xl mx-auto">
          {groups.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span className="text-[10px] text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full">
                  {group.date}
                </span>
              </div>
              {group.messages.map((msg) => {
                if (msg.isInternalNote || msg.type === "note") {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs px-3 py-2 rounded-lg max-w-[85%]">
                        <div className="flex items-center gap-1 mb-0.5">
                          <StickyNote className="h-3 w-3" />
                          <span className="font-semibold text-[10px]">{msg.senderName}</span>
                          <span className="text-[9px] opacity-60">{formatTime(msg.createdAt)}</span>
                        </div>
                        <p>{msg.body}</p>
                      </div>
                    </div>
                  );
                }

                const isOut = msg.direction === "outbound";
                return (
                  <div
                    key={msg.id}
                    className={cn("flex mb-1", isOut ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] px-3 py-2 rounded-2xl text-sm shadow-sm",
                        isOut
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md",
                      )}
                    >
                      {!isOut && (
                        <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <div
                        className={cn(
                          "flex items-center gap-1 mt-1 justify-end",
                          isOut ? "text-primary-foreground/60" : "text-muted-foreground",
                        )}
                      >
                        <span className="text-[10px]">{formatTime(msg.createdAt)}</span>
                        {isOut && msg.status && statusIcon[msg.status]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div
        className={cn(
          "border-t px-3 py-2.5",
          isNoteMode &&
            "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/40",
        )}
      >
        {isNoteMode && (
          <div className="flex items-center gap-1.5 mb-1.5 text-amber-700 dark:text-amber-400">
            <StickyNote className="h-3 w-3" />
            <span className="text-[10px] font-semibold">
              Internal note — only visible to your team
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5 max-w-2xl mx-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setIsNoteMode(!isNoteMode)}
                >
                  <StickyNote className={cn("h-4 w-4", isNoteMode && "text-amber-600")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isNoteMode ? "Switch to message" : "Write internal note"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={onSendTemplate}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send template</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Input
            placeholder={isNoteMode ? "Write an internal note..." : "Type a message..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className={cn("h-9 text-sm", isNoteMode && "border-amber-300 dark:border-amber-700")}
          />

          <Button
            size="icon"
            className={cn("h-9 w-9 shrink-0", isNoteMode && "bg-amber-600 hover:bg-amber-700")}
            onClick={handleSend}
            disabled={!text.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
