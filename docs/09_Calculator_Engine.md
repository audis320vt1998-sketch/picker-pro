# 09 — Calculator Engine

## 1. Overview

The Calculator Engine (`lib/calculator/`) accumulates case and unit quantities separately for each resolved product key within a single input page. It never combines case and unit totals, and it records a `SourceRef` for every contributing row to support full traceability.

## 2. Calculation Rules

| Rule | Description |
|---|---|
| **Separation** | Case quantities and unit quantities are summed independently; the totals are stored in separate fields. |
| **No mixing** | A product's `cases` total is never added to its `units` total under any circumstance. |
| **No auto-division** | A single quantity value is never automatically split into cases and a remainder (e.g. `313` is not interpreted as 26 cases + 1 unit). Division only occurs when the source document provides explicit separate sub-columns (see Parser Engine §3.4.2). |
| **Traceability** | Every row that contributes to a total appends its `{ page, row }` reference to `sources`. |
| **Zero quantities** | Rows with `quantity = 0` are included in `sources` but do not change the numeric total. |
| **Negative quantities** | Not permitted; rows with negative quantities produce a `fail` from the Rules Engine before reaching the Calculator. |

## 3. Processing Flow

```
ResolvedProduct[] (per page, rules passed)
        │
        ▼
  Group by (productKey, unit)
        │
        ├─ unit = 'case'  ──▶ sum quantities ──▶ ProductTotals.cases
        │                                             + append SourceRef
        │
        └─ unit = 'unit'  ──▶ sum quantities ──▶ ProductTotals.units
                                                      + append SourceRef
        │
        ▼
  Emit ProductTotals[]
```

## 4. Data Contracts

```typescript
interface ProductTotals {
  jobId: string;
  page: number;
  productKey: string;
  cases: number;
  units: number;
  sources: SourceRef[];
}

interface SourceRef {
  page: number;
  row: number;
  unit: 'case' | 'unit';
  quantity: number;
}
```

## 5. Edge Cases

| Scenario | Handling |
|---|---|
| Same product appears twice on the same page as both `case` and `unit` | Totals accumulated separately; both source refs retained |
| Product appears only as case on this page | `units = 0`; `sources` contains only case refs |
| Product appears with zero quantity | `sources` includes the zero-quantity ref for audit; total unchanged |

## 6. Configuration

No external configuration file is required. Calculator behaviour is determined by the unit-type classification produced by the Rules Engine and Product Engine.

## 7. Error Handling

| Condition | Behaviour |
|---|---|
| Negative quantity reaches Calculator | Engine throws `NEGATIVE_QUANTITY_ERROR` (should have been caught by Rules Engine) |
| Non-numeric quantity | Parsing error caught upstream by Parser Engine; does not reach Calculator |
