import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Wrench, LayoutDashboard, Car, ClipboardList, Users,
  BarChart3, LogOut, Menu, X, ChevronRight, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  navItems: NavItem[];
}

export default function AppLayout({ children, title, navItems }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast({ title: "Wylogowano", description: "Do zobaczenia!" });
  };

  const roleLabel = user?.role === "owner" ? "Właściciel" : user?.role === "mechanic" ? "Mechanik" : "Klient";
  const roleColor = user?.role === "owner" ? "bg-amber-500" : user?.role === "mechanic" ? "bg-blue-500" : "bg-emerald-500";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-200 bg-sidebar border-r border-sidebar-border",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:static lg:z-auto"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-semibold text-sm leading-tight truncate">MotoSerwis</p>
            <p className="text-sidebar-foreground/50 text-xs truncate">{user?.name}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-sidebar-foreground/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 py-2.5">
          <span className={cn("text-xs font-medium text-white px-2 py-0.5 rounded-full", roleColor)}>
            {roleLabel}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                data-testid={`nav-${item.href.replace("/", "") || "home"}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.badge ? <Badge className="bg-primary/20 text-primary text-xs px-1.5 h-5">{item.badge}</Badge> : null}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border p-3">
          <button onClick={handleLogout} data-testid="button-logout"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            <LogOut className="w-4 h-4" />
            Wyloguj się
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} data-testid="button-menu"
            className="text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{title}</span>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 p-4 lg:p-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
