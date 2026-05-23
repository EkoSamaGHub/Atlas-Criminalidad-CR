"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Rec {
  _idx: number;
  year: number;
  period: string;
  province: string;
  canton: string | null;
  district: string | null;
  crimeType: string;
  count: number;
  unit?: string;
  source: string;
}

interface ApiResponse {
  records: Rec[];
  total: number;
  page: number;
  limit: number;
  provinces: string[];
  crimeTypes: string[];
  years: number[];
}

function EditModal({ rec, onClose, onSave }: { rec: Rec; onClose: () => void; onSave: (r: Rec) => Promise<void> }) {
  const [draft, setDraft] = useState<Rec>({ ...rec });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = (key: keyof Rec, type = "text") => (
    <label className="block" key={key}>
      <span className="text-xs text-zinc-400 mb-1 block">{key}</span>
      <input
        type={type}
        value={draft[key] === null ? "" : String(draft[key])}
        onChange={(e) => setDraft((d) => ({ ...d, [key]: type === "number" ? Number(e.target.value) : e.target.value || null }))}
        className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
      />
    </label>
  );

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Edit record #{rec._idx}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">&times;</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field("year", "number")}
          {field("period")}
          {field("province")}
          {field("canton")}
          {field("district")}
          {field("crimeType")}
          {field("count", "number")}
          {field("unit")}
          {field("source")}
        </div>
        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RecordsPage() {
  const [data, setData]           = useState<ApiResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [province, setProvince]   = useState("");
  const [crimeType, setCrimeType] = useState("");
  const [year, setYear]           = useState("");
  const [editing, setEditing]     = useState<Rec | null>(null);
  const [msg, setMsg]             = useState<{ text: string; ok: boolean } | null>(null);

  const debouncedSearch = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchRecords = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "50" });
    if (search)    params.set("search",    search);
    if (province)  params.set("province",  province);
    if (crimeType) params.set("crimeType", crimeType);
    if (year)      params.set("year",      year);
    try {
      const res = await fetch(`/api/admin/records?${params}`);
      setData(await res.json() as ApiResponse);
    } finally {
      setLoading(false);
    }
  }, [search, province, crimeType, year]);

  useEffect(() => {
    clearTimeout(debouncedSearch.current);
    debouncedSearch.current = setTimeout(() => { setPage(1); fetchRecords(1); }, 300);
    return () => clearTimeout(debouncedSearch.current);
  }, [fetchRecords]);

  const save = async (rec: Rec) => {
    const res = await fetch("/api/admin/records", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idx: rec._idx, record: rec }),
    });
    if (!res.ok) throw new Error(await res.text());
    setMsg({ text: "Saved", ok: true });
    setTimeout(() => setMsg(null), 2000);
    fetchRecords(page);
  };

  const del = async (rec: Rec) => {
    if (!confirm(`Delete record #${rec._idx}? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/records", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idx: rec._idx }),
    });
    if (!res.ok) { setMsg({ text: await res.text(), ok: false }); return; }
    setMsg({ text: "Deleted", ok: true });
    setTimeout(() => setMsg(null), 2000);
    fetchRecords(page);
  };

  const totalPages = data ? Math.ceil(data.total / 50) : 1;

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Records</h1>
      <p className="text-sm text-zinc-400 mb-4">
        {data ? `${data.total.toLocaleString()} records matching filters` : "Loading…"}
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 w-40"
        />
        {(["province", "crimeType", "year"] as const).map((key) => {
          const opts = key === "province" ? data?.provinces : key === "crimeType" ? data?.crimeTypes : data?.years?.map(String);
          const val  = key === "province" ? province : key === "crimeType" ? crimeType : year;
          const set  = key === "province" ? setProvince : key === "crimeType" ? setCrimeType : setYear;
          return (
            <select
              key={key}
              value={val}
              onChange={(e) => { set(e.target.value); setPage(1); }}
              className="bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">All {key}s</option>
              {opts?.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          );
        })}
        {(search || province || crimeType || year) && (
          <button onClick={() => { setSearch(""); setProvince(""); setCrimeType(""); setYear(""); setPage(1); }} className="text-xs text-zinc-400 hover:text-white px-2">
            Clear
          </button>
        )}
      </div>

      {msg && (
        <div className={`mb-3 text-xs px-3 py-2 rounded ${msg.ok ? "bg-emerald-900/50 text-emerald-300" : "bg-red-900/50 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-700">
        <table className="w-full text-xs font-mono">
          <thead className="bg-zinc-800 text-zinc-400">
            <tr>
              {["#", "Year", "Period", "Province", "Canton", "CrimeType", "Count", "Unit", "Source", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-zinc-500">Loading…</td></tr>
            ) : data?.records.map((r) => (
              <tr key={r._idx} className="border-t border-zinc-800 hover:bg-zinc-900 transition-colors">
                <td className="px-3 py-1.5 text-zinc-500">{r._idx}</td>
                <td className="px-3 py-1.5">{r.year}</td>
                <td className="px-3 py-1.5 text-zinc-400">{r.period}</td>
                <td className="px-3 py-1.5">{r.province}</td>
                <td className="px-3 py-1.5 text-zinc-400">{r.canton ?? "—"}</td>
                <td className="px-3 py-1.5 text-amber-400">{r.crimeType}</td>
                <td className="px-3 py-1.5 text-right">{r.count}</td>
                <td className="px-3 py-1.5 text-zinc-500">{r.unit ?? "count"}</td>
                <td className="px-3 py-1.5 text-zinc-500 max-w-[140px] truncate" title={r.source}>{r.source}</td>
                <td className="px-3 py-1.5">
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(r)} className="text-sky-400 hover:text-sky-200">edit</button>
                    <button onClick={() => del(r)} className="text-red-500 hover:text-red-300">del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 mt-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => { const p = page - 1; setPage(p); fetchRecords(p); }}
            className="px-3 py-1 rounded bg-zinc-800 text-white disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-zinc-400">Page {page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => { const p = page + 1; setPage(p); fetchRecords(p); }}
            className="px-3 py-1 rounded bg-zinc-800 text-white disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {editing && (
        <EditModal rec={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}
