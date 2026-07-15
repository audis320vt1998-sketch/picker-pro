# 18 — Deployment

## 1. Overview

Picker Pro is a Next.js 14 application deployable to any Node.js hosting platform. The recommended target is **Vercel**, but a self-hosted Node.js server with a reverse proxy (Nginx / Caddy) is also supported.

## 2. Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 18 LTS |
| npm | 9 |
| PostgreSQL | 14 |
| Object storage | S3-compatible (for uploaded images/PDFs) |

## 3. Environment Variables

Copy `.env.example` to `.env.local` (development) or configure via your hosting provider's secrets management.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI-assisted correction |
| `STORAGE_BUCKET` | Yes | S3-compatible bucket name |
| `STORAGE_ENDPOINT` | Yes | S3 endpoint URL |
| `STORAGE_ACCESS_KEY` | Yes | S3 access key |
| `STORAGE_SECRET_KEY` | Yes | S3 secret key |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the application |
| `DATABASE_POOL_SIZE` | No | DB connection pool size (default: 10) |
| `OCR_CONFIDENCE_THRESHOLD` | No | Minimum OCR confidence (default: 70) |

## 4. Build and Start

```bash
# Install dependencies
npm install

# Run database migrations
npm run migrate

# Production build
npm run build

# Start production server
npm start
```

## 5. Vercel Deployment

1. Connect the GitHub repository to a Vercel project.
2. Set all environment variables in the Vercel dashboard under **Project → Settings → Environment Variables**.
3. Vercel automatically runs `npm run build` on each push to the default branch.
4. Database migrations must be run manually via `vercel env pull && npm run migrate` or via a Vercel build hook.

## 6. Self-Hosted Deployment

```
Internet ──▶ Nginx (TLS termination) ──▶ Node.js (port 3000)
                                              │
                                       PostgreSQL (port 5432)
                                              │
                                       S3 Object Storage
```

Systemd service example:

```ini
[Service]
ExecStart=/usr/bin/node /app/server.js
WorkingDirectory=/app
EnvironmentFile=/app/.env.production
Restart=always
```

## 7. Database Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback
```

Migrations are idempotent; re-running them on an up-to-date database is safe.

## 8. Catalog Updates

Catalog files (`catalogs/`) are deployed as part of the application. To update a catalog:

1. Edit the relevant JSON file in the repository.
2. Increment the `version` field in the catalog.
3. Merge to the default branch.
4. Redeploy the application (Vercel redeploys automatically; self-hosted requires a restart).

## 9. Health Check

```
GET /api/health
```

Returns `{ "status": "ok" }` when the application and database are reachable. Use this endpoint for load-balancer health checks and uptime monitoring.

## 10. Rollback

- **Vercel**: use the Vercel dashboard to promote a previous deployment.
- **Self-hosted**: redeploy the previous Git tag; run `npm run migrate:rollback` if the schema changed.

## 11. Security Hardening

- All environment variables are injected at runtime; never hard-coded.
- TLS is required in production; HTTP requests are redirected to HTTPS.
- The application runs as a non-root user in self-hosted deployments.
- Database connections use SSL (`sslmode=require` in `DATABASE_URL`).
