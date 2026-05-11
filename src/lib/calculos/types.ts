export type SectionKey = "lacado" | "anodizado" | "extras";

export interface InputField {
  key: string;
  label: string;
  unit?: string;
  default?: number;
  step?: number;
}

export interface ResultField {
  key: string;
  label: string;
  unit?: string;
  /** Optional descriptive range text shown next to the value */
  rangeLabel?: string;
  /** numeric range used for color validation */
  min?: number;
  max?: number;
  /** computed from inputs */
  compute: (i: Record<string, number>) => number;
  /** number of decimals to display */
  decimals?: number;
}

export interface SectionGroup {
  key: string;
  title: string;
  inputs: InputField[];
  results: ResultField[];
}

export interface SectionDef {
  key: SectionKey;
  title: string;
  groups: SectionGroup[];
}

export type StatusLevel = "ok" | "warn" | "n/a";

export function statusFor(value: number, min?: number, max?: number): StatusLevel {
  if (!isFinite(value)) return "n/a";
  if (min === undefined && max === undefined) return "n/a";
  if (min !== undefined && value < min) return "warn";
  if (max !== undefined && value > max) return "warn";
  return "ok";
}
