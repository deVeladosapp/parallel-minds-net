import { Camera, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

type Enviar = (tipo: "audio" | "image", path: string) => Promise<void>;

export function MediaVipButtons({ userId, onSend }: { userId: string; onSend: Enviar }) {
  const [grabando, setGrabando] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | null>(null);

  const subir = async (bucket: "audios" | "fotos-vip", blob: Blob, ext: string, tipo: "audio" | "image") => {
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type });
    if (error) { toast.error("No se pudo subir. Intenta otra vez."); return; }
    await onSend(tipo, path);
  };

  const grabar = async () => {
    if (grabando) { rec.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) window.clearTimeout(timer.current);
        setGrabando(false);
        void subir("audios", new Blob(chunks, { type: r.mimeType || "audio/webm" }), "webm", "audio");
      };
      rec.current = r;
      r.start();
      setGrabando(true);
      timer.current = window.setTimeout(() => r.state === "recording" && r.stop(), 15_000);
    } catch {
      toast.error("Permite el micrófono para grabar.");
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label={grabando ? "Detener audio" : "Grabar audio (15s)"} onClick={() => void grabar()} className={`grid size-9 place-items-center rounded-full ${grabando ? "animate-pulse bg-destructive" : "bg-night-soft"}`}>
        {grabando ? <Square className="size-4" /> : <Mic className="size-4" />}
      </button>
      <label aria-label="Enviar foto" className="grid size-9 cursor-pointer place-items-center rounded-full bg-night-soft">
        <Camera className="size-4" />
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && f.size <= 8_000_000) void subir("fotos-vip", f, f.name.split(".").pop() || "jpg", "image"); else if (f) toast.error("La foto debe pesar menos de 8 MB."); }} />
      </label>
    </div>
  );
}

export function MediaMensaje({ tipo, path }: { tipo: string; path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    void supabase.storage.from(tipo === "audio" ? "audios" : "fotos-vip").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [tipo, path]);
  if (!url) return null;
  return tipo === "audio" ? <audio controls src={url} className="mt-1 w-full" /> : <img src={url} alt="Foto enviada" className="mt-1 max-h-72 rounded-xl object-cover" />;
}
