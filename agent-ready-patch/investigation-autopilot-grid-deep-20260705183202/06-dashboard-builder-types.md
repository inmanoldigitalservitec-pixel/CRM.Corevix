## 06-dashboard-builder-types
```
import type { ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type DashboardWidgetMode = "mini" | "standard" | "advanced";
export type DashboardWidgetSize = "compact" | "standard" | "expanded";
export type DashboardBreakpoint = "lg" | "md" | "sm" | "xs";

export type DashboardGridLayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
};

export type DashboardWidgetSettings = Record<string, unknown>;

export type DashboardWidgetPreference = {
  widgetId: string;
  enabled: boolean;
  mode: DashboardWidgetMode;
  layout: Partial<Record<DashboardBreakpoint, DashboardGridLayoutItem>>;
  settings: DashboardWidgetSettings;
};

export type DashboardWidgetRenderProps = {
  mode: DashboardWidgetMode;
  settings: DashboardWidgetSettings;
};

export type DashboardWidgetRenderItem = {
  id: string;
  content?: ReactNode;
  render?: (props: DashboardWidgetRenderProps) => ReactNode;
};

export type DashboardWidgetDefinition = {
  id: string;
  module: string;
  title: string;
  description: string;
  icon: LucideIcon;
  size: DashboardWidgetSize;
  supportedModes: DashboardWidgetMode[];
  defaultMode: DashboardWidgetMode;
  defaultLayout: Partial<Record<DashboardBreakpoint, DashboardGridLayoutItem>>;
  component?: ComponentType<DashboardWidgetRenderProps>;
  preview?: ReactNode;
};
```
