import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthedShell } from "@/components/authed-shell";
import { useDraft, SECTIONS } from "@/lib/draft-store";
import { buildResumen, emailBody, type SeccionResumen } from "@/lib/resumen";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Save, Send, AlertTriangle, CheckCircle2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/resumen")({
  component: () => (
    <AuthedShell>
      <ResumenPage />
    </AuthedShell>
  ),
});

interface Destinatario {
  id: string;
  email: string;
  nombre: string | null;
  secciones: string[];
}

function ResumenPage() {
  const { user } = useAuth();
  const { state, setObservaciones, reset } = useDraft();
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const resumenes: SeccionResumen[] = useMemo(
    () => SECTIONS.map((s) => buildResumen(s, state.inputs[s])),
    [state.inputs]
  );

  const cuerpo = useMemo(() => emailBody(resumenes, state.observaciones), [resumenes, state.observaciones]);
  const seccionesActivas = resumenes.filter((r) => r.hasInputs).map((r) => r.key);

  useEffect(() => {
    supabase
      .from("destinatarios_email")
      .select("id,email,nombre,secciones")
      .eq("activo", true)
      .order("email")
      .then(({ data }) => {
        const list = (data ?? []) as Destinatario[];
        setDestinatarios(list);
        // Pre-select destinatarios that match active secciones
        setSeleccionados(
          new Set(
            list
              .filter((d) => d.secciones.some((s) => seccionesActivas.includes(s as never)))
              .map((d) => d.id)
          )
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDest = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const guardar = async () => {
    if (!user) return;
    if (seccionesActivas.length === 0) {
      toast.error("No hay datos para guardar");
      return;
    }
    setBusy(true);
    try {
      const enviados = Array.from(seleccionados)
        .map((id) => destinatarios.find((d) => d.id === id)?.email)
        .filter((e): e is string => !!e);
      const rows = resumenes
        .filter((r) => r.hasInputs)
        .map((r) => ({
          seccion: r.key,
          inputs: state.inputs[r.key],
          resultados: Object.fromEntries(r.items.map((it) => [it.label, it.value])),
          observaciones: state.observaciones || null,
          autor_id: user.id,
          autor_email: user.email,
          enviado_a: enviados.length > 0 ? enviados : null,
        }));
      const { error } = await supabase.from("analiticas").insert(rows);
      if (error) throw error;
      toast.success(`Guardadas ${rows.length} analítica(s)`);
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const enviarEmail = async () => {
    toast.info(
      "Activa el envío de email configurando un dominio en Lovable Cloud → Emails. Cuando esté listo, dímelo y conecto el envío.",
      { duration: 7000 }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Resumen y envío</h2>
          <p className="text-sm text-muted-foreground">
            Revisa los resultados, añade observaciones y guarda en el histórico.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={guardar} disabled={busy}>
            <Save className="mr-2 h-4 w-4" /> Guardar
          </Button>
          <Button onClick={enviarEmail} disabled={busy || seleccionados.size === 0}>
            <Send className="mr-2 h-4 w-4" /> Guardar y enviar
          </Button>
        </div>
      </div>

      {seccionesActivas.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No has introducido valores en ninguna sección. Ve a Lacado, Anodizado o Extras.
        </Card>
      )}

      {resumenes.map((r) =>
        r.hasInputs ? (
          <Card key={r.key} className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-base font-semibold tracking-tight">{r.title}</h3>
              <Badge variant="secondary" className="bg-ok-bg">
                <CheckCircle2 className="mr-1 h-3 w-3 text-ok" /> {r.ok} OK
              </Badge>
              {r.warn > 0 && (
                <Badge variant="secondary" className="bg-warn-bg text-warn">
                  <AlertTriangle className="mr-1 h-3 w-3" /> {r.warn} fuera
                </Badge>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-3">Cuba / Parámetro</th>
                    <th className="py-1.5 pr-3 text-right">Valor</th>
                    <th className="py-1.5 pr-3">Rango</th>
                  </tr>
                </thead>
                <tbody>
                  {r.items.map((it, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="py-1.5 pr-3">
                        <span className="text-muted-foreground">{it.groupTitle} · </span>
                        {it.label}
                      </td>
                      <td
                        className={cn(
                          "py-1.5 pr-3 text-right tabular-nums font-medium",
                          it.status === "warn" && "text-warn"
                        )}
                      >
                        {it.formatted} {it.unit ?? ""}
                      </td>
                      <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                        {it.rangeLabel ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null
      )}

      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold tracking-tight">Observaciones</h3>
        <Textarea
          rows={5}
          placeholder="Notas, incidencias o contexto que se incluirá en el email…"
          value={state.observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
        />
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold tracking-tight">
          <Mail className="h-4 w-4" /> Destinatarios del email
        </h3>
        {destinatarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay destinatarios. Añádelos en Configuración → Destinatarios.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {destinatarios.map((d) => (
              <li key={d.id} className="flex items-center gap-3 text-sm">
                <Checkbox
                  id={`d-${d.id}`}
                  checked={seleccionados.has(d.id)}
                  onCheckedChange={() => toggleDest(d.id)}
                />
                <label htmlFor={`d-${d.id}`} className="cursor-pointer">
                  <span className="font-medium">{d.nombre ?? d.email}</span>
                  {d.nombre && (
                    <span className="ml-2 text-muted-foreground">{d.email}</span>
                  )}
                  <span className="ml-2 text-xs text-muted-foreground">
                    [{d.secciones.join(", ")}]
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold tracking-tight">Vista previa del email</h3>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs">
          {cuerpo}
        </pre>
      </Card>
    </div>
  );
}
