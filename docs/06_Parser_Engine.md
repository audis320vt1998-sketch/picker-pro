# 06 — Parser Engine

## 1. Overview

The Parser Engine (`lib/parser/`) converts raw `OcrResult` lines into structured `ParsedRow` objects. It handles RTL reordering for Hebrew text, extracts barcodes and SKUs from numeric fields, identifies quantity and unit type, and emits warnings for rows it cannot fully parse.

## 2. Parsing Pipeline

```
OcrLine[]
    │
    ▼
RTL normalisation
(reverse Hebrew tokens if needed)
    │
    ▼
Field extraction
(barcode | sku | product name | quantity | unit)
    │
    ▼
Unit-type classification
(case | unit — based on Rules Engine lookup)
    │
    ▼
ParsedRow emission  ─── ParseWarning if incomplete
```

## 3. Field Extraction Rules

### 3.1 Barcode Detection

- A barcode is a sequence of 8, 12, or 13 digits (EAN-8, UPC-A, EAN-13).
- If found in the row, it takes priority over all other product identifiers.

### 3.2 SKU Detection

- A SKU matches the pattern defined in `catalogs/rules.json` (`sku_pattern`, default: `[A-Z]{2}\d{4,6}`).
- Extracted when no barcode is present on the row.

### 3.3 Product Name Extraction

- Remaining non-numeric Hebrew / Latin tokens after barcode/SKU removal constitute the product name hint.
- The hint is normalised (trim, collapse whitespace, lowercase Latin) before passing to the Product Engine.

### 3.4 Quantity Column Interpretation

Order sheets used by Picker Pro distributors may present quantities in several formats. The parser reads each source column as-is and must **never** automatically divide one quantity value into cases and a remainder.

#### 3.4.1 Single-value quantity column

A single standalone integer or decimal is a raw quantity in the unit type implied by the row context (case or individual unit per product rules).

```
נוטלה   5
→ quantity = 5, unit determined by product catalog
```

#### 3.4.2 Verified example — "3 1 3"

Per the verified warehouse rule, the OCR text `3 1 3` in the quantity field represents **3 individual units**. The two other numbers (`3` and `1`) are the values in adjacent source columns (e.g. cases column and pack-size column) and must be read from those columns independently — they are not part of a single combined quantity.

| Source column | OCR value | Meaning |
|---|---|---|
| Cases column | `3` | 3 full cases (read from the cases column) |
| Pack-size column | `1` | Pack size or intermediate pack count (product property column) |
| Units column | `3` | 3 individual units (the quantity being documented in the "3 1 3" example) |

The "3 1 3" example therefore describes a row where **3 individual units** are ordered, alongside 3 full cases in the cases column. These values come from separate physical columns on the order sheet.

> **Ambiguity rule** — if the parser cannot determine which column a number belongs to from the source document layout, the row is sent to the review queue with warning `AMBIGUOUS_QUANTITY_COLUMN`. Do not guess.

> **Do not** interpret a single scanned value (e.g. `313`) as cases + remainder. That calculation is not supported.

#### 3.4.3 Pack-size column

When the order sheet has a dedicated pack-size column (the number of units per pack, e.g. `12`), this is a product property, not an order quantity. The parser reads it as a `packSizeHint` and passes it to the Product Engine for cross-reference only.

### 3.5 Unit-Type Classification

Unit-type classification applies the following precedence (highest to lowest):

1. **Product catalog** — if `parserSettings.catalogOverridesHeuristics = true` (default) and the product is resolved, the catalog's `caseOnly` / `allowUnitPicking` flags are authoritative.
2. **Name heuristic — case-only** — if the product name hint contains `1/8`, `1/12`, `1/20`, `1/24`, unit type is `case`.
3. **Name heuristic — unit-picking** — if the product name hint contains `(6)`, `(8)`, `(9)`, `(12)`, `(18)`, `(24)`, unit type is `unit` (individual picking allowed).
4. **Default** — `case` when no other signal is available.

Setting `catalogOverridesHeuristics = false` causes name heuristics to override the catalog, which is not recommended.

## 4. Data Contracts

```typescript
interface ParsedRow {
  jobId: string;
  page: number;
  row: number;
  rawText: string;
  productHint: string;
  barcode?: string;
  sku?: string;
  quantity: number;        // raw value from the single source column for this row
  unit: 'case' | 'unit';  // determined by catalog rules > name heuristics > default
  packSizeHint?: number;   // optional value from a dedicated pack-size column; not an order quantity
  confidence: number;
}

interface ParseWarning {
  jobId: string;
  page: number;
  row: number;
  rawText: string;
  reason: string;
}
```

`ParsedRow` contains one `quantity` value per row — the raw count from the relevant source column. There are no separate `cases`/`units` sub-fields on `ParsedRow`; case-vs-unit separation is determined by the `unit` field and is tracked as separate totals only in the Calculator Engine output (`ProductTotals`).

## 5. RTL Handling

Hebrew order sheets are written right-to-left. The parser:

1. Detects if a line's Unicode bidi category is strongly RTL.
2. Reverses the token order for field extraction.
3. Stores the original `rawText` for traceability, regardless of reordering.

## 6. Error Handling

| Condition | Behaviour |
|---|---|
| No quantity found | `ParseWarning` emitted; row enters review queue |
| No product hint | `ParseWarning` emitted; row enters review queue |
| Ambiguous unit type | Defaults to `case`; `ParseWarning` emitted |
| Ambiguous quantity column | `ParseWarning` with reason `AMBIGUOUS_QUANTITY_COLUMN` emitted; row enters review queue |
| Malformed barcode length | Barcode ignored; SKU / name resolution attempted |

## 7. Configuration

The following parser settings are configurable in `catalogs/rules.json`:

| Key | Default | Description |
|---|---|---|
| `skuPattern` | `[A-Z]{2}\\d{4,6}` | Regex for SKU detection |
| `confidenceThreshold` | `70` | Minimum OCR confidence to attempt parsing |
| `zeroQuantityAllowed` | `true` | Allow rows with quantity = 0 |
| `catalogOverridesHeuristics` | `true` | When true, resolved catalog entry flags take precedence over name-based 1/N and (N) heuristics |
