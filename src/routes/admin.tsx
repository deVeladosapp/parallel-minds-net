import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { listarPagos, resolverPago } from "@/lib/pagos.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Pagos por revisar — Estamos en la misma" },
      { name: "description", content: "Panel privado para aprobar pagos." },
      { property: "og:title", content: "Pagos por revisar" },
      { property: "og:description", content: "Panel privado para aprobar pagos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: AdminPagos,
});

function AdminPagos() {
  const listar = useServerFn(listarPagos);
  const resolver = useServerFn(resolverPago);
  const qc = useQueryClient();
  const { data, error, isLoading } = useQuery({ queryKey: ["pagos"], queryFn: () => listar(), retry: false });

  const decide = async (id: string, aprobar: boolean) => {
    const res = await resolver({ data: { id, aprobar } });
    if (!res.ok) toast.error(res.error ?? "No se pudo");
    else toast(aprobar ? "Pago aprobado" : "Pago rechazado");
    void qc.invalidateQueries({ queryKey: ["pagos"] });
  };

  return (
    <main className="min-h-dvh bg-night p-5 text-primary-foreground">
      <Link to="/" className="text-sm">← Volver</Link>
      <h1 className="mt-3 text-2xl font-bold">Pagos por revisar</h1>
      {isLoading && <p className="mt-4">Cargando…</p>}
      {error && <p className="mt-4">Esta página es solo para administradores.</p>}
      <div className="mt-4 grid gap-3">
        {data?.map((t: any) => (
          <div key={t.id} className="rounded-xl bg-night-soft p-4">
            <div className="flex justify-between text-sm"><b>{t.tipo === "sala" ? `Sala ${t.sala_tema}: ${t.nombre_sala ?? ""}` : `${t.monedas_acreditadas} moneditas`}</b><span>{t.estado}</span></div>
            <p className="mt-1 text-sm">{t.metodo_pago} · Monto {t.monto_bs} · Ref {t.referencia}</p>
            {t.lectura_ia && <p className="mt-1 text-xs text-primary-foreground/70">Lectura IA: monto {t.lectura_ia.monto ?? "?"} · ref {t.lectura_ia.referencia ?? "?"}{t.lectura_ia.error ? ` (${t.lectura_ia.error})` : ""}</p>}
            {t.captura_url && <a href={t.captura_url} target="_blank" rel="noreferrer" className="mt-1 block text-xs underline">Ver captura</a>}
            {t.estado === "pendiente" && (
              <div className="mt-3 flex gap-2">
                <Button className="bg-mint text-ink hover:bg-mint/90" onClick={() => void decide(t.id, true)}>Aprobar</Button>
                <Button variant="outline" className="text-ink" onClick={() => void decide(t.id, false)}>Rechazar</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
