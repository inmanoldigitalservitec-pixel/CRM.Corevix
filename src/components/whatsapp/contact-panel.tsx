import { useState } from "react";
import {
  User,
  Tag,
  Plus,
  Link2,
  ClipboardList,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Globe,
  Building2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface ContactPanelProps {
  contact: {
    name: string;
    phone: string;
    email?: string;
    linkedClient?: string;
    linkedLead?: string;
    tags: string[];
    status: string;
    assignedTo: string | null;
    optedIn: boolean;
    createdAt: string;
  };
  onAssign: (userId: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onChangeStatus: (status: string) => void;
  onCreateLead: () => void;
  onLinkClient: () => void;
  onCreateTask: () => void;
}

const teamMembers = [
  { id: "u1", name: "Ana Rivera" },
  { id: "u2", name: "Juan Pérez" },
  { id: "u3", name: "María Santos" },
];

export function ContactPanel({
  contact,
  onAssign,
  onAddTag,
  onRemoveTag,
  onChangeStatus,
  onCreateLead,
  onLinkClient,
  onCreateTask,
}: ContactPanelProps) {
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(true);

  const handleAddTag = () => {
    if (newTag.trim()) {
      onAddTag(newTag.trim().toLowerCase());
      setNewTag("");
      setShowTagInput(false);
    }
  };

  return (
    <div className="w-72 border-l bg-card shrink-0 hidden xl:flex xl:flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Contact header */}
          <div className="text-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-xl font-semibold mx-auto mb-2">
              {contact.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <h3 className="font-semibold text-sm">{contact.name}</h3>
            <p className="text-xs text-muted-foreground">{contact.phone}</p>
            {contact.optedIn && (
              <Badge variant="outline" className="mt-1 text-[10px] text-green-600 border-green-300">
                Opted In
              </Badge>
            )}
          </div>

          <Separator className="my-3" />

          {/* Status & Assignment */}
          <div className="space-y-3 mb-4">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Status
              </Label>
              <Select defaultValue={contact.status} onValueChange={onChangeStatus}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Assigned To
              </Label>
              <Select defaultValue={contact.assignedTo || ""} onValueChange={onAssign}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-3" />

          {/* Tags */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Tags
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={() => setShowTagInput(!showTagInput)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] pr-1 gap-0.5">
                  {t}
                  <button onClick={() => onRemoveTag(t)} className="ml-0.5 hover:text-destructive">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              {contact.tags.length === 0 && !showTagInput && (
                <span className="text-[10px] text-muted-foreground">No tags</span>
              )}
            </div>
            {showTagInput && (
              <div className="flex gap-1 mt-1.5">
                <Input
                  className="h-7 text-xs"
                  placeholder="Tag name..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  autoFocus
                />
                <Button size="sm" className="h-7 text-xs px-2" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
            )}
          </div>

          <Separator className="my-3" />

          {/* Details */}
          <div>
            <button
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="flex items-center justify-between w-full mb-2"
            >
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer">
                Contact Details
              </Label>
              {detailsOpen ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
            {detailsOpen && (
              <div className="space-y-2 text-xs">
                {contact.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{contact.phone}</span>
                </div>
                {contact.linkedClient && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-primary">{contact.linkedClient}</span>
                  </div>
                )}
                {contact.linkedLead && (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-primary">{contact.linkedLead}</span>
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground mt-1">
                  Created {new Date(contact.createdAt).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          <Separator className="my-3" />

          {/* Quick Actions */}
          <div>
            <button
              onClick={() => setActionsOpen(!actionsOpen)}
              className="flex items-center justify-between w-full mb-2"
            >
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer">
                Quick Actions
              </Label>
              {actionsOpen ? (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
            {actionsOpen && (
              <div className="space-y-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5 h-8 justify-start"
                  onClick={onCreateLead}
                >
                  <UserPlus className="h-3.5 w-3.5" /> Create Lead
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5 h-8 justify-start"
                  onClick={onLinkClient}
                >
                  <Link2 className="h-3.5 w-3.5" /> Link to Client
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5 h-8 justify-start"
                  onClick={onCreateTask}
                >
                  <ClipboardList className="h-3.5 w-3.5" /> Create Task
                </Button>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
