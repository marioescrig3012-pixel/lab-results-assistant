import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthedShell } from "@/components/authed-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/destinatarios")({
  component: () => (
    <AuthedShell>
      <Destinatarios />
    </AuthedShell>
  ),
});

interface Dest {
  id: string;
  email: string;
  nombre: string | null;
  activo: boolean;
  secciones: string[];
}

const SECCIONES = ["lacado", "anodizado", "extras"] as const;

function Destinatarios() {
  const [list, setList] = useState<Dest[]>([]);
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [secs, setSecs] = useState<Set<string>>(new Set(SECCIONES));

  const load = async () => {
    const { data } = await supabase
      .from("destinatarios_email")
      .select("id,email,nombre,activo,secciones")
      .order("email");
    setList((data ?? []) as Dest[]);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("destinatarios_email").insert({
      email,
      nombre: nombre || null,
      secciones: Array.from(secs),
    });
    if (error) return toast.error(error.message);
    toast.success("Destinatario añadido");
    setEmail("");
    setNombre("");
    load();
  };

  const toggleActivo = async (d: Dest) => {
    await supabase.from("destinatarios_email").update({ activo: !d.activo }).eq("id", d.id);
    load();
  };

  const toggleSec = async (d: Dest, s: string) => {
    const next = d.secciones.includes(s)
      ? d.secciones.filter((x) => x !== s)
      : [...d.secciones, s];
    await supabase.from("destinatarios_email").update({ secciones: next }).eq("id", d.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar destinatario?")) return;
    await supabase.from("destinatarios_email").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Destinatarios de email</h2>
        <p className="text-sm text-muted-foreground">
          Personas que recibirán el resumen de las analíticas que selecciones.
        </p>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold tracking-tight">
          <Plus className="mr-1 inline h-4 w-4" /> Añadir destinatario
        </h3>
        <form onSubmit={add} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Nombre (opcional)</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full md:w-auto">
              Añadir
            </Button>
          </div>
          <div className="md:col-span-3">
            <Label className="mb-2 block">Recibe analíticas de:</Label>
            <div className="flex gap-3">
              {SECCIONES.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm capitalize">
                  <Checkbox
                    checked={secs.has(s)}
                    onCheckedChange={(v) => {
                      const next = new Set(secs);
                      if (v) next.add(s);
                      else next.delete(s);
                      setSecs(next);
                    }}
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold tracking-tight">
          Lista ({list.length})
        </h3>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin destinatarios todavía.</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{d.nombre ?? d.email}</p>
                  {d.nombre && <p className="text-xs text-muted-foreground">{d.email}</p>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {SECCIONES.map((s) => (
                    <Badge
                      key={s}
                      variant={d.secciones.includes(s) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleSec(d, s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={d.activo} onCheckedChange={() => toggleActivo(d)} />
                  <span className="text-xs text-muted-foreground">
                    {d.activo ? "activo" : "inactivo"}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(d.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
