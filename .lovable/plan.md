# Plan: Calculadora de Analíticas de Laboratorio

Sustituir el Excel por una app web con base de datos, cálculos automáticos, validación de rangos, envío por email y análisis histórico.

## Secciones

1. **Lacado**: desengrases 1 y 2 (concentración + Tª), no crómico (concentración + Tª + pH), tasa de ataque, zirconio (sobre chapa Sopena), agua desmi, conductividad no crómico.
2. **Anodizado**: desengrases 1/2, sosa flash, satinado vieja, satinado nueva (Alufinish), neutralizado 1/2, anodizado (sulfúrico total/libre/Al), curado (Tª/pH/cond.), color, sellado en frío, oro, sosa/flash extra.
3. **Extras**: pérdida de peso anodizado, aluminio disuelto desengrase lacado, zirconio lacado.

Cada sección replica las fórmulas exactas del Excel (extraídas: e.g. `Desengrase = NaOH*4.5/10`, `tasa ataque = (P1-P2)/sup`, `RelaciónNaOH/Al = sosa/aluminio`, etc.).

## Funcionalidad

- **Inputs amarillos**: cada campo de entrada es editable; las celdas calculadas se actualizan en vivo.
- **Validación de rangos**: cada resultado se compara con su rango (tabla del Excel: D1/D2 0.5–1.5%, sosa flash 60–80, etc.). Valor fuera de rango → fondo rojo + badge.
- **Resumen**: vista que reproduce el resumen del Excel (formato igual al cuerpo del email).
- **Observaciones**: textarea editable antes de enviar.
- **Destinatarios**: lista de emails configurable (gestión simple en una página de ajustes, persistida en DB).
- **Envío de email**: botón "Enviar email" que manda el resumen formateado en HTML (con valores en rojo si fuera de rango) a los destinatarios.
- **Guardado en DB**: cada analítica (con fecha, sección, valores, observaciones) se guarda automáticamente al enviar.
- **Histórico / evolución**: página por sección con tabla de analíticas pasadas y gráficos de evolución por parámetro (línea temporal con bandas de rango).

## Stack técnico

- **Lovable Cloud** (DB + Auth + Emails transaccionales): tablas `analiticas` (id, fecha, seccion, valores jsonb, observaciones, autor), `destinatarios_email` (email, activo), `parametros_rango` (clave, min, max, unidad — semilla con los rangos del Excel).
- **Auth**: login simple (email/password) para que solo personal autorizado entre.
- **Frontend**: TanStack Start, Tailwind, shadcn. Formularios con validación zod, gráficos con recharts.
- **Email**: dominio Lovable Emails + plantilla React Email replicando el formato del Excel.

## Pasos de implementación

1. Activar Lovable Cloud, crear esquema (tablas + RLS) y configurar auth.
2. Definir el catálogo de parámetros (clave, fórmula, rango, unidad) en código TypeScript a partir del Excel.
3. Construir componente `<CalculatorForm>` reutilizable que renderiza inputs y calcula resultados con resaltado de rango.
4. Páginas: `/lacado`, `/anodizado`, `/extras` (cada una con su formulario y resumen lateral).
5. Página `/resumen` (o modal en cada sección) con preview del email y campo observaciones; botón "Guardar y enviar".
6. Configurar dominio de email + scaffold de emails transaccionales + plantilla React Email del resumen.
7. Página `/destinatarios` para gestionar emails.
8. Página `/historico` con selector de parámetro y gráfico de evolución + tabla de registros.
9. Navegación, dashboard inicial, login.

## Notas técnicas

- El estado de los inputs se mantiene en React (`useState`/`react-hook-form`); los cálculos son funciones puras en `src/lib/calculos/{lacado,anodizado,extras}.ts`.
- Los rangos viven junto a las fórmulas para mantenerlos sincronizados; semilla inicial en DB para análisis histórico, pero la app usa la del código como fuente de verdad.
- El email se enviará con la plantilla `analitica-resumen.tsx` y se invoca desde un server function autenticado.

¿Procedo con esta implementación, o quieres ajustar alguna parte antes (p. ej. quitar login, cambiar estructura de secciones, añadir export PDF, etc.)?