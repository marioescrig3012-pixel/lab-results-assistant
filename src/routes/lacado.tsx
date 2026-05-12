import { createFileRoute } from "@tanstack/react-router";
import { AuthedShell } from "@/components/authed-shell";
import { CalculatorSection } from "@/components/calculator-section";

export const Route = createFileRoute("/lacado")({
  component: () => (
    <AuthedShell>
      <CalculatorSection sectionKey="lacado" />
    </AuthedShell>
  ),
});
