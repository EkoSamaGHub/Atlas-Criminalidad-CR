"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
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
    <div className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-900/50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <p className="text-xs text-red-500 uppercase tracking-widest font-semibold mb-2">Error 500</p>
        <h1 className="text-3xl font-black text-white mb-3">Algo salió mal</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Ocurrió un error inesperado al cargar esta página. Los datos del atlas
          están intactos — intenta recargar.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-600 font-mono mb-6">ID: {error.digest}</p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={reset} className="btn-primary">
            <RefreshCw size={14} />
            Intentar de nuevo
          </button>
          <Link href="/" className="btn-outline">
            <Home size={14} />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
