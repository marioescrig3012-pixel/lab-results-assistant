import { useMemo } from "react";
import React, { useMemo } from "react";
import {
  computeResults,
  formatValue,
  getSection,
  statusFor,
  type SectionKey,
} from "@/lib/calculos";
import { useDraft } from "@/lib/draft-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function CalculatorSection({ sectionKey }: { sectionKey: SectionKey }) {
  const section = getSection(sectionKey);
  const { state, setInputs } = useDraft();
  const inputs = state.inputs[sectionKey];
  const results = useMemo(() => computeResults(section, inputs), [section, inputs]);

  let ok = 0;
  let warn = 0;
  for (const g of section.groups) {
    for (const r of g.results) {
      const v = results[r.key];
      const s = statusFor(v, r.min, r.max);
      if (s === "ok") ok++;
      else if (s === "warn") warn++;
    }
  }
function CommaInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = React.useState(
    Number.isFinite(value) ? String(value).replace(".", ",") : "0"
  );

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        setText(e.target.value);
        const n = raw === "" ? 0 : Number(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        const raw = text.replace(",", ".");
        const n = raw === "" ? 0 : Number(raw);
        setText(Number.isFinite(n) ? String(n).replace(".", ",") : "0");
      }}
      className="h-9 w-32 bg-[var(--highlight-input)] font-medium tabular-nums"
    />
  );
}
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
        <Badge variant="secondary" className="bg-ok-bg text-foreground">
          <CheckCircle2 className="mr-1 h-3 w-3 text-ok" /> {ok} en rango
        </Badge>
        <Badge variant="secondary" className="bg-warn-bg text-warn">
          <AlertTriangle className="mr-1 h-3 w-3" /> {warn} fuera de rango
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {section.groups.map((group) => (
          <Card key={group.key} className="p-5">
            <h3 className="mb-4 text-base font-semibold tracking-tight">{group.title}</h3>

            <div className="space-y-3">
              {group.inputs.map((inp) => (
                <div key={inp.key} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <Label htmlFor={inp.key} className="text-sm text-muted-foreground">
                    {inp.label}
                    {inp.unit ? ` (${inp.unit})` : ""}
                  </Label>
                <CommaInput
                    id={inp.key}
                    value={inputs[inp.key]}
                    onChange={(n) =>
                      setInputs(sectionKey, { ...inputs, [inp.key]: n })
                    }
                  />
                </div>
              ))}
            </div>

            {group.results.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-border pt-4">
                {group.results.map((r) => {
                  const v = results[r.key];
                  const st = statusFor(v, r.min, r.max);
                  return (
                    <div
                      key={r.key}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                        st === "warn"
                          ? "border-warn/40 bg-warn-bg text-warn"
                          : st === "ok"
                            ? "border-ok/30 bg-ok-bg text-foreground"
                            : "border-border bg-muted/40"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{r.label}</span>
                        {r.rangeLabel && (
                          <span className="text-xs text-muted-foreground">{r.rangeLabel}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">
                          {formatValue(v, r.decimals ?? 2)}
                        </span>
                        {r.unit && <span className="text-xs text-muted-foreground">{r.unit}</span>}
                        {st === "warn" ? (
                          <AlertTriangle className="h-4 w-4 text-warn" />
                        ) : st === "ok" ? (
                          <CheckCircle2 className="h-4 w-4 text-ok" />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
