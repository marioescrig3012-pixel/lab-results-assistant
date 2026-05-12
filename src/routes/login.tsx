import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/lacado" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Sesión iniciada");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { nombre } },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Iniciando sesión…");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Analíticas de Laboratorio</h1>
            <p className="text-xs text-muted-foreground">
              {mode === "login" ? "Inicia sesión para continuar" : "Crear nueva cuenta"}
            </p>
          </div>
        </div>

        <form className="space-y-3" onSubmit={submit}>
          {mode === "signup" && (
            <div>
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <button className="underline" onClick={() => setMode("signup")}>
              ¿No tienes cuenta? Crear una
            </button>
          ) : (
            <button className="underline" onClick={() => setMode("login")}>
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          )}
        </div>
        <div className="mt-2 text-center text-xs text-muted-foreground">
          <Link to="/">← Volver</Link>
        </div>
      </Card>
    </div>
  );
}
