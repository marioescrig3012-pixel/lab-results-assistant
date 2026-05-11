import { lacado } from "./lacado";
import { anodizado } from "./anodizado";
import { extras } from "./extras";
import type { SectionDef, SectionKey } from "./types";

export const sections: Record<SectionKey, SectionDef> = { lacado, anodizado, extras };

export function getSection(key: SectionKey): SectionDef {
  return sections[key];
}

export function defaultInputs(section: SectionDef): Record<string, number> {
  const v: Record<string, number> = {};
  for (const g of section.groups) {
    for (const inp of g.inputs) v[inp.key] = inp.default ?? 0;
  }
  return v;
}

export function computeResults(
  section: SectionDef,
  inputs: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of section.groups) {
    for (const r of g.results) {
      try {
        out[r.key] = r.compute(inputs);
      } catch {
        out[r.key] = NaN;
      }
    }
  }
  return out;
}

export function formatValue(v: number, decimals = 2): string {
  if (!isFinite(v)) return "—";
  return v.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export * from "./types";
