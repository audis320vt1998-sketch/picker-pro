# 20 — Developer Guide

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 24 LTS (see `.nvmrc`) |
| npm | 11+ |
| Git | 2.40+ |
| Poppler | Optional; required only for local PDF preflight |

The active review-first workflow has no database, object-storage, or AI-key
requirement. Consult `docs/00_Current_Status.md` before implementing a target
architecture capability described by another numbered design document.

## Initial setup

```bash
git clone https://github.com/audis320vt1998-sketch/picker-pro.git
cd picker-pro
npm ci
npm run dev
```

Open `http://localhost:3000/upload` for OCR preflight or
`http://localhost:3000/review` for explicit manual review.

PDF preflight also needs `pdfinfo` and `pdftoppm` on the server PATH. When
they are installed elsewhere, set `PICKER_PRO_PDFINFO_PATH` and
`PICKER_PRO_PDFTOPPM_PATH`.

## Active project layout

```text
.github/workflows/       Quality and CodeQL workflows
app/                     Next.js routes and request handlers
components/              Hebrew RTL client workspaces
catalogs/                Versioned product and review-rule inputs
lib/catalog/             Verified catalog loader and resolution
lib/document-intake/     Image/PDF policy, OCR preflight, and page review
lib/foundation/          Explicit-row validation and aggregation
lib/manual-review/       Review, packing suggestion, saving, and CSV
lib/traceability/        Safe source-reference presentation
tests/                   Jest suites mirroring the active areas
```

Modules named as legacy in `docs/23_Legacy_Module_Isolation.md` are excluded
from the active TypeScript build and must not be imported into production paths.

## Development workflow

- Branch from `main` using `feature/<name>`, `fix/<name>`, or
  `chore/<name>`.
- Use Conventional Commit messages such as
  `feat: add mobile page review progress`.
- Open pull requests against `main`.
- Run all quality gates before requesting review.

```bash
npm test -- --runInBand
npm run lint
npm run typecheck
npm run build
```

GitHub runs the same commands in the stable `Quality / Verify` job. Requiring
that job before merge is a separate branch-ruleset setting.

## Available scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create an optimized production build |
| `npm start` | Start the compiled application |
| `npm run lint` | Run Next.js ESLint checks |
| `npm test` | Run the Jest suite |
| `npm run typecheck` | Run TypeScript without emitting files |

## Updating review rules

The active packing-suggestion policy is `catalogs/picking-rules.json`.

1. Change only rules backed by an approved warehouse policy.
2. Increment the configuration version.
3. Update `lib/manual-review/picking-rule-config.ts` when the schema changes.
4. Add or update tests under `tests/manual-review/`.
5. Update the current-status and user-manual documentation when behavior
   changes.

Suggestions remain non-persistent and never overwrite a reviewer-entered value.

## Updating the product catalog

`catalogs/products.json` is the active canonical catalog. A CSV checked on the
settings screen is only a structural handoff; it does not import or verify
products automatically.

1. Verify the source against the authoritative warehouse catalog.
2. Preserve stable SKU and barcode identities.
3. Increment the catalog version.
4. Run catalog, manual-review, and full quality checks.
5. Record the change in `CHANGELOG.md`.

## Runtime configuration

No environment file is required for the active image/manual-review flow.
Optional runtime overrides are:

- `PICKER_PRO_PDFINFO_PATH` and `PICKER_PRO_PDFTOPPM_PATH` for Poppler;
- `PICKER_PRO_OCR_CACHE` for the server-side Tesseract cache directory;
- `LOG_LEVEL` for supported server logging levels.

Do not add secrets to `.env.example`, source control, browser storage, OCR
results, or exported CSV files.

## Common issues

| Issue | Resolution |
|---|---|
| PDF renderer unavailable | Install Poppler or set both Poppler path overrides |
| OCR page rejected as too small | Capture a closer, sharper table image |
| Catalog readiness error | Validate the versioned JSON and fixed catalog fields |
| TypeScript imports a legacy module | Move the behavior behind an active Foundation contract |
| CI differs from local output | Use Node 24 and reinstall exactly with `npm ci` |
