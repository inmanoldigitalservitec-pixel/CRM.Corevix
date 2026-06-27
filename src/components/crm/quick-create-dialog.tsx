import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, FileText, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type QuickCreateType = "lead" | "client" | "task";

export type QuickCreateSourceType =
  | "lead"
  | "client"
  | "deal"
  | "proposal"
  | "invoice"
  | "project"
  | "product"
  | "whatsapp"
  | "manual";

export type QuickCreateContext = {
  sourceType?: QuickCreateSourceType;
  sourceId?: string | null;
  prefill?: Record<string, unknown>;
};

type QuickCreateDialogProps = {
  type: QuickCreateType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: QuickCreateContext;
  onCreated?: (args: { type: QuickCreateType; record: any }) => void;
};

type QuickCreateForm = {
  name: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  whatsapp: string;
  service: string;
  title: string;
  description: string;
  notes: string;
  due_date: string;
  priority: string;
};

function tomorrowDateKey() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function nullableText(value: unknown) {
  const v = text(value);
  return v ? v : null;
}

function splitPersonName(raw: string) {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: "", last_name: "" };
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts.slice(-1).join(" "),
  };
}

function resolveRelatedPayload(context?: QuickCreateContext) {
  const sourceType = context?.sourceType;
  const sourceId = context?.sourceId ? String(context.sourceId) : null;
  const prefill = context?.prefill || {};

  return {
    related_client_id:
      text(prefill.related_client_id) || (sourceType === "client" ? sourceId : null),
    related_lead_id: text(prefill.related_lead_id) || (sourceType === "lead" ? sourceId : null),
    related_deal_id: text(prefill.related_deal_id) || (sourceType === "deal" ? sourceId : null),
    related_project_id:
      text(prefill.related_project_id) || (sourceType === "project" ? sourceId : null),
  };
}

