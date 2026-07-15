# 07 — Product Engine

## 1. Overview

The Product Engine (`lib/engine/`) is responsible for resolving each `ParsedRow` to a canonical product record from `catalogs/products.json`. It enforces the priority chain: **barcode → SKU → normalised name → aliases**. Rows that cannot be resolved are placed in the validation queue.

## 2. Resolution Priority

```
ParsedRow
    │
    ├─ barcode present? ──YES──▶ lookup by barcode ──found?──YES──▶ ResolvedProduct (resolvedBy: 'barcode')
    │                                                       │
    │                                                       NO──▶ ValidationQueue
    │
    ├─ sku present? ──YES──▶ lookup by SKU ──found?──YES──▶ ResolvedProduct (resolvedBy: 'sku')
    │                                                │
    │                                                NO──▶ ValidationQueue
    │
    ├─ productHint ──▶ normalise ──▶ lookup by name ──found?──YES──▶ ResolvedProduct (resolvedBy: 'name')
    │                                                         │
    │                                                         NO
    │
    └─ lookup by aliases ──found?──YES──▶ ResolvedProduct (resolvedBy: 'alias')
                                  │
                                  NO──▶ ValidationQueue
```

## 3. Name Normalisation

The normalisation function applied to `productHint` before name/alias lookup:

1. Remove leading/trailing whitespace.
2. Collapse multiple spaces to a single space.
3. Convert Latin characters to lowercase.
4. Strip punctuation except parentheses and forward slashes (important for unit-type rules).
5. Remove diacritics from Latin characters.

## 4. Data Contracts

```typescript
interface ResolvedProduct {
  productKey: string;      // canonical unique identifier (barcode preferred)
  barcode: string;
  sku: string;
  name: string;            // canonical Hebrew/Latin product name
  allowUnitPicking: boolean;
  caseOnly: boolean;
  resolvedBy: 'barcode' | 'sku' | 'name' | 'alias';
}

interface ValidationQueueItem {
  jobId: string;
  page: number;
  row: number;
  rawText: string;
  productHint: string;
  reason: 'UNRESOLVED_PRODUCT' | 'LOW_CONFIDENCE' | string;
}
```

## 5. Product Catalog Reference

The product catalog (`catalogs/products.json`) entry structure:

```json
{
  "productKey": "7290000000001",
  "barcode": "7290000000001",
  "sku": "BV001",
  "name": "מים מינרלים 1.5 ליטר",
  "aliases": ["מים 1.5", "water 1.5L"],
  "allowUnitPicking": false,
  "caseOnly": false,
  "unitSize": 6,
  "caseSize": 6
}
```

## 6. Unit-Type Override Logic

After resolving the product, the engine applies unit-type overrides:

| Condition | Result |
|---|---|
| `caseOnly === true` | Force `unit = 'case'`; override Parser Engine |
| Name matches `1/N` pattern | Force `unit = 'case'` |
| `allowUnitPicking === true` AND name matches `(N)` pattern | Allow `unit = 'unit'` |
| None of the above | Use unit type from Parser Engine |

## 7. Performance

- The product catalog is loaded once at application startup and held in memory.
- Barcode and SKU lookups use hash maps for O(1) resolution.
- Name/alias lookups use a normalised index; fuzzy matching (`lib/ai/fuzzy.ts`) is available as fallback for review-queue suggestions.

## 8. Error Handling

| Condition | Behaviour |
|---|---|
| Barcode present in row but not in catalog | Row enters `ValidationQueue` with `UNRESOLVED_PRODUCT` |
| Product catalog missing or malformed | Engine throws `CATALOG_LOAD_ERROR`; job fails |
| Duplicate barcode in catalog | Warning logged at startup; first entry wins |
