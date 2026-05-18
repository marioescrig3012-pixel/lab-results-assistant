import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Download, FileSpreadsheet, Upload, FileDown } from "lucide-react";
import ExcelJS from "exceljs";
import { computeResults, defaultInputs } from "@/lib/calculos";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";


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
  const { user } = useAuth();
  const [seccion, setSeccion] = useState<SectionKey | "todas">("lacado");
  const [desde, setDesde] = useState<string>(daysAgoISO(30));
  const [hasta, setHasta] = useState<string>(todayISO());
  const [rows, setRows] = useState<Row[]>([]);
  const [param, setParam] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputHistRef = useRef<HTMLInputElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [seccion, desde, hasta, reloadKey]);

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
          <Button
            variant="outline"
            onClick={downloadTemplateHistorica}
          >
            <FileDown className="mr-2 size-4" />
            Plantilla histórica
          </Button>
          <Button
  variant="outline"
  onClick={() => fileInputHistRef.current?.click()}
  disabled={importing}
>
  <Upload className="mr-2 size-4" />
  {importing ? "Importando…" : "Importar histórico"}
</Button>
<input
  ref={fileInputHistRef}
  type="file"
  accept=".xlsx"
  className="hidden"
  onChange={(e) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!user) { toast.error("Debes iniciar sesión"); return; }
      setImporting(true);
      importFromXlsxHistorico(f, user.id, user.email ?? null)
        .then((res) => {
          if (res.inserted > 0) {
            toast.success(`Importadas ${res.inserted} analítica(s)`);
            setReloadKey((k) => k + 1);
          }
          for (const e of res.errors) toast.error(e);
        })
        .catch((e) => toast.error("Error: " + (e as Error).message))
        .finally(() => {
          setImporting(false);
          if (fileInputHistRef.current) fileInputHistRef.current.value = "";
        });
    }
  }}
/>
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

// ============== Excel export following user's template structure ==============

type ColSpec = {
  group: string;
  header: string;
  /** value getter from a row */
  get: (r: Row) => number | string | null;
  /** numeric range for warn coloring */
  min?: number;
  max?: number;
  /** number format */
  numFmt?: string;
  width?: number;
};

const FILL_HEADER_GROUP = "FF1F2937";
const FILL_HEADER_FIELD_INPUT = "FFFFF3B0"; // amarillo
const FILL_HEADER_FIELD_RESULT = "FFDBEAFE"; // azul claro
const FILL_DATA_INPUT = "FFFFFBEB";
const FILL_WARN = "FFFECACA";
const FILL_OK = "FFECFDF5";

// --- LACADO columns (matches user's Excel template) ---
const LACADO_COLS: ColSpec[] = [
  { group: "DESENGRASE 1", header: "Desengrase 1 (mg/L NaOH)", get: (r) => r.inputs.des1_naoh ?? null, numFmt: "0.00", width: 18 },
  { group: "DESENGRASE 1", header: "CONCENTRACION %", get: (r) => r.resultados["Concentración Desengrase 1"] ?? null, min: 0.5, max: 1.5, numFmt: "0.000", width: 16 },
  { group: "DESENGRASE 1", header: "TEMPERATURA ºC", get: (r) => r.inputs.des1_temp ?? null, numFmt: "0.0", width: 14 },
  { group: "DESENGRASE 2", header: "Desengrase 2 (mg/L NaOH)", get: (r) => r.inputs.des2_naoh ?? null, numFmt: "0.00", width: 18 },
  { group: "DESENGRASE 2", header: "CONCENTRACION %", get: (r) => r.resultados["Concentración Desengrase 2"] ?? null, min: 0.5, max: 1.5, numFmt: "0.000", width: 16 },
  { group: "DESENGRASE 2", header: "TEMPERATURA ºC", get: (r) => r.inputs.des2_temp ?? null, numFmt: "0.0", width: 14 },
  { group: "NO CROMICO", header: "Tª", get: (r) => r.inputs.nc_temp ?? null, numFmt: "0.0", width: 10 },
  { group: "NO CROMICO", header: "pH", get: (r) => r.resultados["pH"] ?? r.inputs.nc_ph ?? null, min: 2.2, max: 3.0, numFmt: "0.00", width: 10 },
  { group: "NO CROMICO", header: "CONCENTRACIÓN ptos", get: (r) => r.resultados["Concentración No Crómico"] ?? null, min: 1.5, max: 4.2, numFmt: "0.00", width: 18 },
  { group: "AGUA LAVADO", header: "CONDUCTIVIDAD µS/cm", get: (r) => r.resultados["Agua desmineralizada"] ?? r.inputs.agua_desmi ?? null, max: 30, numFmt: "0.0", width: 20 },
  { group: "TASA DE ATAQUE", header: "PESO INICIAL (g)", get: (r) => r.inputs.p_ini ?? null, numFmt: "0.0000", width: 16 },
  { group: "TASA DE ATAQUE", header: "PESO FINAL (g)", get: (r) => r.inputs.p_fin ?? null, numFmt: "0.0000", width: 16 },
  { group: "TASA DE ATAQUE", header: "g/m²", get: (r) => r.resultados["Tasa de ataque"] ?? null, min: 1, numFmt: "0.000", width: 12 },
  { group: "ZIRCONIO", header: "Absorbancia (mAbs)", get: (r) => r.inputs.abs ?? null, numFmt: "0.00", width: 18 },
  { group: "ZIRCONIO", header: "Zr (mg/L)", get: (r) => r.resultados["[Zr]"] ?? null, numFmt: "0.00", width: 12 },
  { group: "ZIRCONIO", header: "PC (mg/m²)", get: (r) => r.resultados["PC"] ?? null, min: 0.5, max: 15, numFmt: "0.00", width: 14 },
];

