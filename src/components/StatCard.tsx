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
        "rounded-xl border bg-card p-4 flex items-center justify-between gap-3 transition-shadow",
        toneMap[tone],
        active && "ring-2 ring-primary/40",
      )}
    >
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5 truncate">{hint}</div>}
      </div>
      {Icon && (
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", iconToneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
