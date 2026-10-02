import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Coffee, Palette, Send } from "lucide-react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Conversation, ConversationContent, ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { SALAS, SeleccionSalas } from "@/components/SeleccionSalas";
import { AvatarMarco, MarcoGrid } from "@/components/AvatarMarco";
import { CafecitoDialog } from "@/components/CafecitoDialog";
import { AVATARES, MARCOS } from "@/lib/desvelados";
import { comprarMarco } from "@/lib/pagos.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Screen = "cover" | "map" | "rooms" | "chat";
type ChatMessage = Tables<"messages">;
type Room = Tables<"rooms">;
type SalaChoice = (typeof SALAS)[number];
type Pinta = { color: string; fuente: string; nube: string; fondo: string };
const db = supabase as any;

const NUBES = [
  { nombre: "Blanca", clase: "bg-paper text-ink" },
  { nombre: "Noche", clase: "bg-night-soft text-primary-foreground" },
  { nombre: "Menta", clase: "bg-mint text-ink" },
  { nombre: "Dorada", clase: "bg-gold text-ink" },
  { nombre: "Agua", clase: "bg-water text-ink" },
  { nombre: "Vidrio", clase: "bg-paper/20 text-primary-foreground backdrop-blur" },
];
const FONDOS = [
  { nombre: "Luna", valor: "/fondo-luna.jpg" },
  { nombre: "Lluvia", valor: "/portada-lluvia.jpg" },
  { nombre: "Venezuela", valor: "/venezuela-bg.png" },
  { nombre: "Liso", valor: "" },
];
const TABS = ["Colores", "Fuentes", "Marcos", "Efectos", "Avatares", "Nube", "Fondo"] as const;

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
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [marcoActivo, setMarcoActivo] = useState<number | null>(null);
  const [saldo, setSaldo] = useState(0);
  const [vipActivos, setVipActivos] = useState<number[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Colores");
  const comprar = useServerFn(comprarMarco);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [enteringTema, setEnteringTema] = useState<string | null>(null);
  const [pinta, setPinta] = useState<Pinta>({ color: "", fuente: "Arial, sans-serif", nube: NUBES[0]!.clase, fondo: "/fondo-luna.jpg" });
  const [showPinta, setShowPinta] = useState(false);
  const pintaKey = `miPinta_${authId ?? "anon"}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(pintaKey);
      if (saved) setPinta((c) => ({ ...c, ...JSON.parse(saved) }));
    } catch { /* ignore */ }
  }, [pintaKey]);

  const updatePinta = (next: Partial<Pinta>) => {
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
      const { data: profile } = await db
        .from("profiles")
        .select("nickname,avatar_url,marco_activo")
        .eq("id", data.user.id)
        .maybeSingle();
      if (active && profile?.nickname) {
        setNickname(profile.nickname);
        setAvatar(profile.avatar_url ?? null);
        setMarcoActivo(profile.marco_activo ?? null);
      }
      void refreshWallet(data.user.id);
    });
    return () => { active = false; };
  }, []);

  const refreshWallet = async (uid: string) => {
    const [{ data: w }, { data: owned }] = await Promise.all([
      db.from("monedas").select("saldo").eq("user_id", uid).maybeSingle(),
      db.from("marcos_usuario").select("marco_id").eq("user_id", uid).gt("expira", new Date().toISOString()),
    ]);
    setSaldo(w?.saldo ?? 0);
    setVipActivos((owned ?? []).map((o: { marco_id: number }) => o.marco_id));
  };

  const pickMarco = async (id: number, limpio = false) => {
    if (!authId) return;
    const frame = MARCOS.find((m) => m.id === id);
    if (frame?.vip && !limpio && !vipActivos.includes(id)) {
      const res = await comprar({ data: { marcoId: id } });
      if (!res.ok) { toast.error(res.error); return; }
      setSaldo(res.saldo);
      setVipActivos((v) => [...v, id]);
      toast("¡Marco VIP activo por 1 día! ✨");
    } else {
      await db.from("profiles").update({ marco_activo: id }).eq("id", authId);
    }
    setMarcoActivo(id);
  };

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
      let avatarValue = avatarDraft ?? avatar;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upError } = await supabase.storage.from("avatares").upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (upError) throw upError;
        avatarValue = `storage:${path}`;
      }
      const pais = (navigator.language.split("-")[1] ?? "").toUpperCase() || null;
      const { error } = await db.from("profiles").upsert({ id: userId, nickname: clean, state: "Lara", avatar_url: avatarValue, pais, updated_at: new Date().toISOString() });
      if (error) throw error;
      setAvatar(avatarValue);
      setAvatarFile(null);
      window.localStorage.setItem("perfilDesvelado", JSON.stringify({ nombre: clean, avatar: avatarValue }));
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
    const { error } = await supabase.from("messages").insert({ user_id: authId, nickname, body, state: "Lara", room_id: activeRoom.id, color: pinta.color, fuente: pinta.fuente, avatar_url: avatar, marco: marcoActivo } as any);
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
        <section className="pantalla-chat relative mx-auto flex h-dvh w-full max-w-xl flex-col px-5 pb-4 pt-8 sm:px-8" style={{ backgroundImage: pinta.fondo ? `url(${pinta.fondo})` : "none" }}>
          <CoffeeButton onOpen={() => setShowCoffee(true)} />
          <button type="button" onClick={() => setShowPinta(true)} className="absolute left-2 top-2 z-20 flex h-8 items-center gap-1.5 rounded-full bg-paper/95 px-3 text-xs font-semibold text-ink shadow-md">
            <Palette className="size-3.5" /> Mi pinta
          </button>
          {(activeRoom as any).fundador_id === authId && (
            <button type="button" onClick={() => setShowEditor(true)} className="absolute left-1/2 top-2 z-20 h-8 -translate-x-1/2 rounded-full bg-gold px-3 text-xs font-bold text-ink">👑 Editar sala</button>
          )}
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
                  <MessageContent className={`w-full rounded-[1.7rem] px-5 py-4 shadow-lg ${message.user_id === authId ? pinta.nube : "bg-paper text-ink"}`}>
                    <div className="mb-2 flex items-center gap-2 font-bold">
                      <AvatarMarco avatar={(message as any).avatar_url} marco={(message as any).marco} size={36} />
                      {message.nickname}
                    </div>
                    <div className="flex items-end gap-3">
                      <p className="min-w-0 flex-1 break-words text-lg leading-snug sm:text-xl" style={{ color: message.color || undefined, fontFamily: message.fuente || undefined }}>{message.body}</p>
                      <time className="shrink-0 text-sm opacity-60">{new Date(message.created_at).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}</time>
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
            <DialogContent className="panel-neon max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto rounded-2xl text-primary-foreground">
              <DialogHeader>
                <DialogTitle>Mi pinta</DialogTitle>
                <DialogDescription className="text-primary-foreground/70">Tienes {saldo} moneditas 🪙</DialogDescription>
              </DialogHeader>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {TABS.map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${tab === t ? "bg-water text-ink" : "bg-night-soft"}`}>{t}</button>
                ))}
              </div>
              {tab === "Colores" && (
                <div className="grid grid-cols-6 gap-3">
                  {COLORES.map((c) => (
                    <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => updatePinta({ color: c })} style={{ backgroundColor: c }} className={`size-9 rounded-full border-2 ${pinta.color === c ? "border-ring ring-2 ring-ring" : "border-border"}`} />
                  ))}
                </div>
              )}
              {tab === "Fuentes" && (
                <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {FUENTES.map((f) => (
                    <button key={f.nombre} type="button" onClick={() => updatePinta({ fuente: f.valor })} style={{ fontFamily: f.valor }} className={`flex h-11 items-center justify-center truncate rounded-lg border px-2 text-base ${pinta.fuente === f.valor ? "border-water bg-night-soft" : "border-border"}`}>{f.nombre}</button>
                  ))}
                </div>
              )}
              {tab === "Marcos" && (
                <div className="max-h-80 overflow-y-auto pr-1">
                  <MarcoGrid activo={marcoActivo} unlocked={(id) => vipActivos.includes(id)} onPick={(id) => void pickMarco(id)} />
                </div>
              )}
              {tab === "Efectos" && <p className="py-8 text-center text-primary-foreground/70">Próximamente ✨</p>}
              {tab === "Avatares" && (
                <div>
                  <div className="grid grid-cols-5 gap-2">
                    {AVATARES.map((a) => (
                      <button key={a} type="button" onClick={() => { setAvatar(a); if (authId) void db.from("profiles").update({ avatar_url: a }).eq("id", authId); }} className={`overflow-hidden rounded-full ring-2 ${avatar === a ? "ring-gold" : "ring-transparent"}`}>
                        <img src={a} alt="Avatar" className="aspect-square w-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" className="mt-3 w-full text-ink" onClick={() => { setShowPinta(false); setNicknameDraft(nickname); setShowNickname(true); }}>📸 Cambiar foto</Button>
                </div>
              )}
              {tab === "Nube" && (
                <div className="grid grid-cols-3 gap-2">
                  {NUBES.map((n) => <button key={n.nombre} type="button" onClick={() => updatePinta({ nube: n.clase })} className={`h-12 rounded-2xl text-sm font-semibold ${n.clase} ${pinta.nube === n.clase ? "ring-2 ring-water" : ""}`}>{n.nombre}</button>)}
                </div>
              )}
              {tab === "Fondo" && (
                <div className="grid grid-cols-2 gap-2">
                  {FONDOS.map((f) => (
                    <button key={f.nombre} type="button" onClick={() => updatePinta({ fondo: f.valor })} className={`h-20 rounded-xl bg-night-soft bg-cover bg-center text-sm font-semibold ${pinta.fondo === f.valor ? "ring-2 ring-water" : ""}`} style={f.valor ? { backgroundImage: `url(${f.valor})` } : undefined}>{f.nombre}</button>
                  ))}
                </div>
              )}
              <div className={`mt-2 flex items-center gap-2 rounded-2xl p-3 ${pinta.nube}`}>
                <AvatarMarco avatar={avatar} marco={marcoActivo} size={40} />
                <p className="text-lg" style={{ color: pinta.color || undefined, fontFamily: pinta.fuente }}>Así se verán tus mensajes</p>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showEditor} onOpenChange={setShowEditor}>
            <DialogContent className="panel-neon max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto rounded-2xl text-primary-foreground">
              <DialogHeader><DialogTitle>👑 Editor de tu sala</DialogTitle><DialogDescription className="text-primary-foreground/70">Como fundador, usa cualquier marco gratis.</DialogDescription></DialogHeader>
              <MarcoGrid limpio activo={marcoActivo} unlocked={() => true} onPick={(id) => void pickMarco(id, true)} />
            </DialogContent>
          </Dialog>
        </section>
      )}

      {showNickname && (
        <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-night/90 px-4 py-6">
          <form onSubmit={saveNickname} className="panel-neon w-full max-w-sm rounded-2xl p-5 text-primary-foreground">
            <h2 className="text-center text-xl font-extrabold">EPA DESVELADO! ¿CÓMO TE LLAMAS Y TU FOTO?</h2>
            <div className="mt-3 flex justify-center"><AvatarMarco avatar={avatarFile ? URL.createObjectURL(avatarFile) : avatarDraft ?? avatar} marco={marcoActivo} size={88} /></div>
            <label className="mt-3 block text-sm font-semibold" htmlFor="nickname">Tu nombre</label>
            <input id="nickname" autoFocus maxLength={24} minLength={2} required value={nicknameDraft} onChange={(event) => setNicknameDraft(event.target.value)} placeholder="Desvelado_234" className="mt-1 h-11 w-full rounded-md bg-night-soft px-4 outline-none placeholder:text-primary-foreground/50 focus:ring-2 focus:ring-water" />
            <label className="mt-3 flex h-11 cursor-pointer items-center justify-center rounded-md border border-dashed border-water/60 text-sm font-semibold">
              📸 SUBIR MI FOTO DE GALERÍA
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f && f.size <= 5_000_000) { setAvatarFile(f); setAvatarDraft(null); } else if (f) toast.error("La foto debe pesar menos de 5 MB."); }} />
            </label>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {AVATARES.map((a) => (
                <button key={a} type="button" onClick={() => { setAvatarDraft(a); setAvatarFile(null); }} className={`overflow-hidden rounded-full ring-2 ${avatarDraft === a && !avatarFile ? "ring-gold" : "ring-transparent"}`}>
                  <img src={a} alt="Avatar" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
            <Button disabled={busy || nicknameDraft.trim().length < 2} className="mt-4 h-12 w-full bg-gold font-extrabold text-ink hover:bg-gold/90" type="submit">{busy ? "Entrando..." : "ENTRAR AL CHAT 🔥"}</Button>
          </form>
        </div>
      )}

      {screen === "chat" && showCoffee && (
        <CafecitoDialog open userId={authId} modo={{ tipo: "monedas" }} onClose={() => { setShowCoffee(false); if (authId) void refreshWallet(authId); }} />
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