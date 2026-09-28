import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Coffee, Copy, Palette, Send } from "lucide-react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Conversation, ConversationContent, ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { SALAS, SeleccionSalas } from "@/components/SeleccionSalas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import coverAsset from "@/assets/portada.jpg.asset.json";

type Screen = "cover" | "map" | "rooms" | "chat";
type ChatMessage = Tables<"messages">;
type Room = Tables<"rooms">;
type SalaChoice = (typeof SALAS)[number];

const COLORES = [
  "#FF1493", "#FF00FF", "#9400D3", "#8A2BE2",
  "#000000", "#FF0000", "#0000FF", "#00FF00",
  "#FFD700", "#00CED1", "#FF8C00", "#FFFF00",
  "#FFFFFF", "#808080", "#000080", "#228B22",
  "#FF69B4", "#00FF7F", "#FF4500", "#1E90FF",
  "#8B0000", "#4B0082", "#2F4F4F", "#ADFF2F",
];
const FUENTES = [
  { nombre: "Normal", valor: "Arial, sans-serif" },
  { nombre: "Gótica", valor: "'UnifrakturMaguntia', cursive" },
  { nombre: "Graffiti", valor: "'Permanent Marker', cursive" },
  { nombre: "Bonita", valor: "'Dancing Script', cursive" },
  { nombre: "Gruesa", valor: "'Bebas Neue', sans-serif" },
  { nombre: "Cartel", valor: "'Anton', sans-serif" },
  { nombre: "Burbuja", valor: "'Lobster', cursive" },
  { nombre: "Manuscrita", valor: "'Caveat', cursive" },
  { nombre: "Gordita", valor: "'Pacifico', cursive" },
  { nombre: "Futurista", valor: "'Orbitron', sans-serif" },
  { nombre: "Game", valor: "'Press Start 2P', cursive" },
  { nombre: "Terror", valor: "'Creepster', cursive" },
  { nombre: "Nota Loca", valor: "'Indie Flower', cursive" },
  { nombre: "Neón", valor: "'Monoton', cursive" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estamos en la misma — Desahogo nocturno" },
      { name: "description", content: "Habla en tiempo real con personas despiertas cerca de ti." },
      { property: "og:title", content: "Estamos en la misma" },
      { property: "og:description", content: "No estás solo esta noche. Entra y conversa en tiempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NightApp,
});

function NightApp() {
  const [screen, setScreen] = useState<Screen>("cover");
  const [nickname, setNickname] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [showNickname, setShowNickname] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [authId, setAuthId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCoffee, setShowCoffee] = useState(false);
  const [otherAmount, setOtherAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);
  const [savingTip, setSavingTip] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [enteringTema, setEnteringTema] = useState<string | null>(null);
  const [pinta, setPinta] = useState<{ color: string; fuente: string }>({ color: "", fuente: "Arial, sans-serif" });
  const [showPinta, setShowPinta] = useState(false);
  const pintaKey = `miPinta_${authId ?? "anon"}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(pintaKey);
      if (saved) setPinta(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [pintaKey]);

  const updatePinta = (next: Partial<{ color: string; fuente: string }>) => {
    setPinta((current) => {
      const merged = { ...current, ...next };
      window.localStorage.setItem(pintaKey, JSON.stringify(merged));
      return merged;
    });
  };

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      setAuthId(data.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", data.user.id)
        .maybeSingle();
      if (active && profile?.nickname) setNickname(profile.nickname);
    });
    return () => { active = false; };
  }, []);

  const refreshRoomsAndCounts = useCallback(async () => {
    const [{ data: roomData }, { data: presenceData }] = await Promise.all([
      supabase.from("rooms").select("*"),
      supabase.from("presencia_sala").select("room_id,last_seen"),
    ]);
    const currentRooms = roomData ?? [];
    setRooms(currentRooms);
    const cutoff = Date.now() - 60_000;
    const byId = new Map(currentRooms.map((room) => [room.id, room.tema]));
    const nextCounts: Record<string, number> = {};
    for (const presence of presenceData ?? []) {
      const tema = byId.get(presence.room_id);
      if (tema && new Date(presence.last_seen).getTime() > cutoff) {
        nextCounts[tema] = (nextCounts[tema] ?? 0) + 1;
      }
    }
    setRoomCounts(nextCounts);
  }, []);

  useEffect(() => {
    if (screen !== "rooms" && screen !== "chat") return;
    void refreshRoomsAndCounts();
    const timer = window.setInterval(() => void refreshRoomsAndCounts(), 30_000);
    const channel = supabase
      .channel("room-presence-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "presencia_sala" }, () => {
        void refreshRoomsAndCounts();
      })
      .subscribe();
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [refreshRoomsAndCounts, screen]);

  useEffect(() => {
    if (screen !== "chat" || !authId || !activeRoom) return;
    let active = true;
    void supabase
      .from("messages")
      .select("*")
      .eq("room_id", activeRoom.id)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => { if (active && data) setMessages(data); });

    const channel = supabase
      .channel(`lara-night-chat-${activeRoom.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${activeRoom.id}` }, (payload) => {
        const incoming = payload.new as ChatMessage;
        setMessages((current) => current.some((item) => item.id === incoming.id) ? current : [...current, incoming]);
      })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [screen, authId, activeRoom]);

  useEffect(() => {
    if (screen !== "chat" || !authId || !activeRoom) return;
    const touchPresence = async () => {
      await supabase.from("presencia_sala").upsert(
        { room_id: activeRoom.id, user_id: authId, last_seen: new Date().toISOString() },
        { onConflict: "room_id,user_id" },
      );
    };
    void touchPresence();
    const timer = window.setInterval(() => void touchPresence(), 30_000);
    return () => {
      window.clearInterval(timer);
      void supabase.from("presencia_sala").delete().eq("room_id", activeRoom.id).eq("user_id", authId);
    };
  }, [screen, authId, activeRoom]);

  const enter = useCallback(() => {
    if (nickname && authId) setScreen("map");
    else setShowNickname(true);
  }, [nickname, authId]);

  const saveNickname = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = nicknameDraft.trim();
    if (clean.length < 2) return;
    setBusy(true);
    setNotice(null);
    try {
      let userId = authId;
      if (!userId) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        userId = data.user?.id ?? null;
      }
      if (!userId) throw new Error("No se pudo abrir la sesión.");
      const { error } = await supabase.from("profiles").upsert({ id: userId, nickname: clean, state: "Lara", updated_at: new Date().toISOString() });
      if (error) throw error;
      setAuthId(userId);
      setNickname(clean);
      setShowNickname(false);
      setScreen("map");
    } catch {
      setNotice("No pudimos guardar tu apodo. Intenta otra vez.");
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async ({ text }: { text: string }) => {
    const body = text.trim();
    if (!body || !authId || !nickname || !activeRoom) return;
    const { error } = await supabase.from("messages").insert({ user_id: authId, nickname, body, state: "Lara", room_id: activeRoom.id, color: pinta.color, fuente: pinta.fuente });
    if (error) setNotice("Tu mensaje no pudo enviarse. Intenta de nuevo.");
  };

  const enterRoom = async (choice: SalaChoice) => {
    if (!authId) return;
    setEnteringTema(choice.tema);
    setNotice(null);
    try {
      let room = rooms.find((item) => item.tema === choice.tema) ?? null;
      if (!room) {
        const { data, error } = await supabase
          .from("rooms")
          .insert({ tema: choice.tema, title: choice.t, subtitle: choice.s })
          .select()
          .single();
        if (error) {
          const { data: existing, error: readError } = await supabase.from("rooms").select("*").eq("tema", choice.tema).single();
          if (readError) throw readError;
          room = existing;
        } else {
          room = data;
        }
      }
      if (!room) throw new Error("No se pudo abrir la sala.");
      const { error: presenceError } = await supabase.from("presencia_sala").upsert(
        { room_id: room.id, user_id: authId, last_seen: new Date().toISOString() },
        { onConflict: "room_id,user_id" },
      );
      if (presenceError) throw presenceError;
      setMessages([]);
      setActiveRoom(room);
      setScreen("chat");
    } catch {
      setNotice("No pudimos abrir esta sala. Intenta otra vez.");
    } finally {
      setEnteringTema(null);
    }
  };

  const closeCoffee = () => {
    if (savingTip) return;
    setShowCoffee(false);
    setSelectedAmount(null);
    setOtherAmount("");
  };

  const chooseAmount = (amount: string) => {
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || Number(amount) > 9999999999.99) return;
    setSelectedAmount(amount);
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast("¡Copiado!");
    } catch {
      toast.error("No se pudo copiar. Intenta de nuevo.");
    }
  };

  const confirmTip = async () => {
    if (selectedAmount === null || !authId || savingTip) return;
    setSavingTip(true);
    try {
      const { error } = await supabase.from("propinas").insert({ user_id: authId, monto: Number(selectedAmount) });
      if (error) throw error;
      setShowCoffee(false);
      setSelectedAmount(null);
      setOtherAmount("");
      toast("¡Gracias por el cafecito! ❤️ Tu apoyo significa mucho");
    } catch {
      toast.error("No pudimos registrar tu apoyo. Intenta de nuevo.");
    } finally {
      setSavingTip(false);
    }
  };

  const [splash, setSplash] = useState(true);
  useEffect(() => { const t = setTimeout(() => setSplash(false), 1400); return () => clearTimeout(t); }, []);

  return (
    <main className="watercolor-surface relative min-h-dvh overflow-hidden bg-night text-primary-foreground">
      {notice && <div role="status" className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-md bg-paper px-4 py-2 text-sm font-semibold text-ink shadow-lg">{notice}</div>}

      {splash && <div className="pantalla-splash" aria-hidden="true" />}

      {screen === "cover" && (
        <div className="pantalla-portada">
          <div className="tarjeta-entrada h-full w-full">
            <Button aria-label="Entrar" onClick={enter} variant="ghost" className="absolute bottom-[10.5%] left-[33%] h-[5%] w-[34%] rounded-full bg-transparent hover:bg-transparent" />
          </div>
        </div>
      )}

      {screen === "map" && (
        <div className="relative h-dvh w-screen overflow-hidden bg-night">
          <img src="/venezuela-bg.png" alt="Mapa nocturno de Venezuela con personas desveladas" className="h-full w-full object-cover object-center" />
          <Button aria-label="Entra a desahogarte y hablar con ellos" onClick={() => setScreen("rooms")} variant="ghost" className="absolute bottom-[3.5%] left-[14%] h-[7%] w-[72%] rounded-full bg-transparent hover:bg-transparent" />
        </div>
      )}

      {screen === "rooms" && (
        <SeleccionSalas counts={roomCounts} enteringTema={enteringTema} onBack={() => setScreen("map")} onSelect={enterRoom} />
      )}

      {screen === "chat" && activeRoom && (
        <section className="pantalla-chat relative mx-auto flex h-dvh w-full max-w-xl flex-col px-5 pb-4 pt-8 sm:px-8">
          <CoffeeButton onOpen={() => setShowCoffee(true)} />
          <button type="button" onClick={() => setShowPinta(true)} className="absolute left-2 top-2 z-20 flex h-8 items-center gap-1.5 rounded-full bg-paper/95 px-3 text-xs font-semibold text-ink shadow-md">
            <Palette className="size-3.5" /> Mi pinta
          </button>
          <img src="/splash-aritos.jpg" alt="Logo de Estamos en la misma" className="mx-auto mb-2 size-12 rounded-full object-cover shadow-lg" />
          <h1 className="mb-6 text-center text-2xl font-normal text-primary-foreground sm:text-3xl">Estamos en la misma</h1>
          <div className="mb-5 flex min-h-20 items-center gap-3 rounded-[2rem] bg-night-soft px-4 shadow-xl">
             <Button aria-label="Volver a las salas" onClick={() => setScreen("rooms")} size="icon" variant="ghost" className="shrink-0 rounded-full text-primary-foreground hover:bg-water/20 hover:text-primary-foreground"><ArrowLeft className="size-7" /></Button>
             <h2 className="min-w-0 flex-1 text-base font-semibold leading-tight sm:text-lg">{activeRoom.title} - Lara</h2>
             <span className="shrink-0 rounded-full bg-paper px-2.5 py-2 text-xs font-semibold text-ink"><span className="text-mint">●</span> {roomCounts[activeRoom.tema] ?? 0} conectados</span>
          </div>

          <Conversation className="min-h-0">
            <ConversationContent className="gap-4 px-1 py-2">
              {messages.length === 0 ? (
                <ConversationEmptyState title="La noche está en silencio" description="Suelta lo que sientes para comenzar." />
              ) : messages.map((message) => (
                <Message from="assistant" key={message.id} className="max-w-full">
                  <MessageContent className="w-full rounded-[1.7rem] bg-paper px-5 py-4 text-ink shadow-lg">
                    <div className="mb-2 font-bold">{message.nickname}</div>
                    <div className="flex items-end gap-3">
                      <p className="min-w-0 flex-1 break-words text-lg leading-snug sm:text-xl" style={{ color: message.color || undefined, fontFamily: message.fuente || undefined }}>{message.body}</p>
                      <time className="shrink-0 text-sm text-muted-foreground">{new Date(message.created_at).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</time>
                    </div>
                  </MessageContent>
                </Message>
              ))}
            </ConversationContent>
          </Conversation>

          <PromptInput onSubmit={sendMessage} className="mt-4 rounded-[2rem] border-water/60 bg-night-soft/85 text-primary-foreground">
            <PromptInputTextarea aria-label="Mensaje" placeholder="Suelta lo que sientes..." className="min-h-16 px-5 text-lg text-primary-foreground placeholder:text-primary-foreground/55" />
            <PromptInputFooter className="justify-end px-3 pb-3">
              <PromptInputSubmit aria-label="Enviar mensaje" className="size-12 rounded-full bg-mint text-ink hover:bg-mint/90"><Send className="size-6" /></PromptInputSubmit>
            </PromptInputFooter>
          </PromptInput>
          <Dialog open={showPinta} onOpenChange={setShowPinta}>
            <DialogContent className="max-w-sm rounded-2xl">
              <DialogHeader>
                <DialogTitle>Mi pinta</DialogTitle>
                <DialogDescription>Elige el color y la letra de tus mensajes.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-6 gap-3">
                {COLORES.map((c) => (
                  <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => updatePinta({ color: c })} style={{ backgroundColor: c }} className={`size-9 rounded-full border-2 ${pinta.color === c ? "border-ring ring-2 ring-ring" : "border-border"}`} />
                ))}
              </div>
              <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
                {FUENTES.map((f) => (
                  <button key={f.nombre} type="button" onClick={() => updatePinta({ fuente: f.valor })} style={{ fontFamily: f.valor }} className={`flex h-11 items-center justify-center truncate rounded-lg border px-2 text-base ${pinta.fuente === f.valor ? "border-ring bg-secondary" : "border-border"}`}>{f.nombre}</button>
                ))}
              </div>
              <p className="mt-2 rounded-lg bg-paper p-3 text-center text-lg text-ink" style={{ color: pinta.color || undefined, fontFamily: pinta.fuente }}>Así se verán tus mensajes</p>
            </DialogContent>
          </Dialog>
        </section>
      )}

      {showNickname && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-night/90 px-6">
          <form onSubmit={saveNickname} className="w-full max-w-sm rounded-lg bg-paper p-6 text-ink shadow-2xl">
            <img src="/splash-aritos.jpg" alt="Logo de Estamos en la misma" className="mx-auto mb-4 size-24 rounded-md object-cover" />
            <h2 className="text-center text-2xl font-bold">¿Cómo quieres que te llamemos?</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">Tu apodo será visible en el chat.</p>
            <label className="mt-5 block text-sm font-semibold" htmlFor="nickname">Apodo</label>
            <input id="nickname" autoFocus maxLength={24} minLength={2} required value={nicknameDraft} onChange={(event) => setNicknameDraft(event.target.value)} placeholder="Desvelado_234" className="mt-2 h-12 w-full rounded-md border border-input bg-background px-4 text-foreground outline-none focus:ring-2 focus:ring-water" />
            <Button disabled={busy || nicknameDraft.trim().length < 2} className="mt-5 h-12 w-full bg-night-soft text-primary-foreground hover:bg-night" type="submit">{busy ? "Entrando..." : "Continuar"}</Button>
          </form>
        </div>
      )}

      {screen === "chat" && (
        <Dialog open={showCoffee} onOpenChange={(open) => { if (!open) closeCoffee(); }}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm gap-0 overflow-y-auto rounded-lg border-border bg-paper p-5 text-ink shadow-2xl sm:p-6 [&>button]:text-ink [&>button>span]:hidden [&>button]:after:content-['Cerrar'] [&>button]:after:sr-only">
            {selectedAmount === null ? (
              <>
                <Coffee className="mx-auto size-9 text-night-soft" aria-hidden="true" />
                <DialogHeader className="mt-3 text-center sm:text-center">
                  <DialogTitle className="text-2xl">Invita un cafecito</DialogTitle>
                  <DialogDescription>Elige el monto que deseas enviar.</DialogDescription>
                </DialogHeader>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[100, 200, 300].map((amount) => <Button key={amount} onClick={() => chooseAmount(String(amount))} className="h-12 bg-night-soft text-primary-foreground hover:bg-night">{amount}</Button>)}
                </div>
                <form className="mt-5" onSubmit={(event) => { event.preventDefault(); chooseAmount(otherAmount); }}>
                  <label className="block text-sm font-semibold" htmlFor="other-amount">Otro monto</label>
                  <div className="mt-2 flex gap-2">
                    <input id="other-amount" inputMode="decimal" min="0.01" step="0.01" type="number" value={otherAmount} onChange={(event) => setOtherAmount(event.target.value)} placeholder="Agregar otro valor" className="h-12 min-w-0 flex-1 rounded-md border border-input bg-background px-4 text-foreground outline-none focus:ring-2 focus:ring-water" />
                    <Button disabled={!Number.isFinite(Number(otherAmount)) || Number(otherAmount) <= 0} type="submit" className="h-12 bg-mint text-ink hover:bg-mint/90">Continuar</Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <DialogHeader className="pr-5 text-center sm:text-center">
                  <DialogTitle className="text-2xl leading-tight">¡Gracias por el cafecito! ☕</DialogTitle>
                  <DialogDescription className="pt-1 text-base">Para enviar Bs {selectedAmount}</DialogDescription>
                </DialogHeader>
                <div className="mt-5 space-y-2">
                  {([
                    { label: "Banco", display: "BNC (0191)", copy: "0191" },
                    { label: "Teléfono", display: "04164531216", copy: "04164531216" },
                    { label: "Cédula", display: "V26049337", copy: "26049337" },
                    { label: "Monto", display: `Bs ${selectedAmount}`, copy: String(selectedAmount) },
                  ]).map((row) => (
                    <div key={row.label} className="flex min-h-12 items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-1.5">
                      <span className="min-w-0 flex-1 text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-right text-sm font-semibold tabular-nums text-ink">{row.display}</span>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Copiar ${row.label.toLowerCase()}`} title={`Copiar ${row.label.toLowerCase()}`} onClick={() => void copyValue(row.copy)} className="ml-1 shrink-0 text-night-soft hover:bg-water/20 hover:text-ink"><Copy aria-hidden="true" /></Button>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>O escanea directo</span><span className="h-px flex-1 bg-border" /></div>
                <img src="/qr-pago-movil.png" alt="Código QR de pago móvil" width={220} height={220} className="mx-auto mt-3 size-[min(220px,52dvh)] rounded-md border-4 border-paper object-contain ring-1 ring-border" />
                <p className="mt-3 text-center text-sm text-muted-foreground">Gracias por el cafecito ❤️</p>
                <div className="mt-5 flex flex-col gap-2">
                  <Button type="button" variant="outline" onClick={() => void copyValue(`BNC (0191) - 04164531216 - V26049337 - Bs ${selectedAmount}`)} className="h-11 w-full border-border text-ink"><Copy aria-hidden="true" />Copiar todos los datos</Button>
                  <Button type="button" disabled={savingTip} onClick={() => void confirmTip()} className="h-12 w-full bg-night-soft text-primary-foreground hover:bg-night">{savingTip ? "Guardando..." : "Ya apoyé ☕"}</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}

function ImageScreen({ src, alt, portrait = false, children }: { src: string; alt: string; portrait?: boolean; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-night">
      <div className={portrait ? "relative h-dvh max-h-[1365px] aspect-[768/1365] max-w-full" : "relative w-full max-w-[1152px] aspect-[3/2]"}>
        <img src={src} alt={alt} className="size-full object-contain" />
        {children}
      </div>
    </div>
  );
}

function CoffeeButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button onClick={onOpen} className="absolute right-2 top-2 z-30 h-8 gap-1.5 rounded-full bg-paper/95 px-3 text-xs text-ink shadow-lg hover:bg-paper" title="Invita un cafecito">
      <Coffee className="size-3.5" />
      ❤️ Invita un cafecito
    </Button>
  );
}