import { useMemo, useState } from "react";
import {
  computeResults,
  defaultInputs,
  formatValue,
  getSection,
  statusFor,
  type SectionKey,
} from "@/lib/calculos";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CalculatorSection({ sectionKey }: { sectionKey: SectionKey }) {
  const section = getSection(sectionKey);
  const [inputs, setInputs] = useState<Record<string, number>>(() => defaultInputs(section));
  const results = useMemo(() => computeResults(section, inputs), [section, inputs]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {section.groups.map((group) => (
        <Card key={group.key} className="p-5">
          <h3 className="mb-4 text-base font-semibold tracking-tight text-foreground">
            {group.title}
          </h3>

          <div className="space-y-3">
            {group.inputs.map((inp) => (
              <div key={inp.key} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <Label htmlFor={inp.key} className="text-sm text-muted-foreground">
                  {inp.label}
                  {inp.unit ? ` (${inp.unit})` : ""}
                </Label>
                <Input
                  id={inp.key}
                  type="number"
                  step={inp.step ?? "any"}
                  value={Number.isFinite(inputs[inp.key]) ? inputs[inp.key] : 0}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      [inp.key]: e.target.value === "" ? 0 : Number(e.target.value),
                    }))
                  }
                  className="h-9 w-32 bg-[var(--highlight-input)] font-medium tabular-nums"
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
                      {st === "warn" && (
                        <Badge variant="destructive" className="ml-1">
                          Fuera de rango
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
