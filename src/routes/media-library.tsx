import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileImage,
  FolderOpen,
  ImageIcon,
  Link2,
  Package,
  Search,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/crm/empty-state";
import { LoadingCards } from "@/components/crm/loading-state";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/media-library")({
  component: MediaLibraryPage,
  head: () => ({ meta: [{ title: "Biblioteca multimedia — Corevix CRM" }] }),
});

type Asset = {
  id: string;
  source: "drive" | "product";
  title: string;
  subtitle: string;
  previewUrl: string | null;
  openUrl: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MediaLibraryPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadAssets = async () => {
      if (!profile?.company_id) return;

      setLoading(true);
      const db = supabase as any;
      const [driveResult, productResult] = await Promise.all([
        db
          .from("drive_files")
          .select(
            "id,name,mime_type,web_view_link,web_content_link,thumbnail_link,linked_type,created_at",
          )
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false })
          .limit(120),
        db
          .from("products")
          .select("id,name,type,image_url,updated_at")
          .eq("company_id", profile.company_id)
          .not("image_url", "is", null)
          .order("updated_at", { ascending: false })
          .limit(120),
      ]);

      if (cancelled) return;

      const driveAssets: Asset[] = (driveResult.data || []).map((file: any) => ({
        id: `drive-${file.id}`,
        source: "drive",
        title: file.name || "Archivo sin nombre",
        subtitle: `Drive · ${file.linked_type || "general"}`,
        previewUrl: file.thumbnail_link || null,
        openUrl: file.web_view_link || file.web_content_link || null,
        createdAt: file.created_at,
      }));

      const productAssets: Asset[] = (productResult.data || []).map((product: any) => ({
        id: `product-${product.id}`,
        source: "product",
        title: product.name || "Producto sin nombre",
        subtitle: `Producto · ${product.type || "item"}`,
        previewUrl: product.image_url || null,
        openUrl: product.image_url || null,
        createdAt: product.updated_at || new Date().toISOString(),
      }));

      setAssets(
        [...productAssets, ...driveAssets].sort(
          (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
        ),
      );
      setLoading(false);
    };

    void loadAssets();
    return () => {
      cancelled = true;
    };
  }, [profile?.company_id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assets;
    return assets.filter((asset) =>
      `${asset.title} ${asset.subtitle}`.toLowerCase().includes(term),
    );
  }, [assets, search]);

  const driveCount = assets.filter((asset) => asset.source === "drive").length;
  const productCount = assets.filter((asset) => asset.source === "product").length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Biblioteca multimedia</h1>
          <p className="text-sm text-muted-foreground">
            Archivos de Drive y recursos visuales ya guardados por el CRM en un solo lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link to="/tasks">
              <FolderOpen className="h-4 w-4" />
              Ver archivos en tareas
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/products">
              <Package className="h-4 w-4" />
              Ver imagenes de productos
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total de activos</CardDescription>
            <CardTitle className="text-3xl">{assets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Archivos de Drive</CardDescription>
            <CardTitle className="text-3xl">{driveCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Imagenes de productos</CardDescription>
            <CardTitle className="text-3xl">{productCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar recurso</CardTitle>
          <CardDescription>Filtra por nombre o por origen.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ej. brochure, logo, contrato, producto..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingCards count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-6 w-6" />}
          title="No encontramos recursos"
          description="Todavia no hay archivos centralizados o el filtro no devolvio coincidencias."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((asset) => (
            <Card key={asset.id} className="overflow-hidden">
              <div className="flex aspect-[16/9] items-center justify-center bg-slate-100">
                {asset.previewUrl ? (
                  <img
                    src={asset.previewUrl}
                    alt={asset.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileImage className="h-10 w-10 text-slate-400" />
                )}
              </div>
              <CardHeader>
                <CardTitle className="line-clamp-1 text-base">{asset.title}</CardTitle>
                <CardDescription>{asset.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">{formatDate(asset.createdAt)}</div>
                <div className="flex gap-2">
                  {asset.openUrl ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={asset.openUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </a>
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={asset.source === "drive" ? "/tasks" : "/products"}>
                      <Link2 className="h-4 w-4" />
                      Origen
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
