# 18 — Deployment

## Active deployment boundary

Picker Pro is currently a review-first Next.js 14 application. It does not use
a database, object storage, authentication, an AI service, or a background job
queue. OCR results are transient; the only retained result is an explicit,
limited browser-local snapshot described in `docs/00_Current_Status.md`.

Do not provision target-architecture services from older design assumptions or
treat this deployment as an automated pick-list system.

## Requirements

| Requirement | Version or boundary |
|---|---|
| Node.js | 24 LTS, matching `.nvmrc` and `package.json` |
| npm | 11 or newer |
| Memory/time | Enough for one Tesseract worker per Node process |
| Poppler | Optional; required for PDF preflight only |

The image/manual-review workflow requires no environment variables. Optional
values are documented in `.env.example`:

- `LOG_LEVEL`;
- `PICKER_PRO_OCR_CACHE`;
- `PICKER_PRO_PDFINFO_PATH`;
- `PICKER_PRO_PDFTOPPM_PATH`.

## Build and start

```bash
npm ci --no-audit --no-fund
npm run build
npm start
```

`npm start` serves the compiled application on port 3000 by default. Set
`PORT` using the hosting platform's standard process configuration when
another port is required.

No migration command exists or is required.

## Hosted platforms

For a managed Next.js platform:

1. Select Node.js 24.
2. Install from `package-lock.json` and run `npm run build`.
3. Keep the application and its API routes on the same origin.
4. Verify the platform permits the Tesseract worker, request sizes, memory, and
   execution time required by OCR preflight.
5. Treat PDF preflight as unavailable unless compatible `pdfinfo` and
   `pdftoppm` binaries are explicitly supplied.

Vercel can build the Next.js application, but the repository does not promise
that its default serverless limits or filesystem include Poppler. Validate OCR
and PDF behavior in the selected production plan before operational use.

## Self-hosted process

A typical topology is:

```text
Internet -> TLS reverse proxy -> npm start (Node.js 24, port 3000)
```

Run the service as a non-root user, keep TLS and request limits at the reverse
proxy, and give the process write access only to its temporary/OCR-cache
locations.

Example systemd service (adjust executable paths for the host):

```ini
[Service]
Type=simple
WorkingDirectory=/opt/picker-pro
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=on-failure
NoNewPrivileges=true
```

## Poppler and temporary files

PDF preflight invokes `pdfinfo` and `pdftoppm` with a 30-second command
timeout. The source PDF and rendered PNG pages are created in a unique temporary
directory and removed in a `finally` block whether rendering succeeds or
fails.

When Poppler is not on PATH, configure both command-path variables. Do not point
them at shell scripts or user-controlled executables.

## Catalog deployment

Catalog JSON files are bundled with the application:

1. Verify an update against the authoritative warehouse source.
2. Increment its version.
3. Run the complete quality workflow.
4. Deploy the resulting commit and restart/redeploy the application.

The settings CSV check does not import or activate a catalog.

## Liveness and capability check

`GET /api/health` returns HTTP JSON with a timestamp, version, and explicit
capabilities. Its body currently uses `"status": "degraded"` by design because
document processing is preflight-only and AI assistance is unavailable. It does
not test a database.

Use the HTTP response for basic process liveness, and monitor OCR separately
with a controlled non-customer test document when required.

## Rollback

Redeploy the previous known-good commit, run `npm ci`, rebuild, and restart.
There is no database schema or server-side job state to roll back in the active
product.

## Production hardening

- Do not expose the internal review workflow publicly without adding and
  testing authentication and rate limiting.
- Terminate TLS at the hosting platform or reverse proxy.
- Preserve the server-side upload limits; do not rely only on browser checks.
- Keep checkout credentials and deployment secrets out of the runtime bundle.
- Review the advisory dependency-audit output before each deployment.
