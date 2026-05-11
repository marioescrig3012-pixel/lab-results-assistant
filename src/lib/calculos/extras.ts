import type { SectionDef } from "./types";

export const extras: SectionDef = {
  key: "extras",
  title: "Analíticas Extras",
  groups: [
    {
      key: "perdida_peso",
      title: "Pérdida de peso anodizado",
      inputs: [
        { key: "pp_area", label: "Área anodizada", unit: "dm²", default: 0.001, step: 0.0001 },
        { key: "pp_pi", label: "Peso inicial", unit: "mg", default: 0, step: 0.0001 },
        { key: "pp_pf", label: "Peso final tras ensayo", unit: "mg", default: 0, step: 0.0001 },
      ],
      results: [
        {
          key: "pp",
          label: "Pérdida de peso",
          unit: "mg/dm²",
          rangeLabel: "≈ 10 mg/dm² · máx. 30 mg/dm²",
          max: 30,
          decimals: 3,
          compute: (i) => (i.pp_area > 0 ? (i.pp_pi - i.pp_pf) / i.pp_area : NaN),
        },
      ],
    },
    {
      key: "al_disuelto",
      title: "Aluminio disuelto en desengrase de Lacado",
      inputs: [
        { key: "ad_vb", label: "Vb · NaOH 0,1N (fenolftaleína)", unit: "ml", default: 0 },
        { key: "ad_va", label: "Va · NaOH 0,1N (azul bromofenol)", unit: "ml", default: 0 },
      ],
      results: [
        {
          key: "ad",
          label: "Aluminio disuelto",
          unit: "g/L",
          rangeLabel: "máx. 2 g/L",
          max: 2,
          decimals: 3,
          compute: (i) => (i.ad_vb - i.ad_va) * 1.86 - 1.6,
        },
      ],
    },
    {
      key: "zr_lacado",
      title: "Zirconio Lacado (sobre chapa Qualicoat)",
      inputs: [
        { key: "zr_abs", label: "Lectura absorbancia", unit: "mAbs", default: 0 },
      ],
      results: [
        {
          key: "zr_conc",
          label: "[Zr]",
          unit: "mg/L",
          decimals: 2,
          compute: (i) => (i.zr_abs - 98.143) / 55.729,
        },
        {
          key: "zr_pc",
          label: "PC",
          unit: "mg/m²",
          rangeLabel: "0,5 – 15 mg/m²",
          min: 0.5,
          max: 15,
          decimals: 2,
          compute: (i) => (((i.zr_abs - 98.143) / 55.729) * 2.55) / 3,
        },
      ],
    },
  ],
};
