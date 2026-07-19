export function ModuleLoadingState() {
  return (
    <div className="flex min-h-[calc(100dvh-5rem)] w-full items-center justify-center bg-white px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Cargando modulo...</p>
      </div>
    </div>
  );
}

export function LoadingTable(_props: { rows?: number; cols?: number } = {}) {
  return <ModuleLoadingState />;
}

export function LoadingCards(_props: { count?: number } = {}) {
  return <ModuleLoadingState />;
}

export function LoadingMetrics(_props: { count?: number } = {}) {
  return <ModuleLoadingState />;
}
