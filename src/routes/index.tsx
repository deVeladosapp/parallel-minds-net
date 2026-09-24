import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Coffee, Send } from "lucide-react";
import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from "react";

import { Conversation, ConversationContent, ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import logoAsset from "@/assets/logo.jpg.asset.json";
import mapAsset from "@/assets/mapa.jpg.asset.json";
import coverAsset from "@/assets/portada.jpg.asset.json";

type Screen = "cover" | "map" | "chat";
type ChatMessage = Tables<"messages">;

const coffeeText = "Banco BNC 0191 / Tlf 04220432280 / CI 26049337 / Concepto Cafecito Desvelados";

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

  useEffect(() => {
    if (screen !== "chat" || !authId) return;
    let active = true;
    void supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => { if (active && data) setMessages(data); });

    const channel = supabase
      .channel("lara-night-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const incoming = payload.new as ChatMessage;
        setMessages((current) => current.some((item) => item.id === incoming.id) ? current : [...current, incoming]);
      })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [screen, authId]);

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
    if (!body || !authId || !nickname) return;
    const { error } = await supabase.from("messages").insert({ user_id: authId, nickname, body, state: "Lara" });
    if (error) setNotice("Tu mensaje no pudo enviarse. Intenta de nuevo.");
  };

  const copyCoffee = async () => {
    await navigator.clipboard.writeText(coffeeText);
    setNotice("Datos del cafecito copiados");
    window.setTimeout(() => setNotice(null), 2400);
  };

  return (
    <main className="watercolor-surface relative min-h-dvh overflow-hidden bg-night text-primary-foreground">
      {notice && <div role="status" className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-md bg-paper px-4 py-2 text-sm font-semibold text-ink shadow-lg">{notice}</div>}

      {screen === "cover" && (
        <ImageScreen src={coverAsset.url} alt="Dos personas sentadas espalda con espalda bajo el título Estamos en la misma">
          <Button aria-label="Entrar" onClick={enter} variant="ghost" className="absolute bottom-[1.5%] left-[36.5%] h-[9.5%] w-[27%] bg-transparent hover:bg-transparent" />
        </ImageScreen>
      )}

      {screen === "map" && (
        <ImageScreen src={mapAsset.url} alt="Mapa nocturno de Lara con personas despiertas cerca de ti" portrait>
          <Button aria-label="Entrar al desahogo y hablar con ellos" onClick={() => setScreen("chat")} variant="ghost" className="absolute bottom-[3.9%] left-[9%] h-[8%] w-[82%] rounded-full bg-transparent hover:bg-transparent" />
        </ImageScreen>
      )}

      {screen === "chat" && (
        <section className="relative mx-auto flex h-dvh w-full max-w-xl flex-col px-5 pb-4 pt-8 sm:px-8">
          <CoffeeButton onCopy={copyCoffee} />
          <h1 className="mb-6 text-center text-2xl font-normal text-primary-foreground sm:text-3xl">Estamos en la misma</h1>
          <div className="mb-5 flex min-h-20 items-center gap-3 rounded-[2rem] bg-night-soft px-4 shadow-xl">
            <Button aria-label="Volver al mapa" onClick={() => setScreen("map")} size="icon" variant="ghost" className="shrink-0 rounded-full text-primary-foreground hover:bg-water/20 hover:text-primary-foreground"><ArrowLeft className="size-7" /></Button>
            <span className="text-xl" aria-hidden="true">♠</span>
            <h2 className="min-w-0 flex-1 text-lg font-semibold sm:text-xl">Se fue la luz - Lara</h2>
            <span className="shrink-0 rounded-full bg-paper px-3 py-2 text-xs font-semibold text-ink sm:text-sm"><span className="text-mint">●</span> 47 desvelados ahora</span>
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
                      <p className="min-w-0 flex-1 text-lg leading-snug sm:text-xl">{message.body}</p>
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
        </section>
      )}

      {showNickname && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-night/90 px-6">
          <form onSubmit={saveNickname} className="w-full max-w-sm rounded-lg bg-paper p-6 text-ink shadow-2xl">
            <img src={logoAsset.url} alt="Logo de Estamos en la misma" className="mx-auto mb-4 size-24 rounded-md object-cover" />
            <h2 className="text-center text-2xl font-bold">¿Cómo quieres que te llamemos?</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">Tu apodo será visible en el chat.</p>
            <label className="mt-5 block text-sm font-semibold" htmlFor="nickname">Apodo</label>
            <input id="nickname" autoFocus maxLength={24} minLength={2} required value={nicknameDraft} onChange={(event) => setNicknameDraft(event.target.value)} placeholder="Desvelado_234" className="mt-2 h-12 w-full rounded-md border border-input bg-background px-4 text-foreground outline-none focus:ring-2 focus:ring-water" />
            <Button disabled={busy || nicknameDraft.trim().length < 2} className="mt-5 h-12 w-full bg-night-soft text-primary-foreground hover:bg-night" type="submit">{busy ? "Entrando..." : "Continuar"}</Button>
          </form>
        </div>
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

function CoffeeButton({ onCopy }: { onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button onClick={() => { void onCopy(); setCopied(true); window.setTimeout(() => setCopied(false), 2200); }} className="absolute right-2 top-2 z-30 h-8 gap-1.5 rounded-full bg-paper/95 px-3 text-xs text-ink shadow-lg hover:bg-paper" title="Copiar datos del cafecito">
      {copied ? <Check className="size-3.5" /> : <Coffee className="size-3.5" />}
      {copied ? "Copiado" : "❤️ Invita un cafecito"}
    </Button>
  );
}