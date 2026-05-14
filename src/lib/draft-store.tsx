import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultInputs, getSection, type SectionKey } from "@/lib/calculos";

const SECTIONS: SectionKey[] = ["lacado", "anodizado", "extras"];

type DraftState = {
  inputs: Record<SectionKey, Record<string, number>>;
  observaciones: Record<SectionKey, string>;
};

function emptyObs(): Record<SectionKey, string> {
  return { lacado: "", anodizado: "", extras: "" };
}

function loadInitial(): DraftState {
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem("analitica:draft");
      if (raw) {
        const parsed = JSON.parse(raw);
        // back-compat: if observaciones was a string, migrate
        if (typeof parsed.observaciones === "string") {
          parsed.observaciones = emptyObs();
        } else if (!parsed.observaciones) {
          parsed.observaciones = emptyObs();
        }
        return parsed;
      }
    } catch {
      /* ignore */
    }
  }
  return {
    inputs: {
      lacado: defaultInputs(getSection("lacado")),
      anodizado: defaultInputs(getSection("anodizado")),
      extras: defaultInputs(getSection("extras")),
    },
    observaciones: emptyObs(),
  };
}

interface DraftContextValue {
  state: DraftState;
  setInputs: (s: SectionKey, v: Record<string, number>) => void;
  setObservaciones: (s: SectionKey, v: string) => void;
  reset: () => void;
}

const Ctx = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DraftState>(loadInitial);

  useEffect(() => {
    try {
      sessionStorage.setItem("analitica:draft", JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value = useMemo<DraftContextValue>(
    () => ({
      state,
      setInputs: (s, v) => setState((prev) => ({ ...prev, inputs: { ...prev.inputs, [s]: v } })),
      setObservaciones: (s, v) =>
        setState((prev) => ({ ...prev, observaciones: { ...prev.observaciones, [s]: v } })),
      reset: () =>
        setState({
          inputs: {
            lacado: defaultInputs(getSection("lacado")),
            anodizado: defaultInputs(getSection("anodizado")),
            extras: defaultInputs(getSection("extras")),
          },
          observaciones: emptyObs(),
        }),
    }),
    [state]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDraft() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDraft must be used within DraftProvider");
  return ctx;
}

export { SECTIONS };
