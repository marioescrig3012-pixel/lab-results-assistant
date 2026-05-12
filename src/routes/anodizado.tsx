import { createFileRoute } from "@tanstack/react-router";
import { AuthedShell } from "@/components/authed-shell";
import { CalculatorSection } from "@/components/calculator-section";

export const Route = createFileRoute("/anodizado")({
  component: () => (
    <AuthedShell>
      <CalculatorSection sectionKey="anodizado" />
    </AuthedShell>
  ),
});
