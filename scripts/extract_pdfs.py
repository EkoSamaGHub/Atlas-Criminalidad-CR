#!/usr/bin/env python3
"""
PDF table extractor for OIJ Atlas Costa Rica.
Downloads statistical annex PDFs from the Observatorio de la Violencia
and extracts province/canton crime data tables using pdfplumber.

Usage: python scripts/extract_pdfs.py
"""

import json
import os
import re
import sys
import unicodedata
from pathlib import Path

import pdfplumber
import requests

# ── Config ────────────────────────────────────────────────────────────────────

BASE_URL = "https://observatorio.mj.go.cr"
DATA_DIR = Path("public/data")
RAW_DIR = DATA_DIR / "raw"
PDF_DIR = DATA_DIR / "pdfs"
RAW_DIR.mkdir(parents=True, exist_ok=True)
PDF_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {"User-Agent": "OIJ-Atlas-PDF-Extractor/1.0"}

# Statistical annex PDFs — these contain the structured tables we need.
# Ordered newest -> oldest so we prioritise recent data.
TARGET_PDFS = [
    # ── 2026 ──
    {
        "url": "/sites/default/files/docs/An%C3%A1lisis%20de%20delitos%20varios%2C%20I%20cuatrimestre%20de%202026.pdf",
        "title": "Análisis de Delitos I Cuatrimestre 2026",
        "year": 2026,
        "period": "I Cuatrimestre",
    },
    # ── 2025 ──
    {
        "url": "/sites/default/files/docs/ATLAS%20I-2025_y_anexo.pdf",
        "title": "Atlas + Anexo Estadístico I Semestre 2025",
        "year": 2025,
        "period": "I Semestre",
    },
    {
        "url": "/sites/default/files/docs/ATLAS%202025_total_1.pdf",
        "title": "Atlas Incidencia de Delitos 2025",
        "year": 2025,
        "period": "Anual",
    },
    {
        "url": "/sites/default/files/docs/An%C3%A1lisis%20de%20delitos%20OIJ%20I%20trimestre%202025.pdf",
        "title": "Análisis de Delitos I Semestre 2025",
        "year": 2025,
        "period": "I Semestre",
    },
    {
        "url": "/sites/default/files/docs/An%C3%A1lisis%20de%20Homicidios%20Dolosos%2C%202025%20%282%29.pdf",
        "title": "Análisis Homicidios Dolosos 2025",
        "year": 2025,
        "period": "Anual",
    },
    {
        "url": "/sites/default/files/docs/An%C3%A1lisis%20de%20delitos%20contra%20la%20propiedad%2C%202025.pdf",
        "title": "Análisis Delitos contra la Propiedad 2025",
        "year": 2025,
        "period": "Anual",
    },
    # ── 2024 ──
    {
        "url": "/sites/default/files/docs/ATLAS%202024_Y_ANEXO_0.pdf",
        "title": "Atlas + Anexo Estadístico 2024",
        "year": 2024,
        "period": "Anual",
    },
    {
        "url": "/sites/default/files/docs/ATLAS%20Y%20ANEXO%20MSP%202024.pdf",
        "title": "Atlas + Anexo MSP 2024",
        "year": 2024,
        "period": "Anual",
    },
    {
        "url": "/sites/default/files/docs/ATLAS%20I%20Sem%202024.pdf",
        "title": "Atlas I Semestre 2024",
        "year": 2024,
        "period": "I Semestre",
    },
    {
        "url": "/sites/default/files/docs/ANEXO_ESTADISTICO_I_SEMESTRE_2024.pdf",
        "title": "Anexo Estadístico I Semestre 2024",
        "year": 2024,
        "period": "I Semestre",
    },
    # ── 2023 ──
    {
        "url": "/sites/default/files/docs/Anexo%20OIJ%202023.pdf",
        "title": "Anexo Estadístico Atlas OIJ 2023",
        "year": 2023,
        "period": "Anual",
    },
    {
        "url": "/sites/default/files/docs/ATLAS%202023.pdf",
        "title": "Atlas Incidencia de Delitos 2023",
        "year": 2023,
        "period": "Anual",
    },
    {
        "url": "/sites/default/files/docs/ANEXO%20ESTAD%C3%8DSTICO%20ATLAS%20DE%20APREHENSIONES%20MSP%202023.pdf",
        "title": "Anexo Estadístico Atlas Aprehensiones MSP 2023",
        "year": 2023,
        "period": "Anual",
    },
]

# ── Costa Rica reference data ─────────────────────────────────────────────────

PROVINCES = {
    "san jose": "San José",
    "san josé": "San José",
    "alajuela": "Alajuela",
    "cartago": "Cartago",
    "heredia": "Heredia",
    "guanacaste": "Guanacaste",
    "puntarenas": "Puntarenas",
    "limon": "Limón",
    "limón": "Limón",
}

