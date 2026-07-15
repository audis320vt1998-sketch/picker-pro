# 22 — Roadmap

## Release Strategy

Picker Pro follows a milestone-based release strategy. Each milestone delivers a coherent set of user-facing capabilities.

---

## v1.0 — Foundation (Current)

**Status**: In development

### Delivered
- Hebrew OCR with Tesseract.js
- Camera capture, image upload, PDF upload
- Product resolution (barcode → SKU → name → alias)
- Case/unit separation and aggregation
- City and delivery-route grouping
- Validation engine and review queue
- Excel (XLSX), PDF, and print export per city
- Full source traceability (page + row)
- Offline job recovery (PWA)
- Versioned, configurable business rules
- CodeQL security analysis in CI

---

## v1.1 — Mobile Enhancements

**Target**: Q4 2026

- Page removal and reordering after submission
- Batch camera capture (multiple shots without returning to upload screen)
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
