ALTER TABLE public.rooms
  ADD COLUMN es_vip boolean NOT NULL DEFAULT false,
  ADD COLUMN es_vacante boolean NOT NULL DEFAULT false,
  ADD COLUMN fundador_id text,
  ADD COLUMN max_personas integer;

COMMENT ON COLUMN public.rooms.es_vip IS 'Identifica salas premium';
COMMENT ON COLUMN public.rooms.es_vacante IS 'Sala VIP aún sin fundador';
COMMENT ON COLUMN public.rooms.fundador_id IS 'Identificador del fundador cuando exista';
COMMENT ON COLUMN public.rooms.max_personas IS 'Capacidad máxima de la sala';