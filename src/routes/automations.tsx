import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Zap, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { PageHeader } from "@/components/crm/page-header";
import { SearchFilters } from "@/components/crm/search-filters";
import { EmptyState } from "@/components/crm/empty-state";
import { DataCard } from "@/components/crm/data-card";

export const Route = createFileRoute("/automations")({
  component: AutomationsPage,
  head: () => ({
    meta: [
      { title: "Automations — Corevix CRM" },
      { name: "description", content: "Automate your business workflows" },
    ],
  }),
});

const initialAutomations = [
  {
    id: 1,
    name: "Auto-assign new leads",
    trigger: "New lead created",
    action: "Assign to sales agent",
    active: true,
  },
  {
    id: 2,
    name: "WhatsApp welcome message",
    trigger: "New WhatsApp message",
    action: "Send template message",
    active: false,
  },
  {
    id: 3,
    name: "Overdue task reminder",
    trigger: "Task overdue",
    action: "Create notification",
    active: true,
  },
  {
    id: 4,
    name: "Proposal → Invoice",
    trigger: "Proposal accepted",
    action: "Create invoice draft",
    active: true,
  },
  {
    id: 5,
    name: "Lead follow-up reminder",
    trigger: "No follow-up after 3 days",
    action: "Create task",
    active: false,
  },
];

function AutomationsPage() {
  const [automations, setAutomations] = useState(initialAutomations);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const toggle = (id: number) => {
    setAutomations(automations.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
    toast.success("Automation updated");
  };

  const filtered = automations.filter((a) =>
    `${a.name} ${a.trigger} ${a.action}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Automations"
        subtitle="Automate repetitive workflows"
        actionLabel="Nueva automatización"
        onAction={() => setDialogOpen(true)}
      />

      <SearchFilters
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar automatizaciones..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-6 w-6" />}
          title="No se encontraron automatizaciones"
          description="Crea automatizaciones para simplificar tus flujos de trabajo."
          actionLabel="Nueva automatización"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => (
            <DataCard key={a.id}>
              <div className="flex items-center gap-4">
                <Zap
                  className={`h-5 w-5 shrink-0 ${a.active ? "text-primary" : "text-muted-foreground"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    When: {a.trigger} → Then: {a.action}
                  </p>
                </div>
                <Switch checked={a.active} onCheckedChange={() => toggle(a.id)} />
              </div>
            </DataCard>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Automation</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast.success("Automation created");
              setDialogOpen(false);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="Automation name" required />
            </div>
            <div className="space-y-1.5">
              <Label>Trigger</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_created">New lead created</SelectItem>
                  <SelectItem value="whatsapp_message">New WhatsApp message</SelectItem>
                  <SelectItem value="task_overdue">Task overdue</SelectItem>
                  <SelectItem value="proposal_accepted">Proposal accepted</SelectItem>
                  <SelectItem value="no_followup">No follow-up after X days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assign_agent">Assign to agent</SelectItem>
                  <SelectItem value="send_message">Send template message</SelectItem>
                  <SelectItem value="create_notification">Create notification</SelectItem>
                  <SelectItem value="create_task">Create task</SelectItem>
                  <SelectItem value="create_invoice">Create invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Automation</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
