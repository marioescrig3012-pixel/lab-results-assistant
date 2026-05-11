
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "user insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Analíticas
CREATE TABLE public.analiticas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  seccion TEXT NOT NULL CHECK (seccion IN ('lacado','anodizado','extras')),
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  resultados JSONB NOT NULL DEFAULT '{}'::jsonb,
  observaciones TEXT,
  autor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  autor_email TEXT,
  enviado_a TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analiticas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read analiticas" ON public.analiticas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert analiticas" ON public.analiticas FOR INSERT TO authenticated WITH CHECK (auth.uid() = autor_id);
CREATE POLICY "auth update own" ON public.analiticas FOR UPDATE TO authenticated USING (auth.uid() = autor_id);
CREATE POLICY "auth delete own" ON public.analiticas FOR DELETE TO authenticated USING (auth.uid() = autor_id);
CREATE INDEX analiticas_seccion_fecha_idx ON public.analiticas (seccion, fecha DESC);

-- Destinatarios
CREATE TABLE public.destinatarios_email (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  nombre TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  secciones TEXT[] NOT NULL DEFAULT ARRAY['lacado','anodizado','extras'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.destinatarios_email ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage destinatarios" ON public.destinatarios_email FOR ALL TO authenticated USING (true) WITH CHECK (true);
