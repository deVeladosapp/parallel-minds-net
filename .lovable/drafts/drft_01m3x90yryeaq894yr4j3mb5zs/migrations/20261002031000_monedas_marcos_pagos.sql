-- Perfil: avatar, país y marco activo
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pais text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marco_activo integer;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS marco integer;

-- Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Monedas (solo lectura para el dueño; se acreditan desde el servidor)
CREATE TABLE IF NOT EXISTS public.monedas (
  user_id uuid PRIMARY KEY,
  saldo integer NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.monedas TO authenticated;
GRANT ALL ON public.monedas TO service_role;
ALTER TABLE public.monedas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own coins" ON public.monedas FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Transacciones: el usuario reporta su pago, el administrador aprueba
CREATE TABLE IF NOT EXISTS public.transacciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'monedas' CHECK (tipo IN ('monedas', 'sala')),
  referencia text NOT NULL CHECK (char_length(referencia) BETWEEN 3 AND 64),
  monto_bs numeric(12,2) NOT NULL CHECK (monto_bs > 0),
  monedas_acreditadas integer NOT NULL DEFAULT 0,
  metodo_pago text NOT NULL CHECK (metodo_pago IN ('pago_movil', 'binance')),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  captura_path text,
  lectura_ia jsonb,
  nombre_sala text CHECK (nombre_sala IS NULL OR char_length(nombre_sala) <= 60),
  descripcion_sala text CHECK (descripcion_sala IS NULL OR char_length(descripcion_sala) <= 140),
  fecha timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metodo_pago, referencia)
);
GRANT SELECT ON public.transacciones TO authenticated;
GRANT ALL ON public.transacciones TO service_role;
ALTER TABLE public.transacciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON public.transacciones FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all transactions" ON public.transacciones FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Marcos VIP alquilados
CREATE TABLE IF NOT EXISTS public.marcos_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  marco_id integer NOT NULL CHECK (marco_id BETWEEN 16 AND 30),
  expira timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marcos_usuario TO authenticated;
GRANT ALL ON public.marcos_usuario TO service_role;
ALTER TABLE public.marcos_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own frames" ON public.marcos_usuario FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Salas de fundador
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS vence timestamptz;

-- Storage: fotos de perfil públicas, comprobantes privados
CREATE POLICY "Avatares públicos" ON storage.objects FOR SELECT USING (bucket_id = 'avatares');
CREATE POLICY "Subir mi avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Subir mi comprobante" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = auth.uid()::text);
