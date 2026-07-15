# 01 — Executive Summary

## Product Overview

**Picker Pro** is a Hebrew-aware, OCR-powered order-picking platform designed for beverage and FMCG distributors. Warehouse pickers photograph physical order sheets using a smartphone; Picker Pro extracts the text, resolves each product by barcode/SKU/name, aggregates quantities across all pages, separates cases from individual units, and produces validated pick lists grouped by city and delivery route — all exportable as Excel, PDF, or a print-ready view.

## Business Problem

Distributors currently transcribe paper order sheets manually, leading to:

- Mis-picks caused by illegible handwriting.
- Quantity errors when the same product appears on multiple pages.
- Delays building city-level and route-level pick lists.
- No audit trail linking a shipped quantity back to a specific order row.

## Solution

Picker Pro replaces manual transcription with an automated OCR + rules pipeline:

1. **Capture** — phone camera, image upload, or PDF upload.
2. **Extract** — Hebrew-capable OCR (Tesseract.js) with dictionary-aided correction.
3. **Resolve** — product matching by barcode → SKU → normalised name.
4. **Aggregate** — cases and units summed separately across all input pages.
5. **Validate** — rule engine flags anomalies; human reviewers resolve them.
6. **Export** — Excel/PDF/print per city and per delivery route, fully traceable to source rows.

## Key Differentiators

| Capability | Description |
|---|---|
| Hebrew OCR | Native Hebrew language pack; handles RTL text |
| Dual-unit tracking | Cases and individual units never mixed |
| Full traceability | Every quantity pinned to original page and row |
| Offline recovery | Jobs resume after connectivity loss |
| PWA-first mobile | Installable on any smartphone, no app store required |
| Versioned rules | All business rules stored in catalog; changes are auditable |

## Scope (v1.0)

**In scope:**
- Hebrew and numeric OCR from camera / image / PDF inputs
- Product resolution with barcode / SKU / name / alias matching
- Case-vs-unit rule enforcement
- City and delivery-route grouping
- Validation and manual-review queue
- Excel (XLSX), PDF, and print export per city
- Offline job recovery

**Out of scope (v1.0):**
- Native iOS / Android application (deferred; Capacitor wrapper planned for v1.x)
- ERP integration (planned for v2.0)
- Multi-tenant SaaS billing

## Success Metrics

| Metric | Target |
|---|---|
| OCR accuracy (Hebrew numeric fields) | ≥ 97 % |
| End-to-end processing time per page | < 8 seconds |
| Manual correction rate | < 5 % of line items |
| Pick-list export time | < 30 seconds per city |

## Stakeholders

| Role | Responsibility |
|---|---|
| Warehouse manager | Initiates jobs; approves export |
| Picker | Executes physical picking from exported list |
| IT administrator | Configures environment; manages catalogs |
| Engineering team | Builds and maintains the platform |
