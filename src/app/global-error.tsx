"use client";
import { useEffect } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 antialiased px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-900/50 flex items-center justify-center mx-auto mb-6">
            <AlertOctagon size={28} className="text-red-500" />
          </div>
          <p className="text-xs text-red-500 uppercase tracking-widest font-semibold mb-2">Error crítico</p>
          <h1 className="text-3xl font-black text-white mb-3">Atlas no disponible</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Ocurrió un error crítico en la plataforma. Por favor intenta recargar
            la página.
          </p>
          {error.digest && (
            <p className="text-xs text-slate-600 font-mono mb-6">ID: {error.digest}</p>
          )}
          <button onClick={reset} className="btn-primary">
            <RefreshCw size={14} />
            Recargar plataforma
          </button>
        </div>
      </body>
    </html>
  );
}
