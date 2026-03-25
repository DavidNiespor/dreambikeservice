import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  pending:          { label: "Nowe",          class: "bg-muted text-muted-foreground border-border" },
  quoted:           { label: "Wycena wysłana", class: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  quote_accepted:   { label: "Zaakceptowana",  class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  quote_rejected:   { label: "Odrzucona",      class: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800" },
  in_progress:      { label: "W naprawie",     class: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  completed:        { label: "Zakończone",     class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  paid:             { label: "Opłacone",       class: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
};

const PRIORITY_MAP: Record<string, { label: string; class: string }> = {
  low:    { label: "Niski",    class: "bg-muted text-muted-foreground" },
  normal: { label: "Normalny", class: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  high:   { label: "Wysoki",   class: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  urgent: { label: "Pilne",    class: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, class: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={cn("text-xs font-medium", s.class)}>{s.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const p = PRIORITY_MAP[priority] || { label: priority, class: "bg-muted text-muted-foreground" };
  return <Badge variant="secondary" className={cn("text-xs font-medium", p.class)}>{p.label}</Badge>;
}

export const STATUS_OPTIONS = [
  { value: "pending",        label: "Nowe" },
  { value: "quoted",         label: "Wycena wysłana" },
  { value: "quote_accepted", label: "Zaakceptowana" },
  { value: "quote_rejected", label: "Odrzucona" },
  { value: "in_progress",    label: "W naprawie" },
  { value: "completed",      label: "Zakończone" },
  { value: "paid",           label: "Opłacone" },
];
