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
  default: "border-border bg-card",
  success: "border-black/20 bg-black/[0.02]",
  warning: "border-black/20 bg-black/[0.02]",
  info: "border-black/20 bg-black/[0.02]",
  destructive: "border-black/20 bg-black/[0.02]",
  primary: "border-black/20 bg-black/[0.02]",
};

const iconToneMap: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-muted-foreground bg-muted",
  success: "text-black bg-black/[0.06]",
  warning: "text-black bg-black/[0.06]",
  info: "text-black bg-black/[0.06]",
  destructive: "text-black bg-black/[0.06]",
  primary: "text-black bg-black/[0.06]",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default", active }: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 flex items-center justify-between gap-4 transition-all",
        toneMap[tone],
        active && "ring-2 ring-black/20 shadow-sm",
      )}
    >
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
          {label}
        </div>
        <div className="text-3xl font-bold mt-1.5 text-foreground">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1 truncate">{hint}</div>}
      </div>
      {Icon && (
        <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0", iconToneMap[tone])}>
          <Icon className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}