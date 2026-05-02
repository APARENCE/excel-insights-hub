import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "info" | "destructive" | "primary";
  active?: boolean;
}

const toneMap: Record<NonNullable<Props["tone"]>, string> = {
  default: "border-border",
  success: "border-success/40 bg-success/5",
  warning: "border-warning/40 bg-warning/5",
  info: "border-info/40 bg-info/5",
  destructive: "border-destructive/40 bg-destructive/5",
  primary: "border-primary/40 bg-primary/5",
};

const iconToneMap: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-muted-foreground bg-muted",
  success: "text-success bg-success/10",
  warning: "text-warning-foreground bg-warning/30",
  info: "text-info bg-info/10",
  destructive: "text-destructive bg-destructive/10",
  primary: "text-primary bg-primary/10",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default", active }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-3 md:p-4 flex items-center justify-between gap-2 md:gap-3 transition-shadow",
        toneMap[tone],
        active && "ring-2 ring-primary/40",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </div>
        <div className="text-xl md:text-2xl font-bold mt-0.5 md:mt-1 truncate tracking-tight">{value}</div>
        {hint && <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate font-medium">{hint}</div>}
      </div>
      {Icon && (
        <div className={cn("h-8 w-8 md:h-10 md:w-10 rounded-lg flex items-center justify-center shrink-0", iconToneMap[tone])}>
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
      )}
    </div>
  );
}