import { useServerFn } from "@tanstack/react-start";
import { Copy, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { BINANCE_ID, PRECIO_SALA_USD, monedasPorBs } from "@/lib/desvelados";
import { reportarPago } from "@/lib/pagos.functions";

export type CafecitoModo =
  | { tipo: "monedas" }
  | { tipo: "sala"; salaTema: string; nombreSala: string; descripcionSala: string };

type Metodo = "pago_movil" | "binance";

async function copy(value: string) {
  try { await navigator.clipboard.writeText(value); toast("¡Copiado!"); } catch { toast.error("No se pudo copiar."); }
}

export function CafecitoDialog({ open, onClose, modo, userId }: { open: boolean; onClose: () => void; modo: CafecitoModo; userId: string | null }) {
  const [metodo, setMetodo] = useState<Metodo>("pago_movil");
  const [monto, setMonto] = useState<string | null>(modo.tipo === "sala" ? String(PRECIO_SALA_USD) : null);
  const [otro, setOtro] = useState("");
  const [referencia, setReferencia] = useState("");
  const [captura, setCaptura] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const reportar = useServerFn(reportarPago);
  const esSala = modo.tipo === "sala";
  const unidad = esSala ? "$" : "Bs";

  const reset = () => { setMonto(esSala ? String(PRECIO_SALA_USD) : null); setOtro(""); setReferencia(""); setCaptura(null); };
  const close = () => { if (sending) return; reset(); onClose(); };

  const elegir = (v: string) => { if (/^\d+(?:\.\d{1,2})?$/.test(v) && Number(v) > 0) setMonto(v); };

  const enviar = async () => {
    if (!userId || !monto || referencia.trim().length < 3 || sending) return;
    setSending(true);
    try {
      let capturaPath: string | null = null;
      if (captura) {
        const ext = captura.name.split(".").pop()?.toLowerCase() || "jpg";
        capturaPath = `${userId}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("comprobantes").upload(capturaPath, captura, { contentType: captura.type });
        if (error) throw error;
      }
      const res = await reportar({ data: {
        tipo: modo.tipo, metodo, monto: Number(monto), referencia: referencia.trim(), capturaPath,
        salaTema: esSala ? (modo.salaTema as "vip-1") : null,
        nombreSala: esSala ? modo.nombreSala : null,
        descripcionSala: esSala ? modo.descripcionSala : null,
      } });
      if (!res.ok) { toast.error(res.error); return; }
      if (!esSala) await supabase.from("propinas").insert({ user_id: userId, monto: Number(monto) });
      toast(esSala ? "¡Pago recibido! Tu sala se desbloquea 🔓 apenas se confirme." : "¡Gracias por el cafecito! ❤️ Tus moneditas llegan apenas se confirme el pago.");
      reset();
      onClose();
    } catch {
      toast.error("No pudimos enviar tu comprobante. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  const filasPM = [
    { label: "Banco", display: "BNC (0191)", copy: "0191" },
    { label: "Teléfono", display: "04164531216", copy: "04164531216" },
    { label: "Cédula", display: "V26049337", copy: "26049337" },
    { label: "Monto", display: `${unidad} ${monto}`, copy: String(monto) },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm gap-0 overflow-y-auto rounded-2xl bg-paper p-5 text-ink">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 pr-1">
          {([["pago_movil", "📱 Pago Móvil"], ["binance", "🟡 Binance"]] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMetodo(id)} className={`h-9 rounded-full text-sm font-semibold ${metodo === id ? "bg-night-soft text-primary-foreground" : "text-ink"}`}>{label}</button>
          ))}
        </div>

        {esSala && <p className="mt-4 rounded-lg bg-gold/15 p-2 text-center text-sm font-bold text-gold-deep">Estás pagando tu Sala - {PRECIO_SALA_USD}$</p>}

        {monto === null ? (
          <>
            <DialogHeader className="mt-4 text-center sm:text-center">
              <DialogTitle className="text-2xl">Invita un cafecito</DialogTitle>
              <DialogDescription>💡 2 Bs = 1 monedita | 50 moneditas = 1 día marco VIP</DialogDescription>
            </DialogHeader>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[100, 200, 300].map((a) => (
                <div key={a} className="text-center">
                  <Button onClick={() => elegir(String(a))} className="h-12 w-full bg-night-soft text-primary-foreground hover:bg-night">{a}</Button>
                  <p className="mt-1 text-xs font-semibold text-gold-deep">{monedasPorBs(a)} moneditas 🪙</p>
                </div>
              ))}
            </div>
            <form className="mt-4" onSubmit={(e) => { e.preventDefault(); elegir(otro); }}>
              <label className="block text-sm font-semibold" htmlFor="other-amount">Otro monto</label>
              <div className="mt-2 flex gap-2">
                <input id="other-amount" type="number" inputMode="decimal" step="0.01" value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="Agregar otro valor" className="h-12 min-w-0 flex-1 rounded-md border border-input bg-background px-4 outline-none focus:ring-2 focus:ring-water" />
                <Button type="submit" disabled={!(Number(otro) > 0)} className="h-12 bg-mint text-ink hover:bg-mint/90">Continuar</Button>
              </div>
              <p className="mt-1 text-xs font-semibold text-gold-deep">Tú eliges {Number(otro) > 0 ? `· ${monedasPorBs(Number(otro))} moneditas 🪙` : ""}</p>
            </form>
          </>
        ) : (
          <>
            <DialogHeader className="mt-4 text-center sm:text-center">
              <DialogTitle className="text-xl">{esSala ? "👑 Paga tu sala" : "¡Gracias por el cafecito! ☕"}</DialogTitle>
              <DialogDescription>Para enviar {unidad} {monto}{!esSala && ` · recibes ${monedasPorBs(Number(monto))} moneditas 🪙`}</DialogDescription>
            </DialogHeader>

            {metodo === "pago_movil" ? (
              <>
                <div className="mt-4 space-y-2">
                  {filasPM.map((r) => (
                    <div key={r.label} className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-secondary/60 px-3">
                      <span className="flex-1 text-sm text-muted-foreground">{r.label}</span>
                      <span className="text-sm font-semibold tabular-nums">{r.display}</span>
                      <Button variant="ghost" size="icon-sm" aria-label={`Copiar ${r.label}`} onClick={() => void copy(r.copy)}><Copy /></Button>
                    </div>
                  ))}
                </div>
                <img src="/qr-pago-movil.png" alt="QR de Pago Móvil BNC" className="mx-auto mt-4 size-[200px] rounded-md border-4 border-paper object-contain ring-1 ring-border" />
                <Button variant="outline" className="mt-3 h-10 w-full" onClick={() => void copy(`BNC (0191) - 04164531216 - V26049337 - ${unidad} ${monto}`)}><Copy />Copiar todos los datos</Button>
              </>
            ) : (
              <>
                <div className="mt-4 flex items-center justify-center gap-2 font-bold text-gold-deep"><span className="grid size-7 place-items-center rounded-md bg-gold text-ink">◆</span> Binance Pay</div>
                <img src="/qr-binance.jpg" alt="QR de Binance Pay" className="mx-auto mt-3 size-[220px] rounded-md object-contain" />
                <p className="mt-2 text-center font-mono text-base font-semibold">{BINANCE_ID}</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Button className="h-10 bg-gold text-ink hover:bg-gold/90" onClick={() => void copy(BINANCE_ID)}>📋 Copiar ID Binance</Button>
                  <Button variant="outline" className="h-10" onClick={() => void copy(`Binance Pay ID: ${BINANCE_ID} - Monto: ${unidad} ${monto}`)}><Copy />Copiar todos los datos</Button>
                </div>
              </>
            )}

            <div className="mt-5 rounded-xl border border-border p-3">
              <p className="text-sm font-semibold">Ya pagué: envía tu comprobante</p>
              <input value={referencia} onChange={(e) => setReferencia(e.target.value)} maxLength={64} placeholder="Número de referencia" className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-water" />
              <label className="mt-2 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm">
                <Upload className="size-4" /> {captura ? captura.name.slice(0, 28) : "Subir captura del pago"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => setCaptura(e.target.files?.[0] ?? null)} />
              </label>
              <Button disabled={sending || referencia.trim().length < 3} onClick={() => void enviar()} className="mt-3 h-12 w-full bg-night-soft text-primary-foreground hover:bg-night">{sending ? "Enviando..." : "Enviar comprobante"}</Button>
              <p className="mt-2 text-center text-xs text-muted-foreground">Revisamos cada pago antes de acreditarlo.</p>
            </div>
            {!esSala && <button type="button" onClick={() => setMonto(null)} className="mt-3 w-full text-sm text-muted-foreground">Cambiar monto</button>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
