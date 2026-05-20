#!/usr/bin/env tsx
/**
 * Scrapes XLS/XLSX files from the Observatorio de la Violencia (MJP Costa Rica),
 * converts each sheet to JSON, and writes a manifest to public/data/.
 *
 * Usage: npm run scrape
 */
import * as cheerio from "cheerio";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const BASE_URL = "https://observatorio.mj.go.cr";
const TOTAL_PAGES = 12;
const DATA_DIR = path.join(process.cwd(), "public", "data");
const RAW_DIR = path.join(DATA_DIR, "raw");

fs.mkdirSync(RAW_DIR, { recursive: true });

interface ManifestEntry {
  title: string;
  originalUrl: string;
  filename: string;
  year: number | null;
  sheets: string[];
  downloadedAt: string;
}

async function fetchPage(page: number): Promise<string> {
  const url = `${BASE_URL}/recursos/publicaciones?url=recursos/publicaciones&page=${page}`;
  const res = await fetch(url, { headers: { "User-Agent": "OIJ-Atlas-Scraper/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`);
  return res.text();
}

function extractExcelLinks(html: string): Array<{ title: string; url: string }> {
  const $ = cheerio.load(html);
  const found: Array<{ title: string; url: string }> = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href.match(/\.(xls|xlsx)(\?.*)?$/i)) return;

    const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    const title =
      $(el)
        .closest(".views-row, article, .node, li")
        .find("h2, h3, .field--name-title, .views-field-title")
        .first()
        .text()
        .trim() ||
      $(el).text().trim() ||
      decodeURIComponent(path.basename(href));

    found.push({ title: title.replace(/\s+/g, " "), url: fullUrl });
  });

  return found;
}

function guessYear(text: string): number | null {
  const m = text.match(/20\d{2}/);
  return m ? parseInt(m[0]) : null;
}

async function downloadAndConvert(
  url: string,
  title: string
): Promise<ManifestEntry | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "OIJ-Atlas-Scraper/1.0" } });
    if (!res.ok) {
      console.warn(`  ⚠ ${res.status} — ${url}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

    const originalFilename = decodeURIComponent(
      path.basename(new URL(url).pathname)
    );
    const jsonFilename = originalFilename.replace(/\.(xls|xlsx)$/i, ".json");

    const sheetMap: Record<string, unknown[][]> = {};
    for (const name of wb.SheetNames) {
      sheetMap[name] = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
        header: 1,
        defval: null,
        blankrows: false,
      });
    }

    fs.writeFileSync(path.join(RAW_DIR, jsonFilename), JSON.stringify(sheetMap, null, 2));

    console.log(`  ✓ ${originalFilename} (${wb.SheetNames.length} sheet(s): ${wb.SheetNames.join(", ")})`);

    return {
      title,
      originalUrl: url,
      filename: jsonFilename,
      year: guessYear(`${url} ${title}`),
      sheets: wb.SheetNames,
      downloadedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`  ✗ ${url} — ${(err as Error).message}`);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`\n🔍 Scanning ${TOTAL_PAGES} pages from Observatorio de la Violencia…\n`);

  const seen = new Set<string>();
  const queue: Array<{ title: string; url: string }> = [];

  for (let page = 0; page < TOTAL_PAGES; page++) {
    process.stdout.write(`  Page ${String(page).padStart(2, "0")}/${TOTAL_PAGES - 1} … `);
    try {
      const html = await fetchPage(page);
      const links = extractExcelLinks(html);
      let newCount = 0;
      for (const l of links) {
        if (!seen.has(l.url)) {
          seen.add(l.url);
          queue.push(l);
          newCount++;
        }
      }
      console.log(`${newCount} Excel file(s) found`);
    } catch (err) {
      console.log(`FAILED — ${(err as Error).message}`);
    }
    await sleep(600);
  }

  console.log(`\n📥 Downloading ${queue.length} file(s)…\n`);

  const manifest: ManifestEntry[] = [];
  for (const item of queue) {
    console.log(`  ↓ ${item.title}`);
    const entry = await downloadAndConvert(item.url, item.title);
    if (entry) manifest.push(entry);
    await sleep(400);
  }

  manifest.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  fs.writeFileSync(
    path.join(DATA_DIR, "manifest.json"),
    JSON.stringify({ updatedAt: new Date().toISOString(), count: manifest.length, files: manifest }, null, 2)
  );

  console.log(`\n✅ Done — ${manifest.length} file(s) saved to public/data/`);
  console.log(`   Run "npm run process" to normalize the data for the frontend.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