export function QuickCreateDialog({
  type,
  open,
  onOpenChange,
  context,
  onCreated,
}: QuickCreateDialogProps) {
  const { profile, user } = useAuth();
  const prefill = context?.prefill || {};

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<QuickCreateForm>({
    name: "",
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    whatsapp: "",
    service: "",
    title: "",
    description: "",
    notes: "",
    due_date: tomorrowDateKey(),
    priority: "Medium",
  });

  useEffect(() => {
    if (!open) return;

    const nextName = text(prefill.name || prefill.full_name || prefill.company_name);
    const nextCompany = text(prefill.company_name);
    const nextContact = text(prefill.contact_person);
    const nextPhone = text(prefill.phone);
    const nextWhatsapp = text(prefill.whatsapp || prefill.phone);
    const nextService = text(prefill.service || prefill.selected_service || prefill.product_name);
    const nextTitle =
      text(prefill.title) || (type === "task" && nextName ? `Dar seguimiento a ${nextName}` : "");

    setForm({
      name: nextName,
      company_name: nextCompany,
      contact_person: nextContact,
      email: text(prefill.email),
      phone: nextPhone,
      whatsapp: nextWhatsapp,
      service: nextService,
      title: nextTitle,
      description: text(prefill.description),
      notes: text(prefill.notes),
      due_date: text(prefill.due_date) || tomorrowDateKey(),
      priority: text(prefill.priority) || "Medium",
    });
  }, [open, type, context?.sourceType, context?.sourceId]);

  const title = useMemo(() => {
    if (type === "lead") return "Nuevo prospecto rápido";
    if (type === "client") return "Nuevo cliente rápido";
    return "Nueva tarea rápida";
  }, [type]);

  const description = useMemo(() => {
    if (type === "lead") return "Captura lo mínimo y deja que el CRM complete el flujo después.";
    if (type === "client") return "Crea la cuenta con los datos esenciales.";
    return "Crea una tarea conectada al contexto actual.";
  }, [type]);

  const Icon = type === "lead" ? UserPlus : type === "client" ? Users : CalendarClock;

  const updateField = (key: keyof QuickCreateForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!profile?.company_id) {
      toast.error("No se pudo detectar la empresa.");
      return;
    }

    setSaving(true);

    try {
      let table = "";
      let payload: Record<string, unknown> = {};

      if (type === "lead") {
        const name = form.name.trim() || form.company_name.trim();
        if (!name && !form.phone.trim() && !form.whatsapp.trim() && !form.email.trim()) {
          toast.error("Agrega al menos nombre, teléfono, WhatsApp o email.");
          return;
        }

        const person = splitPersonName(name || "Prospecto");
        const service = form.service.trim();

        table = "leads";
        payload = {
          company_id: profile.company_id,
          first_name: person.first_name || "Prospecto",
          last_name: person.last_name || "",
          company_name: nullableText(form.company_name),
          email: nullableText(form.email),
          phone: nullableText(form.phone || form.whatsapp),
          whatsapp: nullableText(form.whatsapp || form.phone),
          source: text(prefill.source) || "Website",
          status: text(prefill.status) || "New",
          assigned_to: text(prefill.assigned_to) || profile.user_id || user?.id || null,
          estimated_value: Number(prefill.estimated_value || 0) || 0,
          notes: nullableText(form.notes),
          metadata: service ? { selected_service: service } : null,
          source_channel: context?.sourceType === "whatsapp" ? "whatsapp" : null,
          first_touch_channel: context?.sourceType === "whatsapp" ? "whatsapp" : null,
          last_touch_channel: context?.sourceType === "whatsapp" ? "whatsapp" : null,
        };
      }

      if (type === "client") {
        const companyName = form.company_name.trim() || form.name.trim();
        if (!companyName) {
          toast.error("El nombre o empresa es requerido.");
          return;
        }

        table = "clients";
        payload = {
          company_id: profile.company_id,
          company_name: companyName,
          contact_person: nullableText(form.contact_person || form.name),
          email: nullableText(form.email),
          phone: nullableText(form.phone || form.whatsapp),
          whatsapp: nullableText(form.whatsapp || form.phone),
          status: "Active",
          account_manager: text(prefill.account_manager) || profile.id || null,
          notes: nullableText(form.notes),
        };
      }

      if (type === "task") {
        if (!form.title.trim()) {
          toast.error("El título de la tarea es requerido.");
          return;
        }

        const related = resolveRelatedPayload(context);

        table = "tasks";
        payload = {
          company_id: profile.company_id,
          title: form.title.trim(),
          description: nullableText(form.description || form.notes),
          status: "To Do",
          priority: form.priority || "Medium",
          due_date: form.due_date || null,
          assigned_to: text(prefill.assigned_to) || profile.user_id || user?.id || null,
          related_client_id: related.related_client_id || null,
          related_lead_id: related.related_lead_id || null,
          related_deal_id: related.related_deal_id || null,
          related_project_id: related.related_project_id || null,
        };
      }

      const { data, error } = await (supabase as any)
        .from(table)
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      toast.success(
        type === "lead"
          ? "Prospecto creado"
          : type === "client"
            ? "Cliente creado"
            : "Tarea creada",
      );

      onCreated?.({ type, record: data });
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el registro.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#eaf1ff] text-[#1d62f9]">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === "lead" ? (
            <>
              <div className="space-y-1.5">
                <Label>Nombre o empresa</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Ej: Juan Pérez / Diseño y Muebles S.A."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => updateField("whatsapp", e.target.value)}
                    placeholder="+1 809 555 0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="cliente@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Servicio de interés</Label>
                <Input
                  value={form.service}
                  onChange={(e) => updateField("service", e.target.value)}
                  placeholder="Ej: CRM, página web, automatización..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Nota rápida</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={3}
                  placeholder="Qué necesita, de dónde vino, urgencia..."
                />
              </div>
            </>
          ) : null}

          {type === "client" ? (
            <>
              <div className="space-y-1.5">
                <Label>Empresa o nombre</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  placeholder="Ej: Diseño y Muebles S.A."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Contacto principal</Label>
                <Input
                  value={form.contact_person}
                  onChange={(e) => updateField("contact_person", e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>WhatsApp / teléfono</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => updateField("whatsapp", e.target.value)}
                    placeholder="+1 809 555 0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="cliente@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={3}
                />
              </div>
            </>
          ) : null}

          {type === "task" ? (
            <>
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Ej: Dar seguimiento al cliente"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Vence</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => updateField("due_date", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridad</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(value) => updateField("priority", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                  placeholder="Detalles del seguimiento..."
                />
              </div>

              {context?.sourceType ? (
                <div className="rounded-[14px] border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <FileText className="mr-1 inline h-3.5 w-3.5" />
                  Se creará vinculada a: {context.sourceType}
                </div>
              ) : null}
            </>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creando..." : "Crear rápido"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
