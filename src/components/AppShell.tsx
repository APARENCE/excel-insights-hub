import {
  LayoutGrid,
  Boxes,
  Clock,
  PackageOpen,
  CloudUpload,
  Zap,
  X,
  Container,
  UserCircle,
  Truck,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NavLink, usePathname } from "@/components/NavLink";
import { useDataset, setUserRole } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/estoque", label: "Estoque do Pátio", icon: Boxes },
  { to: "/prioridades", label: "Prioridades Fábrica", icon: Zap },
  { to: "/demurrage", label: "Controle Demurrage", icon: Clock },
  { to: "/vazios", label: "Vazios Locados", icon: PackageOpen },
  { to: "/importar", label: "Importar Dados", icon: CloudUpload },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { userRole } = useDataset();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Container className="h-5 w-5 text-primary" />
            <div className="text-sm font-semibold truncate">Operação Spot Renault</div>
          </div>
        </div>

        {/* Perfil Switcher */}
        <div className="px-3 py-4 border-b border-sidebar-border bg-sidebar-accent/30">
          <label className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest block mb-2 px-1">Perfil Ativo</label>
          <div className="flex flex-col gap-1">
            <button 
              onClick={() => setUserRole("CLIENTE")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all",
                userRole === "CLIENTE" ? "bg-primary text-white font-bold" : "hover:bg-sidebar-accent text-sidebar-foreground/60"
              )}
            >
              <UserCircle className="h-3.5 w-3.5" /> Cliente (Renault)
            </button>
            <button 
              onClick={() => setUserRole("TRANSPORTADORA")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-all",
                userRole === "TRANSPORTADORA" ? "bg-info text-white font-bold" : "hover:bg-sidebar-accent text-sidebar-foreground/60"
              )}
            >
              <Truck className="h-3.5 w-3.5" /> Transportadora
            </button>
          </div>
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
        
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <div className="text-[10px] text-sidebar-foreground/50 uppercase truncate">{user?.email}</div>
              <div className="flex items-center gap-1.5 text-[10px] text-success font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                ONLINE
              </div>
            </div>
            <button 
              onClick={() => signOut()}
              className="p-1.5 rounded-md hover:bg-destructive/20 text-sidebar-foreground/60 hover:text-destructive transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
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