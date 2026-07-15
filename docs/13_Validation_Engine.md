# 13 — Validation Engine

## 1. Overview

The Validation Engine (`lib/rules/`) performs two passes of validation:

- **Row-level validation** — applied immediately after the Rules Engine evaluates each `ParsedRow` (blocking: failures prevent the row from reaching the Calculator).
- **Post-aggregation validation** — applied to `AggregatedResult[]` after cross-page aggregation (non-blocking: failures enter the review queue but do not stop export of other items).

## 2. Review Queue

Items that fail validation are placed in the **review queue**. Each queued item contains enough context for a human reviewer to make an informed decision.

```typescript
interface ReviewQueueItem {
  jobId: string;
  itemId: string;           // UUID
  stage: 'row' | 'aggregate';
  page?: number;
  row?: number;
  productKey?: string;
  rawText?: string;
  failedRules: string[];    // rule IDs
  severity: 'warn' | 'fail';
  status: 'pending' | 'approved' | 'corrected' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;      // ISO 8601
  correction?: Partial<ParsedRow>;
}
```

## 3. Reviewer Actions

| Action | Description |
|---|---|
| **Approve** | Accept the item as-is; include it in the final output. |
| **Correct** | Modify one or more fields (e.g. quantity, unit type, product key) then approve. |
| **Reject** | Exclude the item from all outputs; recorded for audit. |

All reviewer actions are logged with identity and timestamp (FR-VAL-04).

## 4. Post-Aggregation Checks

| Check | Description |
|---|---|
| `ZERO_TOTAL` | An aggregated product has `cases = 0` AND `units = 0`; may indicate a full-page parse failure. |
| `UNUSUALLY_HIGH_QUANTITY` | Total cases or units exceed the configured threshold (default: 500). |
| `UNRESOLVED_CITY` | Product could not be assigned to any city. |
| `UNRESOLVED_ROUTE` | Product could not be assigned to any delivery route. |

## 5. Export Gating

- Items with `status = 'pending'` are **excluded** from all exports.
- Items with `status = 'approved'` or `status = 'corrected'` are included.
- Items with `status = 'rejected'` are excluded.
- The export API returns a `pendingCount` field so the UI can warn the user before download.

## 6. Configuration

Post-aggregation thresholds are configurable in `catalogs/rules.json`:

```json
{
  "validationSettings": {
    "unusuallyHighQuantityThreshold": 500,
    "zeroTotalAction": "warn"
  }
}
```

## 7. Error Handling

| Condition | Behaviour |
|---|---|
| Review queue item edited with invalid data | Validation re-runs; error shown to reviewer |
| Review queue API called after export | Returns read-only queue state |
