"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",           label: "Inicio" },
  { href: "/atlas",      label: "Atlas" },
  { href: "/dashboard",  label: "Estadísticas" },
  { href: "/cantones",   label: "Cantones" },
  { href: "/analisis",   label: "Análisis IA" },
  { href: "/datos",      label: "Datos" },
  { href: "/fuentes",    label: "Fuentes" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-6 h-6 rounded bg-red-600 flex items-center justify-center text-white text-[10px] font-bold tracking-tight">OIJ</span>
          <span className="font-semibold text-white tracking-tight text-sm hidden sm:block">Atlas Criminal CR</span>
        </Link>
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                isActive(pathname, l.href)
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:block">datos actualizados</span>
        </div>
      </div>
    </header>
  );
}
