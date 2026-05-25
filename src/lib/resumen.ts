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
  let html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;">`;
  html += `<p>Buenas,</p>`;

  for (const r of resumenes) {
    if (!r.hasInputs) continue;
    html += `<p>Por Orden del Director de Calidad, se pasa a detallar los resultados de las analíticas de la sección de <strong>${r.title.toUpperCase()}</strong>:</p>`;

    let lastGroup = "";
    for (const it of r.items) {
      if (it.groupTitle !== lastGroup) {
        if (lastGroup !== "") html += `<br>`;
        html += `<p style="margin:8px 0 2px 0;"><strong>- ${it.groupTitle}:</strong></p>`;
        lastGroup = it.groupTitle;
      }
      const fuera = it.status === "warn";
      const color = fuera ? "#991b1b" : "#166534";
      const icon = fuera ? "⚠️" : "✓";
      const range = it.rangeLabel ? ` <span style="color:#9ca3af;font-size:12px;">(${it.rangeLabel})</span>` : "";
      html += `<p style="margin:2px 0 2px 20px;color:${color};">${icon} ${it.label}: <strong>${it.formatted}${it.unit ? " " + it.unit : ""}</strong>${range}</p>`;
    }
    html += `<br>`;
  }

  if (observaciones.trim()) {
    html += `<p style="background:#fefce8;border-left:4px solid #ca8a04;padding:10px;margin-top:10px;"><strong>📝 Observaciones:</strong><br>${observaciones.trim()}</p>`;
  }

  html += `<p style="margin-top:20px;">Saludos.</p></div>`;
  return html;
}
