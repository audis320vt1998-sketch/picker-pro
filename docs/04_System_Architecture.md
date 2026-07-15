# 04 — System Architecture

## 1. Architecture Style

Picker Pro follows a **layered monolith** architecture deployed as a single Next.js application. The layers are:

```
┌─────────────────────────────────────────────┐
│                  Browser / PWA              │
│       React components  ·  Service Worker   │
├─────────────────────────────────────────────┤
│              Next.js App Router             │
│         pages  ·  API route handlers        │
├─────────────────────────────────────────────┤
│             Domain Service Layer            │
│  ocr │ parser │ rules │ calculator │ export │
│  aggregator │ catalog │ engine │ ai         │
├─────────────────────────────────────────────┤
│              Persistence Layer              │
│       lib/database  ·  localStorage (PWA)   │
├─────────────────────────────────────────────┤
│             External Services               │
│     Tesseract.js OCR  ·  OpenAI API         │
└─────────────────────────────────────────────┘
```

## 2. Component Diagram

```
Browser
  │
  ├─ React UI (app/, components/)
  │    ├─ UploadBox
  │    ├─ ProgressBar
  │    ├─ ResultsTable
  │    └─ SummaryCards
  │
  └─ Service Worker (offline cache + job recovery)
       │
       ▼
  Next.js Server
  ├─ /api/health
  ├─ /api/process ──▶ OCR Engine
  │                       │
  │                       ▼
  │                  Parser Engine
  │                       │
  │                       ▼
  │                 Product Engine ──▶ catalogs/products.json
  │                       │
  │                       ▼
  │                  Rules Engine ──▶ catalogs/rules.json
  │                       │
  │                       ▼
  │               Calculator Engine
  │                       │
  │                       ▼
  │               Aggregator Engine
  │                       │
  │              ┌─────────────────┐
  │              ▼                 ▼
  │         City Engine   Delivery Route Engine
  │              └─────────────────┘
  │                       │
  │                       ▼
  │             Validation Engine
  │
  ├─ /api/jobs/[id]/review
  ├─ /api/jobs/[id]/export ──▶ Export Engine (XLSX / PDF / print)
  └─ /api/ai ──▶ OpenAI API
```

## 3. Data Flow

### 3.1 Happy Path

1. User submits files via `/upload` page.
2. `POST /api/process` receives the multipart payload.
3. Each page is sent to **OCR Engine** → returns `OcrResult[]`.
4. **Parser Engine** converts OCR lines to `ParsedRow[]`.
5. **Product Engine** resolves each row to a `ResolvedProduct`.
6. **Rules Engine** validates quantity type (case vs. unit).
7. **Calculator Engine** accumulates totals per product key.
8. **Aggregator Engine** merges totals across pages.
9. **City Engine** and **Delivery Route Engine** group aggregated results.
10. **Validation Engine** performs final checks; failures enter review queue.
11. User reviews any flagged items.
12. **Export Engine** generates XLSX / PDF / print per city.

### 3.2 Offline Recovery Path

1. Browser detects connectivity loss.
2. Service worker caches job state to IndexedDB.
3. On reconnect, client resumes from last checkpoint via `POST /api/jobs/[id]/resume`.

### 3.3 Manual Review Path

1. Validation failures appear in the review queue (`GET /api/jobs/[id]/review`).
2. Reviewer approves, corrects, or rejects each item (`PATCH /api/jobs/[id]/review`).
3. Approved/corrected items rejoin the aggregation pipeline.
4. Rejected items are excluded from all exports.

## 4. Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 App Router | SSR + API routes in one deployment; existing codebase |
| Language | TypeScript (strict) | Type safety across domain models |
| OCR | Tesseract.js | Open-source, Hebrew support, runs in Node.js |
| AI correction | OpenAI API | Flexible correction prompts; tool-calling for structured output |
| Export | SheetJS (XLSX) + PDF library | Widely supported; no external service dependency |
| Mobile | PWA | Installable on any device; no app store friction |
| Future mobile | Capacitor | Drop-in wrapper when native features are required |
| Database | PostgreSQL (via `lib/database`) | Relational; supports job and audit data |

## 5. Deployment Topology

```
Vercel (or self-hosted Node)
├─ Next.js application (server + static)
│   ├─ Edge: /api/health
│   └─ Serverless: /api/process, /api/jobs/*, /api/ai
├─ PostgreSQL (managed, e.g. Supabase / Neon)
└─ Object Storage (images/PDFs)
```

## 6. Scalability Considerations

- Processing API routes are stateless and can scale horizontally.
- Long-running OCR jobs can be offloaded to background workers via a queue (v2 roadmap).
- Catalog JSON files are loaded at cold start and cached in memory.

## 7. Observability

- `/api/health` provides a liveness endpoint for uptime monitoring.
- Structured logging (JSON to stdout) is used in all domain modules.
- Each job has a unique `jobId` included in all log entries for traceability.
