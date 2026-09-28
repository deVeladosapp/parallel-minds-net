import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

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

function SalasVip() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedSala, setSelectedSala] = useState(0);

  return (
    <div className="pantalla-salas min-h-dvh p-6">
      <div className="contenido-salas">
        <button onClick={() => router.history.back()} className="mb-4 text-primary-foreground">← Volver</button>
        <h1 className="mb-2 text-center text-2xl font-bold text-primary-foreground">Salas Premium</h1>
        <p className="mb-6 text-center text-primary-foreground/70">Solo 50 personas por sala - Sé fundador</p>

        <div className="mx-auto grid max-w-md grid-cols-1 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => { setSelectedSala(n); setShowModal(true); }}
              className="rounded-2xl p-6 text-left"
              style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)", border: "2px solid #FFD700", boxShadow: "0 0 15px rgba(255,215,0,0.5)" }}
            >
              <h3 className="font-bold text-primary-foreground">SALA VACANTE {n}</h3>
              <p className="text-sm" style={{ color: "#FFD700" }}>Sé fundador - 0/50</p>
            </button>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/85 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-night p-6" style={{ border: "1px solid rgba(255,215,0,0.3)" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 font-bold text-primary-foreground">Ser fundador por 4$ al mes · Sala {selectedSala}</h3>
            <input placeholder="Tu nombre de sala" className="mb-3 w-full rounded-lg bg-night-soft p-3 text-primary-foreground placeholder:text-primary-foreground/50" />
            <input placeholder="Descripción" className="mb-4 w-full rounded-lg bg-night-soft p-3 text-primary-foreground placeholder:text-primary-foreground/50" />
            <button className="w-full rounded-lg p-3 font-bold text-ink" style={{ background: "#FFD700" }}>Pagar 4$ (Demo)</button>
            <button onClick={() => setShowModal(false)} className="mt-3 w-full text-primary-foreground/60">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
