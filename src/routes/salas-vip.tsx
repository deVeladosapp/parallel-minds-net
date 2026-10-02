import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CafecitoDialog } from "@/components/CafecitoDialog";
import { supabase } from "@/integrations/supabase/client";
import { PRECIO_SALA_USD } from "@/lib/desvelados";

export const Route = createFileRoute("/salas-vip")({
  head: () => ({
    meta: [
      { title: "Salas Premium — Estamos en la misma" },
      { name: "description", content: "Salas premium de hasta 50 personas. Sé fundador de tu propia sala." },
      { property: "og:title", content: "Salas Premium — Estamos en la misma" },
      { property: "og:description", content: "Salas de hasta 50 personas con fundador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalasVip,
});

const BENEFICIOS = [
  "Enviar fotos y audios / notas de voz",
  "Personalización de nombre de sala",
  "Personalización de usuario y chat",
  "Personalización de letras",
  "Marco de perfil exclusivo",
  "Nube de chat personalizada",
  "Efecto de letra al estilo",
];

function SalasVip() {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [pagando, setPagando] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [vacantes, setVacantes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    void supabase.from("rooms").select("tema,es_vacante").like("tema", "vip-%").then(({ data }) => {
      setVacantes(Object.fromEntries((data ?? []).map((r) => [r.tema, r.es_vacante])));
    });
  }, []);

  return (
    <div className="pantalla-salas min-h-dvh p-6">
      <div className="contenido-salas">
        <button onClick={() => router.history.back()} className="mb-4 text-primary-foreground">← Volver</button>
        <h1 className="mb-2 text-center text-2xl font-bold text-primary-foreground">👑 Salas Premium</h1>
        <p className="mb-6 text-center text-primary-foreground/70">Solo 50 personas por sala - Sé fundador por {PRECIO_SALA_USD}$ (30 días)</p>

        <div className="mx-auto grid max-w-md grid-cols-1 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const libre = vacantes[`vip-${n}`] !== false;
            return (
              <button type="button" key={n} disabled={!libre} onClick={() => setSelected(n)} className="pastilla-vip rounded-2xl p-6 text-left backdrop-blur-md disabled:opacity-60">
                <h3 className="font-bold text-primary-foreground">{libre ? `🔒 SALA VACANTE ${n}` : `👑 Sala ${n} ocupada`}</h3>
                <p className="text-sm">{libre ? `Sé fundador por ${PRECIO_SALA_USD} $ al mes` : "Ya tiene fundador"} - 0/50</p>
              </button>
            );
          })}
        </div>
      </div>

      {selected !== null && !pagando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/85 p-4" onClick={() => setSelected(null)}>
          <div className="panel-neon max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-2xl p-6 text-primary-foreground" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-center text-xl font-bold text-gold">👑 Sé Fundador por {PRECIO_SALA_USD}$ al mes</h3>
            <p className="mt-2 text-center text-sm text-primary-foreground/80">Ponle el nombre que tú quieras. Esta será tu sala.</p>
            <ul className="mt-4 space-y-1.5 text-sm">{BENEFICIOS.map((b) => <li key={b}>✅ {b}</li>)}</ul>
            <p className="mt-2 text-center text-xs text-primary-foreground/60">Todo esto solo para fundadores VIP</p>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} placeholder="Nombre de tu sala..." className="mt-4 w-full rounded-lg bg-night-soft p-3 placeholder:text-primary-foreground/50" />
            <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={140} placeholder="Describe tu sala..." className="mt-3 w-full rounded-lg bg-night-soft p-3 placeholder:text-primary-foreground/50" />
            {!userId && <p className="mt-3 text-center text-xs text-gold">Primero entra a la app con tu apodo para poder pagar.</p>}
            <button disabled={!userId || nombre.trim().length < 2} onClick={() => setPagando(true)} className="mt-4 w-full rounded-lg bg-gold p-3 font-bold text-ink disabled:opacity-50">PAGAR {PRECIO_SALA_USD}$ Y SER FUNDADOR</button>
            <button onClick={() => setSelected(null)} className="mt-3 w-full text-sm text-primary-foreground/60">Volver</button>
          </div>
        </div>
      )}

      {selected !== null && pagando && (
        <CafecitoDialog
          open
          userId={userId}
          modo={{ tipo: "sala", salaTema: `vip-${selected}`, nombreSala: nombre.trim(), descripcionSala: descripcion.trim() }}
          onClose={() => { setPagando(false); setSelected(null); }}
        />
      )}
    </div>
  );
}
