import { cn } from "@/lib/utils";

export function StatusBadge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "destructive" | "info" | "primary" }) {
  const map = {
    default: "bg-muted text-muted-foreground border-border",
    success: "bg-black text-white border-black/20",
    warning: "bg-black text-white border-black/20",
    destructive: "bg-black text-white border-black/20",
    info: "bg-black text-white border-black/20",
    primary: "bg-black text-white border-black/20",
  } as const;
  return (
    <span className={cn("inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border", map[tone])}>
      {children}
    </span>
  );
}