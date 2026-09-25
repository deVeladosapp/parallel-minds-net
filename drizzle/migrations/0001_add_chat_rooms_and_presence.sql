CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tema TEXT NOT NULL UNIQUE CHECK (tema IN ('despecho', 'ansiedad', 'soledad', 'pensativo', 'luz', 'arrechera', 'joda', 'general')),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create known rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (tema IN ('despecho', 'ansiedad', 'soledad', 'pensativo', 'luz', 'arrechera', 'joda', 'general'));

CREATE TABLE public.presencia_sala (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presencia_sala TO authenticated;
GRANT ALL ON public.presencia_sala TO service_role;
ALTER TABLE public.presencia_sala ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read room presence" ON public.presencia_sala FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own room presence" ON public.presencia_sala FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own room presence" ON public.presencia_sala FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own room presence" ON public.presencia_sala FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX presencia_sala_room_last_seen_idx ON public.presencia_sala (room_id, last_seen DESC);

ALTER TABLE public.messages ADD COLUMN room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;
CREATE INDEX messages_room_created_at_idx ON public.messages (room_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.presencia_sala;