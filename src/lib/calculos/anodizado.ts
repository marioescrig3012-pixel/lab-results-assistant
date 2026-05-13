import type { SectionDef } from "./types";

export const anodizado: SectionDef = {
  key: "anodizado",
  title: "Anodizado",
  groups: [
    {
      key: "des1",
      title: "Desengrase 1",
      inputs: [{ key: "des1_naoh", label: "Volumen NaOH 1N", unit: "ml", default: 0 }],
      results: [
        {
          key: "des1_conc",
          label: "Concentración Desengrase 1",
          unit: "%",
          rangeLabel: "2,0 – 4,0 %",
          min: 2,
          max: 4,
          decimals: 2,
          compute: (i) => i.des1_naoh * 0.45,
        },
      ],
    },
    {
      key: "des2",
      title: "Desengrase 2",
      inputs: [{ key: "des2_naoh", label: "Volumen NaOH 1N", unit: "ml", default: 0 }],
      results: [
        {
          key: "des2_conc",
          label: "Concentración Desengrase 2",
          unit: "%",
          rangeLabel: "2,0 – 4,0 %",
          min: 2,
          max: 4,
          decimals: 2,
          compute: (i) => i.des2_naoh * 0.45,
        },
      ],
    },
    {
      key: "flash",
      title: "Cuba Flash (Sosa)",
      inputs: [
        { key: "flash_a", label: "A · HCl 1M sin KF", unit: "ml", default: 0 },
        { key: "flash_b", label: "B · HCl 1M con KF", unit: "ml", default: 0 },
      ],
      results: [
        {
          key: "flash_sosa",
          label: "Sosa",
          unit: "g/L",
          rangeLabel: "50 – 70 g/L",
          min: 50,
          max: 70,
          decimals: 1,
          compute: (i) => i.flash_a * 20 - i.flash_b * 6.7,
        },
        {
          key: "flash_al",
          label: "Aluminio",
          unit: "g/L",
          rangeLabel: "0 – 60 g/L",
          min: 0,
          max: 60,
          decimals: 1,
          compute: (i) => (i.flash_b * 13.6) / 3.03,
        },
      ],
    },
    {
      key: "satinado_vieja",
      title: "Satinado Vieja",
      inputs: [
        { key: "sv_a", label: "A · HCl 1M sin KF", unit: "ml", default: 0 },
        { key: "sv_b", label: "B · HCl 1M con KF", unit: "ml", default: 0 },
      ],
      results: [
        {
          key: "sv_sosa",
          label: "Sosa",
          unit: "g/L",
          rangeLabel: "70 – 110 g/L",
          min: 70,
          max: 110,
          decimals: 1,
          compute: (i) => i.sv_a * 20 - i.sv_b * 6.7,
        },
        {
          key: "sv_al",
          label: "Aluminio",
          unit: "g/L",
          rangeLabel: "90 – 200 g/L",
          min: 90,
          max: 200,
          decimals: 1,
          compute: (i) => (i.sv_b * 13.6) / 3.03,
        },
        {
          key: "sv_ratio",
          label: "Relación NaOH/Al",
          rangeLabel: "0,8 – 1,0",
          min: 0.8,
          max: 1,
          decimals: 2,
          compute: (i) => {
            const sosa = i.sv_a * 20 - i.sv_b * 6.7;
            const al = (i.sv_b * 13.6) / 3.03;
            return al > 0 ? sosa / al : NaN;
          },
        },
      ],
    },
    {
      key: "satinado_nueva",
      title: "Satinado Nueva (Alufinish — lunes/jueves)",
      inputs: [
        { key: "sn_n", label: "N · H₂SO₄ 1N (sosa)", unit: "ml", default: 0 },
        { key: "sn_a", label: "A · H₂SO₄ 1N (Al)", unit: "ml", default: 0 },
        { key: "sn_aditivo", label: "Aditivo (titulación)", unit: "ptos", default: 0 },
      ],
      results: [
        {
          key: "sn_sosa",
          label: "Hidróxido sódico",
          unit: "g/L",
          rangeLabel: "50 – 80 g/L",
          min: 50,
          max: 80,
          decimals: 1,
          compute: (i) => i.sn_n * 4.5,
        },
        {
          key: "sn_al",
          label: "Aluminio",
          unit: "g/L",
          rangeLabel: "≥ 140 g/L",
          min: 140,
          decimals: 2,
          compute: (i) => (5 * i.sn_a - i.sn_n) * 0.73,
        },
        {
          key: "sn_aditivo_r",
          label: "Aditivo",
          unit: "ptos",
          rangeLabel: "≥ 22 ptos",
          min: 22,
          decimals: 2,
          compute: (i) => i.sn_aditivo,
        },
        {
          key: "sn_ratio",
          label: "Relación NaOH/Al",
          rangeLabel: "0,8 – 1,0",
          min: 0.8,
          max: 1,
          decimals: 2,
          compute: (i) => {
            const sosa = i.sn_n * 4.5;
            const al = (5 * i.sn_a - i.sn_n) * 0.73;
            return al > 0 ? sosa / al : NaN;
          },
        },
      ],
    },
    {
      key: "neut1",
      title: "Neutralizado 1",
      inputs: [
        { key: "n1_va", label: "Va · Tiosulfato Sódico 0,1N", unit: "ml", default: 0 },
        { key: "n1_v", label: "V · NaOH 1N", unit: "ml", default: 0 },
      ],
      results: [
        {
          key: "n1_prod",
          label: "Producto",
          unit: "g/L",
          rangeLabel: "5 – 15 g/L",
          min: 5,
          max: 15,
          decimals: 2,
          compute: (i) => i.n1_va * 0.75,
        },
        {
          key: "n1_acido",
          label: "Ácido",
          unit: "g/L",
          rangeLabel: "80 – 120 g/L",
          min: 80,
          max: 120,
          decimals: 2,
          compute: (i) => i.n1_v * 9.8,
        },
      ],
    },
    {
      key: "neut2",
      title: "Neutralizado 2",
      inputs: [
        { key: "n2_va", label: "Va · Tiosulfato Sódico 0,1N", unit: "ml", default: 0 },
        { key: "n2_v", label: "V · NaOH 1N", unit: "ml", default: 0 },
      ],
      results: [
        {
          key: "n2_prod",
          label: "Producto",
          unit: "g/L",
          rangeLabel: "5 – 15 g/L",
          min: 5,
          max: 15,
          decimals: 2,
          compute: (i) => i.n2_va * 0.75,
        },
        {
          key: "n2_acido",
          label: "Ácido",
          unit: "g/L",
          rangeLabel: "80 – 120 g/L",
          min: 80,
          max: 120,
          decimals: 2,
          compute: (i) => i.n2_v * 9.8,
        },
      ],
    },
    {
      key: "anod",
      title: "Cuba de Anodizado",
      inputs: [
        { key: "an_a", label: "A · NaOH 1M sin KF", unit: "ml", default: 0 },
        { key: "an_b", label: "B · NaOH 1M con KF", unit: "ml", default: 0 },
      ],
      results: [
        {
          key: "an_sulf_total",
          label: "Sulfúrico total",
          unit: "g/L",
          rangeLabel: "≥ 200 g/L",
          min: 200,
          decimals: 1,
          compute: (i) => (i.an_a / 4) * 98,
        },
        {
          key: "an_sulf_libre",
          label: "Sulfúrico libre",
          unit: "g/L",
          rangeLabel: "185 – 200 g/L",
          min: 185,
          max: 200,
          decimals: 1,
          compute: (i) => (i.an_b / 4) * 98,
        },
        {
          key: "an_al",
          label: "Aluminio",
          unit: "g/L",
          rangeLabel: "máx. 14 g/L",
          max: 14,
          decimals: 2,
          compute: (i) => {
            const D = ((i.an_a / 4) * 9.8) / 10;
            const R = ((i.an_b / 4) * 9.8) / 10;
            return (D - R) * 18;
          },
        },
      ],
    },
    {
      key: "curado",
      title: "Curado",
      inputs: [
        { key: "cu_temp", label: "Temperatura", unit: "ºC", default: 0 },
        { key: "cu_ph", label: "pH", unit: "pH", default: 0 },
        { key: "cu_cond", label: "Conductividad", unit: "µS", default: 0 },
      ],
      results: [
        { key: "cu_temp_r", label: "Temperatura", unit: "ºC", compute: (i) => i.cu_temp },
        { key: "cu_ph_r", label: "pH", unit: "pH", decimals: 2, compute: (i) => i.cu_ph },
        {
          key: "cu_cond_r",
          label: "Conductividad",
          unit: "µS",
          rangeLabel: "máx. 100 µS",
          max: 100,
          compute: (i) => i.cu_cond,
        },
      ],
    },
    {
      key: "color",
      title: "Color (bronce/negro/acero)",
      inputs: [
        { key: "co_a", label: "A · Tiosulfato Sódico 0,1N", unit: "ml", default: 0 },
        { key: "co_v_yodo", label: "C · Volumen solución de yodo", unit: "ml", default: 50 },
        { key: "co_v_naoh", label: "B · Volumen NaOH 1N", unit: "ml", default: 0 },
      ],
      results: [
        {
          key: "co_estano",
          label: "Estaño",
          unit: "g/L",
          decimals: 3,
          compute: (i) => (i.co_v_yodo - i.co_a) * 0.2374,
        },
        {
          key: "co_producto",
          label: "Concentración producto",
          unit: "g/L",
          rangeLabel: "15 – 18 g/L",
          min: 15,
          max: 18,
          decimals: 2,
          compute: (i) => (i.co_v_yodo - i.co_a) * 0.2374 * 1.6,
        },
        {
          key: "co_acido",
          label: "Ácido sulfúrico",
          unit: "g/L",
          rangeLabel: "19 – 20 g/L",
          min: 19,
          max: 20,
          decimals: 2,
          compute: (i) => i.co_v_naoh * 0.98,
        },
      ],
    },
    {
      key: "oro",
      title: "Cuba de Oro (lunes/jueves)",
      inputs: [
        { key: "oro_v", label: "A · Volumen baño a valorar", unit: "ml", default: 1 },
        { key: "oro_naoh", label: "B · Volumen NaOH 1N", unit: "ml", default: 0 },
      ],
      results: [
        {
          key: "oro_prod",
          label: "Producto",
          unit: "g/L",
          rangeLabel: "8 – 15 g/L",
          min: 8,
          max: 15,
          decimals: 2,
          compute: (i) => (i.oro_v > 0 ? 270 / i.oro_v : NaN),
        },
        {
          key: "oro_acido",
          label: "Ácido sulfúrico",
          unit: "g/L",
          rangeLabel: "25 – 28 g/L",
          min: 25,
          max: 28,
          decimals: 2,
          compute: (i) => i.oro_naoh * 0.98,
        },
      ],
    },
    {
      key: "sellado",
      title: "Sellado en Frío",
      inputs: [
        { key: "sf_v", label: "A · Volumen EDTA 0,1M", unit: "ml", default: 0 },
        { key: "sf_ph", label: "pH", unit: "pH", default: 0 },
      ],
      results: [
        {
          key: "sf_prod",
          label: "Producto",
          unit: "g/L",
          rangeLabel: "6 – 8 g/L",
          min: 6,
          max: 8,
          decimals: 2,
          compute: (i) => i.sf_v * 0.7,
        },
        { key: "sf_ph_r", label: "pH", unit: "pH", decimals: 2, compute: (i) => i.sf_ph },
      ],
    },
  ],
};
