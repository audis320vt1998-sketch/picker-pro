# 20 — Developer Guide

## 1. Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18 LTS |
| npm | 9+ |
| Git | 2.40+ |
| PostgreSQL | 14+ (local or Docker) |

## 2. Initial Setup

```bash
# Clone the repository
git clone https://github.com/audis320vt1998-sketch/picker-pro.git
cd picker-pro

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
# Edit .env.local — fill in DATABASE_URL, OPENAI_API_KEY, and storage settings

# Run database migrations
npm run migrate

# Start the development server
npm run dev
```

The application starts at `http://localhost:3000`.

## 3. Project Layout

```
picker-pro/
├── app/                    # Next.js App Router (pages + API routes)
├── components/             # React components
├── lib/                    # Domain service modules (pure TypeScript)
│   ├── ai/                 # OpenAI integration + fuzzy matching
│   ├── aggregator/         # Cross-page aggregation
│   ├── calculator/         # Case/unit totals
│   ├── catalog/            # City and route catalog access
│   ├── database/           # DB abstraction + migrations
│   ├── engine/             # Orchestration / pipeline
│   ├── export/             # XLSX / PDF / print generation
│   ├── ocr/                # Tesseract.js OCR extraction
│   ├── parser/             # OCR line → ParsedRow
│   └── rules/              # Business rules engine + validation
├── catalogs/               # JSON reference catalogs (versioned)
├── docs/                   # Documentation
├── data/                   # Static seed data
└── __tests__/              # Jest test suites and fixtures
```

## 4. Development Workflow

### 4.1 Branching

- `main` — production-ready code.
- `feature/<name>` — new features.
- `fix/<name>` — bug fixes.
- `docs/<name>` — documentation changes.
- `chore/<name>` — tooling / dependency updates.

### 4.2 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Hebrew OCR dictionary correction
fix: case/unit totals merged incorrectly across pages
docs: add Aggregator Engine specification
chore: update Tesseract.js to v5.1
```

### 4.3 Pull Requests

- Open PRs against `main`.
- All CI checks (lint, type check, tests) must pass before merge.
- At least one approving review is required.

## 5. Available Scripts

| Script | Command | Description |
|---|---|---|
| Development server | `npm run dev` | Hot-reload dev server |
| Production build | `npm run build` | Compile and optimise |
| Production start | `npm start` | Start compiled server |
| Lint | `npm run lint` | ESLint via Next.js |
| Tests | `npm test` | Jest test suite |
| Coverage | `npm test -- --coverage` | Coverage report |
| Type check | `npx tsc --noEmit` | TypeScript type check |
| Migrate | `npm run migrate` | Run pending DB migrations |

## 6. Adding a New Business Rule

1. Add a new entry to `catalogs/rules.json` with a unique `id` and `ruleType`.
2. If the `ruleType` is new, implement the evaluator in `lib/rules/`:

```typescript
// lib/rules/myNewRule.ts
import type { ParsedRow, ResolvedProduct, RuleResult } from './types';

export function evaluateMyNewRule(
  row: ParsedRow,
  product: ResolvedProduct,
  params: Record<string, unknown>
): RuleResult {
  // ... implementation
  return { ruleId: 'R999', status: 'pass', rowRef: { page: row.page, row: row.row } };
}
```

3. Register the evaluator in `lib/rules/index.ts`.
4. Add unit tests in `__tests__/rules/myNewRule.test.ts`.
5. Increment the `version` in `catalogs/rules.json`.

## 7. Updating a Catalog

1. Edit the relevant JSON file in `catalogs/`.
2. Increment the `version` field.
3. Add a change entry to `CHANGELOG.md`.
4. Open a pull request; catalog changes follow the same review process as code changes.

## 8. Environment Variables

See `docs/18_Deployment.md` for the full variable reference and `.env.example` for a template.

## 9. Debugging

- Set `NODE_ENV=development` to enable verbose logging.
- OCR logs are written to `stdout` with structured JSON including `jobId` and `page`.
- Use the `/api/health` endpoint to verify DB connectivity.

## 10. Common Issues

| Issue | Resolution |
|---|---|
| `CATALOG_LOAD_ERROR` at startup | Check that all files in `catalogs/` are valid JSON. |
| Hebrew text reversed in output | Verify RTL normalisation in `lib/parser/`. |
| OCR confidence always low | Check image quality; consider raising `OCR_CONFIDENCE_THRESHOLD`. |
| `OPENAI_API_KEY` not set | Set the variable in `.env.local` and restart the dev server. |