// --- ANODIZADO columns (matches user's Excel template) ---
const ANODIZADO_COLS: ColSpec[] = [
  { group: "DESENGRASE 1", header: "Concentración %", get: (r) => r.resultados["Concentración Desengrase 1"] ?? null, min: 2, max: 4, numFmt: "0.00", width: 16 },
  { group: "DESENGRASE 2", header: "Concentración %", get: (r) => r.resultados["Concentración Desengrase 2"] ?? null, min: 2, max: 4, numFmt: "0.00", width: 16 },
  { group: "SOSA MATE HENKEL", header: "Sosa (g/L) (70-110)", get: (r) => r.resultados["Sosa"] && r.inputs.sv_a !== undefined ? (r.inputs.sv_a * 20 - r.inputs.sv_b * 6.7) : null, min: 70, max: 110, numFmt: "0.0", width: 16 },
  { group: "SOSA MATE HENKEL", header: "Aluminio (g/L) (90-200)", get: (r) => r.inputs.sv_b !== undefined ? (r.inputs.sv_b * 13.6) / 3.03 : null, min: 90, max: 200, numFmt: "0.0", width: 18 },
  { group: "SOSA MATE HENKEL", header: "Relación sosa/Al", get: (r) => {
      if (r.inputs.sv_a === undefined) return null;
      const s = r.inputs.sv_a * 20 - r.inputs.sv_b * 6.7;
      const al = (r.inputs.sv_b * 13.6) / 3.03;
      return al > 0 ? s / al : null;
    }, min: 0.8, max: 1, numFmt: "0.00", width: 14 },
  { group: "SOSA MATE ALUFINISH", header: "Hidróxido sódico (g/L)", get: (r) => r.resultados["Hidróxido sódico"] ?? null, min: 50, max: 80, numFmt: "0.0", width: 18 },
  { group: "SOSA MATE ALUFINISH", header: "Aluminio (g/L)", get: (r) => r.resultados["Aluminio"] ?? null, numFmt: "0.00", width: 14 },
  { group: "SOSA MATE ALUFINISH", header: "Aditivo (ptos)", get: (r) => r.resultados["Aditivo"] ?? null, min: 22, numFmt: "0.0", width: 14 },
  { group: "SOSA FLASH", header: "Sosa (g/L) (50-70)", get: (r) => r.inputs.flash_a !== undefined ? r.inputs.flash_a * 20 - r.inputs.flash_b * 6.7 : null, min: 50, max: 70, numFmt: "0.0", width: 16 },
  { group: "SOSA FLASH", header: "Aluminio (g/L)", get: (r) => r.inputs.flash_b !== undefined ? (r.inputs.flash_b * 13.6) / 3.03 : null, max: 60, numFmt: "0.0", width: 14 },
  { group: "NEUTRALIZADO 1", header: "Conc. g/L", get: (r) => r.resultados["Producto"] ?? null, min: 5, max: 15, numFmt: "0.00", width: 12 },
  { group: "NEUTRALIZADO 1", header: "Ác. sulfúrico g/L", get: (r) => r.resultados["Ácido"] ?? null, min: 80, max: 120, numFmt: "0.0", width: 16 },
  { group: "NEUTRALIZADO 2", header: "Conc. g/L", get: (r) => r.resultados["Producto"] ?? null, min: 5, max: 15, numFmt: "0.00", width: 12 },
  { group: "NEUTRALIZADO 2", header: "Ác. sulfúrico g/L", get: (r) => r.resultados["Ácido"] ?? null, min: 80, max: 120, numFmt: "0.0", width: 16 },
  { group: "ANODIZADO", header: "Nº Baño", get: (r) => r.inputs.an_bano ?? null, numFmt: "0", width: 10 },
  { group: "ANODIZADO", header: "Sulf. total g/L", get: (r) => r.resultados["Sulfúrico total"] ?? null, min: 200, numFmt: "0.0", width: 14 },
  { group: "ANODIZADO", header: "Sulf. libre g/L", get: (r) => r.resultados["Sulfúrico libre"] ?? null, min: 185, max: 200, numFmt: "0.0", width: 14 },
  { group: "ANODIZADO", header: "Aluminio g/L", get: (r) => r.resultados["Aluminio"] ?? null, max: 14, numFmt: "0.00", width: 14 },
  { group: "COLOR", header: "Estaño/Bronce conc. (g/L)", get: (r) => r.resultados["Concentración producto"] ?? null, min: 15, max: 18, numFmt: "0.00", width: 18 },
  { group: "COLOR", header: "Ác. sulfúrico (g/L)", get: (r) => r.resultados["Ácido sulfúrico"] ?? null, min: 19, max: 20, numFmt: "0.00", width: 16 },
  { group: "ORO", header: "Conc. (g/L)", get: (r) => r.resultados["Producto"] ?? null, min: 8, max: 15, numFmt: "0.00", width: 12 },
  { group: "ORO", header: "Ác. sulfúrico (g/L)", get: (r) => r.resultados["Ácido sulfúrico"] ?? null, min: 25, max: 28, numFmt: "0.00", width: 16 },
  { group: "SELLADO EN FRÍO", header: "pH", get: (r) => r.resultados["pH"] ?? r.inputs.sf_ph ?? null, numFmt: "0.00", width: 10 },
  { group: "SELLADO EN FRÍO", header: "Conc. g/L", get: (r) => r.resultados["Producto"] ?? null, min: 6, max: 8, numFmt: "0.00", width: 12 },
  { group: "CURADO", header: "Tª", get: (r) => r.inputs.cu_temp ?? null, numFmt: "0.0", width: 10 },
  { group: "CURADO", header: "Conductividad µS", get: (r) => r.inputs.cu_cond ?? null, max: 100, numFmt: "0.0", width: 16 },
  { group: "CURADO", header: "pH", get: (r) => r.inputs.cu_ph ?? null, numFmt: "0.00", width: 10 },
];

