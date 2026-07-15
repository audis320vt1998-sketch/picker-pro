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

### 3.4 Quantity Extraction

- The rightmost standalone integer or decimal in the line is treated as the quantity.
- Values of zero are allowed (product present but not ordered).

### 3.5 Unit-Type Classification

- If the product name hint contains `(6)`, `(8)`, `(9)`, `(12)`, `(18)`, `(24)` — unit type is `unit` (individual picking allowed per product rules).
- If the product name hint contains `1/8`, `1/12`, `1/20`, `1/24` — unit type is `case` (full-case only).
- Otherwise, unit type is determined by the product catalog entry; defaults to `case`.

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
  quantity: number;
  unit: 'case' | 'unit';
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
| Malformed barcode length | Barcode ignored; SKU / name resolution attempted |

## 7. Configuration

The following parser settings are configurable in `catalogs/rules.json`:

| Key | Default | Description |
|---|---|---|
| `sku_pattern` | `[A-Z]{2}\\d{4,6}` | Regex for SKU detection |
| `confidence_threshold` | `70` | Minimum OCR confidence to attempt parsing |
| `zero_quantity_allowed` | `true` | Allow rows with quantity = 0 |
