import { getSession } from "@/lib/session";
import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

const CRIMES_PATH = path.join(process.cwd(), "public", "data", "crimes.json");

function checkAuth(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false;
  const adminId = process.env.ADMIN_DISCORD_ID;
  return !adminId || session.discordId === adminId;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!checkAuth(session)) return new Response("Unauthorized", { status: 401 });

  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit    = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const search   = (searchParams.get("search") ?? "").toLowerCase();
  const province = searchParams.get("province") ?? "";
  const crimeType = searchParams.get("crimeType") ?? "";
  const year     = searchParams.get("year") ?? "";

  const db = JSON.parse(fs.readFileSync(CRIMES_PATH, "utf-8"));
  let records = db.records as Record<string, unknown>[];

  if (province)  records = records.filter((r) => r.province === province);
  if (crimeType) records = records.filter((r) => r.crimeType === crimeType);
  if (year)      records = records.filter((r) => String(r.year) === year);
  if (search) {
    records = records.filter((r) =>
      JSON.stringify(r).toLowerCase().includes(search)
    );
  }

  const total = records.length;
  const offset = (page - 1) * limit;
  const page_records = records.slice(offset, offset + limit).map((r, i) => ({
    ...r,
    _idx: offset + i,
  }));

  const allRecords = db.records as Record<string, unknown>[];
  const provinces  = [...new Set(allRecords.map((r) => r.province as string))].sort();
  const crimeTypes = [...new Set(allRecords.map((r) => r.crimeType as string))].sort();
  const years      = [...new Set(allRecords.map((r) => r.year as number))].sort((a, b) => b - a);

  return Response.json({ records: page_records, total, page, limit, provinces, crimeTypes, years });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!checkAuth(session)) return new Response("Unauthorized", { status: 401 });

  const { idx, record } = await request.json() as { idx: number; record: Record<string, unknown> };
  if (typeof idx !== "number") return new Response("Missing idx", { status: 400 });

  const db = JSON.parse(fs.readFileSync(CRIMES_PATH, "utf-8"));
  if (idx < 0 || idx >= db.records.length) {
    return new Response("Index out of range", { status: 400 });
  }

  // Strip internal _idx field before saving
  const { _idx: _discard, ...clean } = record as { _idx?: number } & Record<string, unknown>;
  db.records[idx] = { ...db.records[idx], ...clean };
  db.generatedAt = new Date().toISOString();

  fs.writeFileSync(CRIMES_PATH, JSON.stringify(db, null, 2), "utf-8");
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!checkAuth(session)) return new Response("Unauthorized", { status: 401 });

  const { idx } = await request.json() as { idx: number };
  if (typeof idx !== "number") return new Response("Missing idx", { status: 400 });

  const db = JSON.parse(fs.readFileSync(CRIMES_PATH, "utf-8"));
  if (idx < 0 || idx >= db.records.length) {
    return new Response("Index out of range", { status: 400 });
  }

  db.records.splice(idx, 1);
  db.totalRecords = db.records.length;
  db.generatedAt = new Date().toISOString();

  fs.writeFileSync(CRIMES_PATH, JSON.stringify(db, null, 2), "utf-8");
  return Response.json({ ok: true });
}
