import { createFileRoute } from "@tanstack/react-router";
import { AuthedShell } from "@/components/authed-shell";
import { CalculatorSection } from "@/components/calculator-section";

export const Route = createFileRoute("/extras")({
  component: () => (
    <AuthedShell>
      <CalculatorSection sectionKey="extras" />
    </AuthedShell>
  ),
});
