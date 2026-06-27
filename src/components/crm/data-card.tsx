import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DataCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function DataCard({ children, className, noPadding }: DataCardProps) {
  return (
    <Card className={cn("border-border/40 shadow-sm bg-card", className)}>
      <CardContent className={noPadding ? "p-0" : "p-4 sm:p-5"}>{children}</CardContent>
    </Card>
  );
}
