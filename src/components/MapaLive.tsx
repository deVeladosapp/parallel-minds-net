import { useEffect, useState } from "react";

const PAISES = [
  { n: "México", f: "🇲🇽", base: 12000, x: 15, y: 11 },
  { n: "Colombia", f: "🇨🇴", base: 8300, x: 37, y: 35.5 },
  { n: "Venezuela", f: "🇻🇪", base: 5000, x: 44.4, y: 25.6 },
  { n: "Brasil", f: "🇧🇷", base: 7200, x: 71, y: 47 },
  { n: "Perú", f: "🇵🇪", base: 4600, x: 48, y: 56 },
  { n: "Argentina", f: "🇦🇷", base: 3220, x: 47.6, y: 83.4 },
  { n: "Chile", f: "🇨🇱", base: 2900, x: 43, y: 74 },
  { n: "Ecuador", f: "🇪🇨", base: 1800, x: 33, y: 41 },
  { n: "Bolivia", f: "🇧🇴", base: 1300, x: 55, y: 62 },
  { n: "Uruguay", f: "🇺🇾", base: 900, x: 62, y: 77 },
  { n: "Paraguay", f: "🇵🇾", base: 850, x: 60, y: 68 },
  { n: "Rep. Dominicana", f: "🇩🇴", base: 1500, x: 49, y: 17 },
  { n: "Cuba", f: "🇨🇺", base: 1100, x: 38, y: 13 },
  { n: "Panamá", f: "🇵🇦", base: 700, x: 32, y: 29 },
  { n: "Costa Rica", f: "🇨🇷", base: 600, x: 28.5, y: 27 },
  { n: "Guatemala", f: "🇬🇹", base: 950, x: 22, y: 20 },
];

export function MapaLive({ onSalas }: { onSalas: () => void }) {
  const [cuentas, setCuentas] = useState(() => PAISES.map((p) => p.base));
  useEffect(() => {
    const t = window.setInterval(() => {
      setCuentas((c) => c.map((v, i) => Math.max(Math.round(PAISES[i]!.base * 0.9), v + Math.round((Math.random() - 0.48) * 40))));
    }, 1500);
    return () => window.clearInterval(t);
  }, []);
  const total = cuentas.reduce((a, b) => a + b, 0);
  const hora = new Date().toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative flex h-dvh w-screen flex-col overflow-hidden bg-night text-primary-foreground">
      <header className="mx-3 mt-3 flex items-center justify-between rounded-xl border border-gold/70 bg-night/80 px-4 py-2.5 shadow-[0_0_14px_var(--gold)]">
        <span className="text-sm font-bold tracking-wide text-gold">💬 LIVE CHAT · LATINOAMÉRICA</span>
        <span className="flex items-center gap-1.5 text-sm font-bold text-gold"><span className="size-2 animate-pulse rounded-full bg-water" /> EN VIVO</span>
      </header>
      <div className="mt-2 text-center">
        <p className="text-sm font-bold tracking-widest text-water">TOTAL CONECTADOS</p>
        <p className="text-5xl font-black tabular-nums text-gold transition-all" style={{ textShadow: "0 0 18px var(--gold)" }}>{total.toLocaleString("es-VE")}</p>
      </div>
      <div className="relative mx-auto min-h-0 w-full max-w-md flex-1">
        <img src="/mapa-latam.jpg" alt="Mapa de Latinoamérica con puntos de personas conectadas" className="absolute inset-0 h-full w-full object-contain" />
        <div className="absolute inset-0 mx-auto aspect-[1085/1140] max-h-full max-w-full" style={{ top: "50%", transform: "translateY(-50%)" }}>
          {PAISES.map((p) => (
            <span key={p.n} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              <span className="map-ping absolute left-0 top-0 size-5 rounded-full border-2 border-gold" />
              <span className="absolute left-0 top-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_10px_var(--gold)]" />
            </span>
          ))}
        </div>
        <button type="button" onClick={onSalas} className="absolute bottom-3 right-3 z-10 rounded-full bg-gold px-4 py-3 text-sm font-extrabold text-ink shadow-[0_0_18px_var(--gold)]">
          💬 Entra a las salas de chat
        </button>
      </div>
      <section className="mx-3 mb-2 rounded-xl border border-gold/70 bg-night/85 p-3">
        <p className="mb-2 text-xs font-bold tracking-wide text-water">USUARIOS EN VIVO POR PAÍS</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PAISES.map((p, i) => (
            <div key={p.n} className="w-20 shrink-0 rounded-lg border border-gold/40 bg-night-soft p-2 text-center">
              <div className="text-2xl">{p.f}</div>
              <div className="truncate text-[11px]">{p.n}</div>
              <div className="text-sm font-bold tabular-nums text-gold">{cuentas[i]!.toLocaleString("es-VE")}</div>
            </div>
          ))}
        </div>
      </section>
      <p className="mb-2 text-center text-[11px] text-water">📶 ACTUALIZADO {hora} · TIEMPO REAL</p>
    </div>
  );
}