// --- EXTRAS columns ---
const EXTRAS_COLS: ColSpec[] = [
  { group: "PÉRDIDA DE PESO", header: "Área (dm²)", get: (r) => r.inputs.pp_area ?? null, numFmt: "0.0000", width: 12 },
  { group: "PÉRDIDA DE PESO", header: "Peso inicial (mg)", get: (r) => r.inputs.pp_pi ?? null, numFmt: "0.0000", width: 16 },
  { group: "PÉRDIDA DE PESO", header: "Peso final (mg)", get: (r) => r.inputs.pp_pf ?? null, numFmt: "0.0000", width: 16 },
  { group: "PÉRDIDA DE PESO", header: "Pérdida (mg/dm²)", max: 30, get: (r) => r.resultados["Pérdida de peso"] ?? null, numFmt: "0.000", width: 16 },
  { group: "AL DISUELTO LACADO", header: "Vb (ml)", get: (r) => r.inputs.ad_vb ?? null, numFmt: "0.00", width: 10 },
  { group: "AL DISUELTO LACADO", header: "Va (ml)", get: (r) => r.inputs.ad_va ?? null, numFmt: "0.00", width: 10 },
  { group: "AL DISUELTO LACADO", header: "Al disuelto (g/L)", max: 2, get: (r) => r.resultados["Aluminio disuelto"] ?? null, numFmt: "0.000", width: 16 },
  { group: "ZIRCONIO LACADO", header: "Absorbancia (mAbs)", get: (r) => r.inputs.zr_abs ?? null, numFmt: "0.00", width: 18 },
  { group: "ZIRCONIO LACADO", header: "[Zr] (mg/L)", get: (r) => r.resultados["[Zr]"] ?? null, numFmt: "0.00", width: 12 },
  { group: "ZIRCONIO LACADO", header: "PC (mg/m²)", min: 0.5, max: 15, get: (r) => r.resultados["PC"] ?? null, numFmt: "0.00", width: 14 },
];

