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
  let html = `<p>Buenas,</p>`;

  for (const r of resumenes) {
    if (!r.hasInputs) continue;
    html += `
      <h3 style="color:#1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 5px; margin-top: 25px;">
        ${r.title.toUpperCase()}
      </h3>
      <p style="color:#6b7280; font-size:13px;">
        Por Orden del Director de Calidad, se pasa a detallar los resultados de las analíticas de la sección de <strong>${r.title.toUpperCase()}</strong>:
      </p>
    `;

    let lastGroup = "";
    for (const it of r.items) {
      if (it.groupTitle !== lastGroup) {
        if (lastGroup !== "") html += `</table><br>`;
        html += `
          <p style="margin:10px 0 4px 0;">
            <strong style="color:#374151;">— ${it.groupTitle}:</strong>
          </p>
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
        `;
        lastGroup = it.groupTitle;
      }

      const fuera = it.status === "warn";
      const bgColor = fuera ? "#fef2f2" : "#f0fdf4";
      const textColor = fuera ? "#991b1b" : "#166534";
      const icon = fuera ? "⚠️" : "✓";

      html += `
        <tr style="background-color:${bgColor}; border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 6px 10px; color:#374151;">${it.label}</td>
          <td style="padding: 6px 10px; font-weight:bold; color:${textColor}; text-align:right;">
            ${icon} ${it.formatted}${it.unit ? " " + it.unit : ""}
          </td>
          <td style="padding: 6px 10px; color:#9ca3af; font-size:11px; text-align:right;">
            ${it.rangeLabel ?? ""}
          </td>
        </tr>
      `;
    }
    html += `</table>`;
  }

  if (observaciones.trim()) {
    html += `
      <div style="margin-top:20px; background-color:#fefce8; border-left: 4px solid #ca8a04; padding: 12px 15px; border-radius: 4px;">
        <strong style="color:#92400e;">📝 Observaciones:</strong>
        <p style="margin: 5px 0 0 0; color:#374151;">${observaciones.trim()}</p>
      </div>
    `;
  }

  html += `<p style="margin-top:25px; color:#374151;">Saludos.</p>`;

  return html;
}
}
