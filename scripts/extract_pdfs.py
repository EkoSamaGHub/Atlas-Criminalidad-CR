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
    {"url": "/sites/default/files/docs/An%C3%A1lisis%20de%20delitos%20varios%2C%20I%20cuatrimestre%20de%202026.pdf", "title": "Análisis de Delitos I Cuatrimestre 2026", "year": 2026, "period": "I Cuatrimestre"},
    # ── 2025 ──
    {"url": "/sites/default/files/docs/ATLAS%20MSP%202025_1.pdf", "title": "Atlas de Incidencia de Infracciones MSP 2025", "year": 2025, "period": "Anual"},
    {"url": "/sites/default/files/docs/ATLAS%202025_total_1.pdf", "title": "Atlas de Incidencia de Delitos 2025", "year": 2025, "period": "Anual"},
    {"url": "/sites/default/files/docs/An%C3%A1lisis%20de%20Infracciones%20a%20las%20Leyes%2C%20MSP_VF.pdf", "title": "Infracciones a Diversas Leyes MSP 2025", "year": 2025, "period": "Anual"},
    {"url": "/sites/default/files/docs/An%C3%A1lisis%20de%20delitos%20contra%20la%20propiedad%2C%202025.pdf", "title": "Análisis de Delitos contra la Propiedad 2025", "year": 2025, "period": "Anual"},
    {"url": "/sites/default/files/docs/An%C3%A1lisis%20de%20Homicidios%20Dolosos%2C%202025%20%282%29.pdf", "title": "Análisis de Homicidios Dolosos 2025", "year": 2025, "period": "Anual"},
    {"url": "/sites/default/files/docs/ATLAS%20MSP%202025_0.pdf", "title": "Atlas de Infracciones a Leyes MSP 2025 (v0)", "year": 2025, "period": "Anual"},
    {"url": "/sites/default/files/docs/PPT_%20Informe%20anual_Investigaci%C3%B3n%20de%20casos%20de%20suicidios_2024_web.pdf", "title": "Presentación Informe Anual de Suicidios 2024", "year": 2025, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/Informe_casos_de_suicidios_del_a%C3%B1o_2024_0.pdf", "title": "Informe Anual de Casos de Suicidios 2024", "year": 2025, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/ICSC%202025_0.pdf", "title": "ICSC 2024 — Informe Final", "year": 2025, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/ICSC_2025_RESUMEN_METODOLOGICO.pdf", "title": "ICSC 2024 — Resumen Metodológico", "year": 2025, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/ATLAS%20I-2025_y_anexo.pdf", "title": "Atlas + Anexo Estadístico I Semestre 2025", "year": 2025, "period": "I Semestre"},
    {"url": "/sites/default/files/docs/Trafico%20y%20consumo%20de%20sustancis%20ilicitas%20COMESCO%202025_0.pdf", "title": "Tráfico y Consumo de Sustancias Ilícitas y Jóvenes 2025", "year": 2025, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/An%C3%A1lisis%20de%20delitos%20OIJ%20I%20trimestre%202025.pdf", "title": "Análisis de Delitos I Semestre 2025 OIJ", "year": 2025, "period": "I Semestre"},
    # ── 2024 ──
    {"url": "/sites/default/files/docs/Delitos%20contra%20la%20propiedad%202019-2024.pdf", "title": "Análisis Estadístico Delitos contra la Propiedad 2019-2024", "year": 2024, "period": "Anual"},
    {"url": "/sites/default/files/docs/ATLAS%20Y%20ANEXO%20MSP%202024.pdf", "title": "Atlas + Anexo MSP 2024", "year": 2024, "period": "Anual"},
    {"url": "/sites/default/files/docs/homicidios_dolosos_2024.pdf", "title": "Análisis de Homicidios Dolosos 2024", "year": 2024, "period": "Anual"},
    {"url": "/sites/default/files/docs/ATLAS%202024_Y_ANEXO_0.pdf", "title": "Atlas + Anexo Estadístico 2024", "year": 2024, "period": "Anual"},
    {"url": "/sites/default/files/docs/ISC_2024.pdf", "title": "Índice Cantonal de Seguridad Ciudadana 2024", "year": 2024, "period": "Anual"},
    {"url": "/sites/default/files/docs/Documento%20Indicadores%20COMESCO_2024_0.pdf", "title": "Indicadores Seguridad Ciudadana en Costa Rica 2018-2023", "year": 2024, "period": "Anual"},
    {"url": "/sites/default/files/docs/homicidios%20dolosos%2020204_v09%20de%20septiembre.pdf", "title": "Análisis Homicidios Dolosos Enero-Junio 2024", "year": 2024, "period": "I Semestre"},
    {"url": "/sites/default/files/docs/JUVENTUDES_Y_VIOLENCIAS_2019_2023_COMESCO.pdf", "title": "Juventudes y Violencia 2019-2023", "year": 2024, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/ANEXO_ESTADISTICO_I_SEMESTRE_2024.pdf", "title": "Anexo Estadístico I Semestre 2024", "year": 2024, "period": "I Semestre"},
    {"url": "/sites/default/files/docs/ATLAS%20I%20Sem%202024.pdf", "title": "Atlas I Semestre 2024", "year": 2024, "period": "I Semestre"},
    {"url": "/sites/default/files/docs/Mesa%20T%C3%A9cnica%20Muertes%20Accidentes%20de%20Tr%C3%A1nsito_Presentaci%C3%B3n.pdf", "title": "Presentación Ruta Integración Fallecidos Accidentes de Tránsito", "year": 2024, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/Mesa%20T%C3%A9cnica%20Muertes%20Accidentes_Final_2.pdf", "title": "Informe Mesa Técnica Muertes por Accidentes de Tránsito", "year": 2024, "period": "Anual", "reference_only": True},
    # ── 2023 ──
    {"url": "/sites/default/files/docs/ATLAS%20APREHENSIONES%20MSP%202023.pdf", "title": "Atlas de Aprehensiones por Infracciones MSP 2023", "year": 2023, "period": "Anual"},
    {"url": "/sites/default/files/docs/ANEXO%20ESTAD%C3%8DSTICO%20ATLAS%20DE%20APREHENSIONES%20MSP%202023.pdf", "title": "Anexo Estadístico Atlas Aprehensiones MSP 2023", "year": 2023, "period": "Anual"},
    {"url": "/sites/default/files/docs/Anexo%20OIJ%202023.pdf", "title": "Anexo Estadístico Atlas OIJ 2023", "year": 2023, "period": "Anual"},
    {"url": "/sites/default/files/docs/ATLAS%202023.pdf", "title": "Atlas de Incidencia de Delitos 2023", "year": 2023, "period": "Anual"},
    {"url": "/sites/default/files/docs/op-homicidios-4t-2023-cr-esp%5B1%5D.pdf", "title": "Análisis Homicidios Dolosos Enero-Diciembre 2023", "year": 2023, "period": "Anual"},
    {"url": "/sites/default/files/docs/Presentaci%C3%B3n_Indicadores_seguridad_ciudadana_2024.pdf", "title": "Presentación Indicadores Seguridad y Convivencia 2018-2022", "year": 2023, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/indicadores_seguimiento_violencia_Costa_Rica_web_1.pdf", "title": "Indicadores Seguridad Ciudadana en Costa Rica 2018-2022", "year": 2023, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/Atlas%20Cartogr%C3%A1fico%20Homicidios%20Delincuencia%20organizada%2C%202010-2023.pdf", "title": "Homicidios Dolosos Delincuencia Organizada 2010-2023", "year": 2023, "period": "Anual"},
    {"url": "/sites/default/files/docs/pnud_modulo_de_victimizacion_de_la_encuesta_nacional_de_hogares_compressed_12octubre.pdf", "title": "La Victimización Delictiva en Costa Rica 2023", "year": 2023, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/Violencia_contra_las_mujeres_2020_2022_ppt.pdf", "title": "Presentación Violencia contra las Mujeres 2020-2022", "year": 2023, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/Violencia_contra_las_mujeres_2020_2022_1.pdf", "title": "Violencia contra las Mujeres en Costa Rica 2020-2022", "year": 2023, "period": "Anual", "reference_only": True},
    # ── 2022 ──
    {"url": "/sites/default/files/docs/atlas_msp.pdf", "title": "Atlas de Incidencia de Delitos MSP 2022", "year": 2022, "period": "Anual"},
    {"url": "/sites/default/files/docs/ppt_dataccion_6t.pdf", "title": "Análisis sobre Situación de Seguridad Ciudadana 2022", "year": 2022, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/atlas_conglomerados_oij_2022.pdf", "title": "Atlas de Delitos 2022 — Conglomerados", "year": 2022, "period": "Anual"},
    {"url": "/sites/default/files/docs/atlas_puntos_oij_2023.pdf", "title": "Atlas de Delitos 2022 — Puntos Agregados", "year": 2022, "period": "Anual"},
    {"url": "/sites/default/files/docs/fichasfinales_metadatos_ultima_version_0.pdf", "title": "Listado de Indicadores y Metadatos", "year": 2022, "period": "Anual", "reference_only": True},
    # ── 2021 ──
    {"url": "/sites/default/files/docs/ppt_cr_dataccion_5_julio_2022_0.pdf", "title": "Análisis sobre Situación de Seguridad Ciudadana 2021", "year": 2021, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/atlas_msp_2021_final_0.pdf", "title": "Atlas de Ocurrencia de Delitos MSP 2021", "year": 2021, "period": "Anual"},
    {"url": "/sites/default/files/docs/atlas_oij_2021_final_0.pdf", "title": "Atlas de Incidencia de Delitos OIJ 2021", "year": 2021, "period": "Anual"},
    # ── 2020 ──
    {"url": "/sites/default/files/docs/ppt_dataccion_fase3_cr_0.pdf", "title": "Situación de Violencia en Costa Rica 2020", "year": 2020, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/atlas_oij_2020_web_0.pdf", "title": "Atlas de Ocurrencia de Delitos OIJ 2020", "year": 2020, "period": "Anual"},
    {"url": "/sites/default/files/docs/atlas_i_semestre_2020_0.pdf", "title": "Atlas de Ocurrencia de Delitos I Semestre 2020", "year": 2020, "period": "I Semestre"},
    {"url": "/sites/default/files/docs/victimizacion_en_la_region_chorotega_2014-2018ppt_0.pdf", "title": "Victimización Región Chorotega 2014-2018 (PPT)", "year": 2020, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/victimizacion_en_la_region_chorotega_2014-2018_24-10-2020_0.pdf", "title": "Victimización Región Chorotega 2014-2018", "year": 2020, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/seguridad_ciudadana_enero_junio_2020_0.pdf", "title": "Seguridad Ciudadana Enero-Junio 2020", "year": 2020, "period": "I Semestre"},
    {"url": "/sites/default/files/docs/analisis_i_semestre_2020_0.pdf", "title": "Situación de Violencia I Semestre 2020", "year": 2020, "period": "I Semestre"},
    # ── 2019 ──
    {"url": "/sites/default/files/docs/atlas_2019_ii_parte_0.pdf", "title": "Atlas de Ocurrencia de Delitos 2019 — II Parte", "year": 2019, "period": "Anual"},
    {"url": "/sites/default/files/docs/atlas_2019_i_parte_0_0.pdf", "title": "Atlas de Ocurrencia de Delitos 2019 — I Parte", "year": 2019, "period": "Anual"},
    {"url": "/sites/default/files/docs/resumen_grafico_de_suicidio_en_costa_rica_0.pdf", "title": "Resumen Gráfico del Suicidio en Costa Rica", "year": 2019, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/estado_suicidio_cr_0.pdf", "title": "Estado del Suicidio en Costa Rica", "year": 2019, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/comesco_desplegable_11x17.cleaned_0.pdf", "title": "Infográfico Masculinidades y Violencia", "year": 2019, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/masculinidades_y_tendencias_delictivas_en_costa_rica_1.pdf", "title": "Masculinidades y Tendencias Delictivas en Costa Rica 2015-2018", "year": 2019, "period": "Anual", "reference_only": True},
    # ── 2018 ──
    {"url": "/sites/default/files/docs/atlas_de_actuaciones_policiales_2018_0.pdf", "title": "Atlas de Actuaciones Policiales MSP 2018", "year": 2018, "period": "Anual"},
    {"url": "/sites/default/files/docs/atlas_2018_0_0.pdf", "title": "Atlas de Delitos OIJ 2018", "year": 2018, "period": "Anual"},
    {"url": "/sites/default/files/docs/figura-1-ods-a2_2.pdf", "title": "ODS: Metas e Indicadores Violencia contra las Mujeres", "year": 2018, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/infografia-violencia_contra_las_mujeres_13.pdf", "title": "Infografía Violencia contra las Mujeres 2015-2017", "year": 2018, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/violencia_contra_mujeres_2015-2017_1.pdf", "title": "Violencia Contra las Mujeres en Costa Rica 2015-2017", "year": 2018, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/infografia_iccs_1.pdf", "title": "Infografía ICCS", "year": 2018, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/iccs_spanish_2016_web_0.pdf", "title": "Clasificación Internacional del Delito (ICCS)", "year": 2018, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/odm_mundo_que_queremos_1_0.pdf", "title": "Consulta Nacional Post 2015", "year": 2018, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/conceptualizacion_agenda_18_abril_2018_0.pdf", "title": "Conceptualización Agenda 2030", "year": 2018, "period": "Anual", "reference_only": True},
    # ── 2017 ──
    {"url": "/sites/default/files/docs/grant-continuum-30-marzo-2017_0.pdf", "title": "Continuum de la Violencia contra las Mujeres", "year": 2017, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/violencia_y_delito_en_el_espacio_urbano_0.pdf", "title": "Violencia y Delito en el Espacio Urbano", "year": 2017, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/juventud_y_violencia_0.pdf", "title": "Presentación Juventudes y Violencia", "year": 2017, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/infografia_juventud_y_violencia_0.pdf", "title": "Infografía Juventud y Violencia", "year": 2017, "period": "Anual", "reference_only": True},
    # ── 2016 ──
    {"url": "/sites/default/files/docs/algunos_datos_y_acercamiento_a_la_violencia_en_el_sector_de_juventudes_2016_0.pdf", "title": "Algunos Datos sobre Violencia en el Sector de Juventudes 2016", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/analisis_homicidios_dolosos_y_delincuencia_organizada_0.pdf", "title": "Homicidios Dolosos Delincuencia Organizada 2010-2016", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/hnn_2016_0.pdf", "title": "Situaciones de Violencia contra Personas Menores de Edad 2016", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/31-informe12_0.pdf", "title": "Informe Estadístico N°12", "year": 2016, "period": "Anual"},
    {"url": "/sites/default/files/docs/10-atlas_oij_2016_vfinal_1.pdf", "title": "Atlas Cartográfico de Delitos OIJ 2016", "year": 2016, "period": "Anual"},
    {"url": "/sites/default/files/docs/1-perfil_del_victimario_0.pdf", "title": "Perfil del Victimario y Casos de Homicidios", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/30-informe11_0.pdf", "title": "Informe Estadístico N°11", "year": 2016, "period": "Anual"},
    {"url": "/sites/default/files/docs/11-infografia_homicidios_2016_0_0.pdf", "title": "Infografía Homicidios 2016", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/13-atlas_oij_2016_0.pdf", "title": "Atlas OIJ de Delitos 2016 — I Semestre", "year": 2016, "period": "I Semestre"},
    {"url": "/sites/default/files/docs/12-compendio_comesco_0.pdf", "title": "Compendio de Investigaciones sobre Convivencia y Seguridad Ciudadana", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/8-perfil_homicidios_0.pdf", "title": "Perfil del Homicidio en Costa Rica — Las Víctimas 2008-2016", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/7-idh2016_na_f_0.pdf", "title": "Infografía: No Dejar a Nadie Atrás (IDH 2016)", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/6-idh2016_mujeres_f_0.pdf", "title": "Infografía: Desarrollo Humano de las Mujeres (IDH 2016)", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/4-idh2016_alc_f_0.pdf", "title": "Infografía: Costa Rica Respecto a la Región (IDH 2016)", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/5-idh2016_f_0.pdf", "title": "Infografía: Índice de Desarrollo Humano 2015 (IDH 2016)", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/3-atalas_de_ocurrencia_de_delitos_2016_0.pdf", "title": "Atlas Cartográfico de Ocurrencia de Delitos 2016", "year": 2016, "period": "Anual"},
    {"url": "/sites/default/files/docs/2-perfil_del_victimario_0.pdf", "title": "Perfil del Homicidio en Costa Rica", "year": 2016, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/9-paper_oij_0.pdf", "title": "Violaciones y Extorsiones Sexuales vía Facebook", "year": 2016, "period": "Anual", "reference_only": True},
    # ── 2015 ──
    {"url": "/sites/default/files/docs/19-anexo_atlas_distrital_0.pdf", "title": "Anexo de Conglomerados Atlas 2015", "year": 2015, "period": "Anual"},
    {"url": "/sites/default/files/docs/18-atlas_de_delitos_y_acciones_2015_0.pdf", "title": "Atlas Cartográfico Delitos y Acciones de Prevención 2015", "year": 2015, "period": "Anual"},
    {"url": "/sites/default/files/docs/14-atlas_delitos_2015_0.pdf", "title": "Atlas de Delitos 2015", "year": 2015, "period": "Anual"},
    {"url": "/sites/default/files/docs/17-pme_ampliado_0.pdf", "title": "Mapas de Violencia contra Personas Menores de Edad", "year": 2015, "period": "Anual"},
    {"url": "/sites/default/files/docs/16-directorio_de_ong_por_la_paz_0.pdf", "title": "Directorio de Organismos No Gubernamentales (ONG)", "year": 2015, "period": "Anual", "reference_only": True},
    {"url": "/sites/default/files/docs/15-infografia_homicidios_0.pdf", "title": "Homicidios Registrados por Año y Mes — Costa Rica", "year": 2015, "period": "Anual", "reference_only": True},
    # ── 2013 ──
    {"url": "/sites/default/files/docs/29-informe10_0.pdf", "title": "Informe Estadístico N°10", "year": 2013, "period": "Anual"},
    {"url": "/sites/default/files/docs/28-informe9_0.pdf", "title": "Informe Estadístico N°9", "year": 2013, "period": "Anual"},
    # ── 2012 ──
    {"url": "/sites/default/files/docs/27-informe8_0.pdf", "title": "Informe Estadístico N°8", "year": 2012, "period": "Anual"},
    {"url": "/sites/default/files/docs/26-informe7_0.pdf", "title": "Informe Estadístico N°7", "year": 2012, "period": "Anual"},
    # ── 2011 ──
    {"url": "/sites/default/files/docs/25-informe6_0.pdf", "title": "Informe Estadístico N°6", "year": 2011, "period": "Anual"},
    # ── 2010 ──
    {"url": "/sites/default/files/docs/24-informe5_0.pdf", "title": "Informe Estadístico N°5", "year": 2010, "period": "Anual"},
    # ── 2009 ──
    {"url": "/sites/default/files/docs/23-informe4_0.pdf", "title": "Informe Estadístico N°4", "year": 2009, "period": "Anual"},
    {"url": "/sites/default/files/docs/22-informe3_0.pdf", "title": "Informe Estadístico N°3", "year": 2009, "period": "Anual"},
    # ── 2008 ──
    {"url": "/sites/default/files/docs/21-informe2_0.pdf", "title": "Informe Estadístico N°2", "year": 2008, "period": "Anual"},
    {"url": "/sites/default/files/docs/20-informe1_0.pdf", "title": "Informe Estadístico N°1", "year": 2008, "period": "Anual"},
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

    province_detected = False
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
            province_detected = True
            raw_name = prov   # always use the canonical accented name
            is_province_row = True
        else:
            is_province_row = False
            # Skip canton rows that appear before any province header is found —
            # these are parsing artifacts with no geographic context.
            if not province_detected:
                continue

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

    from urllib.parse import unquote
    for meta in TARGET_PDFS:
        title = meta["title"]
        full_url = BASE_URL + meta["url"]
        filename = os.path.basename(meta["url"].split("?")[0])
        filename = unquote(filename)
        pdf_path = PDF_DIR / filename
        json_filename = filename.replace(".pdf", "_pdf.json")
        json_path = RAW_DIR / json_filename
        is_reference = meta.get("reference_only", False)

        print(f"  [{meta['year']}] {title}{' [ref]' if is_reference else ''}")

        # Reference-only PDFs: add to manifest without downloading or extracting.
        if is_reference:
            manifest_entries.append(
                {
                    "title": title,
                    "originalUrl": full_url,
                    "filename": pdf_path.name,
                    "year": meta["year"],
                    "sheets": [],
                    "reference_only": True,
                    "downloadedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
                }
            )
            print()
            continue

        if not download_pdf(full_url, pdf_path):
            continue

        records = extract_from_pdf(pdf_path, meta)
        print(f"    -> {len(records)} record(s) extracted")

        has_data = len(records) > 0
        if has_data:
            total_tables += 1
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(records, f, ensure_ascii=False, indent=2)
            all_records.extend(records)

        manifest_entries.append(
            {
                "title": title,
                "originalUrl": full_url,
                "filename": json_filename if has_data else pdf_path.name,
                "year": meta["year"],
                "sheets": ["pdf_extracted"] if has_data else [],
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

    # Deduplicate freshly extracted PDF records: when multiple PDFs (e.g. Atlas OIJ,
    # Atlas MSP, Anexo Estadístico) all report the same annual province/canton total,
    # keep only the maximum value to avoid inflated counts.
    deduped: dict[tuple, dict] = {}
    for r in all_records:
        key = (r["province"], r["year"], r["period"], r["crimeType"], r.get("canton") or "")
        if key not in deduped or r["count"] > deduped[key]["count"]:
            deduped[key] = r
    all_records = list(deduped.values())
    print(f"\n  Deduplication: {len(all_records)} unique records (after cross-PDF dedup)")

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
