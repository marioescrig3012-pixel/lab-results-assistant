import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthedShell } from "@/components/authed-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getSection, type SectionKey } from "@/lib/calculos";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { format } from "date-fns";

export const Route = createFileRoute("/historial")({
  component: () => (
    <AuthedShell>
      <Historial />
    </AuthedShell>
  ),
});

interface Row {
  id: string;
  fecha: string;
  seccion: string;
  inputs: Record<string, number>;
  resultados: Record<string, number>;
  observaciones: string | null;
  autor_email: string | null;
}

function Historial() {
  const [seccion, setSeccion] = useState<SectionKey>("lacado");
  const [rows, setRows] = useState<Row[]>([]);
  const [param, setParam] = useState<string>("");

  useEffect(() => {
    supabase
      .from("analiticas")
      .select("id,fecha,seccion,inputs,resultados,observaciones,autor_email")
      .eq("seccion", seccion)
      .order("fecha", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setRows((data ?? []) as Row[]);
      });
  }, [seccion]);

  const section = getSection(seccion);
  const allResults = section.groups.flatMap((g) => g.results.map((r) => ({ ...r, group: g.title })));

  useEffect(() => {
    if (allResults.length > 0 && !allResults.find((r) => r.label === param)) {
      setParam(allResults[0].label);
    }
  }, [seccion, param, allResults]);

  const paramDef = allResults.find((r) => r.label === param);

  const chartData = useMemo(() => {
    return rows
      .slice()
      .reverse()
      .map((r) => ({
        fecha: format(new Date(r.fecha), "dd/MM HH:mm"),
        valor: r.resultados?.[param] ?? null,
      }))
      .filter((d) => d.valor !== null && Number.isFinite(d.valor));
  }, [rows, param]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Historial</h2>
          <p className="text-sm text-muted-foreground">
            Registros guardados y evolución temporal por parámetro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={seccion} onValueChange={(v) => setSeccion(v as SectionKey)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lacado">Lacado</SelectItem>
              <SelectItem value="anodizado">Anodizado</SelectItem>
              <SelectItem value="extras">Extras</SelectItem>
            </SelectContent>
          </Select>
          <Select value={param} onValueChange={setParam}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Parámetro…" />
            </SelectTrigger>
            <SelectContent>
              {allResults.map((r) => (
                <SelectItem key={r.label} value={r.label}>
                  {r.group} · {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="mb-4 text-base font-semibold tracking-tight">
          Evolución: {param} {paramDef?.unit ? `(${paramDef.unit})` : ""}
        </h3>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay datos para este parámetro.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="valor"
                  name={param}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot
                />
                {paramDef?.min !== undefined && (
                  <ReferenceLine
                    y={paramDef.min}
                    stroke="var(--warn)"
                    strokeDasharray="4 4"
                    label={{ value: `mín ${paramDef.min}`, fontSize: 11, fill: "var(--warn)" }}
                  />
                )}
                {paramDef?.max !== undefined && (
                  <ReferenceLine
                    y={paramDef.max}
                    stroke="var(--warn)"
                    strokeDasharray="4 4"
                    label={{ value: `máx ${paramDef.max}`, fontSize: 11, fill: "var(--warn)" }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-base font-semibold tracking-tight">
          Registros ({rows.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Autor</th>
                <th className="py-2 pr-3">Observaciones</th>
                <th className="py-2 pr-3">Enviado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="py-2 pr-3 tabular-nums">
                    {format(new Date(r.fecha), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.autor_email ?? "—"}</td>
                  <td className="py-2 pr-3 max-w-md text-muted-foreground">
                    {r.observaciones ?? <span className="opacity-50">—</span>}
                  </td>
                  <td className="py-2 pr-3">
                    <Badge variant="secondary">guardado</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No hay registros todavía.
            </p>
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => exportCsv(rows, seccion)}>
            Exportar CSV
          </Button>
        </div>
      </Card>
    </div>
  );
}

function exportCsv(rows: Row[], seccion: string) {
  if (rows.length === 0) return;
  const headers = ["fecha", "autor", "observaciones"];
  const params = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r.resultados ?? {})) params.add(k);
  const allHeaders = [...headers, ...params];
  const csv = [
    allHeaders.join(","),
    ...rows.map((r) =>
      allHeaders
        .map((h) => {
          let v: unknown =
            h === "fecha"
              ? r.fecha
              : h === "autor"
                ? r.autor_email ?? ""
                : h === "observaciones"
                  ? r.observaciones ?? ""
                  : r.resultados?.[h] ?? "";
          if (typeof v === "string") v = `"${v.replace(/"/g, '""')}"`;
          return v;
        })
        .join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analiticas-${seccion}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
