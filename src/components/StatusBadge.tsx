import { cn } from "@/lib/utils";

export function StatusBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "destructive" | "info" | "primary" }) {
  const map = {
    default: "bg-muted text-muted-foreground border-border",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/25 text-warning-foreground border-warning/40",
    destructive: "bg-destructive/15 text-destructive border-destructive/30",
    info: "bg-info/15 text-info border-info/30",
    primary: "bg-primary/15 text-primary border-primary/30",
  } as const;
  return (
    <span className={cn("inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border", map[tone])}>
      {children}
    </span>
  );
}