const SECTION_COLS: Record<SectionKey, ColSpec[]> = {
  lacado: LACADO_COLS,
  anodizado: ANODIZADO_COLS,
  extras: EXTRAS_COLS,
};

const SECTION_NAMES: Record<SectionKey, string> = {
  lacado: "LACADO",
  anodizado: "ANODIZADO",
  extras: "EXTRAS",
};

function writeSectionSheet(
  wb: ExcelJS.Workbook,
  sk: SectionKey,
  rows: Row[]
) {
  const cols = SECTION_COLS[sk];
  const ws = wb.addWorksheet(SECTION_NAMES[sk], {
    views: [{ state: "frozen", xSplit: 1, ySplit: 2 }],
  });

  const totalCols = 2 + cols.length + 1; // FECHA + AUTOR + cols + Observaciones

  // Group header row (row 1)
  ws.mergeCells(1, 1, 2, 1); // FECHA spans rows 1-2
  ws.getCell(1, 1).value = "FECHA";
  ws.mergeCells(1, 2, 2, 2); // AUTOR spans rows 1-2
  ws.getCell(1, 2).value = "AUTOR";

  const col = 3;
  let i = 0;
  while (i < cols.length) {
    const g = cols[i].group;
    let j = i;
    while (j < cols.length && cols[j].group === g) j++;
    const span = j - i;
    if (span > 1) ws.mergeCells(1, col + i, 1, col + j - 1);
    const c = ws.getCell(1, col + i);
    c.value = g;
    c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEADER_GROUP } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    i = j;
  }
  // Observaciones group cell
  ws.mergeCells(1, col + cols.length, 2, col + cols.length);
  const obsTop = ws.getCell(1, col + cols.length);
  obsTop.value = "OBSERVACIONES";
  obsTop.font = { bold: true, color: { argb: "FFFFFFFF" } };
  obsTop.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEADER_GROUP } };
  obsTop.alignment = { horizontal: "center", vertical: "middle" };

  // Style FECHA / AUTOR header
  [1, 2].forEach((c2) => {
    const cc = ws.getCell(1, c2);
    cc.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEADER_GROUP } };
    cc.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Field header row (row 2)
  cols.forEach((cc, idx) => {
    const cell = ws.getCell(2, col + idx);
    cell.value = cc.header;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: FILL_HEADER_FIELD_RESULT },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCCCCCC" } },
      bottom: { style: "medium", color: { argb: "FF111827" } },
    };
  });
  ws.getRow(2).height = 38;

  // Data rows starting at row 3 (chronological order, no day separators)
  const sorted = [...rows].sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  let rowIdx = 3;
  for (const r of sorted) {
    const dataRow = ws.getRow(rowIdx);
    dataRow.getCell(1).value = format(new Date(r.fecha), "dd/MM/yyyy HH:mm");
    dataRow.getCell(2).value = r.autor_email ?? "";
    cols.forEach((cc, idx) => {
      const cell = dataRow.getCell(col + idx);
      const v = cc.get(r);
      if (v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v))) {
        cell.value = null;
      } else {
        cell.value = v;
      }
      if (cc.numFmt) cell.numFmt = cc.numFmt;
      if (typeof v === "number" && Number.isFinite(v)) {
        const status = statusFor(v, cc.min, cc.max);
        if (status === "warn") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_WARN } };
          cell.font = { bold: true, color: { argb: "FF991B1B" } };
        } else if (status === "ok") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_OK } };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_DATA_INPUT } };
        }
      }
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });
    dataRow.getCell(col + cols.length).value = r.observaciones ?? "";
    dataRow.getCell(col + cols.length).alignment = { wrapText: true, vertical: "top" };

    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: "hair", color: { argb: "FFE5E7EB" } },
        bottom: { style: "hair", color: { argb: "FFE5E7EB" } },
        left: { style: "hair", color: { argb: "FFEFEFEF" } },
        right: { style: "hair", color: { argb: "FFEFEFEF" } },
      };
    });
    rowIdx++;
  }

  // Column widths
  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 22;
  cols.forEach((cc, idx) => (ws.getColumn(col + idx).width = cc.width ?? 14));
  ws.getColumn(col + cols.length).width = 32;
}

