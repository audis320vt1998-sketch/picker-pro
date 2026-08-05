# 17 — Testing

## Current quality gates

Picker Pro uses the following executable checks:

| Gate | Tool | Current scope |
|---|---|---|
| Tests | Jest | Unit, integration, request-handler, catalog, OCR-preflight, and manual-review behavior under `tests/` |
| Lint | ESLint CLI with the Next.js flat configuration | Active Next.js, React, and TypeScript source |
| Type check | Next.js type generation + TypeScript | Generated route contracts and the active build selected by `tsconfig.json` |
| Production build | Next.js | Route compilation, static generation, and production bundling |

Browser E2E and rendered-component tests are not configured yet. The Jest
environment is `node`; the suite does not currently claim browser coverage.

## Run locally

Use Node.js 24, as declared in `.nvmrc`, and install the committed lockfile:

```bash
npm ci
```

Run the same blocking checks used by CI:

```bash
npm test -- --runInBand
npm run lint
npm run typecheck
npm run build
```

Useful focused commands:

```bash
# Run one test file
npm test -- --runTestsByPath tests/document-intake/page-review-navigation.test.ts

# Produce a local coverage report; no repository-wide threshold is enforced yet
npm test -- --coverage
```

## Test layout

```text
tests/
  ai/                 Legacy-isolation and disabled-AI behavior
  api/                Route-handler contracts and failure boundaries
  catalog/            Catalog loading, normalization, policy, and onboarding
  document-intake/    Upload policy, OCR preflight, PDF, camera, and page review
  foundation/         Explicit-row processing contracts
  manual-review/      Resolution, validation, aggregation, saving, and CSV
  traceability/       Safe source-reference presentation
```

The repository does not contain committed customer images or PDF fixtures.
Document-intake tests use controlled in-memory inputs and mocks so that CI does
not retain source documents or require Poppler.

## GitHub Actions

The `Quality / Verify` job in `.github/workflows/quality.yml` runs on:

- pull requests targeting `main`;
- pushes to `main`;
- an explicit manual dispatch.

The job uses Node.js 24 on Ubuntu 24.04, installs with `npm ci`, and runs all
four blocking gates listed above. It has read-only repository permissions, a
20-minute timeout, and no persisted checkout credentials.

The final dependency-audit step is blocking for high and critical production
dependency findings. The lockfile is expected to pass
`npm audit --omit=dev --audit-level=high` with zero vulnerabilities before a
change can merge.

A workflow does not enforce repository merge policy by itself. Configure the
GitHub branch ruleset for `main` to require the stable `Quality / Verify`
check before merge.

## Configuration

- `jest.config.js` uses `next/jest` and the `node` test environment.
- `tsconfig.json` defines the active source boundary and path aliases.
- `npm run typecheck` generates Next.js route types before running TypeScript,
  so it also works on a clean checkout before the first build.
- `eslint.config.mjs` applies the Next.js Core Web Vitals flat configuration.
- `package-lock.json` is required; CI never replaces it with a floating
  dependency install.

When adding behavior, place the test beside the matching area under `tests/`
and cover both the accepted path and the fixed failure/review boundary.
