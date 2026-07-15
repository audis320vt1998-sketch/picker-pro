# 03 — Software Design Specification

## 1. Document Control

| Field | Value |
|---|---|
| Version | 1.0 |
| Status | Approved |
| Date | 2026-07-15 |
| Supersedes | `docs/picker-pro-software-design-specification.md` (v0.1) |

## 2. Purpose

This document defines the software design for Picker Pro — a Next.js 14 / TypeScript application for OCR-driven, Hebrew-aware order-picking and product aggregation.

## 3. System Overview

Picker Pro accepts camera images, uploaded images, or PDFs of order sheets and produces validated, traceable pick lists grouped by city and delivery route.

```
Input ──▶ OCR Engine ──▶ Parser Engine ──▶ Product Engine
              │                                   │
              ▼                                   ▼
        OCR Dictionary               Rules Engine / Calculator
                                            │
                                            ▼
                             Aggregator ──▶ City Engine
                                            │
                                            ▼
                             Delivery Route Engine ──▶ Validation Engine
                                                              │
                                                              ▼
                                                       Export Engine
```

## 4. Module Responsibilities

### 4.1 OCR Engine (`lib/ocr/`)

- Accepts image buffers or PDF pages.
- Runs Tesseract.js with Hebrew (`heb+eng`) language pack.
- Returns structured `OcrResult` objects containing text lines, bounding boxes, and confidence scores.
- Applies `catalogs/ocr_dictionary.json` corrections before emitting results.

### 4.2 Parser Engine (`lib/parser/`)

- Parses `OcrResult` lines into `ParsedRow` objects: `{ page, row, rawText, productHint, quantity, unit, barcode, sku }`.
- Handles RTL reordering for Hebrew product names.
- Emits `ParseWarning` for rows it cannot fully parse.

### 4.3 Product Engine (`lib/engine/`)

- Resolves each `ParsedRow.productHint` against `catalogs/products.json`.
- Resolution priority: barcode → SKU → normalised name → aliases.
- Returns `ResolvedProduct` or queues to validation if unresolved.

### 4.4 Rules Engine (`lib/rules/`)

- Loads versioned rules from `catalogs/rules.json`.
- Enforces case/unit separation rules (FR-QTY-01 – FR-QTY-04).
- Applies product-specific quantity-type constraints.
- Returns `RuleResult` with `pass | warn | fail` per row.

### 4.5 Calculator Engine (`lib/calculator/`)

- Sums case quantities and unit quantities separately per product key.
- Never merges case and unit totals.
- Produces `ProductTotals: { productKey, cases, units, sources[] }`.

### 4.6 Aggregator Engine (`lib/aggregator/`)

- Merges `ProductTotals` across all pages of a job.
- Preserves all contributing `sources` for traceability (FR-TRC-02).

### 4.7 City Engine (`lib/catalog/`)

- Groups aggregated results by city using `catalogs/cities.json`.
- Returns `CityGroup: { cityId, cityName, products[], routes[] }`.

### 4.8 Delivery Route Engine (`lib/catalog/`)

- Sub-groups each `CityGroup` by delivery route using `catalogs/delivery_routes.json`.
- A route belongs to exactly one city (FR-CTY-03).

### 4.9 Validation Engine (`lib/rules/`)

- Runs post-aggregation validation rules.
- Items failing validation enter the review queue.
- Accepts manual reviewer decisions (approve / correct / reject).

### 4.10 Export Engine (`lib/export/`)

- Generates XLSX, PDF, and print-HTML outputs per city.
- Each output includes: city, route, product key, name, cases, units, source references.

## 5. Data Contracts

### 5.1 OcrResult

```typescript
interface OcrResult {
  page: number;
  lines: OcrLine[];
}

interface OcrLine {
  row: number;
  text: string;
  confidence: number;
  bbox: BoundingBox;
}
```

### 5.2 ParsedRow

```typescript
interface ParsedRow {
  page: number;
  row: number;
  rawText: string;
  productHint: string;
  barcode?: string;
  sku?: string;
  quantity: number;
  unit: 'case' | 'unit';
}
```

### 5.3 ResolvedProduct

```typescript
interface ResolvedProduct {
  productKey: string;
  barcode: string;
  sku: string;
  name: string;
  resolvedBy: 'barcode' | 'sku' | 'name' | 'alias';
}
```

### 5.4 ProductTotals

```typescript
interface ProductTotals {
  productKey: string;
  cases: number;
  units: number;
  sources: SourceRef[];
}

interface SourceRef {
  page: number;
  row: number;
}
```

## 6. API Routes

| Route | Method | Description |
|---|---|---|
| `/api/health` | GET | Liveness check |
| `/api/process` | POST | Submit a job (multipart form: files) |
| `/api/jobs/[id]` | GET | Poll job status |
| `/api/jobs/[id]/review` | GET | Fetch review queue for job |
| `/api/jobs/[id]/review` | PATCH | Submit reviewer decisions |
| `/api/jobs/[id]/export` | GET | Trigger export (query: `format`, `cityId`) |
| `/api/ai` | POST | AI-assisted OCR correction chat |

## 7. Frontend Pages

| Route | Component | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Landing / job list |
| `/upload` | `app/upload/` | File / camera input |
| `/results/[id]` | `app/results/` | Job result detail |
| `/settings` | `app/settings/` | Runtime config |

## 8. State Management

- Job state is persisted to `localStorage` for offline recovery (FR-OFF-01, FR-OFF-02).
- React context provides job state to the component tree.
- API polling (SSE or REST) updates progress indicators.

## 9. Mobile / PWA Strategy

- `next.config.js` configures service worker via `next-pwa` (planned).
- Manifest provides installability on iOS Safari 16+ and Android Chrome 112+.
- Camera access uses the standard `<input type="file" capture="environment">` API.
- Capacitor wrapper is a documented future option; no native code is included in v1.0.

## 10. Quality Gates

- ESLint (`next lint`) must pass with zero errors.
- Jest test suite must pass with ≥ 80 % coverage on `lib/` modules.
- All new code must be typed; `any` is disallowed in `tsconfig.json` strict mode.
