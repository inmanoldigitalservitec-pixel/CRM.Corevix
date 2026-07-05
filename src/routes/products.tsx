import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarClock,
  Camera,
  Code2,
  FileText,
  Globe,
  Layers,
  Megaphone,
  Package,
  Palette,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Users,
  Wrench,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
} from "lucide-react";
import { icons as lucideIconMap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useCrud } from "@/hooks/use-crud";
import { PageHeader } from "@/components/crm/page-header";
import { DataCard } from "@/components/crm/data-card";
import { SearchFilters } from "@/components/crm/search-filters";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadingTable as LoadingState } from "@/components/crm/loading-state";
import { MetricCard } from "@/components/crm/metric-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/i18n";

export const Route = createFileRoute("/products")({
  component: ProductsPage,
  head: () => ({ meta: [{ title: "Productos — Corevix CRM" }] }),
});

type ProductType = "service" | "product" | "package" | "subscription" | string;
type BillingType = "one_time" | "monthly" | "yearly" | "custom" | string;

type Product = {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  category: string | null;
  type: ProductType;
  description: string | null;
  base_price: number;
  currency: string;
  billing_type: BillingType;
  duration_days: number | null;
  deliverables: string | null;
  image_url?: string | null;
  icon_name?: string | null;
  keywords?: string[] | string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductWorkflow = {
  id: string;
  company_id: string;
  product_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductWorkflowStep = {
  id: string;
  company_id: string;
  workflow_id: string;
  product_id: string;
  title: string;
  description: string | null;
  step_order: number;
  default_priority: string;
  default_duration_days: number;
  assigned_role: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const PRODUCT_TYPES: Array<{ label: string; value: ProductType }> = [
  { label: "Servicio", value: "service" },
  { label: "Producto", value: "product" },
  { label: "Paquete", value: "package" },
  { label: "Suscripción", value: "subscription" },
];

const BILLING_TYPES: Array<{ label: string; value: BillingType }> = [
  { label: "Único", value: "one_time" },
  { label: "Mensual", value: "monthly" },
  { label: "Anual", value: "yearly" },
  { label: "Personalizado", value: "custom" },
];

const ALL_LUCIDE_ICONS = Object.keys(lucideIconMap)
  .filter((name) => /^[A-Z]/.test(name))
  .sort((a, b) => a.localeCompare(b));

function defaultIconForType(type?: ProductType | null) {
  if (type === "subscription") return "CalendarClock";
  if (type === "package") return "Sparkles";
  if (type === "product") return "Package";
  return "BriefcaseBusiness";
}

function humanizeIconName(name: string) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function ProductVisualIcon({
  name,
  className = "h-10 w-10",
}: {
  name?: string | null;
  className?: string;
}) {
  const iconName = name || "BriefcaseBusiness";
  const Icon = (lucideIconMap as Record<string, any>)[iconName] || BriefcaseBusiness;
  return <Icon className={className} />;
}

function formatMoney(value: number, currency: string) {
  const n = Number.isFinite(value) ? value : 0;
  return `${currency} ${n.toLocaleString()}`;
}

function productTypeLabel(value: string | null | undefined, t: (key: string) => string) {
  switch (value) {
    case "service":
      return t("products.type.service");
    case "product":
      return t("products.type.product");
    case "package":
      return t("products.type.package");
    case "subscription":
      return t("products.type.subscription");
    default:
      return value || "—";
  }
}

function billingTypeLabel(value: string | null | undefined, t: (key: string) => string) {
  switch (value) {
    case "one_time":
      return t("products.billing.one_time");
    case "monthly":
      return t("products.billing.monthly");
    case "yearly":
      return t("products.billing.yearly");
    case "custom":
      return t("products.billing.custom");
    default:
      return value || "—";
  }
}

function ProductsPage() {
  const { profile, roles } = useAuth();
  const { t } = useT();
  const isAdminLike = roles?.some((r) => ["super_admin", "admin", "manager"].includes(r)) ?? false;

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [billingFilter, setBillingFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">(
    isAdminLike ? "all" : "active",
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [productAdvancedOpen, setProductAdvancedOpen] = useState(false);
  const [productDraftType, setProductDraftType] = useState<ProductType>("service");
  const [productDraftIcon, setProductDraftIcon] = useState("BriefcaseBusiness");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const productImageInputRef = useRef<HTMLInputElement | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);

  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<ProductWorkflow | null>(null);
  const [workflowSteps, setWorkflowSteps] = useState<ProductWorkflowStep[]>([]);

  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [workflowForm, setWorkflowForm] = useState({
    name: "Proceso de ejecución",
    description: "",
  });
  const [workflowSaving, setWorkflowSaving] = useState(false);

  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ProductWorkflowStep | null>(null);
  const [stepSaving, setStepSaving] = useState(false);
  const [stepForm, setStepForm] = useState({
    title: "",
    description: "",
    step_order: "1",
    default_duration_days: "1",
    default_priority: "Medium",
    assigned_role: "",
    is_active: true,
  });

  const { data, loading, create, update } = useCrud<Product>({
    table: "products",
    orderBy: "updated_at",
    ascending: false,
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of data) {
      const c = (p.category || "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const p of data) {
      const t = String(p.type || "").trim();
      if (t) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const billingTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of data) {
      const b = String(p.billing_type || "").trim();
      if (b) set.add(b);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const stats = useMemo(() => {
    const total = data.length;
    const active = data.filter((p) => p.is_active).length;
    const inactive = total - active;
    const avgPrice =
      total > 0 ? Math.round(data.reduce((s, p) => s + Number(p.base_price || 0), 0) / total) : 0;
    return { total, active, inactive, avgPrice };
  }, [data]);

  const filteredIconNames = useMemo(() => {
    const q = iconSearch.trim().toLowerCase();
    if (!q) return ALL_LUCIDE_ICONS;
    return ALL_LUCIDE_ICONS.filter((name) => humanizeIconName(name).toLowerCase().includes(q));
  }, [iconSearch]);

  const activeProductImagePreview = productImagePreview || editItem?.image_url || null;

  function resetProductDraftVisuals() {
    setProductDraftType("service");
    setProductDraftIcon("BriefcaseBusiness");
    setIconPickerOpen(false);
    setIconSearch("");
    setProductImageFile(null);
    setProductImagePreview(null);
    if (productImageInputRef.current) productImageInputRef.current.value = "";
  }

  function handleProductImageFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen válida.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede pesar más de 5 MB.");
      return;
    }

    setProductImageFile(file);
    setProductImagePreview(URL.createObjectURL(file));
  }

  async function uploadProductImage(file: File) {
    if (!profile?.company_id) {
      throw new Error("No se encontró la empresa para subir la imagen.");
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ext.replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${profile.company_id}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (error) throw error;

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((p) => {
      const matchSearch =
        !q || `${p.name} ${p.category || ""} ${p.description || ""}`.toLowerCase().includes(q);
      const matchCategory = categoryFilter === "all" || (p.category || "") === categoryFilter;
      const matchType = typeFilter === "all" || String(p.type || "") === typeFilter;
      const matchBilling =
        billingFilter === "all" || String(p.billing_type || "") === billingFilter;
      const matchActive =
        activeFilter === "all" ||
        (activeFilter === "active" && p.is_active) ||
        (activeFilter === "inactive" && !p.is_active);
      return matchSearch && matchCategory && matchType && matchBilling && matchActive;
    });
  }, [activeFilter, billingFilter, categoryFilter, data, search, typeFilter]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdminLike) {
      toast.error("No tienes permiso para administrar productos");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const basePrice = Number(fd.get("base_price"));
    const durationDays = fd.get("duration_days") ? Number(fd.get("duration_days")) : null;

    const selectedType = (String(fd.get("type") || "service") || "service") as ProductType;
    const selectedBilling =
      selectedType === "subscription"
        ? "monthly"
        : ((String(fd.get("billing_type") || "one_time") || "one_time") as BillingType);

    setProductSaving(true);

    let uploadedImageUrl = editItem?.image_url || null;
    try {
      if (selectedType === "product" && productImageFile) {
        uploadedImageUrl = await uploadProductImage(productImageFile);
      }
    } catch (err: any) {
      setProductSaving(false);
      toast.error(err?.message || "No se pudo subir la imagen del producto.");
      return;
    }

    const record = {
      name: String(fd.get("name") || "").trim(),
      slug: (String(fd.get("slug") || "").trim() || null) as string | null,
      category: (String(fd.get("category") || "").trim() || null) as string | null,
      type: selectedType,
      description: (String(fd.get("description") || "").trim() || null) as string | null,
      base_price: Number.isFinite(basePrice) ? basePrice : 0,
      currency: (String(fd.get("currency") || "DOP") || "DOP").toUpperCase(),
      billing_type: selectedBilling,
      duration_days: durationDays && Number.isFinite(durationDays) ? durationDays : null,
      deliverables: (String(fd.get("deliverables") || "").trim() || null) as string | null,
      image_url: selectedType === "product" ? uploadedImageUrl : null,
      icon_name:
        selectedType === "product"
          ? null
          : ((String(fd.get("icon_name") || defaultIconForType(selectedType)).trim() ||
              defaultIconForType(selectedType)) as string),
      is_active: fd.get("is_active") === "on",
    };

    if (!record.name) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      if (editItem) {
        await update(editItem.id, record);
        toast.success("Producto actualizado");
        setSelected(null);
      } else {
        await create(record);
        toast.success("Producto creado");
      }
      setDialogOpen(false);
      setEditItem(null);
      resetProductDraftVisuals();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo guardar");
    } finally {
      setProductSaving(false);
    }
  };

  const estimatedTotalDays = useMemo(() => {
    return workflowSteps
      .filter((s) => s.is_active)
      .reduce(
        (sum, s) =>
          sum +
          (Number.isFinite(Number(s.default_duration_days)) ? Number(s.default_duration_days) : 0),
        0,
      );
  }, [workflowSteps]);

  useEffect(() => {
    let cancelled = false;
    const loadWorkflow = async () => {
      if (!selected?.id || !profile?.company_id) {
        setActiveWorkflow(null);
        setWorkflowSteps([]);
        return;
      }
      setWorkflowLoading(true);
      try {
        const db = supabase as any;
        const { data: wf, error: wfErr } = await db
          .from("product_workflows")
          .select("id,company_id,product_id,name,description,is_active,created_at,updated_at")
          .eq("company_id", profile.company_id)
          .eq("product_id", selected.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (wfErr) {
          setActiveWorkflow(null);
          setWorkflowSteps([]);
          return;
        }

        const workflow = (wf as ProductWorkflow | null) ?? null;
        setActiveWorkflow(workflow);
        if (!workflow?.id) {
          setWorkflowSteps([]);
          return;
        }

        const { data: steps, error: stepsErr } = await db
          .from("product_workflow_steps")
          .select(
            "id,company_id,workflow_id,product_id,title,description,step_order,default_priority,default_duration_days,assigned_role,is_active,created_at,updated_at",
          )
          .eq("company_id", profile.company_id)
          .eq("product_id", selected.id)
          .eq("workflow_id", workflow.id)
          .order("step_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (cancelled) return;
        if (stepsErr) {
          setWorkflowSteps([]);
          return;
        }
        setWorkflowSteps((Array.isArray(steps) ? steps : []) as ProductWorkflowStep[]);
      } finally {
        if (!cancelled) setWorkflowLoading(false);
      }
    };

    void loadWorkflow();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id, selected?.id]);

  function openCreateWorkflow() {
    if (!selected) return;
    setWorkflowForm({ name: "Proceso de ejecución", description: "" });
    setWorkflowDialogOpen(true);
  }

  async function handleCreateWorkflow() {
    if (!selected?.id || !profile?.company_id) return;
    if (!isAdminLike) {
      toast.error("No tienes permiso para crear workflows");
      return;
    }
    if (!workflowForm.name.trim()) {
      toast.error("El nombre del workflow es requerido");
      return;
    }
    setWorkflowSaving(true);
    try {
      const db = supabase as any;
      const { data: created, error } = await db
        .from("product_workflows")
        .insert({
          company_id: profile.company_id,
          product_id: selected.id,
          name: workflowForm.name.trim(),
          description: workflowForm.description.trim() || null,
          is_active: true,
        })
        .select("id,company_id,product_id,name,description,is_active,created_at,updated_at")
        .single();
      if (error) {
        toast.error(error.message || "No se pudo crear el workflow");
        return;
      }
      setActiveWorkflow(created as ProductWorkflow);
      setWorkflowSteps([]);
      setWorkflowDialogOpen(false);
      toast.success("Workflow creado");
    } finally {
      setWorkflowSaving(false);
    }
  }

  function openNewStep() {
    if (!activeWorkflow || !selected) return;
    const nextOrder = workflowSteps.length
      ? Math.max(...workflowSteps.map((s) => Number(s.step_order || 0))) + 1
      : 1;
    setEditingStep(null);
    setStepForm({
      title: "",
      description: "",
      step_order: String(nextOrder),
      default_duration_days: "1",
      default_priority: "Medium",
      assigned_role: "",
      is_active: true,
    });
    setStepDialogOpen(true);
  }

  function openEditStep(step: ProductWorkflowStep) {
    setEditingStep(step);
    setStepForm({
      title: step.title || "",
      description: step.description || "",
      step_order: String(step.step_order ?? 1),
      default_duration_days: String(step.default_duration_days ?? 1),
      default_priority: step.default_priority || "Medium",
      assigned_role: step.assigned_role || "",
      is_active: step.is_active !== false,
    });
    setStepDialogOpen(true);
  }

  async function handleSaveStep() {
    if (!selected?.id || !activeWorkflow?.id || !profile?.company_id) return;
    if (!isAdminLike) {
      toast.error("No tienes permiso para editar pasos");
      return;
    }
    if (!stepForm.title.trim()) {
      toast.error("El título del paso es requerido");
      return;
    }

    const stepOrder = Math.max(1, Number(stepForm.step_order || 1));
    const durationDays = Math.max(1, Number(stepForm.default_duration_days || 1));
    const payload = {
      company_id: profile.company_id,
      product_id: selected.id,
      workflow_id: activeWorkflow.id,
      title: stepForm.title.trim(),
      description: stepForm.description.trim() || null,
      step_order: Number.isFinite(stepOrder) ? stepOrder : 1,
      default_duration_days: Number.isFinite(durationDays) ? durationDays : 1,
      default_priority: stepForm.default_priority || "Medium",
      assigned_role: stepForm.assigned_role.trim() || null,
      is_active: Boolean(stepForm.is_active),
    };

    setStepSaving(true);
    try {
      const db = supabase as any;
      if (editingStep?.id) {
        const { data: updated, error } = await db
          .from("product_workflow_steps")
          .update(payload)
          .eq("id", editingStep.id)
          .select(
            "id,company_id,workflow_id,product_id,title,description,step_order,default_priority,default_duration_days,assigned_role,is_active,created_at,updated_at",
          )
          .single();
        if (error) {
          toast.error(error.message || "No se pudo actualizar el paso");
          return;
        }
        setWorkflowSteps((prev) =>
          prev.map((s) => (s.id === editingStep.id ? (updated as ProductWorkflowStep) : s)),
        );
        toast.success("Paso actualizado");
      } else {
        const { data: created, error } = await db
          .from("product_workflow_steps")
          .insert(payload)
          .select(
            "id,company_id,workflow_id,product_id,title,description,step_order,default_priority,default_duration_days,assigned_role,is_active,created_at,updated_at",
          )
          .single();
        if (error) {
          toast.error(error.message || "No se pudo crear el paso");
          return;
        }
        setWorkflowSteps((prev) =>
          [...prev, created as ProductWorkflowStep].sort((a, b) => a.step_order - b.step_order),
        );
        toast.success("Paso creado");
      }
      setStepDialogOpen(false);
      setEditingStep(null);
    } finally {
      setStepSaving(false);
    }
  }

  async function handleToggleStepActive(step: ProductWorkflowStep) {
    if (!isAdminLike) return;
    if (!profile?.company_id) return;
    const next = !step.is_active;
    const db = supabase as any;
    const { data: updated, error } = await db
      .from("product_workflow_steps")
      .update({ is_active: next })
      .eq("company_id", profile.company_id)
      .eq("id", step.id)
      .select(
        "id,company_id,workflow_id,product_id,title,description,step_order,default_priority,default_duration_days,assigned_role,is_active,created_at,updated_at",
      )
      .single();
    if (error) {
      toast.error(error.message || "No se pudo actualizar el paso");
      return;
    }
    setWorkflowSteps((prev) =>
      prev.map((s) => (s.id === step.id ? (updated as ProductWorkflowStep) : s)),
    );
  }

  async function handleMoveStep(stepId: string, direction: "up" | "down") {
    if (!isAdminLike) return;
    if (!profile?.company_id) return;
    const sorted = [...workflowSteps].sort((a, b) => a.step_order - b.step_order);
    const idx = sorted.findIndex((s) => s.id === stepId);
    if (idx < 0) return;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapWith];
    const db = supabase as any;

    const { error: e1 } = await db
      .from("product_workflow_steps")
      .update({ step_order: b.step_order })
      .eq("company_id", profile.company_id)
      .eq("id", a.id);
    const { error: e2 } = await db
      .from("product_workflow_steps")
      .update({ step_order: a.step_order })
      .eq("company_id", profile.company_id)
      .eq("id", b.id);
    if (e1 || e2) {
      toast.error((e1 || e2)?.message || "No se pudo reordenar");
      return;
    }

    setWorkflowSteps((prev) =>
      prev
        .map((s) => {
          if (s.id === a.id) return { ...s, step_order: b.step_order };
          if (s.id === b.id) return { ...s, step_order: a.step_order };
          return s;
        })
        .sort((x, y) => x.step_order - y.step_order),
    );
  }

  async function handleToggleActive(item: Product) {
    if (!isAdminLike) {
      toast.error("No tienes permiso para administrar productos");
      return;
    }
    try {
      await update(item.id, { is_active: !item.is_active } as any);
      toast.success(
        item.is_active ? "Producto desactivado correctamente." : "Producto activado correctamente.",
      );
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo actualizar el producto.");
    }
  }

  useEffect(() => {
    const onDemoOpenProductDetail = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;

      if (detail?.open === false) {
        setSelected(null);
        return;
      }

      const firstProduct = filtered[0] || data[0];
      if (firstProduct) {
        setSelected(firstProduct);
      }
    };

    window.addEventListener("crm-demo-open-product-detail", onDemoOpenProductDetail);
    return () =>
      window.removeEventListener("crm-demo-open-product-detail", onDemoOpenProductDetail);
  }, [filtered, data]);

  if (loading) return <LoadingState />;

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <PageHeader
        title={t("products.title")}
        subtitle={t("products.subtitle")}
        actionLabel={isAdminLike ? t("products.new") : undefined}
        onAction={
          isAdminLike
            ? () => {
                setEditItem(null);
                setDialogOpen(true);
              }
            : undefined
        }
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          variant="reference"
          size="compact"
          label={t("products.stats.total")}
          value={stats.total}
          icon={Layers}
          iconClassName="text-[#1d62f9]"
          iconChipClassName="bg-[#eaf1ff]"
        />
        <MetricCard
          variant="reference"
          size="compact"
          label={t("products.stats.active")}
          value={stats.active}
          icon={ShieldCheck}
          iconClassName="text-emerald-700"
          iconChipClassName="bg-emerald-50"
        />
        <MetricCard
          variant="reference"
          size="compact"
          label={t("products.stats.inactive")}
          value={stats.inactive}
          icon={Power}
          iconClassName="text-slate-700"
          iconChipClassName="bg-slate-100"
        />
        <MetricCard
          variant="reference"
          size="compact"
          label={t("products.stats.avgPrice")}
          value={`USD ${stats.avgPrice.toLocaleString()}`}
          icon={BadgeDollarSign}
          iconClassName="text-amber-700"
          iconChipClassName="bg-amber-50"
        />
      </div>

      <DataCard>
        <div data-demo="products-list" className="space-y-4">
          <SearchFilters
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("products.searchPlaceholder")}
            filters={[
              {
                key: "category",
                placeholder: t("products.category"),
                value: categoryFilter,
                onChange: setCategoryFilter,
                options: categories.map((c) => ({ label: c, value: c })),
              },
              {
                key: "type",
                placeholder: t("products.type"),
                value: typeFilter,
                onChange: setTypeFilter,
                options: types.map((type) => ({ label: productTypeLabel(type, t), value: type })),
              },
              {
                key: "billing",
                placeholder: t("products.billingLabel"),
                value: billingFilter,
                onChange: setBillingFilter,
                options: billingTypes.map((billing) => ({
                  label: billingTypeLabel(billing, t),
                  value: billing,
                })),
              },
              ...(isAdminLike
                ? [
                    {
                      key: "active",
                      placeholder: t("products.status"),
                      value: activeFilter,
                      onChange: setActiveFilter as any,
                      options: [
                        { label: t("products.all"), value: "all" },
                        { label: t("status.active"), value: "active" },
                        { label: t("status.inactive"), value: "inactive" },
                      ],
                    },
                  ]
                : []),
            ]}
          />

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title={t("products.empty")}
              description={isAdminLike ? t("products.emptyAdmin") : t("products.emptyActive")}
              actionLabel={isAdminLike ? t("products.new") : undefined}
              onAction={
                isAdminLike
                  ? () => {
                      setEditItem(null);
                      setProductDraftType("service");
                      setProductDraftIcon("BriefcaseBusiness");
                      setProductAdvancedOpen(false);
                      setDialogOpen(true);
                    }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-4 sm:-mx-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4 sm:pl-5">Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="hidden md:table-cell">Tipo</TableHead>
                    <TableHead className="hidden sm:table-cell">Precio</TableHead>
                    <TableHead className="hidden lg:table-cell">Cobro</TableHead>
                    {isAdminLike ? (
                      <TableHead className="text-right pr-4 sm:pr-5">Estado</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p, index) => (
                    <TableRow
                      data-demo={index === 0 ? "products-first-row" : undefined}
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setSelected(p)}
                    >
                      <TableCell className="pl-4 sm:pl-5">
                        <div className="flex min-w-[260px] items-center gap-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-white shadow-[0_8px_18px_rgba(15,23,42,.06)]">
                            {p.type === "product" && p.image_url ? (
                              <img
                                src={p.image_url}
                                alt={p.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ProductVisualIcon
                                name={p.icon_name || defaultIconForType(p.type)}
                                className="h-5 w-5 text-blue-600"
                              />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-semibold">{p.name}</div>
                            {p.description ? (
                              <div className="line-clamp-1 text-xs text-muted-foreground">
                                {p.description}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                {p.category || p.type || "Producto"}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.category || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {productTypeLabel(p.type, t)}
                      </TableCell>
                      <TableCell
                        data-demo={index === 0 ? "products-price" : undefined}
                        className="hidden sm:table-cell text-sm"
                      >
                        {formatMoney(Number(p.base_price || 0), p.currency || "USD")}
                      </TableCell>
                      <TableCell
                        data-demo={index === 0 ? "products-billing" : undefined}
                        className="hidden lg:table-cell text-sm"
                      >
                        {billingTypeLabel(p.billing_type, t)}
                      </TableCell>
                      {isAdminLike ? (
                        <TableCell
                          data-demo={index === 0 ? "products-active-status" : undefined}
                          className="text-right pr-4 sm:pr-5"
                        >
                          <span
                            className={
                              p.is_active
                                ? "text-emerald-700 font-semibold"
                                : "text-slate-500 font-semibold"
                            }
                          >
                            {p.is_active ? "Activo" : "Inactivo"}
                          </span>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DataCard>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) {
            setEditItem(null);
            resetProductDraftVisuals();
          }
        }}
      >
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5 text-left">
            <DialogTitle>{editItem ? t("products.edit") : t("products.new")}</DialogTitle>
            <p className="text-sm text-muted-foreground">{t("products.formSubtitle")}</p>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid max-h-[78vh] grid-cols-1 overflow-y-auto lg:grid-cols-[340px_1fr]">
              <div className="border-b bg-muted/20 p-6 lg:border-b-0 lg:border-r">
                {productDraftType === "product" ? (
                  <div className="space-y-4">
                    <button
                      type="button"
                      className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed bg-white text-center transition hover:border-blue-300 hover:bg-blue-50/40"
                      onClick={() => productImageInputRef.current?.click()}
                    >
                      {activeProductImagePreview ? (
                        <img
                          src={activeProductImagePreview}
                          alt={editItem?.name || t("products.productImage")}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="px-6 text-center">
                          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
                          <div className="mt-3 text-sm font-semibold">
                            {t("products.productImage")}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("products.productImageHelp")}
                          </p>
                          <div className="mt-4 inline-flex rounded-full border bg-white px-4 py-2 text-sm font-medium">
                            {t("products.uploadImage")}
                          </div>
                        </div>
                      )}
                    </button>

                    <input
                      ref={productImageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleProductImageFile(e.target.files?.[0] || null)}
                    />

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => productImageInputRef.current?.click()}
                      >
                        {activeProductImagePreview
                          ? t("products.changeImage")
                          : t("products.uploadImage")}
                      </Button>

                      {activeProductImagePreview ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setProductImageFile(null);
                            setProductImagePreview(null);
                            if (productImageInputRef.current)
                              productImageInputRef.current.value = "";
                          }}
                        >
                          {t("products.remove")}
                        </Button>
                      ) : null}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {t("products.imageRequirements")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex aspect-square items-center justify-center rounded-3xl border bg-white p-6 text-center">
                      <div>
                        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-blue-50 text-blue-700">
                          <ProductVisualIcon name={productDraftIcon} className="h-10 w-10" />
                        </div>
                        <div className="mt-4 text-sm font-semibold">
                          {productTypeLabel(productDraftType, t)}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("products.iconHelp")}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <input type="hidden" name="icon_name" value={productDraftIcon} />

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => setIconPickerOpen((v) => !v)}
                      >
                        <span className="flex items-center gap-2">
                          <ProductVisualIcon name={productDraftIcon} className="h-4 w-4" />
                          Agregar icono
                        </span>
                        <span className="max-w-[150px] truncate text-xs text-muted-foreground">
                          {humanizeIconName(productDraftIcon)}
                        </span>
                      </Button>

                      {iconPickerOpen ? (
                        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border bg-white shadow-xl">
                          <div className="border-b p-3">
                            <Input
                              value={iconSearch}
                              onChange={(e) => setIconSearch(e.target.value)}
                              placeholder={t("products.searchIcon")}
                              autoFocus
                            />
                          </div>

                          <div className="max-h-72 overflow-y-auto p-2">
                            {filteredIconNames.length ? (
                              <div className="grid grid-cols-5 gap-1.5">
                                {filteredIconNames.map((iconName) => {
                                  const active = productDraftIcon === iconName;
                                  return (
                                    <button
                                      key={iconName}
                                      type="button"
                                      title={humanizeIconName(iconName)}
                                      className={`grid h-12 place-items-center rounded-xl border transition ${
                                        active
                                          ? "border-blue-600 bg-blue-50 text-blue-700"
                                          : "border-transparent text-slate-600 hover:border-blue-200 hover:bg-blue-50/60"
                                      }`}
                                      onClick={() => {
                                        setProductDraftIcon(iconName);
                                        setIconPickerOpen(false);
                                        setIconSearch("");
                                      }}
                                    >
                                      <ProductVisualIcon name={iconName} className="h-5 w-5" />
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                {t("products.noIcons")}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-5 p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("products.type")}</Label>
                    <Select
                      name="type"
                      value={productDraftType}
                      onValueChange={(value) => {
                        const nextType = value as ProductType;
                        setProductDraftType(nextType);
                        setProductDraftIcon(defaultIconForType(nextType));
                        setIconPickerOpen(false);
                        setIconSearch("");
                        if (nextType !== "product") {
                          setProductImageFile(null);
                          setProductImagePreview(null);
                          if (productImageInputRef.current) productImageInputRef.current.value = "";
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPES.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {productTypeLabel(item.value, t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t("products.category")}</Label>
                    <Input
                      name="category"
                      defaultValue={editItem?.category || ""}
                      placeholder={
                        productDraftType === "product"
                          ? t("products.placeholder.categoryProduct")
                          : productDraftType === "subscription"
                            ? t("products.placeholder.categorySubscription")
                            : t("products.placeholder.categoryService")
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    {productDraftType === "subscription"
                      ? t("products.nameSubscription")
                      : productDraftType === "package"
                        ? t("products.namePackage")
                        : productDraftType === "product"
                          ? t("products.nameProduct")
                          : t("products.nameService")}
                  </Label>
                  <Input
                    name="name"
                    defaultValue={editItem?.name || ""}
                    required
                    placeholder={
                      productDraftType === "subscription"
                        ? t("products.placeholder.nameSubscription")
                        : productDraftType === "package"
                          ? t("products.placeholder.namePackage")
                          : productDraftType === "product"
                            ? t("products.placeholder.nameProduct")
                            : t("products.placeholder.nameService")
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div
                    className={
                      productDraftType === "subscription"
                        ? "space-y-1.5 sm:col-span-2"
                        : "space-y-1.5"
                    }
                  >
                    <Label>
                      {productDraftType === "subscription"
                        ? t("products.monthlyPrice")
                        : productDraftType === "package"
                          ? t("products.packagePrice")
                          : productDraftType === "product"
                            ? t("products.productPrice")
                            : t("products.servicePrice")}
                    </Label>
                    <Input
                      name="base_price"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={String(editItem?.base_price ?? "")}
                      placeholder="0.00"
                    />
                  </div>

                  {productDraftType === "subscription" ? (
                    <input type="hidden" name="billing_type" value="monthly" />
                  ) : (
                    <div className="space-y-1.5">
                      <Label>{t("products.billingLabel")}</Label>
                      <Select
                        name="billing_type"
                        defaultValue={editItem?.billing_type || "one_time"}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BILLING_TYPES.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {billingTypeLabel(item.value, t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label>{t("products.currency")}</Label>
                    <Input name="currency" defaultValue={editItem?.currency || "DOP"} />
                  </div>
                </div>

                {productDraftType === "service" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t("products.estimatedDuration")}</Label>
                      <Input
                        name="duration_days"
                        type="number"
                        defaultValue={editItem?.duration_days ?? ""}
                        placeholder={t("products.placeholder.duration")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("products.serviceDeliverables")}</Label>
                      <Input
                        name="deliverables"
                        defaultValue={editItem?.deliverables || ""}
                        placeholder={t("products.placeholder.serviceDeliverables")}
                      />
                    </div>
                  </div>
                ) : null}

                {productDraftType === "package" ? (
                  <div className="space-y-1.5">
                    <Label>{t("products.packageIncludes")}</Label>
                    <Textarea
                      name="deliverables"
                      defaultValue={editItem?.deliverables || ""}
                      rows={3}
                      placeholder={t("products.placeholder.packageIncludes")}
                    />
                  </div>
                ) : null}

                {productDraftType === "subscription" ? (
                  <div className="space-y-1.5">
                    <Label>{t("products.subscriptionIncludes")}</Label>
                    <Textarea
                      name="deliverables"
                      defaultValue={editItem?.deliverables || ""}
                      rows={3}
                      placeholder={t("products.placeholder.subscriptionIncludes")}
                    />
                  </div>
                ) : null}

                {productDraftType === "product" ? (
                  <div className="space-y-1.5">
                    <Label>{t("products.productDetails")}</Label>
                    <Textarea
                      name="deliverables"
                      defaultValue={editItem?.deliverables || ""}
                      rows={2}
                      placeholder={t("products.placeholder.productDetails")}
                    />
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label>{t("products.description")}</Label>
                  <Textarea
                    name="description"
                    defaultValue={editItem?.description || ""}
                    rows={4}
                    placeholder={t("products.placeholder.description")}
                  />
                </div>

                <div className="rounded-2xl border bg-muted/20 p-4">
                  <div className="mb-3 text-sm font-semibold">{t("products.internalOptions")}</div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Slug</Label>
                      <Input
                        name="slug"
                        defaultValue={editItem?.slug || ""}
                        placeholder={t("products.optional")}
                      />
                    </div>

                    <div className="flex items-end">
                      <div className="flex h-10 items-center gap-2">
                        <input
                          id="is_active"
                          name="is_active"
                          type="checkbox"
                          className="h-4 w-4"
                          defaultChecked={editItem ? Boolean(editItem.is_active) : true}
                        />
                        <Label htmlFor="is_active">{t("status.active")}</Label>
                      </div>
                    </div>
                  </div>
                </div>

                {productDraftType !== "product" ? (
                  <input type="hidden" name="image_url" value="" />
                ) : (
                  <input type="hidden" name="icon_name" value="" />
                )}

                <div className="flex justify-end gap-2 border-t pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditItem(null);
                      resetProductDraftVisuals();
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={!isAdminLike || productSaving}>
                    {productSaving
                      ? t("products.saving")
                      : editItem
                        ? t("products.saveChanges")
                        : t("products.create")}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {selected ? (
        <Dialog
          open={!!selected}
          onOpenChange={(o) => {
            if (!o) setSelected(null);
          }}
        >
          <DialogContent className="max-w-xl p-0 overflow-hidden">
            <DialogHeader className="relative border-b px-5 py-4 text-left">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[84px] bg-gradient-to-b from-blue-600/20 via-blue-500/10 to-transparent" />
              <div className="relative flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border bg-background/85 shadow-[0_12px_24px_rgba(15,23,42,.06)]">
                  {selected.type === "product" ? (
                    <Package className="h-5 w-5 text-blue-600" />
                  ) : (
                    <ProductVisualIcon
                      name={selected.icon_name || defaultIconForType(selected.type)}
                      className="h-5 w-5 text-blue-600"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-[18px] font-semibold tracking-[-0.02em] truncate">
                    {selected.name}
                  </DialogTitle>
                  <div className="mt-0.5 text-[13px] text-muted-foreground truncate">
                    {(selected.category || t("products.fallbackProduct")) +
                      (selected.type ? ` · ${productTypeLabel(selected.type, t)}` : "")}
                  </div>
                </div>
              </div>
            </DialogHeader>
            <div className="p-5 space-y-3 text-sm max-h-[75vh] overflow-y-auto">
              <div data-demo="products-detail-summary" className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Categoría</div>
                  <div className="font-medium">{selected.category || "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tipo</div>
                  <div className="font-medium">{productTypeLabel(selected.type, t)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Precio</div>
                  <div className="font-medium">
                    {formatMoney(Number(selected.base_price || 0), selected.currency || "USD")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Cobro</div>
                  <div className="font-medium">{billingTypeLabel(selected.billing_type, t)}</div>
                </div>
              </div>
              {selected.type === "product" && selected.image_url ? (
                <div className="overflow-hidden rounded-2xl border bg-muted/20">
                  <img
                    src={selected.image_url}
                    alt={selected.name}
                    className="max-h-64 w-full object-cover"
                  />
                </div>
              ) : null}

              {selected.description ? (
                <div>
                  <div className="text-xs text-muted-foreground">Descripción</div>
                  <div className="whitespace-pre-wrap">{selected.description}</div>
                </div>
              ) : null}
              {selected.deliverables ? (
                <div data-demo="products-deliverables">
                  <div className="text-xs text-muted-foreground">Entregables</div>
                  <div className="whitespace-pre-wrap">{selected.deliverables}</div>
                </div>
              ) : null}

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-muted-foreground">
                  {selected.is_active ? "Activo" : "Inactivo"} · Actualizado{" "}
                  {new Date(selected.updated_at).toLocaleDateString()}
                </div>
                <div data-demo="products-actions" className="flex gap-2">
                  {isAdminLike ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => void handleToggleActive(selected)}
                        className="gap-2"
                      >
                        <Power className="h-4 w-4" />
                        {selected.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditItem(selected);
                          setProductDraftType(selected.type || "service");
                          setProductDraftIcon(
                            selected.icon_name || defaultIconForType(selected.type),
                          );
                          setIconPickerOpen(false);
                          setIconSearch("");
                          setProductImageFile(null);
                          setProductImagePreview(null);
                          if (productImageInputRef.current) productImageInputRef.current.value = "";
                          setDialogOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setSelected(null)}>
                      Cerrar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <Dialog open={workflowDialogOpen} onOpenChange={(o) => setWorkflowDialogOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear workflow</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateWorkflow();
            }}
          >
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={workflowForm.name}
                onChange={(e) => setWorkflowForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                value={workflowForm.description}
                onChange={(e) => setWorkflowForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWorkflowDialogOpen(false)}
                disabled={workflowSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!isAdminLike || workflowSaving}>
                {workflowSaving ? "Creando..." : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={stepDialogOpen}
        onOpenChange={(o) => {
          setStepDialogOpen(o);
          if (!o) setEditingStep(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStep ? "Editar paso" : "Nuevo paso"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveStep();
            }}
          >
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                value={stepForm.title}
                onChange={(e) => setStepForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                value={stepForm.description}
                onChange={(e) => setStepForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Orden</Label>
                <Input
                  type="number"
                  min={1}
                  value={stepForm.step_order}
                  onChange={(e) => setStepForm((p) => ({ ...p, step_order: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duración (días)</Label>
                <Input
                  type="number"
                  min={1}
                  value={stepForm.default_duration_days}
                  onChange={(e) =>
                    setStepForm((p) => ({ ...p, default_duration_days: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select
                  value={stepForm.default_priority}
                  onValueChange={(v) => setStepForm((p) => ({ ...p, default_priority: v }))}
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
              <div className="space-y-1.5">
                <Label>Rol sugerido</Label>
                <Input
                  value={stepForm.assigned_role}
                  onChange={(e) => setStepForm((p) => ({ ...p, assigned_role: e.target.value }))}
                  placeholder="Ej: developer, designer…"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStepDialogOpen(false)}
                disabled={stepSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!isAdminLike || stepSaving}>
                {stepSaving ? "Guardando..." : editingStep ? "Guardar" : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
