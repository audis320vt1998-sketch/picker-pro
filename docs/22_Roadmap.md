# 22 — Roadmap

## Release Strategy

Picker Pro follows a milestone-based release strategy. Each milestone delivers a coherent set of user-facing capabilities.

---

## v1.0 — Foundation (Current)

**Status**: In development — review-first workflow with explicit local result snapshots

### Delivered
- Hebrew OCR with Tesseract.js
- Camera-first capture with a local multi-page queue (up to 20 pages), image upload, and PDF OCR preflight
- Online-only installable mobile shell with a manifest, home-screen icons, and
  browser-specific install guidance; it does not add offline OCR or draft recovery
- Post-OCR page-level confirmation for route codes 1–99 before manual-review handoff
- Manual product resolution (barcode → SKU → name → alias)
- Explicit case/unit entry, validation, and aggregation
- Non-persistent review breakdown by a confirmed route code
- Safe source traceability (document position + page + row)
- Versioned, configurable packing-review rules
- Explicit, browser-local snapshots of completed verified results (up to 24
  hours); they are display-only and contain no source images, OCR text, or
  editable drafts
- Local UTF-8 CSV download of a saved verified-result summary only; no
  route/city/source data and no server-side export history
- Confirmed return from an image-OCR outcome to its local photo batch for
  reordering or removal before a fresh OCR run; it clears drafts and remains
  unavailable for individual PDF pages
- Browser-local page navigator for multi-page OCR review, including progress
  counts, next-attention navigation, failed pages, and replacement-photo
  states, without a saved review queue

### Not delivered in v1.0

- City or delivery-route assignment
- Server-side saved jobs, review queues, editable draft recovery, or offline
  recovery
- Excel, PDF, print, or export history beyond the local verified-summary CSV
- Operational pick lists or grouping by city
- Authentication or multi-user audit logs

---

## v1.1 — Mobile Enhancements

**Target**: Q4 2026

- Improved Hebrew OCR accuracy via fine-tuned Tesseract model
- Push notifications for job completion
- Export history with re-download

---

## v1.2 — Authentication and Multi-User

**Target**: Q1 2027

- JWT-based authentication
- Role-based access control: Admin, Manager, Picker
- User-specific job history
- Audit log UI for managers
- Per-user export access restrictions

---

## v1.3 — Capacitor Native Wrapper

**Target**: Q2 2027

- Capacitor wrapper for iOS and Android
- App Store and Google Play distribution
- Native camera API for improved image quality
- Background sync via native networking
- Push notifications via APNs / FCM

---

## v2.0 — ERP Integration and Multi-Tenant

**Target**: Q3 2027

- REST / webhook integration with common ERP systems (SAP, Priority, Dynamics)
- Multi-tenant SaaS mode with organisation isolation
- Automated product catalog sync from ERP
- Background worker queue for large-volume jobs (> 100 pages)
- Analytics dashboard: pick accuracy trends, processing times, correction rates

---

## v2.1 — Advanced OCR

**Target**: Q4 2027

- Cloud OCR fallback (Google Vision / AWS Textract) for difficult images
- On-device OCR via WebAssembly (fully offline)
- Handwriting recognition for hand-filled order sheets
- Auto-rotation and perspective correction for angled photographs

---

## Deferred / Under Evaluation

| Feature | Notes |
|---|---|
| Real-time collaborative review | Requires WebSocket infrastructure |
| Barcode scanner input (QR/1D) | Useful for physical verification at pick time |
| Voice input for quantity correction | Accessibility and warehouse noise considerations |
| Customer-facing order portal | Separate product; not part of Picker Pro scope |

---

## Deprecations

None planned for v1.x.

---

## How to Request Features

Open a GitHub issue in the `audis320vt1998-sketch/picker-pro` repository with the label `enhancement`. Include:

- The user story: "As a [role], I want [capability] so that [benefit]."
- The business impact.
- Any relevant mockups or examples.
