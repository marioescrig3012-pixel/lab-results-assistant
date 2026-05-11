
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY "auth manage destinatarios" ON public.destinatarios_email;
CREATE POLICY "auth select destinatarios" ON public.destinatarios_email FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth insert destinatarios" ON public.destinatarios_email FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update destinatarios" ON public.destinatarios_email FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth delete destinatarios" ON public.destinatarios_email FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
