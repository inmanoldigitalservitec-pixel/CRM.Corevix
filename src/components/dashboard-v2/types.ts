import type { LucideIcon } from "lucide-react";

export type DashboardTone = "blue" | "green" | "orange" | "red" | "purple" | "teal" | "neutral";

export type DashboardKpi = {
  label: string;
  value: string;
  helper: string;
  tone: DashboardTone;
  icon: LucideIcon;
};

export type DashboardActionItem = {
  id: string;
  title: string;
  relatedTo: string;
  dueLabel: string;
  priority: "Alta" | "Media" | "Normal";
  actionLabel: string;
  tone: DashboardTone;
  icon: LucideIcon;
  href?: string;
};

export type DashboardScheduleItem = {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  tone: DashboardTone;
};

export type DashboardCollectionMetric = {
  label: string;
  value: string;
  percent: number;
  tone: DashboardTone;
};

export type DashboardPipelineStage = {
  label: string;
  count: number;
  value: string;
  percent: number;
  tone: DashboardTone;
};

export type DashboardClientReview = {
  id: string;
  initials: string;
  name: string;
  note: string;
  status: string;
  tone: DashboardTone;
};

export type DashboardActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  amount?: string;
  tone: DashboardTone;
  icon: LucideIcon;
};
