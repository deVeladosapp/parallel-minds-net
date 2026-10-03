ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_bubble_style integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_background_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS efecto_letra integer;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS burbuja integer;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS efecto integer;

-- Nubes y fondos premium alquilados por 1 día
CREATE TABLE IF NOT EXISTS public.items_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item text NOT NULL CHECK (item ~ '^(nube-(1[1-9]|20)|fondo-(1[3-9]|2[0-4]))$'),
  expira timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.items_usuario TO authenticated;
GRANT ALL ON public.items_usuario TO service_role;
ALTER TABLE public.items_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own items" ON public.items_usuario FOR SELECT TO authenticated USING (auth.uid() = user_id);
