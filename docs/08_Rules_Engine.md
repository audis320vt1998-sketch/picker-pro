# 08 — Rules Engine

## 1. Overview

The Rules Engine (`lib/rules/`) enforces all versioned business rules against `ParsedRow` and `ResolvedProduct` data. Rules are loaded from `catalogs/rules.json` and evaluated in order. Each rule returns a `RuleResult` with a `pass | warn | fail` status and an optional message.

## 2. Rule Evaluation Pipeline

```
ParsedRow + ResolvedProduct
        │
        ▼
  Load active rule set
  (catalogs/rules.json, highest version)
        │
        ▼
  For each rule (in order):
    evaluate(row, product) ──▶ RuleResult
        │
        ▼
  Aggregate results:
    any fail  ──▶ ValidationQueue
    any warn  ──▶ ReviewQueue (non-blocking)
    all pass  ──▶ proceed to Calculator
```

## 3. Built-in Rule Types

The ten core rules are listed below in order of their rule ID. All are configurable in `catalogs/rules.json`.

### Rule 1 — UNIT_TYPE_ENFORCEMENT (R001)

Ensures the `unit` field on a `ParsedRow` is consistent with the resolved product's rules.

| Condition | Result |
|---|---|
| `caseOnly = true` AND `unit = 'unit'` | `fail` — unit type overridden |
| Name contains `1/N` AND `unit = 'unit'` | `fail` — full-case-only product |
| `allowUnitPicking = true` AND `unit = 'case'` for `(N)` product | `warn` — unusual but allowed |

### Rule 2 — QUANTITY_RANGE (R002)

Validates that quantity is within the configured min/max range for the product.

```json
{
  "ruleType": "QUANTITY_RANGE",
  "params": { "min": 0, "max": 9999 }
}
```

### Rule 3 — PRODUCT_RESOLVED (R003)

Fails if `resolvedBy` is missing (product was not found in catalog).

### Rule 4 — CONFIDENCE_THRESHOLD (R004)

Warns if the `ParsedRow.confidence` is below the configured threshold (default 70).

### Rule 5 — DUPLICATE_DETECTION (R005)

Warns if the same `productKey` + `unit` combination appears more than once on the same page (may indicate a double-scan).

### Rule 6 — ZERO_TOTAL (R006)

Warns when an aggregated product has both `cases = 0` and `units = 0` after all pages are merged.

### Rule 7 — UNUSUALLY_HIGH_QUANTITY (R007)

**Disabled by default.** Warns when total cases or units for a single product exceed a configured threshold. This rule is disabled until real operational order-volume data is available to establish a meaningful threshold. Enable it in `catalogs/rules.json` and set `threshold` to a value derived from actual data before production use.

```json
{
  "ruleType": "UNUSUALLY_HIGH_QUANTITY",
  "enabled": false,
  "params": { "threshold": null }
}
```

### Rule 8 — CASE_ONLY_NAME_PATTERN (R008)

Products whose names contain a fraction pattern (`1/8`, `1/12`, `1/20`, `1/24`) are treated as full-case only. When `catalogOverridesHeuristics = true`, the product catalog `caseOnly` flag takes precedence over this name heuristic.

### Rule 9 — UNIT_PICKING_NAME_PATTERN (R009)

Products whose names contain a parenthesised unit count (`(6)`, `(8)`, `(9)`, `(12)`, `(18)`, `(24)`) may allow individual-unit picking as defined in the product catalog. When `catalogOverridesHeuristics = true`, the catalog `allowUnitPicking` flag takes precedence over this name heuristic.

### Rule 10 — CATALOG_OVERRIDES_HEURISTICS (R010)

When a resolved product entry exists in the catalog, its `caseOnly` and `allowUnitPicking` flags take precedence over name-based heuristics (Rules 8 and 9). Name heuristics are applied only when no catalog entry is found. This rule enforces the precedence hierarchy and is controlled by `parserSettings.catalogOverridesHeuristics` in `catalogs/rules.json`.

## 4. Rule Catalog Format

```json
{
  "version": "1.2.0",
  "updatedAt": "2026-07-15T00:00:00Z",
  "updatedBy": "admin",
  "rules": [
    {
      "id": "R001",
      "ruleType": "UNIT_TYPE_ENFORCEMENT",
      "enabled": true,
      "severity": "fail",
      "description": "Enforce case/unit separation per product rules."
    },
    {
      "id": "R002",
      "ruleType": "QUANTITY_RANGE",
      "enabled": true,
      "severity": "fail",
      "params": { "min": 0, "max": 9999 },
      "description": "Quantity must be between 0 and 9999."
    }
  ]
}
```

## 5. Data Contracts

```typescript
interface RuleResult {
  ruleId: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  rowRef: { page: number; row: number };
}
```

## 6. Versioning

- Each `rules.json` has a `version` field (semver).
- The Rules Engine always loads the highest-version active rule set.
- Rule changes are applied on the next job submission; in-flight jobs use the rule set active at job creation.
- All rule set versions are stored in the database for audit purposes.

## 7. Configurability

All rules can be:
- **Enabled / disabled** via the `enabled` flag.
- **Severity-adjusted** (`warn` vs. `fail`) without code changes.
- **Extended** by adding new entries to `catalogs/rules.json`.

New rule types require a corresponding TypeScript implementation in `lib/rules/`, but existing rules are fully configurable through the catalog.

## 8. Error Handling

| Condition | Behaviour |
|---|---|
| Rule catalog missing | Engine throws `RULES_CATALOG_MISSING`; job fails |
| Unsupported rule type | Warning logged; rule skipped |
| Rule evaluation throws | Error logged; row flagged as `fail` with `RULE_ERROR` |
