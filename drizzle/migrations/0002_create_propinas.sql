CREATE TABLE public.propinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  monto numeric(12,2) NOT NULL CHECK (monto > 0),
  fecha timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.propinas TO authenticated;
GRANT ALL ON public.propinas TO service_role;
ALTER TABLE public.propinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can register their own tips" ON public.propinas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);