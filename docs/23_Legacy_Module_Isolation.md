# Legacy Module Isolation

## Status

The folders below are present in the repository for reference only. They are
not part of the operational Picker Pro build and must not be imported by new
application code.

| Area | Why it is isolated | Replacement path |
| --- | --- | --- |
| `lib/aggregator/` | Uses the obsolete `engine/types` model and does not preserve Foundation source references. | `lib/foundation/aggregate-product-totals.ts` |
| `lib/calculator/` | Automatically classifies a single quantity as cases or units. | `lib/foundation/explicit-row-processor.ts` |
| `lib/engine/` | Depends on missing types and demo products. | Foundation resolver and processor |
| `lib/parser/`, `lib/ocr/` | Incomplete OCR/parser pipeline; it cannot produce verified, traceable rows. | Rebuild after a reviewed OCR contract is selected |
| `lib/rules/` | Incompatible rule schemas and missing matcher implementation. | Rebuild against explicit case/unit fields |
| `lib/export/` | Depends on the obsolete engine and an unconfigured XLSX dependency. | Rebuild only after validated job persistence exists |
| `lib/database/` | Placeholder implementation with no operational persistence contract. | Rebuild with the job/review data model |
| `lib/catalog/catalog.ts`, `lib/catalog/loader.ts` | Old in-memory catalog format with demo data. | `lib/catalog/verified-catalog*.ts` |

## Guardrails

- `tsconfig.json` excludes these paths from the active application type-check.
- `lib/catalog/index.ts` exposes only the verified catalog surface.
- The active manual-review workflow uses `catalogs/products.json`, the
  Foundation row contract, and explicit case/unit fields.
- Isolation is not a claim that the legacy code works. Each area must be
  rewritten and covered by tests before it can re-enter the operational build.
