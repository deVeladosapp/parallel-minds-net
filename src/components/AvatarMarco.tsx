import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { MARCOS } from "@/lib/desvelados";

const signedCache = new Map<string, string>();

/** Avatares subidos se guardan como "storage:<ruta>" en un bucket privado. */
export function useAvatarSrc(value: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(() => {
    if (!value) return null;
    if (!value.startsWith("storage:")) return value;
    return signedCache.get(value) ?? null;
  });
  useEffect(() => {
    if (!value) { setSrc(null); return; }
    if (!value.startsWith("storage:")) { setSrc(value); return; }
    const cached = signedCache.get(value);
    if (cached) { setSrc(cached); return; }
    let active = true;
    void supabase.storage.from("avatares").createSignedUrl(value.slice(8), 60 * 60 * 6).then(({ data }) => {
      if (data?.signedUrl) { signedCache.set(value, data.signedUrl); if (active) setSrc(data.signedUrl); }
    });
    return () => { active = false; };
  }, [value]);
  return src;
}

export function AvatarMarco({ avatar, marco, size = 40 }: { avatar: string | null | undefined; marco?: number | null; size?: number }) {
  const src = useAvatarSrc(avatar);
  const frame = MARCOS.find((m) => m.id === marco);
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" className="absolute inset-[14%] size-[72%] rounded-full object-cover" style={{ borderRadius: "50%", aspectRatio: "1 / 1", overflow: "hidden", objectFit: "cover", display: "block" }} />
      ) : (
        <span className="absolute inset-[14%] grid size-[72%] place-items-center rounded-full bg-night-soft text-xs text-primary-foreground">🌙</span>
      )}
      {frame && <img src={frame.src} alt="" className="marco-img absolute inset-0 size-full" />}
    </span>
  );
}

export function MarcoGrid({ limpio, unlocked, activo, onPick }: { limpio?: boolean; unlocked: (id: number) => boolean; activo: number | null; onPick: (id: number) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {MARCOS.map((m) => (
        <button key={m.id} type="button" onClick={() => onPick(m.id)} aria-label={`Marco ${m.id}`} className={`flex flex-col items-center gap-1 rounded-xl p-1 ${activo === m.id ? "ring-2 ring-water" : ""}`}>
          <span className={`relative block size-20 bg-night ${m.id <= 10 ? "aspect-square overflow-hidden rounded-full" : "rounded-full"}`}>
            <img src={m.src} alt="" className={m.id <= 10 ? "aspect-square size-full rounded-full object-cover" : "size-full rounded-xl object-contain"} style={m.id <= 10 ? { borderRadius: "50%", aspectRatio: "1 / 1", objectFit: "cover", width: "100%", height: "100%", display: "block" } : undefined} />
            {!limpio && m.vip && !unlocked(m.id) && <span className="absolute right-0 top-0 text-sm">🔒</span>}
          </span>
          {!limpio && (m.vip ? (
            <span className="pastilla-vip flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold"><span className="moneda-3d grid size-3.5 place-items-center rounded-full text-[8px] text-ink">$</span>50 × 1 DÍA</span>
          ) : (
            <span className="pastilla-gratis flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold italic">✓ GRATIS</span>
          ))}
        </button>
      ))}
    </div>
  );
}
