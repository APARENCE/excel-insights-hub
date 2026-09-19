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
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/cliente", label: "Cliente Renault", icon: UserCircle },
  { to: "/transportadora", label: "Transportadora", icon: Truck },
  { to: "/importar", label: "Importar Dados", icon: CloudUpload },
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

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Carregando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!session && typeof window !== "undefined" && window.location.pathname !== "/login") {
    return null;
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
          <Container className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold tracking-tight truncate">Operação Spot Renault</div>
          <div className="text-[10px] text-muted-foreground truncate">Terminal TLOG</div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary-foreground")} />
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
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
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

      <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="px-6 pt-5 pb-4">{children}</div>
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
    <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
