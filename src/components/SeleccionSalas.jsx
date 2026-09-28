import { ArrowLeft, Crown, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

export const SALAS = [
  { t: "💔 Despechado", s: "Me dejó y aquí estoy a las 3am", tema: "despecho" },
  { t: "😰 Ansioso / No puedo dormir", s: "La mente no para", tema: "ansiedad" },
  { t: "😶 Solo", s: "Sin nadie con quien hablar", tema: "soledad" },
  { t: "🤔 Pensativo", s: "¿Qué piensan ustedes a esta hora?", tema: "pensativo" },
  { t: "🔦 Se fue la luz", s: "Sin luz, ladillado y con calor", tema: "luz" },
  { t: "😡 Arrech@ / Molesto", s: "Necesito desahogarme", tema: "arrechera" },
  { t: "🍻 Sin plata pa rumbear", s: "Pero con ganas de joder", tema: "joda" },
  { t: "💬 Hablar paja", s: "De cualquier vaina a esta hora", tema: "general" },
];

export function SeleccionSalas({ counts, enteringTema, onBack, onSelect, onSelectVip }) {
  return (
    <section className="pantalla-salas relative h-dvh overflow-y-auto px-5 pb-10 pt-7 text-primary-foreground sm:px-8">
      <div className="contenido-salas mx-auto w-full max-w-xl">
        <Button
          aria-label="Volver al mapa"
          className="mb-5 rounded-full text-primary-foreground hover:bg-water/20 hover:text-primary-foreground"
          onClick={onBack}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft className="size-6" />
        </Button>
        <h1 className="text-center text-3xl font-bold leading-tight">¿Por qué estás desvelado?</h1>
        <p className="mb-7 mt-2 text-center text-lg text-primary-foreground/75">Elige tu sala:</p>

        <div className="grid gap-3">
          {SALAS.map((sala) => {
            const count = counts[sala.tema] ?? 0;
            return (
              <Button
                className="boton-sala h-auto min-h-24 w-full justify-start rounded-lg border border-water/35 bg-night-soft/85 px-5 py-4 text-left text-primary-foreground shadow-lg hover:bg-night-soft"
                disabled={Boolean(enteringTema)}
                key={sala.tema}
                onClick={() => onSelect(sala)}
                type="button"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold leading-snug">{sala.t}</span>
                  <span className="mt-1 block whitespace-normal text-sm font-normal text-primary-foreground/70">{sala.s}</span>
                </span>
                <span className="ml-3 flex shrink-0 items-center gap-1.5 text-xs font-semibold text-mint">
                  <Users className="size-4" />
                  {enteringTema === sala.tema ? "Entrando…" : `${count} conectados`}
                </span>
              </Button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById("salas-vip")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="mt-7 h-16 w-full border-vip-gold bg-vip-surface text-lg font-bold text-vip-gold shadow-vip-glow hover:bg-vip-surface hover:text-vip-gold"
        >
          🔥 ENTRAR A SALAS VIP (6) 🔒
        </Button>

        <div id="salas-vip" className="mt-5 scroll-mt-5 rounded-lg border border-vip-gold bg-vip-surface p-3 shadow-vip-glow backdrop-blur-xl sm:p-5">
          <Crown className="mx-auto mb-1 size-7 text-vip-gold" aria-hidden="true" />
          <h2 className="mb-5 text-center font-serif text-2xl font-semibold text-vip-gold">SALAS VIP - Solo 50 personas</h2>
          <div className="grid gap-3">
            {Array.from({ length: 6 }, (_, index) => {
              const number = index + 1;
              return (
                <Button
                  key={number}
                  type="button"
                  variant="outline"
                  onClick={() => onSelectVip(number)}
                  className="h-auto min-h-24 w-full justify-start border-vip-gold bg-vip-surface px-5 py-4 text-left text-vip-gold shadow-vip-glow hover:bg-vip-surface hover:text-vip-gold"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-normal text-lg font-bold leading-snug">🔒 SALA VACANTE {number}</span>
                    <span className="mt-1 block whitespace-normal text-sm font-normal text-vip-gold/80">Sé fundador por 4 $ al mes</span>
                  </span>
                  <span className="ml-2 flex shrink-0 items-center gap-1 text-base font-bold">
                    0/50 <Users className="size-5" aria-label="personas" />
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}