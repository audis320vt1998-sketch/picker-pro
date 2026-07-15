# 10 — Aggregator Engine

## 1. Overview

The Aggregator Engine (`lib/aggregator/`) merges `ProductTotals` from all pages of a job into a single `AggregatedResult` per product key. It preserves every `SourceRef` so that any quantity in the final output can be traced back to its originating page and row.

## 2. Aggregation Rules

| Rule | Description |
|---|---|
| **Cross-page merge** | All pages of a job are merged into one result set. |
| **Key-based grouping** | Grouping key is `productKey`. |
| **Case/unit separation** | `cases` totals are summed separately from `units` totals — never combined. |
| **Source preservation** | Every `SourceRef` from every page is included in the merged `sources` list. |
| **Order independence** | Pages are merged in the order they were submitted; order does not affect totals. |

## 3. Processing Flow

```
ProductTotals[] (all pages)
        │
        ▼
  Group by productKey
        │
        ▼
  For each group:
    cases  = Σ page.cases
    units  = Σ page.units
    sources = flatten(page.sources[])
        │
        ▼
  Emit AggregatedResult[]
```

## 4. Data Contracts

```typescript
interface AggregatedResult {
  jobId: string;
  productKey: string;
  barcode: string;
  sku: string;
  name: string;
  totalCases: number;
  totalUnits: number;
  sources: SourceRef[];
}

interface SourceRef {
  page: number;
  row: number;
  unit: 'case' | 'unit';
  quantity: number;
}
```

## 5. Traceability

For any quantity in an export:

1. Look up `AggregatedResult.sources` filtered by `unit`.
2. Each `SourceRef` points to the exact `page` and `row` in the original input.
3. The original input image is stored by `page` reference so the source can be displayed in the review UI.

## 6. Edge Cases

| Scenario | Handling |
|---|---|
| Product appears on only one page | `sources` contains refs from that page only; totals are correct |
| Product appears on all pages with both case and unit quantities | Both totals grow independently; all refs retained |
| Product appears with quantity = 0 on one page | SourceRef retained; total unchanged |
| No pages in job | Aggregator emits empty array; job marked as `EMPTY` |

## 7. Error Handling

| Condition | Behaviour |
|---|---|
| Duplicate `productKey` within a single page's `ProductTotals` | Warning logged; quantities summed anyway (Calculator should have combined them) |
| Missing `productKey` in a `ProductTotals` record | Error logged; record skipped |