async function exportXlsx(rows: Row[], desde: string, hasta: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Calculadora Analíticas";
  wb.created = new Date();

  const sectionKeys: SectionKey[] = ["lacado", "anodizado", "extras"];

  for (const sk of sectionKeys) {
    const sRows = rows.filter((r) => r.seccion === sk);
    if (sRows.length === 0) continue;
    writeSectionSheet(wb, sk, sRows);
  }

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

// ============== Excel template + import ==============
// ============== Plantilla histórica (resultados directos) ==============

async function buildTemplateHistorica(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Calculadora Analíticas - Histórico";

  // LACADO
  const wsL = wb.addWorksheet("LACADO", { views: [{ state: "frozen", ySplit: 2 }] });
  const lacadoHeaders = [
    "FECHA (DD/MM/YYYY HH:mm)", "AUTOR (email)",
    "Desengrase 1 (%)", "Temperatura D1 (ºC)",
    "Desengrase 2 (%)", "Temperatura D2 (ºC)",
    "No Crómico (%)", "Temperatura NC (ºC)", "pH NC",
    "Agua lavado (µS)", "Conductividad No Crómico (µS)",
    "Tasa de ataque (gr/m²)", "Zirconio PC (mg/m²)",
    "OBSERVACIONES",
  ];
  const lacadoKeys = [
    "__fecha__", "__autor__",
    "des1_conc", "des1_temp",
    "des2_conc", "des2_temp",
    "nc_conc", "nc_temp", "nc_ph",
    "agua_desmi", "cond_nocromico",
    "tasa_ataque", "zirconio_pc",
    "__observaciones__",
  ];
  wsL.addRow(lacadoHeaders);
  wsL.addRow(lacadoKeys);
  wsL.addRow([format(new Date(), "dd/MM/yyyy HH:mm"), "tu@email.com", ...Array(12).fill(""), "Observaciones opcionales"]);
  wsL.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  wsL.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEADER_GROUP } };
  wsL.getRow(1).height = 42;
  wsL.getRow(2).font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
  wsL.getRow(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  lacadoHeaders.forEach((_, idx) => { wsL.getColumn(idx + 1).width = 22; });

  // ANODIZADO
  const wsA = wb.addWorksheet("ANODIZADO", { views: [{ state: "frozen", ySplit: 2 }] });
  const anodHeaders = [
    "FECHA (DD/MM/YYYY HH:mm)", "AUTOR (email)",
    "Desengrase 1 (%)", "Desengrase 2 (%)",
    "Sosa Flash (g/L)", "Aluminio Flash (g/L)",
    "Sosa Henkel (g/L)", "Aluminio Henkel (g/L)", "Relación NaOH/Al Henkel",
    "Sosa Alufinish (g/L)", "Aluminio Alufinish (g/L)", "Aditivo (ptos)", "Relación NaOH/Al Alufinish",
    "Neutralizado 1 producto (g/L)", "Neutralizado 1 ácido (g/L)",
    "Neutralizado 2 producto (g/L)", "Neutralizado 2 ácido (g/L)",
    "Nº Baño", "Sulfúrico total (g/L)", "Sulfúrico libre (g/L)", "Aluminio anodizado (g/L)",
    "Estaño (g/L)", "Producto color (g/L)", "Ácido color (g/L)",
    "Producto oro (g/L)", "Ácido oro (g/L)",
    "Producto sellado (g/L)", "pH sellado",
    "Temperatura curado (ºC)", "pH curado", "Conductividad curado (µS)",
    "OBSERVACIONES",
  ];
  const anodKeys = [
    "__fecha__", "__autor__",
    "des1_conc", "des2_conc",
    "flash_sosa", "flash_al",
    "sv_sosa", "sv_al", "sv_ratio",
    "sn_sosa", "sn_al", "sn_aditivo_r", "sn_ratio",
    "n1_prod", "n1_acido",
    "n2_prod", "n2_acido",
    "an_bano_r", "an_sulf_total", "an_sulf_libre", "an_al",
    "co_estano", "co_producto", "co_acido",
    "oro_prod", "oro_acido",
    "sf_prod", "sf_ph_r",
    "cu_temp_r", "cu_ph_r", "cu_cond_r",
    "__observaciones__",
  ];
  wsA.addRow(anodHeaders);
  wsA.addRow(anodKeys);
  wsA.addRow([format(new Date(), "dd/MM/yyyy HH:mm"), "tu@email.com", ...Array(30).fill(""), "Observaciones opcionales"]);
  wsA.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  wsA.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEADER_GROUP } };
  wsA.getRow(1).height = 42;
  wsA.getRow(2).font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
  wsA.getRow(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  anodHeaders.forEach((_, idx) => { wsA.getColumn(idx + 1).width = 22; });

  // EXTRAS
  const wsE = wb.addWorksheet("EXTRAS", { views: [{ state: "frozen", ySplit: 2 }] });
  const extrasHeaders = [
    "FECHA (DD/MM/YYYY HH:mm)", "AUTOR (email)",
    "Pérdida de peso (mg/dm²)", "Aluminio disuelto lacado (g/L)", "Zirconio Lacado PC (mg/m²)",
    "OBSERVACIONES",
  ];
  const extrasKeys = [
    "__fecha__", "__autor__",
    "pp_perdida", "al_disuelto", "zr_pc_lacado",
    "__observaciones__",
  ];
  wsE.addRow(extrasHeaders);
  wsE.addRow(extrasKeys);
  wsE.addRow([format(new Date(), "dd/MM/yyyy HH:mm"), "tu@email.com", ...Array(4).fill(""), "Observaciones opcionales"]);
  wsE.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  wsE.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_HEADER_GROUP } };
  wsE.getRow(1).height = 42;
  wsE.getRow(2).font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
  wsE.getRow(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  extrasHeaders.forEach((_, idx) => { wsE.getColumn(idx + 1).width = 22; });

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

async function downloadTemplateHistorica() {
  const buffer = await buildTemplateHistorica();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_historica_analiticas.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

async function importFromXlsxHistorico(
  file: File,
  autorId: string,
  autorEmail: string | null
): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const sectionByName: Record<string, SectionKey> = {
    LACADO: "lacado",
    ANODIZADO: "anodizado",
    EXTRAS: "extras",
  };

  const toInsert: {
    seccion: SectionKey;
    fecha: string;
    inputs: Record<string, number>;
    resultados: Record<string, number>;
    observaciones: string | null;
    autor_id: string;
    autor_email: string | null;
  }[] = [];
  const errors: string[] = [];

  for (const ws of wb.worksheets) {
    const sk = sectionByName[ws.name.toUpperCase().trim()];
    if (!sk) continue;

    const headerRow = ws.getRow(2);
    const keys: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      keys[colNumber] = cellToString(cell.value).trim();
    });

    if (!keys.includes("__fecha__")) {
      errors.push(`Hoja "${ws.name}": falta la fila de claves. Usa la plantilla histórica.`);
      continue;
    }

    const resultKeyMap: Record<string, string> = {
      // LACADO
      des1_conc: "Concentración Desengrase 1",
      des2_conc: "Concentración Desengrase 2",
      nc_conc: "Concentración No Crómico",
      tasa_ataque: "Tasa de ataque",
      zirconio_pc: "PC",
      // ANODIZADO
      flash_sosa: "Sosa",
      flash_al: "Aluminio",
      sv_sosa: "Sosa",
      sv_al: "Aluminio",
      sv_ratio: "Relación NaOH/Al",
      sn_sosa: "Hidróxido sódico",
      sn_al: "Aluminio",
      sn_aditivo_r: "Aditivo",
      sn_ratio: "Relación NaOH/Al",
      n1_prod: "Producto",
      n1_acido: "Ácido",
      n2_prod: "Producto",
      n2_acido: "Ácido",
      an_bano_r: "Nº Baño",
      an_sulf_total: "Sulfúrico total",
      an_sulf_libre: "Sulfúrico libre",
      an_al: "Aluminio",
      co_estano: "Estaño",
      co_producto: "Concentración producto",
      co_acido: "Ácido sulfúrico",
      oro_prod: "Producto",
      oro_acido: "Ácido sulfúrico",
      sf_prod: "Producto",
      sf_ph_r: "pH",
      cu_temp_r: "Temperatura",
      cu_ph_r: "pH",
      cu_cond_r: "Conductividad",
      // EXTRAS
      pp_perdida: "Pérdida de peso",
      al_disuelto: "Aluminio disuelto",
      zr_pc_lacado: "PC",
    };

    const inputKeyMap: Record<string, string> = {
      des1_temp: "des1_temp",
      des2_temp: "des2_temp",
      nc_temp: "nc_temp",
      nc_ph: "nc_ph",
      agua_desmi: "agua_desmi",
      cond_nocromico: "cond_nocromico",
      an_bano_r: "an_bano",
    };

    const lastRow = ws.actualRowCount;
    for (let rowNum = 3; rowNum <= lastRow; rowNum++) {
      const row = ws.getRow(rowNum);
      const map: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const k = keys[colNumber];
        if (k) map[k] = cell.value;
      });

      const hasAnyValue = Object.entries(map).some(([k, v]) => {
        if (k === "__fecha__" || k === "__autor__" || k === "__observaciones__") return false;
        const n = cellToNumber(v);
        return n !== null && n !== 0;
      });
      if (!hasAnyValue) continue;

      const fecha = parseFecha(map["__fecha__"]);
      if (!fecha) {
        errors.push(`Hoja "${ws.name}" fila ${rowNum}: fecha inválida.`);
        continue;
      }

      const inputs: Record<string, number> = {};
      const resultados: Record<string, number> = {};

      for (const [key, val] of Object.entries(map)) {
        if (key === "__fecha__" || key === "__autor__" || key === "__observaciones__") continue;
        const n = cellToNumber(val);
        if (n === null) continue;
        if (inputKeyMap[key]) inputs[inputKeyMap[key]] = n;
        if (resultKeyMap[key]) resultados[resultKeyMap[key]] = n;
      }

      const obs = cellToString(map["__observaciones__"]).trim();
      toInsert.push({
        seccion: sk,
        fecha,
        inputs,
        resultados,
        observaciones: obs || null,
        autor_id: autorId,
        autor_email: autorEmail,
      });
    }
  }

  if (toInsert.length === 0) {
    return { inserted: 0, errors: errors.length ? errors : ["No se encontraron filas válidas."] };
  }

  const { error } = await supabase.from("analiticas").insert(toInsert);
  if (error) {
    return { inserted: 0, errors: [...errors, error.message] };
  }
  return { inserted: toInsert.length, errors };
}
async function buildTemplate(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Calculadora Analíticas";
  const sectionKeys: SectionKey[] = ["lacado", "anodizado", "extras"];

  for (const sk of sectionKeys) {
    const section = getSection(sk);
    const inputs = section.groups.flatMap((g) =>
      g.inputs.map((inp) => ({ key: inp.key, label: inp.label, unit: inp.unit, group: g.title }))
    );
    const ws = wb.addWorksheet(SECTION_NAMES[sk], {
      views: [{ state: "frozen", ySplit: 3 }],
    });

    const headerLabels = [
      "FECHA (DD/MM/YYYY HH:mm)",
      "AUTOR (email)",
      ...inputs.map((i) => `${i.group} · ${i.label}${i.unit ? ` (${i.unit})` : ""}`),
      "OBSERVACIONES",
    ];
    const headerKeys = [
      "__fecha__",
      "__autor__",
      ...inputs.map((i) => i.key),
      "__observaciones__",
    ];

    ws.addRow(headerLabels);
    ws.addRow(headerKeys);

    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: FILL_HEADER_GROUP },
    };
    ws.getRow(1).alignment = { wrapText: true, horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 42;

    ws.getRow(2).font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
    ws.getRow(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };

    const example = [
      format(new Date(), "dd/MM/yyyy HH:mm"),
      "tu@email.com",
      ...inputs.map(() => ""),
      "Observaciones opcionales",
    ];
    ws.addRow(example);
    ws.getRow(3).font = { italic: true, color: { argb: "FF9CA3AF" } };

    headerLabels.forEach((_, idx) => {
      ws.getColumn(idx + 1).width = idx < 2 ? 22 : 22;
    });
  }

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

