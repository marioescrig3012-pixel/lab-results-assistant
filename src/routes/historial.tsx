import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthedShell } from "@/components/authed-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getSection, sections, statusFor, type SectionKey } from "@/lib/calculos";
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
import { Download, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";

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
  seccion: SectionKey;
  inputs: Record<string, number>;
  resultados: Record<string, number>;
  observaciones: string | null;
  autor_email: string | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (d: number) => {
  const x = new Date();
  x.setDate(x.getDate() - d);
  return x.toISOString().slice(0, 10);
};

function Historial() {
  const [seccion, setSeccion] = useState<SectionKey | "todas">("lacado");
  const [desde, setDesde] = useState<string>(daysAgoISO(30));
  const [hasta, setHasta] = useState<string>(todayISO());
  const [rows, setRows] = useState<Row[]>([]);
  const [param, setParam] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from("analiticas")
      .select("id,fecha,seccion,inputs,resultados,observaciones,autor_email")
      .gte("fecha", `${desde}T00:00:00`)
      .lte("fecha", `${hasta}T23:59:59`)
      .order("fecha", { ascending: false })
      .limit(1000);
    if (seccion !== "todas") q = q.eq("seccion", seccion);
    q.then(({ data }) => {
      setRows((data ?? []) as Row[]);
      setLoading(false);
    });
  }, [seccion, desde, hasta]);

  const chartSection: SectionKey = seccion === "todas" ? "lacado" : seccion;
  const section = getSection(chartSection);
  const allResults = section.groups.flatMap((g) =>
    g.results.map((r) => ({ ...r, group: g.title }))
  );

  useEffect(() => {
    if (allResults.length > 0 && !allResults.find((r) => r.label === param)) {
      setParam(allResults[0].label);
    }
  }, [chartSection, param, allResults]);

  const paramDef = allResults.find((r) => r.label === param);

  const chartRows = useMemo(
    () => rows.filter((r) => r.seccion === chartSection),
    [rows, chartSection]
  );

  const chartData = useMemo(() => {
    return chartRows
      .slice()
      .reverse()
      .map((r) => ({
        fecha: format(new Date(r.fecha), "dd/MM HH:mm"),
        valor: r.resultados?.[param] ?? null,
      }))
      .filter((d) => d.valor !== null && Number.isFinite(d.valor));
  }, [chartRows, param]);

  // Group by date (day) then by section
  const grouped = useMemo(() => {
    const map = new Map<string, Map<SectionKey, Row[]>>();
    for (const r of rows) {
      const day = format(new Date(r.fecha), "yyyy-MM-dd");
      if (!map.has(day)) map.set(day, new Map());
      const sec = map.get(day)!;
      if (!sec.has(r.seccion)) sec.set(r.seccion, []);
      sec.get(r.seccion)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Historial</h2>
          <p className="text-sm text-muted-foreground">
            Registros agrupados por fecha y sección. Exporta a Excel con formato.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-1">
            <Label className="text-xs">Sección</Label>
            <Select value={seccion} onValueChange={(v) => setSeccion(v as SectionKey | "todas")}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="lacado">Lacado</SelectItem>
                <SelectItem value="anodizado">Anodizado</SelectItem>
                <SelectItem value="extras">Extras</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Desde</Label>
            <Input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Hasta</Label>
            <Input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={() => exportXlsx(rows, desde, hasta)} disabled={rows.length === 0}>
            <FileSpreadsheet className="mr-2 size-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              Evolución: {param} {paramDef?.unit ? `(${paramDef.unit})` : ""}
            </h3>
            <p className="text-xs text-muted-foreground">
              Sección: {section.title} · {chartData.length} puntos
            </p>
          </div>
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
        <h3 className="mb-4 text-base font-semibold tracking-tight">
          Registros por fecha ({rows.length})
        </h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : grouped.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No hay registros en este rango.
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, secMap]) => (
              <div key={day} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-border pb-1">
                  <h4 className="text-sm font-semibold">
                    {format(new Date(day + "T12:00:00"), "EEEE dd/MM/yyyy")}
                  </h4>
                  <Badge variant="outline">
                    {Array.from(secMap.values()).reduce((n, a) => n + a.length, 0)} registros
                  </Badge>
                </div>
                {(["lacado", "anodizado", "extras"] as SectionKey[])
                  .filter((s) => secMap.has(s))
                  .map((s) => (
                    <SectionDayBlock key={s} seccion={s} rows={secMap.get(s)!} />
                  ))}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SectionDayBlock({ seccion, rows }: { seccion: SectionKey; rows: Row[] }) {
  const section = getSection(seccion);
  const results = section.groups.flatMap((g) => g.results);
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <Badge>{section.title}</Badge>
          <span className="text-xs text-muted-foreground">{rows.length} analítica(s)</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-background">
            <tr className="text-left text-muted-foreground">
              <th className="px-3 py-2">Hora</th>
              <th className="px-3 py-2">Autor</th>
              {results.map((r) => (
                <th key={r.key} className="px-3 py-2 whitespace-nowrap">
                  {r.label}
                  {r.unit ? ` (${r.unit})` : ""}
                </th>
              ))}
              <th className="px-3 py-2">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2 tabular-nums">
                  {format(new Date(r.fecha), "HH:mm")}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.autor_email ?? "—"}</td>
                {results.map((res) => {
                  const v = r.resultados?.[res.key];
                  const status = statusFor(v ?? NaN, res.min, res.max);
                  return (
                    <td
                      key={res.key}
                      className={`px-3 py-2 tabular-nums ${
                        status === "warn" ? "bg-destructive/15 text-destructive font-semibold" : ""
                      }`}
                    >
                      {v === undefined || !Number.isFinite(v)
                        ? "—"
                        : v.toLocaleString("es-ES", {
                            maximumFractionDigits: res.decimals ?? 2,
                          })}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-muted-foreground max-w-xs">
                  {r.observaciones ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function exportXlsx(rows: Row[], desde: string, hasta: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Calculadora Analíticas";
  wb.created = new Date();

  const sectionKeys: SectionKey[] = ["lacado", "anodizado", "extras"];

  for (const sk of sectionKeys) {
    const section = sections[sk];
    const sRows = rows.filter((r) => r.seccion === sk);
    if (sRows.length === 0) continue;

    const ws = wb.addWorksheet(section.title, {
      views: [{ state: "frozen", xSplit: 2, ySplit: 3 }],
    });

    const inputs = section.groups.flatMap((g) =>
      g.inputs.map((i) => ({ ...i, group: g.title }))
    );
    const results = section.groups.flatMap((g) =>
      g.results.map((r) => ({ ...r, group: g.title }))
    );

    // Title row
    ws.mergeCells(1, 1, 1, 2 + inputs.length + results.length + 1);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `Analíticas ${section.title} · ${desde} → ${hasta}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    ws.getRow(1).height = 24;

    // Group header row
    const groupRow = ws.getRow(2);
    groupRow.getCell(1).value = "";
    groupRow.getCell(2).value = "";
    let col = 3;
    // Inputs grouped
    const inputsByGroup = new Map<string, number>();
    inputs.forEach((i) => inputsByGroup.set(i.group, (inputsByGroup.get(i.group) ?? 0) + 1));
    for (const [g, count] of inputsByGroup) {
      ws.mergeCells(2, col, 2, col + count - 1);
      const c = ws.getCell(2, col);
      c.value = `Entradas · ${g}`;
      c.font = { bold: true, color: { argb: "FF000000" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3B0" } };
      c.alignment = { horizontal: "center" };
      c.border = { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } };
      col += count;
    }
    const resultsByGroup = new Map<string, number>();
    results.forEach((r) => resultsByGroup.set(r.group, (resultsByGroup.get(r.group) ?? 0) + 1));
    for (const [g, count] of resultsByGroup) {
      ws.mergeCells(2, col, 2, col + count - 1);
      const c = ws.getCell(2, col);
      c.value = `Resultados · ${g}`;
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
      c.alignment = { horizontal: "center" };
      col += count;
    }
    ws.mergeCells(2, col, 2, col);
    const obsHeader = ws.getCell(2, col);
    obsHeader.value = "Observaciones";
    obsHeader.font = { bold: true };
    obsHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
    obsHeader.alignment = { horizontal: "center" };

    // Column header row
    const headerRow = ws.getRow(3);
    const headers: string[] = ["Fecha", "Autor"];
    inputs.forEach((i) => headers.push(`${i.label}${i.unit ? ` (${i.unit})` : ""}`));
    results.forEach((r) =>
      headers.push(
        `${r.label}${r.unit ? ` (${r.unit})` : ""}${r.rangeLabel ? `\n${r.rangeLabel}` : ""}`
      )
    );
    headers.push("Observaciones");
    headers.forEach((h, idx) => {
      const c = headerRow.getCell(idx + 1);
      c.value = h;
      c.font = { bold: true, size: 10 };
      c.alignment = { wrapText: true, vertical: "middle", horizontal: "center" };
      c.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "medium", color: { argb: "FF111827" } },
      };
      // tint inputs vs results
      if (idx >= 2 && idx < 2 + inputs.length) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8DC" } };
      } else if (idx >= 2 + inputs.length && idx < 2 + inputs.length + results.length) {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
      } else {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      }
    });
    headerRow.height = 36;

    // Data rows sorted oldest to newest
    const sorted = [...sRows].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    let lastDay = "";
    for (const r of sorted) {
      const day = format(new Date(r.fecha), "yyyy-MM-dd");
      if (day !== lastDay) {
        // Day separator row
        const sep = ws.addRow([]);
        ws.mergeCells(sep.number, 1, sep.number, headers.length);
        const sc = ws.getCell(sep.number, 1);
        sc.value = format(new Date(r.fecha), "EEEE dd/MM/yyyy");
        sc.font = { bold: true, color: { argb: "FF111827" } };
        sc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
        sc.alignment = { horizontal: "left" };
        lastDay = day;
      }

      const dataRow = ws.addRow([]);
      dataRow.getCell(1).value = format(new Date(r.fecha), "dd/MM/yyyy HH:mm");
      dataRow.getCell(2).value = r.autor_email ?? "";
      let cIdx = 3;
      for (const inp of inputs) {
        const v = r.inputs?.[inp.key];
        const cell = dataRow.getCell(cIdx);
        cell.value = Number.isFinite(v) ? Number(v) : null;
        cell.numFmt = "0.###";
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
        cIdx++;
      }
      for (const res of results) {
        const v = r.resultados?.[res.key];
        const cell = dataRow.getCell(cIdx);
        cell.value = Number.isFinite(v) ? Number(v) : null;
        cell.numFmt = `0.${"0".repeat(res.decimals ?? 2)}`;
        const status = statusFor(v ?? NaN, res.min, res.max);
        if (status === "warn") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
          cell.font = { bold: true, color: { argb: "FF991B1B" } };
        } else if (status === "ok") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
        }
        cIdx++;
      }
      dataRow.getCell(cIdx).value = r.observaciones ?? "";
      dataRow.getCell(cIdx).alignment = { wrapText: true, vertical: "top" };

      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: "hair", color: { argb: "FFE5E7EB" } },
          bottom: { style: "hair", color: { argb: "FFE5E7EB" } },
          left: { style: "hair", color: { argb: "FFEFEFEF" } },
          right: { style: "hair", color: { argb: "FFEFEFEF" } },
        };
      });
    }

    // Column widths
    ws.getColumn(1).width = 18;
    ws.getColumn(2).width = 22;
    for (let i = 3; i <= headers.length - 1; i++) ws.getColumn(i).width = 16;
    ws.getColumn(headers.length).width = 32;
  }

  // Summary sheet
  const summary = wb.addWorksheet("Resumen", { views: [{ state: "frozen", ySplit: 2 }] });
  summary.mergeCells(1, 1, 1, 4);
  const st = summary.getCell(1, 1);
  st.value = `Resumen ${desde} → ${hasta}`;
  st.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  st.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
  st.alignment = { horizontal: "center", vertical: "middle" };
  summary.getRow(1).height = 24;
  const sh = summary.getRow(2);
  ["Sección", "Nº analíticas", "Primera", "Última"].forEach((h, i) => {
    const c = sh.getCell(i + 1);
    c.value = h;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
  });
  for (const sk of sectionKeys) {
    const sRows = rows.filter((r) => r.seccion === sk);
    if (sRows.length === 0) continue;
    const sorted = [...sRows].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    summary.addRow([
      sections[sk].title,
      sRows.length,
      format(new Date(sorted[0].fecha), "dd/MM/yyyy HH:mm"),
      format(new Date(sorted[sorted.length - 1].fecha), "dd/MM/yyyy HH:mm"),
    ]);
  }
  summary.getColumn(1).width = 18;
  summary.getColumn(2).width = 14;
  summary.getColumn(3).width = 22;
  summary.getColumn(4).width = 22;

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analiticas_${desde}_${hasta}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// keep Download icon import used elsewhere
void Download;
