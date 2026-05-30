import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  time: string;
  user?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  title?: string;
}

export function ActivityFeed({ items, title = "Recent Activity" }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No activity yet
      </div>
    );
  }

  return (
    <div>
      {title && <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</h4>}
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 text-sm">
            <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{item.action}</p>
              <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
