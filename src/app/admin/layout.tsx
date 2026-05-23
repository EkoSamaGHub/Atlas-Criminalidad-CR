import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = { title: { default: "Admin", template: "%s | Admin" } };

const NAV = [
  { href: "/admin",           label: "Overview",  icon: "◈" },
  { href: "/admin/health",    label: "Data Health", icon: "◉" },
  { href: "/admin/pipeline",  label: "Pipeline",  icon: "⚙" },
  { href: "/admin/records",   label: "Records",   icon: "◫" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 bg-zinc-900 border-r border-zinc-700 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-700">
          <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">Admin</p>
          <p className="text-xs text-zinc-400 mt-0.5 truncate">@{session.username}</p>
        </div>

        <nav className="flex-1 py-2">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <span className="text-amber-400 font-mono">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-zinc-700">
          <Link
            href="/api/auth/logout"
            className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Sign out
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-zinc-950 p-6">{children}</main>
    </div>
  );
}