async function downloadTemplate() {
  const buffer = await buildTemplate();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plantilla_analiticas.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}

function parseFecha(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof v === "string") {
    const s = v.trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (m) {
      const [, dd, mm, yyyy, hh = "0", mi = "0"] = m;
      const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi));
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object" && v !== null && "text" in v) {
    return String((v as { text: unknown }).text ?? "");
  }
  if (typeof v === "object" && v !== null && "result" in v) {
    return String((v as { result: unknown }).result ?? "");
  }
  return String(v);
}

function cellToNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && v !== null && "result" in v) {
    const r = (v as { result: unknown }).result;
    if (typeof r === "number") return r;
  }
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

interface ImportResult {
  inserted: number;
  errors: string[];
}

async function importFromXlsx(
  file: File,
  autorId: string,
  autorEmail: string | null
): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const sectionByName: Record<string, SectionKey> = {
    LACADO: "lacado",
    ANODIZADO: "anodizado",
    EXTRAS: "extras",
  };

  const toInsert: {
    seccion: SectionKey;
    fecha: string;
    inputs: Record<string, number>;
    resultados: Record<string, number>;
    observaciones: string | null;
    autor_id: string;
    autor_email: string | null;
  }[] = [];
  const errors: string[] = [];

  for (const ws of wb.worksheets) {
    const sk = sectionByName[ws.name.toUpperCase().trim()];
    if (!sk) continue;
    const section = getSection(sk);
    const headerRow = ws.getRow(2);
    const keys: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      keys[colNumber] = cellToString(cell.value).trim();
    });
    if (!keys.includes("__fecha__")) {
      errors.push(`Hoja "${ws.name}": falta la fila de claves (fila 2). Usa la plantilla.`);
      continue;
    }

    const lastRow = ws.actualRowCount;
    for (let rowNum = 3; rowNum <= lastRow; rowNum++) {
      const row = ws.getRow(rowNum);
      const map: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const k = keys[colNumber];
        if (k) map[k] = cell.value;
      });
      const hasAnyInput = section.groups.some((g) =>
        g.inputs.some((inp) => {
          const v = cellToNumber(map[inp.key]);
          return v !== null && v !== 0;
        })
      );
      if (!hasAnyInput) continue;

      const fecha = parseFecha(map["__fecha__"]);
      if (!fecha) {
        errors.push(`Hoja "${ws.name}" fila ${rowNum}: fecha inválida.`);
        continue;
      }

      const inputs = defaultInputs(section);
      for (const g of section.groups) {
        for (const inp of g.inputs) {
          const v = cellToNumber(map[inp.key]);
          if (v !== null) inputs[inp.key] = v;
        }
      }
      const results = computeResults(section, inputs);
      const obs = cellToString(map["__observaciones__"]).trim();

      toInsert.push({
        seccion: sk,
        fecha,
        inputs,
        resultados: Object.fromEntries(
          section.groups.flatMap((g) => g.results.map((r) => [r.label, results[r.key]]))
        ),
        observaciones: obs || null,
        autor_id: autorId,
        autor_email: autorEmail,
      });
    }
  }

  if (toInsert.length === 0) {
    return { inserted: 0, errors: errors.length ? errors : ["No se encontraron filas válidas."] };
  }

  const { error } = await supabase.from("analiticas").insert(toInsert);
  if (error) {
    return { inserted: 0, errors: [...errors, error.message] };
  }
  return { inserted: toInsert.length, errors };
}

void Download;

