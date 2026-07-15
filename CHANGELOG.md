# Changelog

All notable changes to Picker Pro are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Picker Pro uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Complete documentation suite under `docs/` (22 documents).
- Reference catalogs under `catalogs/` (products, cities, delivery routes, rules, OCR dictionary).
- Updated `README.md` with full project overview, core business rules, and documentation index.

---

## [0.1.0] — 2026-07-15

### Added
- Initial Next.js 14 / TypeScript project scaffold.
- Domain module structure under `lib/` (ocr, parser, rules, calculator, aggregator, export, catalog, engine, ai, database).
- API routes: `/api/health`, `/api/process`, `/api/ai`.
- React components: `UploadBox`, `ResultsTable`, `SummaryCards`, `ProgressBar`.
- App pages: `/upload`, `/results`, `/settings`.
- Tesseract.js integration for OCR.
- OpenAI API integration for AI-assisted OCR correction.
- CodeQL analysis workflow.
- Initial Software Design Specification (`docs/picker-pro-software-design-specification.md`).

---

[Unreleased]: https://github.com/audis320vt1998-sketch/picker-pro/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/audis320vt1998-sketch/picker-pro/releases/tag/v0.1.0
