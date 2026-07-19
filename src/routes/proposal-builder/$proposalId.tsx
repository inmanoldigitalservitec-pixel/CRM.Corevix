import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/proposal-builder/$proposalId")({
  component: ProposalBuilderRoute,
  head: () => ({ meta: [{ title: "Constructor de propuestas desactivado - Corevix CRM" }] }),
});

function ProposalBuilderRoute() {
  return (
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="mx-auto max-w-2xl border-y border-slate-200 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Propuestas</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Constructor desactivado</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          El editor visual de propuestas está neutralizado mientras se define el nuevo flujo. El CRM
          queda preparado para continuar trabajando con propuestas cargadas como PDF.
        </p>
        <a
          href="/proposals"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Volver a propuestas
        </a>
      </div>
    </div>
  );
}
