"use client";

import {
  LayoutGrid,
  CloudUpload,
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
import { useDataset } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, roles: ["CLIENTE", "TRANSPORTADORA"] },
  { to: "/cliente", label: "Cliente Renault", icon: UserCircle, roles: ["CLIENTE"] },
  { to: "/transportadora", label: "Transportadora", icon: Truck, roles: ["TRANSPORTADORA"] },
  { to: "/importar", label: "Importar Dados", icon: CloudUpload, roles: ["TRANSPORTADORA"] },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut, user, session, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userEmail = user?.email?.toLowerCase() || "";

  useEffect(() => {
    if (!loading && !session && typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }, [session, loading]);

  // Fecha o menu mobile quando a rota muda
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

  if (!session && typeof window !== "undefined" && window.location.pathname !== "/login") {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Container className="h-5 w-5 text-primary" />
          <div className="text-sm font-semibold truncate">Operação Spot Renault</div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map((item) => {
          // Verificar se o usuário tem acesso a esta navegação baseado no papel
          const userRole = state.userRole;
          const hasAccess = item.roles ? item.roles.includes(userRole) : true;

          if (!hasAccess) return null;

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
              )}\n            >\n              <Icon className="h-4 w-4" />\n              {item.label}\n            </NavLink>\n          );
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
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Container className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Spot Renault</span>
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-sidebar border-sidebar-border">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu de Navegação</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Main Content */}
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
    <div className="flex flex-col sm:flex-row items-start justify-between gap-4 px-6 pt-5 pb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}