CRIME_KEYWORDS = {
    "homicidio": "homicidio",
    "homicidios": "homicidio",
    "robo": "robo",
    "robos": "robo",
    "hurto": "hurto",
    "hurtos": "hurto",
    "agresion": "agresion",
    "agresión": "agresion",
    "agresiones": "agresion",
    "violacion": "violacion",
    "violación": "violacion",
    "violaciones": "violacion",
    "narcotrafico": "narcotrafico",
    "narcotráfico": "narcotrafico",
    "droga": "narcotrafico",
    "psicotr": "narcotrafico",       # psicotrópicos
    "extorsion": "extorsion",
    "extorsión": "extorsion",
    "lesiones": "agresion",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def normalise(s: str) -> str:
    """Lowercase, strip accents, trim."""
    return (
        unicodedata.normalize("NFD", s.lower())
        .encode("ascii", "ignore")
        .decode()
        .strip()
    )


def detect_province(cell: str) -> str | None:
    n = normalise(cell)
    return PROVINCES.get(n)


def detect_crime_type(header: str) -> str | None:
    n = normalise(header)
    for kw, canonical in CRIME_KEYWORDS.items():
        if kw in n:
            return canonical
    return None


def to_int(val) -> int | None:
    if val is None:
        return None
    s = str(val).strip().replace(",", "").replace(" ", "").replace(".", "")
    try:
        v = int(s)
        return v if v >= 0 else None
    except ValueError:
        return None


def is_number_cell(val) -> bool:
    return to_int(val) is not None


# ── Download ──────────────────────────────────────────────────────────────────

def download_pdf(url: str, dest: Path) -> bool:
    if dest.exists():
        print(f"    (cached) {dest.name}")
        return True
    try:
        r = requests.get(url, headers=HEADERS, timeout=60, stream=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(65536):
                f.write(chunk)
        print(f"    OK downloaded {dest.name} ({dest.stat().st_size // 1024} KB)")
        return True
    except Exception as e:
        print(f"    ERR {e}")
        return False


# ── Table extraction ──────────────────────────────────────────────────────────

def score_table(table: list[list]) -> int:
    """Heuristic: how many cells look like province names or crime counts?"""
    score = 0
    for row in table:
        for cell in row:
            if not cell:
                continue
            s = str(cell).strip()
            if detect_province(s):
                score += 10
            elif detect_crime_type(s):
                score += 5
            elif is_number_cell(s) and len(s) <= 8:
                score += 1
    return score


def find_header_row(table: list[list]) -> tuple[int, dict[int, str]]:
    """Return (row_index, {col_index: crime_type}) for the best header row."""
    best_idx, best_map, best_score = -1, {}, 0
    for i, row in enumerate(table[:15]):
        col_map: dict[int, str] = {}
        for j, cell in enumerate(row):
            if cell:
                ct = detect_crime_type(str(cell))
                if ct:
                    col_map[j] = ct
        if len(col_map) > best_score:
            best_score = len(col_map)
            best_idx = i
            best_map = col_map
    return best_idx, best_map


def extract_records_from_table(
    table: list[list], source: str, year: int, period: str
) -> list[dict]:
    records = []
    header_idx, crime_cols = find_header_row(table)
    if header_idx == -1 or not crime_cols:
        return records

    # Find which column holds location names (first text column after header)
    name_col = 0
    sample_row = next((r for r in table[header_idx + 1 :] if any(r)), None)
    if sample_row:
        for j, cell in enumerate(sample_row):
            if cell and isinstance(cell, str) and len(cell.strip()) > 2 and not is_number_cell(cell):
                name_col = j
                break

    current_province = "Desconocida"
    for row in table[header_idx + 1 :]:
        if not row or all(c is None or str(c).strip() == "" for c in row):
            continue
        raw_name = str(row[name_col]).strip() if row[name_col] else ""
        if not raw_name:
            continue

        prov = detect_province(raw_name)
        if prov:
            current_province = prov
            raw_name = prov   # always use the canonical accented name
            is_province_row = True
        else:
            is_province_row = False

        for col_idx, crime_type in crime_cols.items():
            if col_idx >= len(row):
                continue
            val = to_int(row[col_idx])
            if val is None or val <= 0:
                continue
            records.append(
                {
                    "year": year,
                    "period": period,
                    "province": raw_name if is_province_row else current_province,
                    "canton": None if is_province_row else raw_name,
                    "district": None,   # PDF extractions are province/canton level only
                    "crimeType": crime_type,
                    "count": val,
                    "unit": "count",   # PDF Atlas files contain actual crime counts
                    "source": source,
                }
            )
    return records


def extract_from_pdf(pdf_path: Path, meta: dict) -> list[dict]:
    records = []
    year = meta["year"]
    period = meta["period"]
    source = pdf_path.name.replace(".pdf", "")

    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"    {len(pdf.pages)} page(s)")
            for page_num, page in enumerate(pdf.pages, 1):
                tables = page.extract_tables(
                    table_settings={
                        "vertical_strategy": "lines_strict",
                        "horizontal_strategy": "lines_strict",
                        "snap_tolerance": 4,
                        "join_tolerance": 4,
                        "edge_min_length": 10,
                        "min_words_vertical": 1,
                        "min_words_horizontal": 1,
                    }
                )
                if not tables:
                    # fallback: looser settings
                    tables = page.extract_tables()

                for tbl in tables:
                    if not tbl or len(tbl) < 3:
                        continue
                    sc = score_table(tbl)
                    if sc < 5:
                        continue
                    recs = extract_records_from_table(tbl, source, year, period)
                    records.extend(recs)

    except Exception as e:
        print(f"    ERR pdfplumber error: {e}")

    return records


# ── Main ──────────────────────────────────────────────────────────────────────

def update_manifest(new_entries: list[dict]):
    manifest_path = DATA_DIR / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = {"updatedAt": "", "count": 0, "files": []}

    existing_filenames = {e["filename"] for e in manifest["files"]}
    added = 0
    for entry in new_entries:
        if entry["filename"] not in existing_filenames:
            manifest["files"].append(entry)
            added += 1

    manifest["count"] = len(manifest["files"])
    import datetime
    manifest["updatedAt"] = datetime.datetime.utcnow().isoformat() + "Z"

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    if added:
        print(f"\n  Manifest updated: +{added} entries")


def main():
    print(f"\nPDF Extractor -- OIJ Atlas Costa Rica")
    print(f"   Target: {len(TARGET_PDFS)} publications\n")

    all_records: list[dict] = []
    manifest_entries: list[dict] = []
    total_tables = 0

    for meta in TARGET_PDFS:
        title = meta["title"]
        full_url = BASE_URL + meta["url"]
        filename = os.path.basename(meta["url"].split("?")[0])
        # decode percent-encoding for local filename
        from urllib.parse import unquote
        filename = unquote(filename)
        pdf_path = PDF_DIR / filename
        json_filename = filename.replace(".pdf", "_pdf.json")
        json_path = RAW_DIR / json_filename

        print(f"  [{meta['year']}] {title}")

        if not download_pdf(full_url, pdf_path):
            continue

        records = extract_from_pdf(pdf_path, meta)
        print(f"    -> {len(records)} record(s) extracted")

        if records:
            total_tables += 1
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(records, f, ensure_ascii=False, indent=2)

            all_records.extend(records)
            manifest_entries.append(
                {
                    "title": title,
                    "originalUrl": full_url,
                    "filename": json_filename,
                    "year": meta["year"],
                    "sheets": ["pdf_extracted"],
                    "downloadedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
                }
            )
        print()

    # Merge into crimes.json
    crimes_path = DATA_DIR / "crimes.json"
    if crimes_path.exists():
        with open(crimes_path, encoding="utf-8") as f:
            existing = json.load(f)
        existing_records = existing.get("records", [])
    else:
        existing_records = []

    # De-duplicate: drop existing PDF-sourced records, replace with fresh
    pdf_sources = {e["filename"].replace("_pdf.json", "") for e in manifest_entries}
    kept = [r for r in existing_records if r.get("source") not in pdf_sources]
    merged = kept + all_records

    # Rebuild province/year summaries
    by_province: dict[str, dict[str, int]] = {}
    by_year: dict[str, dict[str, int]] = {}
    for r in merged:
        p = r["province"]
        y = str(r["year"])
        ct = r["crimeType"]
        by_province.setdefault(p, {})
        by_province[p][ct] = by_province[p].get(ct, 0) + r["count"]
        by_year.setdefault(y, {})
        by_year[y][ct] = by_year[y].get(ct, 0) + r["count"]

    import datetime
    output = {
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "sourceFiles": existing.get("sourceFiles", 0) + total_tables if crimes_path.exists() else total_tables,
        "totalRecords": len(merged),
        "provinces": by_province,
        "yearTrend": by_year,
        "records": merged,
    }

    with open(crimes_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    update_manifest(manifest_entries)

    print(f"Done")
    print(f"   PDF records extracted : {len(all_records)}")
    print(f"   Total records in crimes.json: {len(merged)}")
    print(f"\n   Run 'npm run process' to re-normalise if needed.\n")


if __name__ == "__main__":
    main()
