import { useEffect, useState, type ReactNode } from "react";
import { Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";

export type GlobalKpiTone = "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral";

export type GlobalKpiItem = {
  key: string;
  label: string;
  value: string | number;
  helper?: string;
  icon?: LucideIcon;
  tone?: GlobalKpiTone;
  meta?: Array<{
    label: string;
    value: string | number;
    tone?: GlobalKpiTone;
  }>;
  onClick?: () => void;
};

type GlobalKpiStripProps = {
  items: GlobalKpiItem[];
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

const toneStyles: Record<
  GlobalKpiTone,
  {
    dot: string;
    icon: string;
    text: string;
    background: string;
  }
> = {
  blue: {
    dot: "bg-blue-500",
    icon: "border-blue-100 bg-blue-50 text-blue-700",
    text: "text-blue-700",
    background: "from-blue-50/70 via-white to-white",
  },
  green: {
    dot: "bg-emerald-500",
    icon: "border-emerald-100 bg-emerald-50 text-emerald-700",
    text: "text-emerald-700",
    background: "from-emerald-50/70 via-white to-white",
  },
  orange: {
    dot: "bg-orange-500",
    icon: "border-orange-100 bg-orange-50 text-orange-700",
    text: "text-orange-700",
    background: "from-orange-50/70 via-white to-white",
  },
  red: {
    dot: "bg-rose-500",
    icon: "border-rose-100 bg-rose-50 text-rose-700",
    text: "text-rose-700",
    background: "from-rose-50/70 via-white to-white",
  },
  purple: {
    dot: "bg-violet-500",
    icon: "border-violet-100 bg-violet-50 text-violet-700",
    text: "text-violet-700",
    background: "from-violet-50/70 via-white to-white",
  },
  teal: {
    dot: "bg-teal-500",
    icon: "border-teal-100 bg-teal-50 text-teal-700",
    text: "text-teal-700",
    background: "from-teal-50/70 via-white to-white",
  },
  neutral: {
    dot: "bg-slate-300",
    icon: "border-slate-100 bg-slate-50 text-slate-600",
    text: "text-slate-600",
    background: "from-slate-50/70 via-white to-white",
  },
};

function styleFor(tone?: GlobalKpiTone) {
  return toneStyles[tone || "blue"];
}

export function GlobalKpiStrip({
  items,
  title = "Resumen",
  subtitle,
  actionLabel,
  onAction,
  actionIcon,
  className,
  children,
}: GlobalKpiStripProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!api) return;
    const update = () => setSelected(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [api]);

  if (!items.length) return null;

  return (
    <section
      className={cn(
        "relative left-1/2 -mt-6 w-screen -translate-x-1/2 bg-white px-4 pt-6 md:hidden",
        className,
      )}
      aria-label={title}
    >
      <div className="border-b border-slate-200/70 pb-2">
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[18px] font-extrabold leading-tight tracking-[-0.02em] text-slate-950">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-0.5 line-clamp-1 text-[11.5px] font-semibold text-slate-500">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actionLabel && onAction ? (
            <Button
              type="button"
              size="sm"
              className="h-8 shrink-0 rounded-full px-3 text-[12px] font-bold"
              onClick={onAction}
            >
              {actionIcon || <Plus className="h-3.5 w-3.5" />}
              {actionLabel}
            </Button>
          ) : null}
        </div>

        <Carousel setApi={setApi} opts={{ align: "start", loop: false }}>
          <CarouselContent className="-ml-2">
            {items.map((item) => {
              const tone = styleFor(item.tone);
              const Icon = item.icon;
              const Wrapper = item.onClick ? "button" : "div";

              return (
                <CarouselItem key={item.key} className="pl-2">
                  <Wrapper
                    type={item.onClick ? "button" : undefined}
                    onClick={item.onClick}
                    className={cn(
                      "block min-h-[78px] w-full text-left",
                      item.onClick && "transition active:scale-[0.992]",
                    )}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-bold text-slate-500">
                          {item.label}
                        </p>
                        <div className="mt-0.5 truncate text-[24px] font-extrabold leading-none tracking-normal text-slate-950">
                          {item.value}
                        </div>
                        {item.helper ? (
                          <p className="mt-0.5 truncate text-[11.5px] font-semibold text-slate-500">
                            {item.helper}
                          </p>
                        ) : null}
                      </div>

                      {Icon ? (
                        <span
                          className={cn(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border",
                            tone.icon,
                          )}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                      ) : null}
                    </div>

                    {item.meta?.length ? (
                      <div
                        className={cn(
                          "mt-2 grid gap-2",
                          item.meta.length > 3
                            ? "grid-cols-4"
                            : item.meta.length > 2
                              ? "grid-cols-3"
                              : "grid-cols-2",
                        )}
                      >
                        {item.meta.slice(0, 4).map((meta) => {
                          const metaTone = styleFor(meta.tone || item.tone);
                          return (
                            <div
                              key={`${item.key}-${meta.label}`}
                              className="flex min-w-0 items-center gap-1.5"
                            >
                              <div className="flex min-w-0 items-center gap-1.5">
                                <span className={cn("h-1.5 w-1.5 rounded-full", metaTone.dot)} />
                                <span className="truncate text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">
                                  {meta.label}
                                </span>
                              </div>
                              <div
                                className={cn("shrink-0 text-[12px] font-extrabold", metaTone.text)}
                              >
                                {meta.value}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </Wrapper>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        {items.length > 1 || children ? (
          <div className="mt-1.5 flex items-center justify-between gap-3">
            {items.length > 1 ? (
              <div className="flex shrink-0 items-center gap-1.5">
                {items.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-label={`Ver ${item.label}`}
                    onClick={() => api?.scrollTo(index)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      selected === index ? "w-4 bg-slate-950" : "w-1.5 bg-slate-200",
                    )}
                  />
                ))}
              </div>
            ) : null}
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
