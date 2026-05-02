"use client";

import {
  LayoutGrid,
  Boxes,
  Clock,
  PackageOpen,
  CloudUpload,
  Zap,
  Container,
  UserCircle,
  Truck,
  LogOut,
  Menu,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { NavLink, usePathname } from "@/components/NavLink";
import { useDataset, setUserRole } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
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
  const { signOut, user, session, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userEmail = user?.email?.toLowerCase() || "";
  const isRestricted = userEmail === "renaultdobrasil.com@outlook.com";

  useEffect(() => {
    if (!loading && !session && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    
    if (isRestricted && userRole !== "CLIENTE") {
      setUserRole("CLIENTE");
    }
  }, [session, loading, isRestricted, userRole]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session && typeof window !== 'undefined' && window.location.pathname !== '/login') {
    return null;
  }

  const filteredNav = isRestricted 
    ? navItems.filter(item => ["/", "/prioridades", "/demurrage"].includes(item.to))
    : navItems;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2 rounded-lg">
            <Container className="h-6 w-6 text-primary" />
          </div>
          <div className="text-base font-bold tracking-tight">Spot Renault</div>
        </div>
      </div>

      {!isRestricted && (
        <div className="px-4 py-5 border-b border-sidebar-border bg-sidebar-accent/20">
          <label className="text-[10px] font-black text-sidebar-foreground/30 uppercase tracking-[0.2em] block mb-3 px-2">Perfil de Acesso</label>
          <div className="flex flex-col gap-1.5">
            <button 
              onClick={() => setUserRole("CLIENTE")}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs transition-all duration-200",
                userRole === "CLIENTE" ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" : "hover:bg-sidebar-accent text-sidebar-foreground/60"
              )}
            >
              <UserCircle className="h-4 w-4" /> Cliente (Renault)
            </button>
            <button 
              onClick={() => setUserRole("TRANSPORTADORA")}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs transition-all duration-200",
                userRole === "TRANSPORTADORA" ? "bg-info text-white font-bold shadow-lg shadow-info/20" : "hover:bg-sidebar-accent text-sidebar-foreground/60"
              )}
            >
              <Truck className="h-4 w-4" /> Transportadora
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl text-sm transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-bold shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-sidebar-foreground/40")} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      
      <div className="px-4 py-6 border-t border-sidebar-border bg-black/10">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-sidebar-foreground/40 uppercase truncate tracking-wider">{user?.email}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(22,163,74,0.5)]" />
              <span className="text-[10px] text-success font-black tracking-widest">SISTEMA ONLINE</span>
            </div>
          </div>
          <button 
            onClick={() => signOut()}
            className="p-2.5 rounded-xl hover:bg-destructive/20 text-sidebar-foreground/40 hover:text-destructive transition-all duration-200"
            title="Sair do Sistema"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-1.5 rounded-lg">
            <Container className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-black tracking-tight uppercase">Spot Renault</span>
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent rounded-xl">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-sidebar border-sidebar-border">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de Navegação</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen shadow-2xl">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-x-hidden bg-[#f8fafc]">
        <div className="max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
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
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 px-4 md:px-8 pt-8 pb-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm md:text-base text-muted-foreground font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">{actions}</div>}
    </div>
  );
}