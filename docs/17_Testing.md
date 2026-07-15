# 17 — Testing

## 1. Testing Strategy

Picker Pro uses a multi-layer testing approach:

| Layer | Tool | Scope |
|---|---|---|
| Unit | Jest | Individual functions in `lib/` |
| Integration | Jest | Module interactions (e.g. OCR → Parser → Product) |
| API | Jest + supertest | API route handlers |
| E2E | Playwright (planned) | Full user workflows in browser |
| Lint | ESLint (`next lint`) | Code style and correctness |
| Type check | TypeScript (`tsc --noEmit`) | Static type safety |

## 2. Running Tests

```bash
# Run full Jest test suite
npm test

# Run with coverage report
npm test -- --coverage

# Run lint
npm run lint

# Type check
npx tsc --noEmit
```

## 3. Coverage Targets

| Module | Target |
|---|---|
| `lib/ocr/` | ≥ 80 % |
| `lib/parser/` | ≥ 85 % |
| `lib/rules/` | ≥ 90 % |
| `lib/calculator/` | ≥ 90 % |
| `lib/aggregator/` | ≥ 85 % |
| `lib/export/` | ≥ 75 % |
| `lib/catalog/` | ≥ 80 % |

## 4. Key Test Cases

### 4.1 OCR Engine

- Returns correct `OcrResult` structure for a sample Hebrew image.
- Applies dictionary corrections to known misreads.
- Flags lines below confidence threshold.

### 4.2 Parser Engine

- Correctly extracts barcode, SKU, quantity, and unit from a row.
- Handles RTL Hebrew text.
- Emits `ParseWarning` for incomplete rows.
- Correctly classifies `(6)`, `(12)` products as unit-pickable.
- Correctly classifies `1/12` products as case-only.

### 4.3 Product Engine

- Resolves by barcode first; does not fall through to name if barcode exists in catalog.
- Returns `UNRESOLVED_PRODUCT` for unknown barcodes.
- Normalises Hebrew product names before name lookup.

### 4.4 Rules Engine

- `UNIT_TYPE_ENFORCEMENT` fails for case-only product with `unit = 'unit'`.
- `QUANTITY_RANGE` fails for quantity > 9999.
- `DUPLICATE_DETECTION` warns for same product appearing twice on the same page.

### 4.5 Calculator Engine

- Sums cases and units separately.
- Appends all `SourceRef` entries.
- Does not combine case and unit totals.

### 4.6 Aggregator Engine

- Correctly merges `ProductTotals` from 3 pages.
- Preserves all source references across pages.
- Emits empty array for a job with no pages.

### 4.7 Validation Engine

- Items failing row-level validation do not reach the Calculator.
- Post-aggregation `ZERO_TOTAL` check produces a `warn`.
- Reviewer `approved` action removes item from `pending` count.

### 4.8 Export Engine

- XLSX output contains correct city/route grouping.
- Source references appear in the "Sources" column.
- PDF export rejects missing font gracefully.

## 5. Test Data

Sample test fixtures are located in `__tests__/fixtures/`:

| Fixture | Description |
|---|---|
| `sample-order-he.png` | Hebrew order sheet scan |
| `sample-order-mixed.png` | Hebrew + Latin mixed order sheet |
| `sample-products.json` | Minimal product catalog for tests |
| `sample-rules.json` | Minimal rule set for tests |

## 6. CI Integration

Tests and lint run automatically on every pull request via the GitHub Actions workflow in `.github/workflows/`. A pull request cannot be merged if any test or lint check fails.

## 7. Test Configuration

`jest.config.js` (or `jest.config.ts`):

- `testEnvironment`: `node` for `lib/` modules; `jsdom` for component tests.
- `moduleNameMapper`: resolves `@/` path alias.
- `collectCoverageFrom`: all files in `lib/` and `components/`.
