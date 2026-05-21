import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-24">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-6">
          <Compass size={28} className="text-slate-500" />
        </div>
        <p className="text-xs text-red-500 uppercase tracking-widest font-semibold mb-2">Error 404</p>
        <h1 className="text-3xl font-black text-white mb-3">Página no encontrada</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          La ruta que buscas no existe en este atlas. Puede que haya sido movida
          o que la URL esté incorrecta.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="btn-primary">
            <Home size={14} />
            Ir al inicio
          </Link>
          <Link href="/atlas" className="btn-outline">
            <ArrowLeft size={14} />
            Ver el atlas
          </Link>
        </div>
      </div>
    </div>
  );
}
