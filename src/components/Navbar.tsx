"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, ShieldAlert } from "lucide-react";

const links = [
  { href: "/",           label: "Inicio" },
  { href: "/atlas",      label: "Atlas" },
  { href: "/dashboard",  label: "Estadísticas" },
  { href: "/cantones",   label: "Cantones" },
  { href: "/analisis",   label: "Análisis IA" },
  { href: "/datos",      label: "Datos" },
  { href: "/fuentes",    label: "Fuentes" },
  { href: "/metodologia", label: "Metodología" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-7 h-7 rounded-md bg-red-600 flex items-center justify-center shrink-0">
              <ShieldAlert size={14} className="text-white" />
            </span>
            <span className="font-semibold text-white tracking-tight text-sm">
              Atlas Criminalidad <span className="text-red-500">CR</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
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

          {/* Status dot — desktop */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>datos actualizados</span>
          </div>

          {/* Hamburger — mobile */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-sm flex flex-col pt-14">
          <nav className="flex flex-col px-4 py-4 gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive(pathname, l.href)
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto px-8 py-6 flex items-center gap-2 text-xs text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            datos actualizados · Atlas Criminalidad CR
          </div>
        </div>
      )}
    </>
  );
}
