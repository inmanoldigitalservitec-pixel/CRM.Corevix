import * as React from "react";

import { cn } from "@/lib/utils";

const TASKS_MOBILE_CARD_TABLE_STYLES = `
@media (max-width: 767px) {
  div:has(> div > [data-corevix-tasks-mobile-cards="true"]),
  div:has(> [data-corevix-tasks-mobile-cards="true"]) {
    overflow: visible !important;
    border-color: transparent !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  div:has(> div > [data-corevix-tasks-mobile-cards="true"]) {
    margin-right: -16px;
    margin-left: -16px;
  }

  [data-corevix-tasks-mobile-cards="true"] {
    width: calc(100% + 32px);
    margin-right: -16px;
    margin-left: -16px;
    overflow: visible;
  }

  [data-corevix-tasks-mobile-cards="true"] table,
  [data-corevix-tasks-mobile-cards="true"] thead,
  [data-corevix-tasks-mobile-cards="true"] tbody,
  [data-corevix-tasks-mobile-cards="true"] tr,
  [data-corevix-tasks-mobile-cards="true"] th,
  [data-corevix-tasks-mobile-cards="true"] td {
    width: 100%;
  }

  [data-corevix-tasks-mobile-cards="true"] table {
    display: block;
    border-collapse: separate;
    border-spacing: 0;
  }

  [data-corevix-tasks-mobile-cards="true"] thead {
    display: none;
  }

  [data-corevix-tasks-mobile-cards="true"] tbody {
    display: grid;
    gap: 14px;
  }

  [data-corevix-tasks-mobile-cards="true"] tr {
    position: relative;
    display: flex;
    min-height: 218px;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
    border-width: 1px 0;
    border-style: solid;
    border-color: rgb(226 232 240);
    border-radius: 0;
    background: #ffffff;
    padding: 22px 18px 18px 24px;
    box-shadow: none;
  }

  [data-corevix-tasks-mobile-cards="true"] tr::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    background: rgb(37 99 235);
  }

  [data-corevix-tasks-mobile-cards="true"] tr:hover {
    background: #ffffff;
  }

  [data-corevix-tasks-mobile-cards="true"] td {
    display: block;
    border: 0;
    padding: 0;
    min-width: 0;
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(1):has([role="checkbox"]) {
    order: 80;
    width: auto;
    padding-top: 2px;
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(2) {
    display: none;
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(3) {
    order: 10;
    padding-right: 32px;
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(3) > div:first-child {
    gap: 7px;
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(3) span.font-semibold {
    display: block;
    font-size: 17px;
    line-height: 1.28;
    font-weight: 850;
    letter-spacing: -0.035em;
    color: rgb(2 6 23);
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(3) .line-clamp-2 {
    margin-top: 10px;
    max-width: 36ch;
    font-size: 13.5px;
    line-height: 1.6;
    font-weight: 550;
    color: rgb(100 116 139);
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(4) {
    order: 20;
    width: auto;
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(5) {
    display: none;
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(6),
  [data-corevix-tasks-mobile-cards="true"] td:nth-child(7),
  [data-corevix-tasks-mobile-cards="true"] td:nth-child(8),
  [data-corevix-tasks-mobile-cards="true"] td:nth-child(9) {
    order: 40;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 650;
    color: rgb(100 116 139);
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(6)::before,
  [data-corevix-tasks-mobile-cards="true"] td:nth-child(7)::before,
  [data-corevix-tasks-mobile-cards="true"] td:nth-child(8)::before,
  [data-corevix-tasks-mobile-cards="true"] td:nth-child(9)::before {
    min-width: 72px;
    color: rgb(148 163 184);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(6)::before {
    content: "Entrega";
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(7)::before {
    content: "Asignado";
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(8)::before {
    content: "Proyecto";
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(9)::before {
    content: "Files";
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(6),
  [data-corevix-tasks-mobile-cards="true"] td:nth-child(7),
  [data-corevix-tasks-mobile-cards="true"] td:nth-child(8),
  [data-corevix-tasks-mobile-cards="true"] td:nth-child(9) span,
  [data-corevix-tasks-mobile-cards="true"] td:nth-child(8) div {
    min-width: 0;
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(10) {
    order: 21;
    margin-top: -36px;
    padding-left: 112px;
    width: auto;
  }

  [data-corevix-tasks-mobile-cards="true"] td:nth-child(10) span {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    border-radius: 4px;
    background: rgb(241 245 249);
    padding: 0 9px;
    font-size: 11px;
    font-weight: 850;
  }

  [data-corevix-tasks-mobile-cards="true"] td:last-child {
    order: 90;
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid rgb(226 232 240);
  }

  [data-corevix-tasks-mobile-cards="true"] td:last-child > div {
    justify-content: space-between;
    gap: 8px;
  }

  [data-corevix-tasks-mobile-cards="true"] td:last-child button:first-child {
    display: none;
  }

  [data-corevix-tasks-mobile-cards="true"] td:last-child button {
    border-radius: 4px;
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(1) {
    display: none;
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(2) {
    display: block;
    order: 10;
    padding-right: 32px;
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(2) > div:first-child {
    gap: 7px;
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(2) span.font-semibold {
    display: block;
    font-size: 17px;
    line-height: 1.28;
    font-weight: 850;
    letter-spacing: -0.035em;
    color: rgb(2 6 23);
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(2) .line-clamp-2 {
    margin-top: 10px;
    max-width: 36ch;
    font-size: 13.5px;
    line-height: 1.6;
    font-weight: 550;
    color: rgb(100 116 139);
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(3) {
    order: 20;
    width: auto;
    padding-right: 0;
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(4) {
    display: none;
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(5),
  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(6),
  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(7),
  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(8) {
    order: 40;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 650;
    color: rgb(100 116 139);
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(5)::before,
  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(6)::before,
  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(7)::before,
  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(8)::before {
    min-width: 72px;
    color: rgb(148 163 184);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(5)::before {
    content: "Entrega";
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(6)::before {
    content: "Asignado";
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(7)::before {
    content: "Proyecto";
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(8)::before {
    content: "Files";
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(9) {
    order: 21;
    margin-top: -36px;
    padding-left: 112px;
    width: auto;
  }

  [data-corevix-tasks-mobile-cards="true"] tr:not(:has(td:nth-child(1) [role="checkbox"])) td:nth-child(9) span {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    border-radius: 4px;
    background: rgb(241 245 249);
    padding: 0 9px;
    font-size: 11px;
    font-weight: 850;
  }

  div[role="dialog"] header > div:first-child {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  div[role="dialog"] header > div:first-child > div:first-child,
  div[role="dialog"] header > div:first-child > div:last-child {
    width: 100%;
  }

  div[role="dialog"] header > div:first-child > div:last-child {
    justify-content: space-between;
    gap: 8px;
  }

  div[role="dialog"] header > div:first-child > div:first-child > div:first-child {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  div[role="dialog"] header h2 {
    width: 100%;
    max-width: none;
    font-size: 29px !important;
    line-height: 1.08 !important;
    letter-spacing: -0.055em !important;
  }

  div[role="dialog"] header .h-9.px-3.text-sm {
    flex: 1 1 0;
    justify-content: center;
    min-width: 0;
  }

  div[role="dialog"] header [aria-label="Cerrar detalle de tarea"] {
    flex: 0 0 40px;
  }
}
`;

function useIsTasksRoute() {
  const [isTasksRoute, setIsTasksRoute] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.pathname === "/tasks";
  });

  React.useEffect(() => {
    const syncRoute = () => setIsTasksRoute(window.location.pathname === "/tasks");
    syncRoute();
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  return isTasksRoute;
}

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const isTasksRoute = useIsTasksRoute();

    return (
      <div
        className="relative w-full overflow-auto"
        data-corevix-tasks-mobile-cards={isTasksRoute ? "true" : undefined}
      >
        {isTasksRoute ? <style>{TASKS_MOBILE_CARD_TABLE_STYLES}</style> : null}
        <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
      </div>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
