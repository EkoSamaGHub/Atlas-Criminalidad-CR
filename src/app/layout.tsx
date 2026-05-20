import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: {
    default: "Atlas Criminal Costa Rica — Datos OIJ 2018-2025",
    template: "%s | Atlas Criminal CR",
  },
  description:
    "Plataforma independiente de análisis geoespacial de la criminalidad en Costa Rica. Datos del Observatorio de la Violencia del Ministerio de Justicia y Paz — 2,566 registros, 7 provincias, 82 cantones, 2018-2025.",
  keywords: [
    "crimen Costa Rica", "OIJ", "delitos Costa Rica", "homicidios Costa Rica",
    "mapa criminal", "estadísticas criminales", "Observatorio Violencia",
  ],
  openGraph: {
    title: "Atlas Criminal Costa Rica",
    description: "Análisis geoespacial de la criminalidad basado en datos oficiales del OIJ y el Ministerio de Justicia.",
    type: "website",
    locale: "es_CR",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 antialiased">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
