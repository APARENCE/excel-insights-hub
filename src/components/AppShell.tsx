import {
  LayoutGrid,
  Boxes,
  Clock,
  PackageOpen,
  CloudUpload,
  X,
  Container,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NavLink, usePathname } from "@/components/NavLink";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/estoque", label: "Estoque do Pátio", icon: Boxes },
  { to: "/demurrage", label: "Controle Demurrage", icon: Clock },
  { to: "/vazios", label: "Vazios Locados", icon: PackageOpen },
  { to: "/importar", label: "Importar Dados", icon: CloudUpload },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Container className="h-5 w-5 text-primary" />
            <div className="text-sm font-semibold truncate">Operação Spot Renault-Terminal …</div>
          </div>
          <button className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-4 py-4 border-t border-sidebar-border text-xs">
          <div className="text-sidebar-foreground/50 uppercase tracking-wider mb-1">Status do Sistema</div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Operacional
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
