# 19 — Security

## Active security boundary

This document describes controls present in the current review-first product.
Database encryption, object storage, malware scanning, authentication,
identity-backed audit logs, persistent jobs, and AI correction are not active
capabilities.

## Data minimization

- Image and PDF inputs are accepted only for transient OCR preflight.
- The API does not create stored jobs or retain original filenames.
- PDF source/render files use a unique temporary directory and are removed
  before the render operation resolves or rejects.
- OCR-to-review handoff retains only the narrow source/page/row reference needed
  for human verification.
- An explicitly saved verified result is browser-local, expires after 24 hours,
  and excludes source images, filenames, OCR text, customer data, and editable
  drafts.
- The local CSV contains only verified product identifiers, names, cases, and
  units; spreadsheet-formula prefixes are escaped.

## Input validation

The server, not the browser, is the authoritative input boundary.

- Images are limited to JPEG, PNG, and WebP, with fixed byte, dimension, pixel,
  multipart, and decoded-content checks.
- PDFs require the PDF media type and signature and have fixed byte/page limits.
- Manual-review JSON rejects unrecognized metadata and enforces explicit
  cases/units, product resolution, and source traceability.
- Disabled `/api/process` and `/api/ai` routes return fixed, non-cacheable
  `501` responses without processing user content.
- Error responses use fixed codes/messages and do not return OCR text,
  filenames, opaque source IDs, or stack traces.

## OCR and external services

Active OCR uses Tesseract on the application server. No raw image or extracted
text is sent to OpenAI or another cloud OCR provider. AI assistance is disabled
and no API key is required.

Poppler command paths are operator-controlled configuration. PDF rendering uses
`execFile` with fixed arguments and a timeout rather than a shell command.

## Browser storage

- The OCR batch, previews, selections, and editable review state remain
  ephemeral browser state.
- The one-time OCR handoff uses session storage.
- A completed verified-result snapshot is saved only after an explicit action
  and can be deleted by the user.
- No server-side recovery is available after browser data is cleared.

## Authentication and rate limiting

Authentication, authorization, user identity, and IP rate limiting are not
implemented. Deploy the current product only in a controlled internal boundary.
They must be implemented and tested before exposing the workflow publicly or
enabling persistent/multi-user capabilities.

OCR concurrency and timeouts protect process capacity but are not substitutes
for network rate limiting.

## Secrets and configuration

The active workflow requires no database, storage, OCR-provider, or OpenAI
secret. Optional non-secret paths/settings are listed in `.env.example`.

- Never commit real credentials or customer data.
- Keep `.env.local` and other local overrides outside source control.
- Do not place secrets in `NEXT_PUBLIC_*` variables because they are exposed
  to browser bundles.

## Dependency and workflow security

- `Quality / Verify` runs with `contents: read` only.
- Checkout credentials are not persisted.
- External workflow actions are pinned to reviewed full commit SHAs.
- Dependencies are installed from `package-lock.json` with `npm ci`.
- Production dependencies are checked with
  `npm audit --omit=dev --audit-level=high` as a blocking CI step.
- The current Next.js 16/PostCSS lockfile passes the production audit with zero
  known vulnerabilities.
- CodeQL runs separately because it requires `security-events: write`.
- Dependabot automation is not configured yet.

## Logging and auditability

The application does not have an identity-backed audit log. Operational logs
must not include source images, OCR text, customer details, filenames, or
browser-local saved results.

Traceability inside a current response/result is a product-review aid, not a
durable compliance audit trail.

## Deployment responsibilities

- Terminate TLS at the hosting platform or reverse proxy.
- Run self-hosted processes as a non-root user with minimal filesystem access.
- Retain the server-side upload boundaries.
- Review dependency/CodeQL findings before deployment.
- Do not claim persistence, deletion schedules, encryption-at-rest, or user
  attribution until those systems exist and have been tested.
