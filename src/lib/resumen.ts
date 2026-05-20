import {
  computeResults,
  formatValue,
  getSection,
  statusFor,
  type SectionDef,
  type SectionKey,
} from "@/lib/calculos";

export interface ResumenItem {
  groupTitle: string;
  label: string;
  value: number;
  formatted: string;
  unit?: string;
  rangeLabel?: string;
  min?: number;
  max?: number;
  status: "ok" | "warn" | "n/a";
}

export interface SeccionResumen {
  key: SectionKey;
  title: string;
  items: ResumenItem[];
  ok: number;
  warn: number;
  hasInputs: boolean;
  /** keys of groups that have at least one non-zero input */
  activeGroupKeys: string[];
  /** input keys belonging to active groups */
  activeInputKeys: string[];
  /** result keys belonging to active groups */
  activeResultKeys: string[];
}

export function buildResumen(
  sectionKey: SectionKey,
  inputs: Record<string, number>
): SeccionResumen {
  const section: SectionDef = getSection(sectionKey);
  const results = computeResults(section, inputs);
  const items: ResumenItem[] = [];
  const activeGroupKeys: string[] = [];
  const activeInputKeys: string[] = [];
  const activeResultKeys: string[] = [];
  let ok = 0;
  let warn = 0;
  for (const g of section.groups) {
    const groupActive = g.inputs.some((inp) => {
      const v = inputs[inp.key];
      return Number.isFinite(v) && v !== 0;
    });
    if (!groupActive) continue;
    activeGroupKeys.push(g.key);
    for (const inp of g.inputs) activeInputKeys.push(inp.key);
    for (const r of g.results) {
      activeResultKeys.push(r.key);
      const v = results[r.key];
      const st = statusFor(v, r.min, r.max);
      if (st === "ok") ok++;
      else if (st === "warn") warn++;
      items.push({
        groupTitle: g.title,
        label: r.label,
        value: v,
        formatted: formatValue(v, r.decimals ?? 2),
        unit: r.unit,
        rangeLabel: r.rangeLabel,
        min: r.min,
        max: r.max,
        status: st,
      });
    }
  }
  const hasInputs = activeGroupKeys.length > 0;
  return {
    key: sectionKey,
    title: section.title,
    items,
    ok,
    warn,
    hasInputs,
    activeGroupKeys,
    activeInputKeys,
    activeResultKeys,
  };
}

export function emailBody(
  resumenes: SeccionResumen[],
  observaciones: string
): string {
  const lines: string[] = ["Buenas,", ""];
  for (const r of resumenes) {
    if (!r.hasInputs) continue;
    lines.push(
      `Por Orden del Director de Calidad, se pasa a detallar los resultados de las analíticas de la sección de ${r.title.toUpperCase()}:`
    );
    lines.push("");
    let lastGroup = "";
    for (const it of r.items) {
      if (it.groupTitle !== lastGroup) {
        if (lastGroup !== "") lines.push("");
        lines.push(`- ${it.groupTitle}:`);
        lastGroup = it.groupTitle;
      }
      const flag = it.status === "warn" ? " FUERA DE RANGO ⚠️" : "";
      const range = it.rangeLabel ? ` (${it.rangeLabel})` : "";
      lines.push(
        `${it.label}: ${it.formatted}${it.unit ? " " + it.unit : ""}${range}${flag}`
      );
    }
    lines.push("");
  }
  if (observaciones.trim()) {
    lines.push("Observaciones:");
    lines.push(observaciones.trim());
    lines.push("");
  }
  lines.push("Saludos.");
  return lines.join("\n");
}
