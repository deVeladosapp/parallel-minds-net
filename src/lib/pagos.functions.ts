import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { COSTO_MARCO_VIP, monedasPorBs } from "./desvelados";

type Lectura = { monto: number | null; referencia: string | null; error?: string };

async function leerCapturaConIA(imageDataUrl: string): Promise<Lectura> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { monto: null, referencia: null, error: "sin_clave" };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: 'Es una captura de un pago (Pago Móvil o Binance). Responde SOLO un JSON: {"monto": número o null, "referencia": "texto" o null}. El monto es el importe transferido; la referencia es el número de operación.' },
          { type: "input_image", image_url: imageDataUrl },
        ],
      }],
    }),
  });
  if (!res.ok || !res.body) return { monto: null, referencia: null, error: `ia_${res.status}` };
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      try {
        const evt = JSON.parse(line.slice(5).trim());
        if (evt.type === "response.output_text.delta") text += evt.delta ?? "";
      } catch { /* ignore */ }
    }
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { monto: null, referencia: null, error: "sin_lectura" };
  try {
    const parsed = JSON.parse(match[0]);
    return { monto: typeof parsed.monto === "number" ? parsed.monto : null, referencia: parsed.referencia ? String(parsed.referencia) : null };
  } catch {
    return { monto: null, referencia: null, error: "sin_lectura" };
  }
}

const reporteSchema = z.object({
  tipo: z.enum(["monedas", "sala"]),
  metodo: z.enum(["pago_movil", "binance"]),
  monto: z.number().positive().max(9999999999),
  referencia: z.string().trim().min(3).max(64),
  capturaPath: z.string().max(300).nullable(),
  salaTema: z.enum(["vip-1", "vip-2", "vip-3", "vip-4", "vip-5", "vip-6"]).nullable(),
  nombreSala: z.string().trim().max(60).nullable(),
  descripcionSala: z.string().trim().max(140).nullable(),
});

/** El usuario reporta un pago. Queda PENDIENTE hasta que el administrador lo apruebe. */
export const reportarPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reporteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: dup } = await admin.from("transacciones").select("id").eq("metodo_pago", data.metodo).eq("referencia", data.referencia).maybeSingle();
    if (dup) return { ok: false as const, error: "Esa referencia ya fue registrada." };

    let lectura: Lectura | null = null;
    if (data.capturaPath) {
      if (!data.capturaPath.startsWith(`${context.userId}/`)) return { ok: false as const, error: "Comprobante inválido." };
      const { data: file } = await supabaseAdmin.storage.from("comprobantes").download(data.capturaPath);
      if (file) {
        const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
        lectura = await leerCapturaConIA(`data:${file.type || "image/jpeg"};base64,${b64}`).catch(() => ({ monto: null, referencia: null, error: "ia_fallo" }));
      }
    }

    const { error } = await admin.from("transacciones").insert({
      user_id: context.userId,
      tipo: data.tipo,
      metodo_pago: data.metodo,
      monto_bs: data.monto,
      referencia: data.referencia,
      monedas_acreditadas: data.tipo === "monedas" ? monedasPorBs(data.monto) : 0,
      captura_path: data.capturaPath,
      lectura_ia: lectura,
      sala_tema: data.salaTema,
      nombre_sala: data.nombreSala,
      descripcion_sala: data.descripcionSala,
    });
    if (error) return { ok: false as const, error: "No pudimos registrar el pago." };
    return { ok: true as const, lectura };
  });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const listarPagos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any).from("transacciones").select("*").order("fecha", { ascending: false }).limit(100);
    const rows = (data ?? []) as any[];
    const paths = rows.map((r) => r.captura_path).filter(Boolean);
    const signed = paths.length ? (await supabaseAdmin.storage.from("comprobantes").createSignedUrls(paths, 3600)).data ?? [] : [];
    const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));
    return rows.map((r) => ({ ...r, captura_url: r.captura_path ? urlByPath.get(r.captura_path) ?? null : null }));
  });

export const resolverPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), aprobar: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: tx } = await admin.from("transacciones").update({ estado: data.aprobar ? "aprobada" : "rechazada" }).eq("id", data.id).eq("estado", "pendiente").select().maybeSingle();
    if (!tx) return { ok: false, error: "Ya estaba resuelto." };
    if (!data.aprobar) return { ok: true };
    if (tx.tipo === "monedas") {
      const { data: wallet } = await admin.from("monedas").select("saldo").eq("user_id", tx.user_id).maybeSingle();
      await admin.from("monedas").upsert({ user_id: tx.user_id, saldo: (wallet?.saldo ?? 0) + tx.monedas_acreditadas, updated_at: new Date().toISOString() });
    } else if (tx.sala_tema) {
      await admin.from("rooms").update({
        title: `👑 ${tx.nombre_sala || "Sala de fundador"}`,
        subtitle: tx.descripcion_sala || "Sala VIP",
        es_vacante: false,
        fundador_id: tx.user_id,
        vence: new Date(Date.now() + 30 * 86400_000).toISOString(),
      }).eq("tema", tx.sala_tema).eq("es_vacante", true);
    }
    return { ok: true };
  });

/** Alquila un marco VIP por 1 día usando moneditas. */
export const comprarMarco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ marcoId: z.number().int().min(16).max(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: wallet } = await admin.from("monedas").select("saldo").eq("user_id", context.userId).maybeSingle();
    const saldo = wallet?.saldo ?? 0;
    if (saldo < COSTO_MARCO_VIP) return { ok: false as const, error: "No tienes suficientes moneditas." };
    const { data: updated } = await admin.from("monedas").update({ saldo: saldo - COSTO_MARCO_VIP, updated_at: new Date().toISOString() }).eq("user_id", context.userId).eq("saldo", saldo).select().maybeSingle();
    if (!updated) return { ok: false as const, error: "Intenta otra vez." };
    await admin.from("marcos_usuario").insert({ user_id: context.userId, marco_id: data.marcoId, expira: new Date(Date.now() + 86400_000).toISOString() });
    await admin.from("profiles").update({ marco_activo: data.marcoId }).eq("id", context.userId);
    return { ok: true as const, saldo: updated.saldo };
  });
