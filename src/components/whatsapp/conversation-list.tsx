import { useState } from "react";
import {
  Search,
  Filter,
  MessageSquare,
  Archive,
  Clock,
  CheckCircle2,
  UserX,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type ConversationFilter =
  | "all"
  | "open"
  | "pending"
  | "resolved"
  | "archived"
  | "unassigned"
  | "mine";

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: "open" | "pending" | "resolved" | "archived";
  assignedTo: string | null;
  tags: string[];
  profilePic?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conv: Conversation) => void;
  activeFilter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
}

const filters: { value: ConversationFilter; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: MessageSquare },
  { value: "open", label: "Open", icon: MessageSquare },
  { value: "pending", label: "Pending", icon: Clock },
  { value: "resolved", label: "Resolved", icon: CheckCircle2 },
  { value: "archived", label: "Archived", icon: Archive },
  { value: "unassigned", label: "Unassigned", icon: UserX },
  { value: "mine", label: "My Chats", icon: User },
];

const statusColor: Record<string, string> = {
  open: "bg-green-500",
  pending: "bg-amber-500",
  resolved: "bg-blue-500",
  archived: "bg-muted-foreground/40",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  activeFilter,
  onFilterChange,
}: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    if (
      search &&
      !c.contactName.toLowerCase().includes(search.toLowerCase()) &&
      !c.contactPhone.includes(search)
    )
      return false;
    if (activeFilter === "open") return c.status === "open";
    if (activeFilter === "pending") return c.status === "pending";
    if (activeFilter === "resolved") return c.status === "resolved";
    if (activeFilter === "archived") return c.status === "archived";
    if (activeFilter === "unassigned") return !c.assignedTo;
    if (activeFilter === "mine") return c.assignedTo === "current-user";
    return true;
  });

  return (
    <div className="w-80 border-r flex flex-col bg-card shrink-0">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <Badge variant="secondary" className="text-[10px]">
            {filtered.length}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 p-1.5 border-b overflow-x-auto">
        {filters.map((f) => (
          <Button
            key={f.value}
            variant={activeFilter === f.value ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "h-6 px-2 text-[10px] shrink-0",
              activeFilter === f.value && "font-semibold",
            )}
            onClick={() => onFilterChange(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No conversations found</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={cn(
                "w-full flex items-start gap-2.5 p-3 text-left border-b transition-colors hover:bg-muted/50",
                selectedId === conv.id && "bg-muted/70",
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xs font-semibold">
                  {conv.contactName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                    statusColor[conv.status],
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{conv.contactName}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {timeAgo(conv.lastMessageAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                <div className="flex items-center gap-1 mt-1">
                  {conv.tags.slice(0, 2).map((t) => (
                    <Badge key={t} variant="outline" className="text-[9px] h-4 px-1 py-0">
                      {t}
                    </Badge>
                  ))}
                  {conv.unreadCount > 0 && (
                    <Badge className="ml-auto h-4 min-w-4 px-1 text-[10px] bg-green-600 hover:bg-green-600 text-white">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
