import type { SectionDef } from "./types";

// Recta de calibración Zr (regresión lineal de los patrones 0/5/15 ppm → 0/524/885 mAbs)
// y = 55.729·x + 98.143  →  x = (Abs − 98.143) / 55.729
const zrFromAbs = (abs: number) => (abs - 98.143) / 55.729;

export const lacado: SectionDef = {
  key: "lacado",
  title: "Lacado",
  groups: [
    {
      key: "agua",
      title: "CONDUCTIVIDAD AGUA DESMINERALIZADA y NO CROMICO",
      inputs: [
        { key: "agua_desmi", label: "Conductividad agua desmineralizada", unit: "µS", default: 0 },
        { key: "cond_nocromico", label: "Conductividad del No Crómico", unit: "µS", default: 0 },
      ],
      results: [
        {
          key: "agua_desmi_r",
          label: "Agua desmineralizada",
          unit: "µS",
          rangeLabel: "máx. 30 µS",
          max: 30,
          compute: (i) => i.agua_desmi,
        },
        {
          key: "cond_nocromico_r",
          label: "Conductividad No Crómico",
          unit: "µS",
          rangeLabel: "≈ 500 µS verano · 1000 µS invierno (informativo)",
          compute: (i) => i.cond_nocromico,
        },
      ],
    },
    {
      key: "des1",
      title: "DESENGRASE 1",
      inputs: [
        { key: "des1_naoh", label: "Volumen NaOH 0,1N (valoración)", unit: "ml", default: 0 },
        { key: "des1_temp", label: "Temperatura cuba", unit: "ºC", default: 0 },
      ],
      results: [
        {
          key: "des1_conc",
          label: "Concentración Desengrase 1",
          unit: "%",
          rangeLabel: "0,5 – 1,5 %",
          min: 0.5,
          max: 1.5,
          decimals: 3,
          compute: (i) => i.des1_naoh / 3,
        },
        { key: "des1_temp_r", label: "Temperatura D1", unit: "ºC", compute: (i) => i.des1_temp },
      ],
    },
    {
      key: "des2",
      title: "DESENGRASE 2",
      inputs: [
        { key: "des2_naoh", label: "Volumen NaOH 0,1N (valoración)", unit: "ml", default: 0 },
        { key: "des2_temp", label: "Temperatura cuba", unit: "ºC", default: 0 },
      ],
      results: [
        {
          key: "des2_conc",
          label: "Concentración Desengrase 2",
          unit: "%",
          rangeLabel: "0,5 – 1,5 %",
          min: 0.5,
          max: 1.5,
          decimals: 3,
          compute: (i) => i.des2_naoh / 3,
        },
        { key: "des2_temp_r", label: "Temperatura D2", unit: "ºC", compute: (i) => i.des2_temp },
      ],
    },
    {
      key: "nocromico",
      title: "NO CRÓMICO",
      inputs: [
        { key: "nc_naoh", label: "Volumen NaOH 0,1N (valoración)", unit: "ml", default: 0 },
        { key: "nc_temp", label: "Temperatura", unit: "ºC", default: 0 },
        { key: "nc_ph", label: "pH", unit: "pH", default: 0 },
      ],
      results: [
        {
          key: "nc_conc",
          label: "Concentración No Crómico",
          unit: "ptos",
          rangeLabel: "1,5 – 4,2 ptos",
          min: 1.5,
          max: 4.2,
          decimals: 2,
          compute: (i) => i.nc_naoh,
        },
        { key: "nc_temp_r", label: "Temperatura", unit: "ºC", compute: (i) => i.nc_temp },
        {
          key: "nc_ph_r",
          label: "pH",
          unit: "pH",
          rangeLabel: "2,2 – 3,0",
          min: 2.2,
          max: 3.0,
          decimals: 2,
          compute: (i) => i.nc_ph,
        },
      ],
    },
    {
      key: "ataque",
      title: "TASA DE ATAQUE",
      inputs: [
        { key: "p_ini", label: "P. inicial (antes túnel)", unit: "g", default: 0, step: 0.0001 },
        { key: "p_fin", label: "P. final (después túnel)", unit: "g", default: 0, step: 0.0001 },
        { key: "sup", label: "Superficie placa", unit: "m²", default: 0.018, step: 0.0001 },
      ],
      results: [
        {
          key: "tasa_ataque",
          label: "Tasa de ataque",
          unit: "g/m²",
          rangeLabel: "mínimo 1 g/m²",
          min: 1,
          decimals: 3,
          compute: (i) => (i.sup > 0 ? (i.p_ini - i.p_fin) / i.sup : NaN),
        },
      ],
    },
    {
      key: "ZIRCONIO",
      title: "Zirconio (sobre chapa Sopena)",
      inputs: [
        { key: "abs", label: "Lectura absorbancia", unit: "mAbs", default: 0 },
        { key: "zr_sup", label: "Superficie chapa", unit: "m²", default: 0.018, step: 0.0001 },
      ],
      results: [
        {
          key: "zr_concentracion",
          label: "[Zr]",
          unit: "mg/L",
          decimals: 2,
          compute: (i) => zrFromAbs(i.abs),
        },
        {
          key: "zr_pc",
          label: "PC",
          unit: "mg/m²",
          rangeLabel: "0,5 – 15 mg/m²",
          min: 0.5,
          max: 15,
          decimals: 2,
          compute: (i) => zrFromAbs(i.abs) * i.zr_sup,
        },
      ],
  },
    {
      key: "al_disuelto1",
      title: "ALUMINIO DISUELTO EN DESENGRASE 1",
      inputs: [
        { key: "ad_vb1", label: "Vb · NaOH 0,1N (fenolftaleína)", unit: "ml", default: 0 },
        { key: "ad_va1", label: "Va · NaOH 0,1N (azul bromofenol)", unit: "ml", default: 0 },
      ],
      results: [
        {
          key: "ad1",
          label: "Aluminio disuelto desengrase 1",
          unit: "g/L",
          rangeLabel: "máx. 2 g/L",
          max: 2,
          decimals: 3,
          compute: (i) => (i.ad_vb1 - i.ad_va1) * 1.86 - 1.6,
        },
      ],
  },
     {
      key: "al_disuelto2",
      title: "ALUMINIO DISUELTO EN DESENGRASE 2",
      inputs: [
        { key: "ad_vb2", label: "Vb · NaOH 0,1N (fenolftaleína)", unit: "ml", default: 0 },
        { key: "ad_va2", label: "Va · NaOH 0,1N (azul bromofenol)", unit: "ml", default: 0 },
      ],
      results: [
        {
          key: "ad2",
          label: "Aluminio disuelto desengrase 2",
          unit: "g/L",
          rangeLabel: "máx. 2 g/L",
          max: 2,
          decimals: 3,
          compute: (i) => (i.ad_vb2 - i.ad_va2) * 1.86 - 1.6,
        },
      ],
    },
  ],
};
