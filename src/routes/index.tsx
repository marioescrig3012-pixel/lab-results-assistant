import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalculatorSection } from "@/components/calculator-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const [tab, setTab] = useState("lacado");
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Calculadora de Analíticas de Laboratorio
            </h1>
            <p className="text-xs text-muted-foreground">
              Lacado · Anodizado · Extras — cálculo automático y validación de rangos
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="lacado">Lacado</TabsTrigger>
            <TabsTrigger value="anodizado">Anodizado</TabsTrigger>
            <TabsTrigger value="extras">Extras</TabsTrigger>
          </TabsList>
          <TabsContent value="lacado">
            <CalculatorSection sectionKey="lacado" />
          </TabsContent>
          <TabsContent value="anodizado">
            <CalculatorSection sectionKey="anodizado" />
          </TabsContent>
          <TabsContent value="extras">
            <CalculatorSection sectionKey="extras" />
          </TabsContent>
        </Tabs>

        <p className="mt-10 rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Las casillas amarillas son valores de entrada (los que rellenas). Los resultados se
          calculan en vivo y se marcan en rojo si están fuera de rango. Próximos pasos:
          login, observaciones, envío por email a destinatarios y guardado del histórico para
          analizar la evolución.
        </p>
      </main>
    </div>
  );
}
