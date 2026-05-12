import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { FlaskConical, BarChart3, Mail, Settings, Send, LogOut, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

const NAV = [
  { to: "/lacado", label: "Lacado", icon: FlaskConical, group: "Nueva analítica" },
  { to: "/anodizado", label: "Anodizado", icon: FlaskConical, group: "Nueva analítica" },
  { to: "/extras", label: "Extras", icon: ClipboardList, group: "Nueva analítica" },
  { to: "/resumen", label: "Resumen y envío", icon: Send, group: "Resultados" },
  { to: "/historial", label: "Historial", icon: BarChart3, group: "Resultados" },
  { to: "/destinatarios", label: "Destinatarios", icon: Mail, group: "Configuración" },
] as const;

export function AppShell({ children, userEmail }: { children: ReactNode; userEmail?: string | null }) {
  const loc = useLocation();
  const navigate = useNavigate();

  const groups = NAV.reduce<Record<string, typeof NAV[number][]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Analíticas</p>
            <p className="text-xs text-muted-foreground">Lacado · Anodizado</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {Object.entries(groups).map(([g, items]) => (
            <div key={g} className="mb-4">
              <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {g}
              </p>
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = loc.pathname === it.to;
                  const Icon = it.icon;
                  return (
                    <li key={it.to}>
                      <Link
                        to={it.to}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                        )}
                      >
                        <Icon className="h-4 w-4" /> {it.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 truncate px-2 text-xs text-muted-foreground">
            {userEmail ?? "—"}
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="border-b border-border bg-card md:hidden">
          <div className="flex items-center gap-2 overflow-x-auto px-3 py-2">
            {NAV.map((it) => (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs",
                  loc.pathname === it.to
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {it.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
